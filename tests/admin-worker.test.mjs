import { test } from "node:test";
import assert from "node:assert/strict";
import worker from "../worker/index.mjs";

const env = {
  ADMIN_PASSWORD: "frase-de-prueba-segura-123",
  ACTIVITY_PUBLISH_TOKEN: "github-token-for-tests-only",
  ASSETS: { fetch: async () => new Response("<main>web</main>", { headers: { "content-type": "text/html" } }) },
};

test("Worker sirve la web estática y normaliza /admin", async () => {
  const asset = await worker.fetch(new Request("https://test.workers.dev/"), env);
  assert.equal(asset.status, 200);
  assert.equal(await asset.text(), "<main>web</main>");
  const redirect = await worker.fetch(new Request("https://test.workers.dev/admin"), env);
  assert.equal(redirect.status, 308);
  assert.equal(redirect.headers.get("location"), "https://test.workers.dev/admin/");
});

test("login, cookie, sesión, origen, CSRF y logout", async () => {
  const origin = "https://test.workers.dev";
  const request = (path, init = {}) => worker.fetch(new Request(origin + path, init), env);
  assert.equal((await request("/api/admin/session")).status, 401);
  const wrongOrigin = await request("/api/admin/login", {
    method: "POST",
    headers: { origin: "https://attacker.test", "content-type": "application/json" },
    body: JSON.stringify({ password: env.ADMIN_PASSWORD }),
  });
  assert.equal(wrongOrigin.status, 403);
  const login = await request("/api/admin/login", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify({ password: env.ADMIN_PASSWORD }),
  });
  assert.equal(login.status, 200);
  assert.match(login.headers.get("set-cookie"), /HttpOnly/);
  assert.match(login.headers.get("set-cookie"), /Secure/);
  const cookie = login.headers.get("set-cookie").split(";")[0];
  const { csrf } = await login.json();
  const current = await request("/api/admin/session", { headers: { cookie } });
  assert.equal(current.status, 200);
  assert.ok((await current.json()).catalog.subjects.length > 0);
  const denied = await request("/api/admin/analyze", {
    method: "POST",
    headers: { cookie, origin, "content-type": "application/json" },
    body: JSON.stringify({ url: "https://127.0.0.1/es/resource/1" }),
  });
  assert.equal(denied.status, 403);
  const badUrl = await request("/api/admin/analyze", {
    method: "POST",
    headers: { cookie, origin, "x-admin-csrf": csrf, "content-type": "application/json" },
    body: JSON.stringify({ url: "https://127.0.0.1/es/resource/1" }),
  });
  assert.equal(badUrl.status, 400);
  const logout = await request("/api/admin/logout", {
    method: "POST",
    headers: { cookie, origin, "x-admin-csrf": csrf, "content-type": "application/json" },
    body: "{}",
  });
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get("set-cookie"), /Max-Age=0/);
  assert.equal((await request("/api/admin/session")).status, 401);
});

test("Worker rechaza bodies excesivos", async () => {
  const response = await worker.fetch(new Request("https://test.workers.dev/api/admin/login", {
    method: "POST",
    headers: { origin: "https://test.workers.dev", "content-type": "application/json" },
    body: JSON.stringify({ password: "x".repeat(13_000) }),
  }), env);
  assert.equal(response.status, 413);
});

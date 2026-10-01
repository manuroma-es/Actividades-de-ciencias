import { test } from "node:test";
import assert from "node:assert/strict";
import worker from "../worker/index.mjs";

const env = {
  ADMIN_PASSWORD: "frase-de-prueba-segura-123",
  ACTIVITY_PUBLISH_TOKEN: "github-token-for-tests-only",
  ASSETS: { fetch: async () => new Response("<main>web</main>", { headers: { "content-type": "text/html" } }) },
};

test('Worker lista actividades nativas y bloquea su edición y borrado en el panel',async()=>{
 const base='https://native-readonly.workers.dev';
 const login=await worker.fetch(new Request(base+'/api/admin/login',{method:'POST',headers:{origin:base,'cf-connecting-ip':'192.0.2.50'},body:JSON.stringify({password:env.ADMIN_PASSWORD})}),env);
 const cookie=login.headers.get('set-cookie').split(';')[0],{csrf}=await login.json();
 const session=await worker.fetch(new Request(base+'/api/admin/session',{headers:{cookie}}),env);
 const {catalog}=await session.json();const native=catalog.activities.find(a=>a.id==='native-vital-functions');
 assert.equal(native.source.kind,'native');
 for(const action of ['update','delete']){
  const response=await worker.fetch(new Request(base+'/api/admin/publish',{method:'POST',headers:{cookie,origin:base,'x-admin-csrf':csrf},body:JSON.stringify({action,entity:'activity',item:{id:native.id}})}),env);
  assert.equal(response.status,409);assert.match((await response.json()).error,/solo lectura/);
 }
});

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

test('sesión recordada, rotación y logout; miniatura validada antes de GitHub', async () => {
  const base='https://test.workers.dev';
  const login=await worker.fetch(new Request(base+'/api/admin/login',{method:'POST',headers:{origin:base},body:JSON.stringify({password:env.ADMIN_PASSWORD,remember:true})}),env);
  assert.equal(login.status,200);
  assert.match(login.headers.get('set-cookie'),/Max-Age=2592000/);
  const cookie=login.headers.get('set-cookie').split(';')[0],{csrf}=await login.json();
  const rotated={...env,ADMIN_PASSWORD:'otra-frase-segura-de-prueba-456'};
  assert.equal((await worker.fetch(new Request(base+'/api/admin/session',{headers:{cookie}}),rotated)).status,401);
  const invalid=await worker.fetch(new Request(base+'/api/admin/upload',{method:'POST',headers:{cookie,origin:base,'x-admin-csrf':csrf},body:JSON.stringify({entity:'topics',mime:'image/svg+xml',base64:'PHN2Zz48L3N2Zz4='})}),env);
  assert.equal(invalid.status,400);
  const badOrigin=await worker.fetch(new Request(base+'/api/admin/publish',{method:'POST',headers:{cookie,origin:'https://attacker.test','x-admin-csrf':csrf},body:'{}'}),env);
  assert.equal(badOrigin.status,403);
  const logout=await worker.fetch(new Request(base+'/api/admin/logout',{method:'POST',headers:{cookie,origin:base,'x-admin-csrf':csrf},body:'{}'}),env);
  assert.match(logout.headers.get('set-cookie'),/Max-Age=0/);
});

test('analizador descarta descripción genérica del tipo',async()=>{
 const base='https://test.workers.dev';
 const login=await worker.fetch(new Request(base+'/api/admin/login',{method:'POST',headers:{origin:base},body:JSON.stringify({password:env.ADMIN_PASSWORD})}),env);
 const cookie=login.headers.get('set-cookie').split(';')[0],{csrf}=await login.json();
 const previous=globalThis.fetch;
 globalThis.fetch=async()=>new Response('<html><meta property="og:title" content="Energía"><meta property="og:description" content="Cuestionario - Una serie de preguntas de opción múltiple. Pulsa la respuesta correcta para continuar."></html>',{headers:{'content-type':'text/html'}});
 try{
  const response=await worker.fetch(new Request(base+'/api/admin/analyze',{method:'POST',headers:{cookie,origin:base,'x-admin-csrf':csrf},body:JSON.stringify({url:'https://wordwall.net/es/resource/999999999/energia'})}),env);
  assert.equal(response.status,200);const result=await response.json();assert.equal(result.title,'Energía');assert.equal(result.description,'');assert.match(result.provenance.description,/Sin descripción/);
 }finally{globalThis.fetch=previous;}
});

test('miniatura WebP real se valida y queda como blob temporal sin exponer token',async()=>{
 const {readFileSync}=await import('node:fs');
 const base='https://test.workers.dev';const login=await worker.fetch(new Request(base+'/api/admin/login',{method:'POST',headers:{origin:base},body:JSON.stringify({password:env.ADMIN_PASSWORD})}),env);
 const cookie=login.headers.get('set-cookie').split(';')[0],{csrf}=await login.json();
 const bytes=readFileSync('public/images/topics/topic-ingles-vocabulary.webp');
 const prior=globalThis.fetch;let called=false;
 globalThis.fetch=async (url,init)=>{called=true;assert.match(String(url),/\/git\/blobs$/);assert.match(init.headers.authorization,/^Bearer /);return Response.json({sha:'a'.repeat(40)});};
 try{
  const r=await worker.fetch(new Request(base+'/api/admin/upload',{method:'POST',headers:{cookie,origin:base,'x-admin-csrf':csrf},body:JSON.stringify({entity:'activities',mime:'image/webp',base64:bytes.toString('base64')})}),env);
  assert.equal(r.status,201,await r.clone().text());const v=await r.json();assert.match(v.path,/^\/images\/admin\/activities\/[a-f0-9]{32}\.webp$/);assert.equal(v.blobSha,'a'.repeat(40));assert.equal(called,true);
 }finally{globalThis.fetch=prior;}
});

test('publicación explica un rechazo de permisos de GitHub sin revelar el token',async()=>{
 const base='https://test.workers.dev';
 const login=await worker.fetch(new Request(base+'/api/admin/login',{method:'POST',headers:{origin:base},body:JSON.stringify({password:env.ADMIN_PASSWORD})}),env);
 const cookie=login.headers.get('set-cookie').split(';')[0],{csrf}=await login.json();
 const optionsResponse=await worker.fetch(new Request(base+'/api/admin/session',{headers:{cookie}}),env);
 const {catalog}=await optionsResponse.json();
 const previousFetch=globalThis.fetch,previousLog=console.error;let logged='';
 globalThis.fetch=async(url,init)=>{
  assert.match(String(url),/actions\/workflows\/import-activity\.yml\/runs/);
  assert.equal(init.headers.authorization,`Bearer ${env.ACTIVITY_PUBLISH_TOKEN}`);
  return Response.json({message:'Resource not accessible by integration'},{status:403,headers:{'x-github-request-id':'ABC123'} });
 };
 console.error=(line)=>{logged=String(line);};
 try{
  const response=await worker.fetch(new Request(base+'/api/admin/publish',{method:'POST',headers:{cookie,origin:base,'x-admin-csrf':csrf},body:JSON.stringify({action:'create',entity:'topic',item:{subjectId:catalog.subjects[0].id,name:'Tema de prueba',description:''}})}),env);
  assert.equal(response.status,502);
  const result=await response.json();
  assert.match(result.error,/Actions: write/);
  assert.match(result.error,/HTTP 403/);
  assert.match(result.error,/ABC123/);
  assert.doesNotMatch(result.error,/github-token-for-tests-only/);
  assert.match(logged,/admin_github_rejected/);
  assert.match(logged,/"status":403/);
  assert.doesNotMatch(logged,/github-token-for-tests-only/);
 }finally{globalThis.fetch=previousFetch;console.error=previousLog;}
});

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const catalog = JSON.parse(await readFile(path.join(root, "data/generated/catalog.json"), "utf8"));
const sources = JSON.parse(await readFile(path.join(root, "data/topic-image-sources.json"), "utf8"));
const topicById = new Map(catalog.topics.map((topic) => [topic.id, topic]));
const subjectById = new Map(catalog.subjects.map((subject) => [subject.id, subject]));
const creditIds = new Set(catalog.credits.map((credit) => credit.id));

test("los 21 assets aprobados coinciden con su Topic, crédito y hash", async () => {
  assert.equal(sources.length, 21);
  assert.equal(new Set(sources.map((source) => source.id)).size, 21);
  assert.equal(catalog.topics.filter((topic) => topic.visual?.image).length, 32);
  assert.equal(catalog.credits.length, 32);
  for (const source of sources) {
    const topic = topicById.get(source.id);
    assert.ok(topic && topic.subjectId !== "ciencias", source.id);
    assert.equal(topic.visual.image, source.suggestedPath);
    assert.equal(topic.visual.creditId, `credit-${source.id}`);
    assert.ok(creditIds.has(topic.visual.creditId));
    assert.equal(topic.visual.imageObjectPosition ?? "center center", source.objectPosition);
    assert.equal(topic.visual.heroImageFit ?? "cover", source.heroTreatment === "contain-on-subject-color" ? "contain" : "cover");
    const file = await readFile(path.join(root, "public", source.suggestedPath.slice(1)));
    assert.equal(createHash("sha256").update(file).digest("hex"), source.sha256, source.id);
    await access(path.join(root, "out", source.suggestedPath.slice(1)));
    const subject = subjectById.get(topic.subjectId);
    const topicHtml = await readFile(path.join(root, "out/asignatura", subject.slug, topic.slug, "index.html"), "utf8");
    const subjectHtml = await readFile(path.join(root, "out/asignatura", subject.slug, "index.html"), "utf8");
    assert.ok(topicHtml.includes(source.suggestedPath), `Hero ausente: ${source.id}`);
    assert.ok(subjectHtml.includes(source.suggestedPath), `Tile ausente: ${source.id}`);
    if (topic.visual.heroImageFit === "contain") assert.match(topicHtml, /section-page-heading[^"<]*hero-contain/);
  }
  const activity = catalog.activities.find((item) => item.primaryTopicId === "topic-ingles-vocabulary");
  const activityHtml = await readFile(path.join(root, "out/actividad", activity.slug, "index.html"), "utf8");
  assert.ok(activityHtml.includes("/images/topics/topic-ingles-vocabulary.webp"), "Miniatura de actividad ausente");
});

test("los once WebP de Ciencias siguen intactos", async () => {
  const hash = createHash("sha256");
  for (const name of (await readdir(path.join(root, "public/sections"))).filter((item) => item.endsWith(".webp")).sort()) {
    hash.update(name);
    hash.update(await readFile(path.join(root, "public/sections", name)));
  }
  assert.equal(hash.digest("hex"), "3385039813897b253567c7a3dfefefbf5a648d7a445a26d2ac576b50d90eb887");
});

test("el validador rechaza imágenes ausentes, duplicadas y sin crédito", () => {
  const code = `import copy,json,sys\nsys.path.insert(0,'scripts')\nfrom catalog_core import validate_catalog\nc=json.load(open('data/generated/catalog.json'))\nfor field,value,expected in [('image','/images/topics/missing.webp','invalid-topic-image'),('creditId','missing','missing-image-credit'),('heroImageFit','stretch','invalid-hero-image-fit')]:\n d=copy.deepcopy(c);d['topics'][11]['visual'][field]=value\n errors,_=validate_catalog(d)\n assert expected in {e['code'] for e in errors},(field,errors)\nd=copy.deepcopy(c);d['topics'][12]['visual']['image']=d['topics'][11]['visual']['image']\nerrors,_=validate_catalog(d)\nassert 'duplicate-topic-image' in {e['code'] for e in errors},errors\nprint('4 casos rechazados')`;
  assert.match(execFileSync("python3", ["-c", code], { cwd: root, encoding: "utf8" }), /4 casos rechazados/);
});

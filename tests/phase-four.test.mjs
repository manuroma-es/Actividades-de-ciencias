import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { rankSearchEntries } from "../lib/catalog/search-core.mjs";
import { isNewPublication } from "../lib/catalog/dates-core.mjs";

const root=process.cwd();
const catalog=JSON.parse(await readFile(path.join(root,"data/generated/catalog.json"),"utf8"));
const search=JSON.parse(await readFile(path.join(root,"data/generated/search-index.json"),"utf8"));
const byId=new Map(catalog.activities.map((activity)=>[activity.id,activity]));
const english=byId.get("WW-55409289");
const math=byId.get("WW-53716987");
const media=catalog.mediaResources[0];
const readHtml=(relative)=>readFile(path.join(root,"out",relative,"index.html"),"utf8");

test("5 asignaturas, 82 actividades, 32 temas y 93 relaciones; el vídeo no cuenta como actividad",()=>{
 assert.deepEqual(catalog.subjects.map((subject)=>subject.id),["ciencias","frances","lengua","matematicas","ingles"]);
 assert.equal(catalog.activities.length,82);
 assert.equal(catalog.topics.length,32);
 assert.equal(catalog.activities.reduce((sum,item)=>sum+item.topicIds.length,0),93);
 assert.equal(catalog.mediaResources.length,1);
 assert.equal(new Set(catalog.activities.map((item)=>item.id)).size,82);
 assert.equal(new Set(catalog.activities.map((item)=>item.slug)).size,82);
 assert.equal(byId.has(media.id),false);
});

test("vocabulario general de Unit 7 corregido por el autor",()=>{
 assert.equal(english.title,"Unit 7 vocabulary · Kid’s Box 3");
 assert.equal(english.sourceTitle,"Unit 7 ENGLISH|Kid's Box 3 VOCABULARIO");
 assert.equal(english.description,"Review the general vocabulary from Unit 7 of Kid’s Box 3 through a matching activity.");
 assert.equal(english.slug,"unit-7-vocabulary-kids-box-3-55409289");
 assert.equal(english.primaryTopicId,"topic-ingles-vocabulary");
 assert.deepEqual(english.topicIds,["topic-ingles-vocabulary"]);
 assert.equal(english.language,"en");
 assert.equal(english.originCourseLabel,"3.º de Primaria");
 assert.equal(english.typeId,"emparejar");
 assert.ok(catalog.topics.some((topic)=>topic.id==="topic-ingles-vocabulary"&&topic.slug==="vocabulary"));
 assert.ok(!catalog.topics.some((topic)=>topic.id==="topic-ingles-animales"));
 assert.equal(byId.get("WW-55344112").primaryTopicId,"topic-ingles-comparativos");
 for(const query of ["Unit 7","vocabulary","Kid’s Box","inglés"]){
  assert.ok(rankSearchEntries(search.entries,query).some((result)=>result.id===english.id),query);
 }
 assert.ok(english.tags.includes("vocabulary")&&english.keywords.includes("Unit 7"));
});

test("recurso multimedia generado con referencias y archivos válidos",async()=>{
 assert.equal(media.id,"MEDIA-MATES-53716987");
 assert.equal(media.kind,"video");
 assert.deepEqual(media.relatedActivityIds,[math.id]);
 assert.equal(media.primaryTopicId,"topic-matematicas-rectas");
 for(const field of ["src","poster","visualDescriptionPath"])await access(path.join(root,"public",media[field].slice(1)));
 assert.equal(media.status,"active");
 const video=await readFile(path.join(root,"public",media.src.slice(1)));
 assert.ok(video.length>5_000_000&&video.length<6_000_000);
});

test("validador bloquea referencias rotas y rutas multimedia inexistentes",()=>{
 const code=`import copy, json, sys\nsys.path.insert(0,'scripts')\nfrom catalog_core import validate_catalog\nc=json.load(open('data/generated/catalog.json'))\nfor key,value,expected in [('subjectId','missing','orphan-media-subject'),('primaryTopicId','missing','invalid-media-topics'),('topicIds',['missing'],'orphan-media-topic'),('relatedActivityIds',['missing'],'orphan-media-activity'),('src','/media/missing.mp4','invalid-media-asset'),('kind','invalid','invalid-media-kind'),('status','invalid','invalid-media-status'),('language','?','invalid-media-language')]:\n d=copy.deepcopy(c);d['mediaResources'][0][key]=value\n errors,_=validate_catalog(d)\n assert expected in {e['code'] for e in errors},(key,errors)\nprint('8 casos rechazados')`;
 assert.match(execFileSync("python3",["-c",code],{cwd:root,encoding:"utf8"}),/8 casos rechazados/);
});

test("fechas nuevas alimentan Recientes y Nueva con la regla general",()=>{
 const additions=catalog.activities.filter((item)=>item.primarySubjectId!=="ciencias");
 assert.equal(additions.length,17);
 assert.ok(additions.every((item)=>item.dates.publishedAt==="2026-09-24"&&item.dates.updatedAt==="2026-09-24"&&item.dates.createdAt===null));
 assert.ok(additions.every((item)=>isNewPublication(item.dates.publishedAt,new Date("2026-09-24T12:00:00Z"))));
});

test("fichas, temas e Inicio muestran cinco asignaturas y vídeo accesible",async()=>{
 const home=await readHtml("");
 for(const subject of catalog.subjects)assert.ok(home.includes(`/asignatura/${subject.slug}`));
 const detail=await readHtml(`actividad/${math.slug}`);
 assert.match(detail,/<video[^>]*controls[^>]*playsinline[^>]*preload="metadata"/i);
 assert.ok(detail.includes(media.src)&&detail.includes(media.poster)&&detail.includes(media.visualDescriptionPath));
 assert.doesNotMatch(detail,/<video[^>]*autoplay/i);
 assert.ok(detail.includes(math.source.url));
 const topic=await readHtml("asignatura/matematicas/rectas");
 assert.ok(topic.includes(media.title)&&topic.includes(`/actividad/${math.slug}`));
 const vocab=await readHtml("asignatura/ingles/vocabulary");
 assert.ok(vocab.includes(`/actividad/${english.slug}`));
 assert.ok((await readHtml(`actividad/${english.slug}`)).includes(english.title));
 const recent=await readHtml("recientes");
 assert.ok(recent.includes(english.title));
});

test("Ciencias conserva exactamente el catálogo estructurado de main",()=>{
 const stable=(value)=>Array.isArray(value)?value.map(stable):value&&typeof value==="object"?Object.fromEntries(Object.keys(value).sort().map((key)=>[key,stable(value[key])])):value;
 const digest=(value)=>createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
 assert.equal(digest(catalog.activities.filter((item)=>item.primarySubjectId==="ciencias")),"cf4177d8ba3de0268b689a2579180c6de635bfae65b03a944497eead593d6302");
 assert.equal(digest(catalog.topics.filter((item)=>item.subjectId==="ciencias")),"0c015042647059e77185db5e1701db7ba822aeda24037da45e4c1fca7b381d4e");
 assert.equal(digest(catalog.credits),"2528dced5f8daf0f8c6c91e94b9dc02b87e4b4dbf6fc2ebf8ae8b008a5a90418");
});

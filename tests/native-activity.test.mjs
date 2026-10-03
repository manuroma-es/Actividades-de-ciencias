import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { validateContent, createAttempt, gradeQuestion, correctAnswer, getResults, reduceAttempt } from '../lib/native/core.mjs';
import { rankSearchEntries, matchesActivityFilters } from '../lib/catalog/search-core.mjs';
import { sortRecentActivities } from '../lib/catalog/dates-core.mjs';

const json=async path=>JSON.parse(await readFile(path,'utf8'));
const content=validateContent(await json('data/native/vital-functions.json'));
const catalog=await json('data/generated/catalog.json');
const activity=catalog.activities.find(a=>a.id===content.id);
const search=await json('data/generated/search-index.json');
const markdown=await readFile('data/native/sources/vital-functions.md','utf8');
const q=id=>content.questions.find(q=>q.id===id);

test('catálogo: asignatura, tema, fuente, fecha, búsqueda, filtros y recientes',()=>{
 assert.equal(catalog.subjects.find(s=>s.id===activity.primarySubjectId).name,'Biología y Geología');
 assert.equal(catalog.topics.find(t=>t.id===activity.primaryTopicId).name,'THE EARTH');
 assert.deepEqual(activity.topicIds,['topic-biologia-geologia-the-earth']);
 assert.deepEqual(activity.subjectIds,['biologia-geologia']);
 assert.equal(activity.title,'VITAL FUNCTIONS');assert.equal(activity.slug,'vital-functions');
 assert.equal(activity.source.kind,'native');assert.equal(activity.source.url,undefined);assert.equal(activity.source.platformId,undefined);
 assert.equal(activity.typeId,'actividad-interactiva');assert.equal(activity.language,'en');
 assert.deepEqual(activity.dates,{createdAt:'2026-10-01',publishedAt:'2026-10-01',updatedAt:'2026-10-01'});
 assert.equal(rankSearchEntries(search.entries,'Vital Functions')[0].id,activity.id);
 assert.ok(sortRecentActivities(catalog.activities).some(a=>a.id===activity.id));
 const filters={subjects:activity.subjectIds,topics:activity.topicIds,languages:['en'],types:['actividad-interactiva'],sources:['native'],platforms:[]};
 assert.equal(matchesActivityFilters(activity,filters),true);
 assert.equal(matchesActivityFilters(activity,{...filters,platforms:['wordwall']}),false);
});

test('las 11 preguntas y todas las opciones proceden del Markdown con solo dos correcciones',()=>{
 assert.equal(content.questions.length,11);
 const sections=[...markdown.matchAll(/^##\s+(\d+)\.\s*([^\n]+)\n([\s\S]*?)(?=^##\s|$(?![\s\S]))/gm)];
 assert.equal(sections.length,11);
 for (const [,number,prompt,body] of sections) {
  const question=q(`q${number}`);assert.equal(question.prompt,prompt.trim());
  const expected=[...new Set([...body.matchAll(/^- \[ \] (.+)$/gm)].map(m=>m[1].trim().replace('Mollecules','Molecules').replace('Nuclei acid','Nucleic acids')))];
  const actual=(question.options??question.items).map(i=>i.label);
  assert.deepEqual(actual,expected,question.id);
  if(Number(number)<=6){
   const correctPart=body.split(/### Respuestas? incorrectas?:/)[0];
   const expectedCorrect=[...correctPart.matchAll(/^- \[ \] (.+)$/gm)].map(m=>m[1].trim());
   assert.deepEqual(question.correctIds.map(id=>question.options.find(o=>o.id===id).label),expectedCorrect);
  }
  if(Number(number)>=10){
   for(const [,category,items] of body.matchAll(/^### (.+):\s*\n([\s\S]*?)(?=^###|$(?![\s\S]))/gm)){
    for(const [,label] of items.matchAll(/^- \[ \] (.+)$/gm)){
     const item=question.items.find(i=>i.label===label.trim().replace('Nuclei acid','Nucleic acids'));
     assert.equal(question.categories.find(c=>c.id===question.correctCategories[item.id]).label,category);
    }
   }
  }
 }
 assert.deepEqual(content.questions.map(q=>q.kind),['multiple-choice',...Array(5).fill('single-choice'),'ordering','single-choice','single-choice','classification','classification']);
 assert.equal(q('q8').options.find(o=>o.id===q('q8').correctIds[0]).label,'Only in living things');
 assert.equal(q('q9').options.find(o=>o.id===q('q9').correctIds[0]).label,'Both');
 assert.equal(q('q11').items.length,18);assert.ok(q('q11').note.includes('meal'));
});

test('validador rechaza IDs, opciones, orden o categorías inválidas',()=>{
 for(const mutate of [c=>c.questions.push(c.questions[0]),c=>c.questions[0].correctIds=['missing'],c=>c.questions[1].correctIds=['o1','o2'],c=>c.questions[6].correctOrder[1]=c.questions[6].correctOrder[0],c=>c.questions[9].correctCategories.i1='missing',c=>c.questions[0].explanation='',c=>c.questions[0].kind='script']){
  const invalid=structuredClone(content);mutate(invalid);assert.throws(()=>validateContent(invalid));
 }
});

test('corrección exacta de los cuatro tipos: correctas, incompletas e incorrectas',()=>{
 for(const question of content.questions){
  const solution=correctAnswer(question);assert.equal(gradeQuestion(question,solution),true,question.id);
  assert.equal(gradeQuestion(question,question.kind==='classification'?{}:[]),false);
  if(question.kind==='single-choice'||question.kind==='multiple-choice'){
   const incorrect=question.options.find(o=>!question.correctIds.includes(o.id));
   assert.equal(gradeQuestion(question,[incorrect.id]),false);
   assert.equal(gradeQuestion(question,[...question.correctIds,incorrect.id]),false);
   assert.equal(gradeQuestion(question,['missing']),false);
   assert.equal(gradeQuestion(question,[...question.correctIds,question.correctIds[0]]),false);
   if(question.kind==='multiple-choice')assert.equal(gradeQuestion(question,question.correctIds.slice(1)),false);
  }else if(question.kind==='ordering') assert.equal(gradeQuestion(question,[...solution].reverse()),false);
  else{
   const incorrect={...solution,i1:question.categories.find(c=>c.id!==solution.i1).id};assert.equal(gradeQuestion(question,incorrect),false);
  }
 }
});

test('intent completo, bloqueo tras corregir, puntuación y repetición de errores',()=>{
 let state=createAttempt(content,undefined,()=>.5);
 state=reduceAttempt(content,state,{type:'next'});assert.equal(state.index,0);
 for(const question of content.questions){
  const answer=question.id==='q1'?[question.options.find(o=>!question.correctIds.includes(o.id)).id]:correctAnswer(question);
  state=reduceAttempt(content,state,{type:'answer',answer});state=reduceAttempt(content,state,{type:'check'});
  assert.equal(reduceAttempt(content,state,{type:'check'}),state);
  assert.equal(reduceAttempt(content,state,{type:'answer',answer:[]}),state);
  state=reduceAttempt(content,state,{type:'next'});
 }
 assert.equal(state.completed,true);assert.equal(getResults(content,state).correct,10);assert.equal(getResults(content,state).percent,91);
 assert.deepEqual(getResults(content,state).incorrectIds,['q1']);
 const errors=createAttempt(content,getResults(content,state).incorrectIds);assert.deepEqual(errors.questionIds,['q1']);
 assert.equal(errors.mode,'errors');assert.equal(createAttempt(content,content.questions.map(q=>q.id)).mode,'errors');
 const reset=reduceAttempt(content,state,{type:'reset',attempt:createAttempt(content,undefined,()=>.1)});
 assert.equal(reset.completed,false);assert.equal(reset.index,0);assert.deepEqual(reset.checked,[]);assert.deepEqual(reset.answers.q1,[]);
 assert.deepEqual(reset.answers.q10,{});assert.equal(getResults(content,reset).correct,0);
 assert.notDeepEqual(reset.itemOrders.q1,state.itemOrders.q1);
 for(const random of [()=>0,()=>.999,()=>.5])assert.notDeepEqual(createAttempt(content,undefined,random).answers.q7,q('q7').correctOrder);
});

test('ruta exportada integra el motor sin iframe, peticiones ni enlaces educativos externos',async()=>{
 const html=(await readFile('out/actividad/vital-functions/index.html','utf8')).replace(/<!--.*?-->/g,'');
 assert.match(html,/VITAL FUNCTIONS/);assert.match(html,/Pregunta 1 de/);assert.match(html,/Comprobar/);
 assert.match(html,/asignatura\/biologia-geologia\/the-earth/);assert.doesNotMatch(html,/<iframe|Abrir actividad en|Su ejecución se incorporará/);
 const recent=await readFile('out/recientes/index.html','utf8');assert.match(recent,/actividad\/vital-functions/);
 const credits=await readFile('out/sobre-el-proyecto/index.html','utf8');assert.match(credits,/Imagen de tawatchai07 en Magnific/);assert.match(credits,/13180419/);
 for(const file of ['lib/native/core.mjs','components/native/native-activity.tsx','components/native/question-controls.tsx']){
  const src=await readFile(file,'utf8');assert.doesNotMatch(src,/fetch\(|XMLHttpRequest|dangerouslySetInnerHTML|eval\(/);
 }
});

test('pipeline rechaza rutas, motores y documentos nativos ausentes',()=>{
 const code=`import copy,json,sys\nsys.path.insert(0,'scripts')\nfrom catalog_core import validate_catalog\nc=json.load(open('data/generated/catalog.json'))\nfor field,value in [('contentPath','../../secret.json'),('contentPath','data/native/missing.json'),('engineVersion',2)]:\n d=copy.deepcopy(c);a=next(a for a in d['activities'] if a['source']['kind']=='native');a['source']['native'][field]=value\n errors,_=validate_catalog(d)\n assert any(e['code'].startswith('invalid-native') for e in errors),errors\nprint('3 casos rechazados')`;
 assert.match(execFileSync('python3',['-c',code],{encoding:'utf8'}),/3 casos rechazados/);
});

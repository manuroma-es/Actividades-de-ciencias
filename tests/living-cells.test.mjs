import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {validateContent,createAttempt,isComplete,gradeQuestion,correctAnswer,normalizeText,assignMatch,reduceAttempt,getResults} from '../lib/native/core.mjs';
import {rankSearchEntries,matchesActivityFilters} from '../lib/catalog/search-core.mjs';
import {sortRecentActivities} from '../lib/catalog/dates-core.mjs';
const json=async p=>JSON.parse(await readFile(p,'utf8'));
const c=validateContent(await json('data/native/living-things-are-formed-of-cells.json'));
const md=await readFile('data/native/sources/living-things-are-formed-of-cells.md','utf8');
const q=n=>c.questions[n-1];
const labels=items=>items.map(i=>i.label);

test('Cells: eight questions in exact source order, exact options and answer keys',()=>{
 const headings=[...md.matchAll(/^##\s+(\d+)\.\s*(.+)$/gm)];
 assert.equal(headings.length,8);assert.equal(c.questions.length,8);
 assert.deepEqual(c.questions.map(v=>v.id),['q1','q2','q3','q4','q5','q6','q7','q8']);
 assert.deepEqual(c.questions.map(v=>v.prompt),headings.map(m=>m[2].trim()));
 assert.deepEqual(c.questions.map(v=>v.kind),['multiple-choice','year','text-input','single-choice','single-choice','classification','matching','matching']);
 const part=md.split('## 2.')[0];
 const listed=s=>[...s.matchAll(/^- \[ \] (.+)$/gm)].map(m=>m[1].trim());
 const [correct,incorrect]=part.split('### Respuestas incorrectas:');
 assert.deepEqual(labels(q(1).options.filter(o=>q(1).correctIds.includes(o.id))),listed(correct));
 assert.deepEqual(labels(q(1).options.filter(o=>!q(1).correctIds.includes(o.id))),listed(incorrect));
 assert.equal(q(2).correctYear,1673);assert.equal(q(3).expectedText,'Anton van Leeuwenhoek');
 for(const [n,label] of [[4,'True'],[5,'False']]){
  assert.equal(q(n).presentation,'true-false');assert.equal(q(n).options.find(o=>o.id===q(n).correctIds[0]).label,label);
 }
 assert.deepEqual(q(6).items.map(i=>[i.label,q(6).categories.find(cat=>cat.id===q(6).correctCategories[i.id]).label]),[
  ['bacteria','Unicellular'],['protozoa','Unicellular'],['animal','Multicellular'],['plant','Multicellular']]);
 const pairs=n=>q(n).left.map(i=>[i.label,q(n).right.find(r=>r.id===q(n).correctMatches[i.id]).label]);
 assert.deepEqual(pairs(7),[['unicellular','if they are made up of a single cell'],['multicellular','if they have more than one cell']]);
 assert.deepEqual(pairs(8),[['50 billion','number of fat cells in a human body'],['37 trillion','total number of cells in an adult'],['200','types of cells in a human'],['96 million','number of cells that die every day'],['18','days that a white blood cell lives']]);
 for(const question of c.questions)assert.ok(question.explanation.length>30);
});

test('Cells: text comparison handles Unicode, accents, case and spaces without accepting extra words',()=>{
 for(const a of ['Anton van Leeuwenhoek','anton van leeuwenhoek','ANTON VAN LEEUWENHOEK','  Antón  van Léeuwenhoek  ','Anto\u0301n\u00a0van Leeuwenhoek'])assert.equal(gradeQuestion(q(3),a),true,a);
 for(const a of ['AntonvanLeeuwenhoek','It was Anton van Leeuwenhoek.','Anton van Leeuwenhoek.','Robert Hooke','', '  '])assert.equal(gradeQuestion(q(3),a),false,a);
 assert.equal(normalizeText('  A\u0301 B  '),'a b');
 let attempt=createAttempt(c,['q3']);const original='  Antón  van Leeuwenhoek  ';
 attempt=reduceAttempt(c,attempt,{type:'answer',answer:original});assert.equal(attempt.answers.q3,original);
});

test('Cells: year is empty initially, requires an integer and compares exactly',()=>{
 assert.equal(createAttempt(c).answers.q2,'');
 assert.equal(gradeQuestion(q(2),'1673'),true);
 for(const a of ['', '1673.5','1e3','-1673','0','10000','NaN',[],{}])assert.equal(isComplete(q(2),a),false);
 assert.equal(isComplete(q(2),'1674'),true);assert.equal(gradeQuestion(q(2),'1674'),false);
});

test('Cells: matching reassignment is one-to-one; partial and duplicate answers fail',()=>{
 let a=assignMatch(q(8),{},'l1','r1');a=assignMatch(q(8),a,'l2','r1');
 assert.deepEqual(a,{l2:'r1'});a=assignMatch(q(8),a,'l2','r2');assert.deepEqual(a,{l2:'r2'});
 assert.throws(()=>assignMatch(q(8),a,'missing','r1'));
 for(const n of [7,8]){
  const solution=correctAnswer(q(n));assert.equal(gradeQuestion(q(n),solution),true);
  assert.equal(gradeQuestion(q(n),{...solution,l1:solution.l2}),false);
  assert.equal(gradeQuestion(q(n),{...solution,l1:solution.l2,l2:solution.l1}),false);
  delete solution.l1;assert.equal(isComplete(q(n),solution),false);
 }
});

test('Cells: deterministic shuffles preserve IDs, mappings and question order through reset/retry',()=>{
 const snapshots=[()=>0,()=>.999,()=>.35].map(r=>createAttempt(c,undefined,r));
 for(const a of snapshots){
  assert.deepEqual(a.questionIds,c.questions.map(q=>q.id));
  for(const n of [1,4,5,6,7,8]){
   const question=q(n),items=question.options??question.items??question.right;
   assert.deepEqual([...a.itemOrders[question.id]].sort(),items.map(i=>i.id).sort());
   assert.equal(gradeQuestion(question,correctAnswer(question)),true);
  }
  for(const n of [7,8])assert.notDeepEqual(a.itemOrders[q(n).id],q(n).left.map(i=>q(n).correctMatches[i.id]));
  assert.notDeepEqual(a.itemOrders.q6,q(6).items.map(i=>i.id));
 }
 assert.notDeepEqual(snapshots[0].itemOrders.q1,snapshots[1].itemOrders.q1);
 assert.notDeepEqual(snapshots[0].itemOrders.q4,snapshots[1].itemOrders.q4);
 let a=snapshots[0];const orders=structuredClone(a.itemOrders);
 for(const question of c.questions){
  const solution=correctAnswer(question);
  const answer=question.id==='q2'?'1674':question.id==='q1'?solution.slice(1):solution;
  a=reduceAttempt(c,a,{type:'answer',answer});a=reduceAttempt(c,a,{type:'check'});a=reduceAttempt(c,a,{type:'next'});
 }
 assert.equal(a.completed,true);assert.deepEqual(a.itemOrders,orders);
 assert.equal(getResults(c,a).correct,6);assert.deepEqual(getResults(c,a).incorrectIds,['q1','q2']);
 const retry=createAttempt(c,['q8','q3','q2'],()=>.2);assert.deepEqual(retry.questionIds,['q2','q3','q8']);
 assert.deepEqual(retry.answers,{q2:'',q3:'',q8:{}});
 const reset=reduceAttempt(c,a,{type:'reset',attempt:snapshots[1]});assert.equal(getResults(c,reset).correct,0);assert.equal(reset.index,0);assert.deepEqual(reset.checked,[]);
});

test('Cells: native validator rejects malformed new question types',()=>{
 for(const mutate of [x=>x.questions[1].correctYear=1673.5,x=>x.questions[1].maxYear=1600,x=>x.questions[2].expectedText='',x=>x.questions[2].instruction='',x=>x.questions[3].options[0].label='Yes',x=>x.questions[6].correctMatches.l2='r1',x=>x.questions[7].right[0].id='missing']){
  const invalid=structuredClone(c);mutate(invalid);assert.throws(()=>validateContent(invalid));
 }
});

test('Cells: canonical catalog, search, recent listing and exported native route',async()=>{
 const catalog=await json('data/generated/catalog.json'),search=await json('data/generated/search-index.json');
 const a=catalog.activities.find(a=>a.id===c.id);assert.ok(a);
 assert.equal(a.title,'LIVING THINGS ARE FORMED OF CELLS');assert.equal(a.slug,'living-things-are-formed-of-cells');
 assert.deepEqual(a.subjectIds,['biologia-geologia']);assert.deepEqual(a.topicIds,['topic-biologia-geologia-the-earth']);
 assert.equal(a.source.kind,'native');assert.equal(a.source.url,undefined);assert.equal(a.typeId,'actividad-interactiva');assert.equal(a.language,'en');
 assert.deepEqual(a.dates,{createdAt:'2026-10-03',publishedAt:'2026-10-03',updatedAt:'2026-10-03'});
 assert.equal(rankSearchEntries(search.entries,a.title)[0].id,a.id);assert.equal(sortRecentActivities(catalog.activities)[0].id,a.id);
 assert.equal(matchesActivityFilters(a,{subjects:a.subjectIds,topics:a.topicIds,languages:['en'],types:[a.typeId],sources:['native'],platforms:[]}),true);
 const html=await readFile(`out/actividad/${a.slug}/index.html`,'utf8');assert.match(html,/What do living things need to survive/);assert.doesNotMatch(html,/<iframe|Abrir actividad en/);
 for(const path of ['recientes','explorar','asignatura/biologia-geologia','asignatura/biologia-geologia/the-earth'])assert.ok((await readFile(`out/${path}/index.html`,'utf8')).includes(a.slug),path);
});

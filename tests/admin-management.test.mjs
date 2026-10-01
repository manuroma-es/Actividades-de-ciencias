import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
const root=process.cwd();
function run(data, input, output){const payload=path.join(path.dirname(output),'operation.json');writeFileSync(payload,JSON.stringify(data));return spawnSync('python3',['scripts/manage-catalog.py','--payload',payload,'--input',input,'--output',output,'--date','2026-09-27'],{encoding:'utf8',cwd:root});}
function generate(book,dir){const file=path.join(dir,'catalog.json');const p=spawnSync('python3',['scripts/generate-catalog.py','--input',book,'--catalog',file,'--search-index',path.join(dir,'search.json'),'--report',path.join(dir,'report.json')],{encoding:'utf8',cwd:root});assert.equal(p.status,0,p.stderr);return JSON.parse(readFileSync(file));}
test('altas, edición, relaciones, reasignación y borrados mantienen el Excel válido',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'admin-management-')), source='data/catalogo-actividades.xlsx';let current=source;
 for(const action of ['update','delete']){
  const native=run({entity:'activity',action,item:{id:'native-vital-functions'}},source,path.join(dir,`native-${action}.xlsx`));
  assert.notEqual(native.status,0);assert.match(native.stderr,/solo lectura/);
 }
 function op(entity,action,item){const next=path.join(dir,`${Math.random()}.xlsx`);const p=run({entity,action,item},current,next);assert.equal(p.status,0,p.stderr);current=next;return JSON.parse(p.stdout).id;}
 const topic=op('topic','create',{subjectId:'matematicas',name:'Tema temporal del panel',description:'Repaso.'});
 const activity=op('activity','create',{url:'https://wordwall.net/es/resource/987654321/prueba',platformId:'wordwall',resourceId:'987654321',title:'Prueba panel',description:'',subjectId:'matematicas',topicIds:[topic,'topic-matematicas-operaciones-combinadas'],typeId:'cuestionario',language:'es',verified:false,manual:true});
 let c=generate(current,dir);const a=c.activities.find(x=>x.id===activity);assert.deepEqual(a.topicIds,[topic,'topic-matematicas-operaciones-combinadas']);assert.equal(a.description,'');const slug=a.slug;
 const collision=run({entity:'activity',action:'create',item:{url:'https://wordwall.net/es/resource/987654321/prueba',platformId:'wordwall',resourceId:'987654321',title:'Otro',description:'',subjectId:'matematicas',topicIds:[topic],typeId:'cuestionario',language:'es',verified:false,manual:true}},current,path.join(dir,'collision.xlsx'));assert.notEqual(collision.status,0);
 op('activity','update',{id:activity,title:'Prueba editada',description:'Texto específico.',subjectId:'matematicas',topicIds:[topic],typeId:'cuestionario',language:'es'});
 const denied=run({entity:'topic',action:'delete',item:{id:topic}},current,path.join(dir,'denied.xlsx'));assert.notEqual(denied.status,0);
 op('topic','delete',{id:topic,replacementTopicId:'topic-matematicas-operaciones-combinadas'});
 c=generate(current,dir);assert.equal(c.activities.find(x=>x.id===activity).slug,slug);assert.deepEqual(c.activities.find(x=>x.id===activity).topicIds,['topic-matematicas-operaciones-combinadas']);
 op('activity','delete',{id:activity});c=generate(current,dir);assert.equal(c.activities.length,83);assert.equal(c.topics.length,33);
});

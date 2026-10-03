import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const c=JSON.parse(await readFile(new URL('../../data/native/living-things-are-formed-of-cells.json',import.meta.url),'utf8'));
const route='/actividad/living-things-are-formed-of-cells/';
const click=async locator=>test.info().project.use.hasTouch?locator.tap():locator.click();
async function capture(page,info,name){
 await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
 await page.screenshot({path:info.outputPath(name),fullPage:true});
}
async function pair(page,q,leftId,rightId,keyboard=false){
 const left=page.getByRole('region',{name:'Concepts'}).getByRole('button').filter({has:page.getByText(q.left.find(i=>i.id===leftId).label,{exact:true})});
 const right=page.getByRole('region',{name:'Responses'}).getByRole('button').filter({has:page.getByText(q.right.find(i=>i.id===rightId).label,{exact:true})});
 if(keyboard){await left.press('Space');await right.press('Enter');}else{await click(left);await click(right);}
}
async function answer(page,q,wrong=false){
 if(q.kind==='multiple-choice'||q.kind==='single-choice'){
  const ids=wrong&&q.kind==='multiple-choice'?[q.correctIds[0],q.options.find(o=>!q.correctIds.includes(o.id)).id]:q.correctIds;
  for(const id of ids)await click(page.locator(`.native-choice:has(input[value="${id}"])`));
 }else if(q.kind==='year'){
  await expect(page.getByRole('spinbutton',{name:'Year',exact:true})).toHaveValue('');
  await page.getByRole('spinbutton').fill(wrong?'1674':'1673');
 }else if(q.kind==='text-input'){
  await expect(page.getByRole('textbox',{name:'Person’s name'})).toHaveValue('');
  await page.getByRole('textbox',{name:'Person’s name'}).fill(wrong?'It was Anton van Leeuwenhoek.':'  ANTÓN  van Léeuwenhoek  ');
 }else if(q.kind==='classification'){
  for(const i of q.items)await page.getByRole('combobox',{name:`Category for ${i.label}`,exact:true}).selectOption(wrong&&i.id==='i1'?'c2':q.correctCategories[i.id]);
 }else if(q.kind==='matching'){
  for(const [index,i] of q.left.entries()){
   const target=wrong&&index<2?q.correctMatches[q.left[1-index].id]:q.correctMatches[i.id];
   await pair(page,q,i.id,target,!test.info().project.use.hasTouch);
  }
 }
}
async function checkNext(page,q,last,wrong=false){
 await click(page.getByRole('button',{name:'Comprobar',exact:true}));
 await expect(page.locator('.native-verdict')).toHaveText(wrong?'Incorrecta':'Correcta');
 await expect(page.locator('.native-explanation')).toContainText(q.explanation);
 if(['matching','classification'].includes(q.kind)){
  await expect(page.locator('.native-item-review li')).toHaveCount((q.left??q.items).length);
  await expect(page.locator('.native-item-review li').first()).toContainText('Respuesta correcta:');
 }
 if(wrong&&q.kind==='multiple-choice'){
  await expect(page.locator('.native-choice-feedback')).toContainText('Correctas omitidas:');
  await expect(page.locator('.native-choice-feedback')).toContainText('Seleccionadas por error:');
 }
 if(q.kind==='text-input')await expect(page.locator('.native-original-answer').first()).toHaveText(wrong?'It was Anton van Leeuwenhoek.':'  ANTÓN  van Léeuwenhoek  ',{useInnerText:false});
 await click(page.getByRole('button',{name:last?'Ver resultados':'Continuar',exact:true}));
 await expect(page.locator(last?'.native-result-heading h2':'.native-question h2')).toBeInViewport();
}

test('Cells: all eight correct offline, stable options, year validation, keyboard/touch and reset',async({page,context},info)=>{
 await page.addInitScript(()=>{Math.random=()=>0;});
 const requests=[];page.on('request',r=>requests.push(r.url()));
 await page.goto(route);await page.waitForLoadState('networkidle');
 const initial=await page.locator('.native-choice input').evaluateAll(xs=>xs.map(x=>x.value));
 await click(page.locator('.native-choice').first());
 expect(await page.locator('.native-choice input').evaluateAll(xs=>xs.map(x=>x.value))).toEqual(initial);
 await click(page.locator('.native-choice').first());
 await context.setOffline(true);
 for(const [index,q] of c.questions.entries()){
  await expect(page.locator('.native-question h2')).toHaveText(q.prompt);
  await expect(page.locator('.native-progress-heading')).toContainText(`Pregunta ${index+1} de 8`);
  if(q.kind==='year'){
   await expect(page.getByRole('button',{name:'Comprobar',exact:true})).toBeDisabled();
   await page.getByRole('spinbutton').fill('1673.5');await expect(page.getByRole('button',{name:'Comprobar',exact:true})).toBeDisabled();
   await page.getByRole('spinbutton').fill('');
  }
  await capture(page,info,`${q.id}-initial.png`);
  await answer(page,q);
  expect(await page.locator('body').evaluate(e=>e.scrollWidth<=window.innerWidth)).toBeTruthy();
  if(q.kind==='matching')await capture(page,info,`${q.id}-paired.png`);
  await checkNext(page,q,index===7);
 }
 await expect(page.locator('.native-score')).toContainText('8 / 8');
 await expect(page.locator('.native-result')).toHaveCount(8);await expect(page.locator('.native-results .native-explanation')).toHaveCount(8);
 await capture(page,info,'results-correct.png');
 expect(requests.every(url=>url.startsWith('http://127.0.0.1:4173/'))).toBeTruthy();
 await page.evaluate(()=>{Math.random=()=>.999;});
 await click(page.getByRole('button',{name:'Repetir actividad',exact:true}));
 await expect(page.locator('input:checked')).toHaveCount(0);await expect(page.locator('.native-progress-heading')).toContainText('0 comprobadas');
 const reset=await page.locator('.native-choice input').evaluateAll(xs=>xs.map(x=>x.value));
 expect(reset).toEqual(c.questions[0].options.map(o=>o.id));expect(reset).not.toEqual(initial);
 for(const q of c.questions.slice(0,3)){
  await answer(page,q);await checkNext(page,q,false);
 }
});

test('Cells: partial errors, changed pairs, complete review and ordered retry subset',async({page},info)=>{
 await page.goto(route);await page.waitForLoadState('networkidle');
 const wrongIds=['q1','q2','q3','q6','q8'];
 for(const [index,q] of c.questions.entries()){
  if(q.id==='q7'){
   await pair(page,q,'l1','r1');await pair(page,q,'l2','r1');
   await expect(page.getByRole('region',{name:'Concepts'}).getByRole('button').filter({has:page.getByText('unicellular',{exact:true})})).toContainText('Not paired');
   await pair(page,q,'l2','r2');
  }
  await answer(page,q,wrongIds.includes(q.id));await checkNext(page,q,index===7,wrongIds.includes(q.id));
 }
 await expect(page.locator('.native-score')).toContainText('3 / 8');
 await expect(page.locator('.native-result').nth(7).locator('.native-item-verdict').filter({hasText:'Incorrecta'})).toHaveCount(2);
 await expect(page.locator('.native-result').nth(5).locator('.native-item-verdict').filter({hasText:'Incorrecta'})).toHaveCount(1);
 await capture(page,info,'results-errors.png');
 await click(page.getByRole('button',{name:'Repetir solo las incorrectas (5)',exact:true}));
 for(const [index,id] of wrongIds.entries()){
  const q=c.questions.find(q=>q.id===id);
  await expect(page.locator('.native-question h2')).toHaveText(q.prompt);
  await expect(page.locator('.native-progress-heading')).toContainText(`Pregunta ${index+1} de 5`);
  if(q.kind==='classification')for(const input of await page.getByRole('combobox').all())await expect(input).toHaveValue('');
  if(q.kind==='matching')await expect(page.locator('.native-assigned')).toHaveText('0 / 5 paired');
  await answer(page,q);await checkNext(page,q,index===4);
 }
 await expect(page.locator('.native-score')).toContainText('5 / 5');
});

test('Cells: Topic, search, filters, recent listing, reload and back',async({page})=>{
 await page.goto('/asignatura/biologia-geologia/the-earth/');
 const card=page.locator('.activity-card').filter({has:page.getByRole('heading',{name:'LIVING THINGS ARE FORMED OF CELLS',exact:true})});
 await card.getByRole('link',{name:'Realizar actividad',exact:true}).click();await expect(page).toHaveURL(new RegExp(`${route}$`));
 await page.goBack();await expect(page).toHaveURL(/the-earth\/$/);
 await page.goto('/explorar/?q=LIVING%20THINGS%20ARE%20FORMED%20OF%20CELLS');
 await expect(page.locator('.activity-card')).toHaveCount(1);
 await page.getByRole('link',{name:'Realizar actividad',exact:true}).click();await page.reload();
 await expect(page.locator('.native-progress-heading')).toContainText('Pregunta 1 de 8');await expect(page.locator('input:checked')).toHaveCount(0);
 await page.goto('/recientes/');await expect(page.getByRole('heading',{name:'LIVING THINGS ARE FORMED OF CELLS',exact:true})).toBeVisible();
});

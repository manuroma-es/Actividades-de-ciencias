import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const content=JSON.parse(await readFile(new URL('../../data/native/vital-functions.json',import.meta.url),'utf8'));
const route='/actividad/vital-functions/';

async function click(page,locator){
 if(test.info().project.use.hasTouch) await locator.tap(); else await locator.click();
}
async function answer(page,question,correct=true){
 if(question.kind==='single-choice'||question.kind==='multiple-choice'){
  const ids=correct?question.correctIds:[question.options.find(o=>!question.correctIds.includes(o.id)).id];
  for(const id of ids)await click(page,page.locator(`.native-choice:has(input[value="${id}"])`));
 }else if(question.kind==='ordering'){
  const desired=correct?question.correctOrder:[...question.correctOrder].reverse();
  for(let position=0;position<desired.length;position++){
   const label=question.items.find(i=>i.id===desired[position]).label;
   let current=await page.locator('.native-order li > span[lang="en"]').allTextContents();
   while(current.indexOf(label)>position){
    const up=page.getByRole('button',{name:`Subir ${label}`,exact:true});
    await up.focus(); await up.press('Space');
    current=await page.locator('.native-order li > span[lang="en"]').allTextContents();
   }
  }
 }else{
  for(const item of question.items){
   const category=correct?question.correctCategories[item.id]:question.categories.find(c=>c.id!==question.correctCategories[item.id]).id;
   await page.getByRole('combobox',{name:`Category for ${item.label}`,exact:true}).selectOption(category);
  }
 }
}

async function session(page,testInfo,correct){
 for(const [index,question] of content.questions.entries()){
  await expect(page.locator('.native-question h2')).toHaveText(question.prompt);
  await expect(page.locator('.native-progress-heading')).toContainText(`Pregunta ${index+1} de 11`);
  if(question.kind==='ordering'){
   const initial=await page.locator('.native-order li > span[lang="en"]').allTextContents();
   expect(initial).not.toEqual(question.correctOrder.map(id=>question.items.find(i=>i.id===id).label));
  }
  await answer(page,question,correct);
  if(correct&&['q1','q7','q10','q11'].includes(question.id))await page.screenshot({path:testInfo.outputPath(`${question.id}.png`),fullPage:true});
  await click(page,page.getByRole('button',{name:'Comprobar',exact:true}));
  await expect(page.locator('.native-verdict')).toHaveText(correct?'Correcta':'Incorrecta');
  await expect(page.locator('.native-explanation')).toContainText(question.explanation);
  await expect(page.getByRole('heading',{name:'Respuesta correcta',exact:true})).toBeVisible();
  await click(page,page.getByRole('button',{name:index===10?'Ver resultados':'Continuar',exact:true}));
 }
 await expect(page.getByRole('heading',{name:'Resultados y revisión',exact:true})).toBeVisible();
 await expect(page.locator('.native-score')).toContainText(`${correct?11:0} / 11`);
 await expect(page.locator('.native-result')).toHaveCount(11);
 await expect(page.locator('.native-results .native-explanation')).toHaveCount(11);
 await page.screenshot({path:testInfo.outputPath(correct?'results-correct.png':'results-incorrect.png'),fullPage:true});
}

test('sesión completa correcta, corrección offline y repetición sin respuestas residuales',async({page,context},testInfo)=>{
 const requests=[];page.on('request',r=>requests.push(r.url()));
 await page.goto(route);await page.waitForLoadState('load');
 const first=page.locator('.native-choice').first();await expect(first).toBeVisible();
 // Exercise keyboard selection, then return to an empty answer before the run.
 const checkbox=page.getByRole('checkbox').first();await checkbox.focus();await checkbox.press('Space');
 await expect(checkbox).toBeChecked();await checkbox.press('Space');await expect(checkbox).not.toBeChecked();
 await page.screenshot({path:testInfo.outputPath('initial.png'),fullPage:true});
 await context.setOffline(true);
 await session(page,testInfo,true);
 expect(requests.every(url=>url.startsWith('http://127.0.0.1:4173/'))).toBeTruthy();
 await click(page,page.getByRole('button',{name:'Repetir actividad',exact:true}));
 await expect(page.locator('.native-progress-heading')).toContainText('Pregunta 1 de 11');
 await expect(page.locator('input:checked')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Comprobar',exact:true})).toBeDisabled();
 expect(await page.locator('body').evaluate(e=>e.scrollWidth<=window.innerWidth)).toBeTruthy();
});

test('sesión completamente incorrecta, soluciones y repaso de errores',async({page},testInfo)=>{
 await page.goto(route);await session(page,testInfo,false);
 await click(page,page.getByRole('button',{name:'Repetir solo las incorrectas (11)',exact:true}));
 await expect(page.locator('.native-progress-heading')).toContainText('Repaso de errores');
 await expect(page.locator('input:checked')).toHaveCount(0);
 for(const question of content.questions){
  await answer(page,question);await click(page,page.getByRole('button',{name:'Comprobar',exact:true}));
  await click(page,page.getByRole('button',{name:question.id==='q11'?'Ver resultados':'Continuar',exact:true}));
 }
 await expect(page.locator('.native-score')).toContainText('11 / 11');
 await expect(page.getByRole('button',{name:/Repetir solo las incorrectas/})).toHaveCount(0);
});

test('navegación desde tema, búsqueda, recientes, URL directa, recarga y atrás',async({page},testInfo)=>{
 await page.goto('/asignatura/biologia-geologia/the-earth/');
 await page.screenshot({path:testInfo.outputPath('topic.png'),fullPage:true});
 await page.getByRole('link',{name:'Realizar actividad',exact:true}).click();
 await expect(page).toHaveURL(/\/actividad\/vital-functions\/$/);
 await page.goBack();await expect(page).toHaveURL(/\/the-earth\/$/);
 await page.goto('/explorar/?q=Vital%20Functions');
 await expect(page.locator('.activity-card')).toHaveCount(1);
 await page.getByRole('link',{name:'Realizar actividad',exact:true}).click();
 await expect(page.locator('.native-question')).toBeVisible();await page.reload();
 await expect(page.locator('.native-progress-heading')).toContainText('Pregunta 1 de 11');
 await page.goto('/recientes/');await expect(page.getByRole('heading',{name:'VITAL FUNCTIONS',exact:true})).toBeVisible();
});

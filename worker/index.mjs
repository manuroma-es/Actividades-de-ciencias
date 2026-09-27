import catalog from "../data/generated/catalog.json" with { type: "json" };

const enc = new TextEncoder();
const owner = "t2wmt6sgff-glitch";
const repo = "Actividades-de-ciencias";
const workflow = "import-activity.yml";
const day=86400000;
const hosts = new Map([["wordwall.net","wordwall"],["es.educaplay.com","educaplay"],["www.educaplay.com","educaplay"]]);
const attempts = new Map();

class AdminError extends Error { constructor(message, status=400) { super(message); this.status=status; } }
function reply(value,status=200,extra={}) {
  return new Response(JSON.stringify(value),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff","x-robots-tag":"noindex, nofollow",...extra}});
}
function b64(bytes) { let s=""; for(const b of bytes)s+=String.fromCharCode(b); return btoa(s).replaceAll("+","-").replaceAll("/","_").replace(/=+$/,""); }
function unb64(value) { const v=value.replaceAll("-","+").replaceAll("_","/")+"=".repeat((4-value.length%4)%4); return Uint8Array.from(atob(v),c=>c.charCodeAt(0)); }
function randomHex(size) { return [...crypto.getRandomValues(new Uint8Array(size))].map(x=>x.toString(16).padStart(2,"0")).join(""); }
async function signature(data, secret) {
  const key=await crypto.subtle.importKey("raw",enc.encode("admin-session:"+secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC",key,enc.encode(data)));
}
function cookie(request,name) {
  for(const part of (request.headers.get("cookie")||"").split(";")) { const i=part.indexOf("="); if(i>0&&part.slice(0,i).trim()===name)return part.slice(i+1).trim(); }
  return "";
}
async function getSession(request,env) {
  const secret=env.ADMIN_PASSWORD, token=cookie(request,"admin_session"), parts=token.split(".");
  if(!secret||secret.length<16) throw new AdminError("El panel aún no está configurado.",503);
  if(parts.length!==2) throw new AdminError("Inicia sesión para continuar.",401);
  try {
    const claims=JSON.parse(new TextDecoder().decode(unb64(parts[0]))), expected=await signature(parts[0],secret), actual=unb64(parts[1]);
    if(!Number.isInteger(claims.exp)||claims.exp<=Date.now()||typeof claims.csrf!=="string"||actual.length!==expected.length) throw new Error();
    let diff=0; for(let i=0;i<expected.length;i++)diff|=expected[i]^actual[i];
    if(diff)throw new Error();
    return claims;
  } catch { throw new AdminError("La sesión ha caducado. Vuelve a entrar.",401); }
}
function origin(request) { if(request.headers.get("origin")!==new URL(request.url).origin)throw new AdminError("Origen de petición no permitido.",403); }
function csrf(request,claims) { origin(request); if(request.headers.get("x-admin-csrf")!==claims.csrf)throw new AdminError("Sesión caducada. Actualiza el panel.",403); }
function rate(key,max,windowMs) {
  const now=Date.now(), recent=(attempts.get(key)||[]).filter(t=>t>now-windowMs); recent.push(now); attempts.set(key,recent);
  if(recent.length>max)throw new AdminError("Demasiados intentos. Prueba más tarde.",429);
}
async function body(request,limit=12000) {
  const reader=request.body?.getReader();if(!reader)throw new AdminError("JSON inválido.");
  const chunks=[];let size=0;
  try {
    while(true) {
      const {done,value}=await reader.read();if(done)break;size+=value.byteLength;
      if(size>limit){await reader.cancel();throw new AdminError("La solicitud es demasiado grande.",413);}
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(()=>{}); }
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw new AdminError("JSON inválido.");}
}
function externalLink(input,manualId="") {
  if(typeof input!=="string"||input.length>2048)throw new AdminError("Pega una URL completa de Wordwall o Educaplay.");
  let url; try{url=new URL(input);}catch{throw new AdminError("Pega una URL completa de Wordwall o Educaplay.");}
  const platformId=hosts.get(url.hostname.toLowerCase());
  if(url.protocol!=="https:"||!platformId||url.username||url.password||url.port)throw new AdminError("Solo se admiten enlaces HTTPS de Wordwall o Educaplay.");
  const match=platformId==="wordwall"?/^\/[a-z]{2}\/resource\/([0-9]+)(?:\/[^/?#]*)?$/.exec(url.pathname):/^\/(?:recursos-educativos|learning-resources)\/([0-9]+)(?:-[^/?#]+)?\.html$/.exec(url.pathname);
  if(!match&&(!/^[0-9]{1,20}$/.test(manualId)||!url.pathname.includes(manualId)||url.pathname==="/"))throw new AdminError("El enlace no tiene un ID reconocible. Introduce el ID manualmente.");
  url.hash="";url.search="";
  const resourceId=match?.[1]||manualId;
  return {url:url.href,platformId,resourceId,id:(platformId==="wordwall"?"WW":"EP")+"-"+resourceId};
}
function plain(text) {
  return String(text||"").replace(/<[^>]*>/g,"").replace(/&#(x[\da-f]+|\d+);/gi,(_,v)=>{const hex=v[0].toLowerCase()==="x",n=Number.parseInt(hex?v.slice(1):v,hex?16:10);return n>0&&n<=0x10ffff?String.fromCodePoint(n):"";})
    .replace(/&(?:amp|quot|apos|lt|gt|nbsp);/gi,v=>({"&amp;":"&","&quot;":'"',"&apos;":"'","&lt;":"<","&gt;":">","&nbsp;":" "})[v.toLowerCase()]||v).trim().slice(0,1200);
}
function meta(html,key) {
  for(const tag of html.match(/<meta\b[^>]*>/gi)||[]) {
    const attrs=Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/gis)].map(m=>[m[1].toLowerCase(),m[3]]));
    if(attrs.property===key||attrs.name===key)return plain(attrs.content);
  }
  return "";
}
async function inspectLink(input) {
  const original=externalLink(input);let current=original.url;
  for(let i=0;i<4;i++) {
    const res=await fetch(current,{redirect:"manual",signal:AbortSignal.timeout(8000),headers:{accept:"text/html"}});
    if(res.status>=300&&res.status<400) {
      const loc=res.headers.get("location");await res.body?.cancel();if(!loc)throw new AdminError("La plataforma devolvió una redirección incompleta.");
      const next=externalLink(new URL(loc,current).href);if(next.platformId!==original.platformId||next.resourceId!==original.resourceId)throw new AdminError("El enlace redirige a otro recurso.");current=next.url;continue;
    }
    if(!res.ok||!(res.headers.get("content-type")||"").toLowerCase().includes("text/html")){await res.body?.cancel();throw new AdminError("No se pudo leer la página. Puedes introducir los datos manualmente.");}
    const reader=res.body?.getReader();if(!reader)throw new AdminError("La plataforma no devolvió HTML.");
    const chunks=[];let size=0;
    try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>450000)throw new AdminError("La página supera el tamaño permitido.");chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
    const html=new TextDecoder().decode(bytes), title=(meta(html,"og:title")||plain(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1])).slice(0,180);
    const candidate=(meta(html,"og:description")||meta(html,"description")).slice(0,1200);
    const typeText=catalog.activityTypes.map(t=>t.name.toLowerCase());
    const generic=/^(cuestionario|quiz|match up|une las parejas|wordwall|educaplay)\s*[-–:]/i.test(candidate)||/una serie de preguntas de opción múltiple|pulsa la respuesta correcta/i.test(candidate)||typeText.some(t=>candidate.toLowerCase().startsWith(t+" - "));
    const description=generic?"":candidate;
    const lang=html.match(/<html\b[^>]*\blang\s*=\s*["']([A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*)["']/i)?.[1]||"";
    const typePrefix=candidate.split(/\s*[-–:]\s*/)[0].toLowerCase();
    const detectedType=catalog.activityTypes.find(t=>t.name.toLowerCase()===typePrefix);
    return {...externalLink(current),title,description,language:lang,typeId:detectedType?.id||"",verified:true,provenance:{title:meta(html,"og:title")?"Open Graph":"Título HTML",description:description?(meta(html,"og:description")?"Open Graph":"Metadata de página"):"Sin descripción específica fiable",language:lang?"Atributo lang de la página":"Sin evidencia",typeId:detectedType?"Etiqueta de tipo en metadata":"Sin evidencia"}};
  }
  throw new AdminError("El enlace tiene demasiadas redirecciones.");
}
function validateDraft(data) {
  if(!data||typeof data!=="object"||Array.isArray(data))throw new AdminError("Datos incompletos.");
  const allowed=new Set(["url","platformId","resourceId","title","description","subjectId","topicIds","typeId","language","verified","sourceTitle","manual","image"]);
  if(Object.keys(data).some(k=>!allowed.has(k)))throw new AdminError("La solicitud contiene campos inesperados.");
  const link=externalLink(data.url,data.manual?data.resourceId:"");
  if(data.manual!=null&&typeof data.manual!=="boolean")throw new AdminError("Estado manual inválido.");
  if(data.manual&&data.verified)throw new AdminError("Un enlace manual queda pendiente de verificación.");
  if(link.platformId!==data.platformId||link.resourceId!==data.resourceId)throw new AdminError("La plataforma o ID no coinciden con el enlace.");
  for(const [key,limit] of [["title",180],["description",1200]])if(typeof data[key]!=="string"||(key==="title"&&!data[key].trim())||data[key].length>limit||/[\x00-\x1f]/.test(data[key]))throw new AdminError(`${key}: revisa el texto.`);
  if(data.sourceTitle!=null&&(typeof data.sourceTitle!=="string"||data.sourceTitle.length>180))throw new AdminError("Título original inválido.");
  if(!/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(data.language||""))throw new AdminError("Idioma inválido.");
  if(!catalog.subjects.some(s=>s.id===data.subjectId&&s.status==="active"))throw new AdminError("Esta asignatura ya no está activa.");
  const topics=new Map(catalog.topics.map(t=>[t.id,t]));
  if(!Array.isArray(data.topicIds)||data.topicIds.length<1||data.topicIds.length>20||new Set(data.topicIds).size!==data.topicIds.length||data.topicIds.some(id=>topics.get(id)?.subjectId!==data.subjectId||topics.get(id)?.status!=="active"))throw new AdminError("Selecciona temas activos de la asignatura, sin repetir.");
  if(!catalog.activityTypes.some(t=>t.id===data.typeId))throw new AdminError("Tipo de actividad desconocido.");
  if(typeof data.verified!=="boolean")throw new AdminError("Estado de verificación inválido.");
  if(catalog.activities.some(a=>a.id===link.id||(a.source?.platformId===link.platformId&&String(a.source?.resourceId)===link.resourceId)||[a.source?.url,a.source?.canonicalUrl,a.source?.originalUrl].includes(link.url)))throw new AdminError("Esta actividad ya existe en el catálogo.",409);
  if(data.image)validateImageRef(data.image,"activities");
  return {...data,url:link.url,title:data.title.trim(),description:data.description.trim()};
}
const catalogOptions=()=>({
  subjects:catalog.subjects.filter(x=>x.status==="active").map(({id,name})=>({id,name})),
  topics:catalog.topics.filter(x=>x.status==="active").map(({id,subjectId,name})=>({id,subjectId,name})),
  types:catalog.activityTypes.map(({id,name})=>({id,name})),
  platforms:catalog.platforms.map(({id,name})=>({id,name})),
  activities:catalog.activities.map(({id,slug,title,description,primarySubjectId,topicIds,typeId,language,source,visual})=>({id,slug,title,description,subjectId:primarySubjectId,topicIds,typeId,language,source,visual})),
  topicDetails:catalog.topics.map(({id,slug,subjectId,name,description,visual})=>({id,slug,subjectId,name,description,visual})),
});
function validateImageRef(image,entity) {
  if(!image||typeof image!=="object"||Object.keys(image).sort().join()!=="alt,author,blobSha,license,path,source"||
    !new RegExp(`^/images/admin/${entity}/[a-f0-9]{32}\\.(png|jpg|webp)$`).test(image.path)||
    !/^[a-f0-9]{40}$/.test(image.blobSha)||
    ["alt","author","source","license"].some(k=>typeof image[k]!=="string"||!image[k].trim()||image[k].length>300))throw new AdminError("Completa el texto alternativo y los créditos de la miniatura.");
}
function validateActivityOperation(action,item) {
  const current=catalog.activities.find(a=>a.id===item.id);if(!current)throw new AdminError("Actividad desconocida.",404);
  if(action==="delete"&&current.legacy?.subjectLabel==="Ciencias / Conocimiento del Medio")throw new AdminError("Esta actividad forma parte de la migración histórica. No se puede borrar sin revisar la paridad de Ciencias.",409);
  if(action==="delete")return;
  if(current.source.kind!=="external")throw new AdminError("Esta actividad requiere edición avanzada en el Excel.");
  if(typeof item.title!=="string"||!item.title.trim()||item.title.length>180||typeof item.description!=="string"||item.description.length>1200)throw new AdminError("Revisa título y descripción.");
  if(!catalog.subjects.some(x=>x.id===item.subjectId&&x.status==="active")||!Array.isArray(item.topicIds)||!item.topicIds.length||new Set(item.topicIds).size!==item.topicIds.length||item.topicIds.some(id=>!catalog.topics.some(t=>t.id===id&&t.subjectId===item.subjectId&&t.status==="active")))throw new AdminError("Revisa asignatura y temas.");
  if(!catalog.activityTypes.some(t=>t.id===item.typeId)||!/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(item.language||""))throw new AdminError("Tipo o idioma inválido.");
}
function validateTopicOperation(action,item) {
  if(action==="create") {if(!catalog.subjects.some(x=>x.id===item.subjectId&&x.status==="active"))throw new AdminError("Asignatura desconocida.");}
  else if(!catalog.topics.some(t=>t.id===item.id))throw new AdminError("Tema desconocido.",404);
  if(action!=="delete"&&(typeof item.name!=="string"||!item.name.trim()||item.name.length>180||typeof item.description!=="string"||item.description.length>1200))throw new AdminError("Revisa nombre y descripción del tema.");
  if(action==="delete"&&Object.values(catalog.migration.topicIdMap).includes(item.id))throw new AdminError("Este tema conserva una ruta histórica y no se puede borrar.",409);
  if(action==="delete"&&catalog.mediaResources.some(m=>m.topicIds?.includes(item.id)))throw new AdminError("Este tema tiene recursos multimedia asociados. Reasígnalos antes de borrar.",409);
  if(action==="delete"&&catalog.activities.some(a=>a.topicIds.includes(item.id))&&!catalog.topics.some(t=>t.id===item.replacementTopicId&&t.id!==item.id&&t.subjectId===catalog.topics.find(x=>x.id===item.id).subjectId))throw new AdminError("Elige un tema de destino para las actividades asociadas.",409);
}
function imageKind(bytes) {
  const b=bytes;
  let width,height,mime,ext;
  if(b[0]===137&&b[1]===80&&b[2]===78&&b[3]===71&&b[12]===73&&b[13]===72&&b[14]===68&&b[15]===82){mime="image/png";ext="png";width=new DataView(b.buffer,b.byteOffset).getUint32(16);height=new DataView(b.buffer,b.byteOffset).getUint32(20);}
  else if(b[0]===82&&b[1]===73&&b[2]===70&&b[3]===70&&String.fromCharCode(...b.slice(8,12))==="WEBP"){
    mime="image/webp";ext="webp";const subtype=String.fromCharCode(...b.slice(12,16));
    if(subtype==="VP8X"){width=1+b[24]+(b[25]<<8)+(b[26]<<16);height=1+b[27]+(b[28]<<8)+(b[29]<<16);}
    else if(subtype==="VP8 "&&b[23]===157&&b[24]===1&&b[25]===42){width=((b[27]<<8)|b[26])&0x3fff;height=((b[29]<<8)|b[28])&0x3fff;}
    else if(subtype==="VP8L"&&b[20]===47){width=1+(((b[22]&0x3f)<<8)|b[21]);height=1+(((b[24]&0xf)<<10)|(b[23]<<2)|(b[22]>>6));}else return null;
  } else if(b[0]===255&&b[1]===216){mime="image/jpeg";ext="jpg";let p=2;while(p+9<b.length){if(b[p]!==255)return null;let marker=b[p+1],len=(b[p+2]<<8)+b[p+3];if([192,193,194].includes(marker)){height=(b[p+5]<<8)+b[p+6];width=(b[p+7]<<8)+b[p+8];break;}if(len<2)return null;p+=2+len;}}
  if(!width||!height||width<100||height<100||width>4096||height>4096||width*height>8_000_000)return null;
  return {width,height,mime,ext};
}
function githubRejection(status,message,path) {
  const text=typeof message==="string"?message.toLowerCase():"";
  if(status===401)return "El token de publicación no es válido o ha caducado.";
  if(status===403&&/rate limit/.test(text))return "GitHub ha limitado temporalmente las solicitudes. Espera unos minutos y vuelve a intentarlo.";
  if(status===403)return path==="/git/blobs"?"El token no puede crear miniaturas en este repositorio. Comprueba que tenga Contents: write.":"El token no tiene acceso suficiente al workflow. Comprueba que tenga Actions: write.";
  if(status===404)return path==="/git/blobs"?"GitHub no encuentra el repositorio o el token no tiene acceso para cargar la miniatura.":"GitHub no encuentra el workflow o el token no tiene acceso al repositorio. Comprueba el acceso y que el workflow esté en main.";
  if(status===422)return path==="/git/blobs"?"GitHub no pudo crear la miniatura. Vuelve a seleccionarla y prueba otra vez.":"GitHub no pudo validar la solicitud del workflow. Comprueba que esté habilitado y que sus entradas coincidan.";
  return "Comprueba el estado de GitHub y vuelve a intentarlo.";
}
async function github(path,env,init={},purpose="la operación") {
  const token=env.ACTIVITY_PUBLISH_TOKEN;if(!token||token.length<20)throw new AdminError("Falta configurar el token de publicación en Cloudflare.",503);
  let res;
  try {
    res=await fetch(`https://api.github.com/repos/${owner}/${repo}${path}`,{...init,headers:{accept:"application/vnd.github+json",authorization:`Bearer ${token}`,"x-github-api-version":"2022-11-28",...(init.headers||{})},signal:AbortSignal.timeout(12000)});
  } catch(error) {
    const timedOut=error?.name==="TimeoutError"||error?.name==="AbortError";
    console.error(JSON.stringify({event:"admin_github_request_failed",path,purpose,reason:timedOut?"timeout":"network_error"}));
    throw new AdminError(`No se pudo ${purpose} en GitHub${timedOut?" porque la solicitud superó el tiempo de espera":" por un problema de conexión"}. Puedes volver a intentarlo.`,502);
  }
  if(!res.ok) {
    let detail="";try{const data=await res.json();if(typeof data?.message==="string")detail=data.message.slice(0,240);}catch{}
    const requestId=res.headers.get("x-github-request-id")||undefined;
    console.error(JSON.stringify({event:"admin_github_rejected",path,purpose,status:res.status,requestId,message:detail||undefined}));
    const reference=requestId?` Referencia: ${requestId}.`:"";
    throw new AdminError(`GitHub rechazó ${purpose}. ${githubRejection(res.status,detail,path)} (HTTP ${res.status}).${reference}`,502);
  }
  return res.status===204?null:res.json();
}
async function api(request,env) {
  const path=new URL(request.url).pathname;
  if(request.method==="POST"&&path==="/api/admin/login") {
    origin(request);rate("login:"+(request.headers.get("cf-connecting-ip")||"unknown"),6,900000);
    const data=await body(request),secret=env.ADMIN_PASSWORD;
    if(!secret||secret.length<16)throw new AdminError("El panel aún no está configurado.",503);
    if(typeof data.password!=="string"||data.password.length>256)throw new AdminError("Credenciales incorrectas.",401);
    const a=new Uint8Array(await crypto.subtle.digest("SHA-256",enc.encode(data.password))),b=new Uint8Array(await crypto.subtle.digest("SHA-256",enc.encode(secret)));let diff=0;
    for(let i=0;i<a.length;i++)diff|=a[i]^b[i];if(diff)throw new AdminError("Credenciales incorrectas.",401);
    if(data.remember!==undefined&&typeof data.remember!=="boolean")throw new AdminError("Opción de sesión inválida.");
    const ttl=data.remember?30*day:7200000;
    const claims={csrf:randomHex(24),nonce:randomHex(16),exp:Date.now()+ttl},payload=b64(enc.encode(JSON.stringify(claims))),sig=b64(await signature(payload,secret));
    return reply({authenticated:true,csrf:claims.csrf},200,{"set-cookie":`admin_session=${payload}.${sig}; HttpOnly; Secure; Path=/api/admin; SameSite=Lax; Max-Age=${Math.floor(ttl/1000)}`});
  }
  if(request.method==="GET"&&path==="/api/admin/session"){const s=await getSession(request,env);return reply({authenticated:true,csrf:s.csrf,catalog:catalogOptions(),sourceSha:catalog.source.sha256});}
  if(request.method==="POST"&&path==="/api/admin/logout"){const s=await getSession(request,env);csrf(request,s);return reply({authenticated:false},200,{"set-cookie":"admin_session=; HttpOnly; Secure; Path=/api/admin; SameSite=Lax; Max-Age=0"});}
  if(request.method==="POST"&&path==="/api/admin/analyze") {
    const s=await getSession(request,env);csrf(request,s);rate("analyze:"+s.nonce,25,900000);const data=await body(request);if(typeof data.url!=="string")throw new AdminError("Pega un enlace.");externalLink(data.url);
    try{return reply(await inspectLink(data.url));}catch(error){return reply({...externalLink(data.url),title:"",description:"",verified:false,warning:error instanceof AdminError?error.message:"No se pudo leer la página. Completa los datos manualmente."});}
  }
  if(request.method==="POST"&&path==="/api/admin/upload") {
    const session=await getSession(request,env);csrf(request,session);rate("upload:"+session.nonce,12,3600000);
    const data=await body(request,1_500_000), entity=data.entity;
    if(!["activities","topics"].includes(entity)||typeof data.base64!=="string"||data.base64.length>1_400_000)throw new AdminError("Imagen demasiado grande o destino inválido.");
    let bytes;try{bytes=unb64(data.base64);}catch{throw new AdminError("Imagen inválida.");}
    if(bytes.length>1_000_000||bytes.length<32)throw new AdminError("La miniatura debe pesar menos de 1 MB.");
    const kind=imageKind(bytes);if(!kind||data.mime!==kind.mime)throw new AdminError("El contenido no coincide con PNG, JPEG o WebP.");
    const path=`/images/admin/${entity}/${randomHex(16)}.${kind.ext}`;
    const result=await github("/git/blobs",env,{method:"POST",body:JSON.stringify({content:data.base64.replaceAll("-","+").replaceAll("_","/"),encoding:"base64"})},"subir la miniatura");
    return reply({path,blobSha:result.sha,width:kind.width,height:kind.height},201);
  }
  if(request.method==="POST"&&path==="/api/admin/publish") {
    const session=await getSession(request,env);csrf(request,session);rate("publish:"+session.nonce,10,3600000);
    const data=await body(request);const action=data?.action||"create",entity=data?.entity||"activity",item=data?.item||data;
    if(!["create","update","delete"].includes(action)||!["activity","topic"].includes(entity)||!item||typeof item!=="object")throw new AdminError("Operación inválida.");
    if(entity==="activity"&&action==="create")validateDraft(item);
    else if(entity==="activity")validateActivityOperation(action,item);
    else validateTopicOperation(action,item);
    const image=item.image;if(image)validateImageRef(image,entity==="activity"?"activities":"topics");
    const payload=JSON.stringify({action,entity,item});if(payload.length>10000)throw new AdminError("Solicitud demasiado grande.",413);
    const runs=await github(`/actions/workflows/${workflow}/runs?event=workflow_dispatch&per_page=10`,env,{},"consultar el historial de publicaciones");
    if(runs.workflow_runs?.some(r=>["queued","in_progress","waiting","pending"].includes(r.status)))throw new AdminError("Ya hay una publicación en curso. Espera a que termine.",409);
    const id=randomHex(12);
    await github(`/actions/workflows/${workflow}/dispatches`,env,{method:"POST",body:JSON.stringify({ref:"main",inputs:{request_id:id,source_sha:catalog.source.sha256,payload}})},"iniciar el workflow de publicación");
    return reply({requestId:id,status:"queued"},202);
  }
  const match=/^\/api\/admin\/status\/([a-f0-9]{24})$/.exec(path);
  if(request.method==="GET"&&match) {
    await getSession(request,env);const runs=await github(`/actions/workflows/${workflow}/runs?event=workflow_dispatch&per_page=30`,env),run=runs.workflow_runs?.find(r=>r.display_title===`admin:${match[1]}`);
    if(!run)return reply({status:"queued"});
    const status=run.status==="completed"?(run.conclusion==="success"?"committed":"failed"):"validating";
    return reply({status,runUrl:run.html_url,message:status==="failed"?"La validación o el commit fallaron. Revisa la ejecución y corrige el formulario.":undefined});
  }
  throw new AdminError("Ruta no encontrada.",404);
}
export default {
  async fetch(request,env) {
    const url=new URL(request.url);
    try {
      if(url.pathname==="/admin")return Response.redirect(new URL("/admin/",url),308);
      if(url.pathname.startsWith("/api/admin/"))return await api(request,env);
      const asset=await env.ASSETS.fetch(request);
      if(!url.pathname.startsWith("/admin"))return asset;
      const headers=new Headers(asset.headers);headers.set("cache-control","no-store");headers.set("x-robots-tag","noindex, nofollow");headers.set("x-content-type-options","nosniff");
      return new Response(asset.body,{status:asset.status,statusText:asset.statusText,headers});
    } catch(error) {
      return reply({error:error instanceof AdminError?error.message:"Error del servidor."},error instanceof AdminError?error.status:500);
    }
  }
};

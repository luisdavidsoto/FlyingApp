const V='v9',AC='aip-offline',CORE=['./','index.html','manifest.json','pdf.min.js','pdf.worker.min.js','manuales/c172.pdf','manuales/tecnam.pdf','icon-180.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(V).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V&&x!==AC).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);if(r.method!=='GET')return;
 if(u.origin!==location.origin){if(u.pathname.startsWith('/aip/file/'))e.respondWith(aipFile(r));return}
 const p=u.pathname,netFirst=r.mode==='navigate'||p.endsWith('index.html')||p.endsWith('/')||p.endsWith('/aip/index.json')||p.endsWith('/cartas/index.json');
 const put=x=>{if(x.ok&&x.status===200){const c=x.clone();caches.open(V).then(k=>k.put(r,c))}return x};
 e.respondWith(netFirst?fetch(r).then(put).catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||caches.match('index.html'))):caches.match(r,{ignoreSearch:!(p.includes('/aip/')||p.includes('/cartas/'))}).then(m=>m||fetch(r).then(put)))});

// AIP guardado sin conexión: se sirve desde la caché 'aip-offline' con soporte de rangos (carga por partes).
async function aipFile(r){
  const c=await caches.open(AC),m=await c.match(r.url);
  if(!m)return fetch(r);
  const rg=/bytes=(\d*)-(\d*)/.exec(r.headers.get('range')||'');
  if(!rg)return m;
  const b=await m.blob(),size=b.size;let s,e;
  if(rg[1]===''){s=Math.max(0,size-Number(rg[2]));e=size-1}else{s=Number(rg[1]);e=rg[2]===''?size-1:Math.min(Number(rg[2]),size-1)}
  if(!(s<=e)||s>=size)return new Response('',{status:416,headers:{'Content-Range':'bytes */'+size}});
  return new Response(b.slice(s,e+1),{status:206,statusText:'Partial Content',headers:{'Content-Type':'application/pdf','Content-Range':'bytes '+s+'-'+e+'/'+size,'Content-Length':String(e-s+1),'Accept-Ranges':'bytes'}});
}

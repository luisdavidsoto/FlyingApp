const V='v3',CORE=['./','index.html','manifest.json','pdf.min.js','pdf.worker.min.js','manuales/c172.pdf','manuales/tecnam.pdf','icon-180.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(V).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);if(r.method!=='GET'||u.origin!==location.origin)return;
 const p=u.pathname,netFirst=r.mode==='navigate'||p.endsWith('index.html')||p.endsWith('/')||p.endsWith('/aip/index.json');
 const put=x=>{if(x.ok&&x.status===200){const c=x.clone();caches.open(V).then(k=>k.put(r,c))}return x};
 e.respondWith(netFirst?fetch(r).then(put).catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||caches.match('index.html'))):caches.match(r,{ignoreSearch:!p.includes('/aip/')}).then(m=>m||fetch(r).then(put)))});

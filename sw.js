const CACHE='wb-review-v3-2';
const ASSETS=['./','./index.html','./manifest.webmanifest','./fix-v3.2.js'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener('activate',e=>{e.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))]))});
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.mode==='navigate'){
    e.respondWith((async()=>{
      try{
        const r=await fetch(req,{cache:'no-store'});
        const text=await r.text();
        const patched=text.includes('fix-v3.2.js')?text:text.replace('</body>','<script src="./fix-v3.2.js"></script></body>');
        return new Response(patched,{status:r.status,statusText:r.statusText,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
      }catch(err){
        const cached=await caches.match('./index.html');
        if(!cached) throw err;
        const text=await cached.text();
        const patched=text.includes('fix-v3.2.js')?text:text.replace('</body>','<script src="./fix-v3.2.js"></script></body>');
        return new Response(patched,{headers:{'Content-Type':'text/html; charset=utf-8'}});
      }
    })());
    return;
  }
  e.respondWith(caches.match(req).then(r=>r||fetch(req)));
});
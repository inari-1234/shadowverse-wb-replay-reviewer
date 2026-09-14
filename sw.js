const CACHE='wb-review-v3-3-20260914-03';
const ASSETS=['./','./index.html','./manifest.webmanifest'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener('activate',e=>{e.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))]))});
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.mode==='navigate'||new URL(req.url).pathname.endsWith('/index.html')){
    e.respondWith((async()=>{
      try{
        const r=await fetch(req,{cache:'no-store'});
        const cache=await caches.open(CACHE);
        cache.put(req,r.clone());
        return r;
      }catch(err){
        return (await caches.match(req))||(await caches.match('./index.html'));
      }
    })());
    return;
  }
  e.respondWith(caches.match(req).then(async cached=>{
    try{
      const fresh=await fetch(req,{cache:'no-store'});
      const cache=await caches.open(CACHE);cache.put(req,fresh.clone());
      return fresh;
    }catch(err){return cached}
  }));
});
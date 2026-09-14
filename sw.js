const CACHE='wb-review-v3-9-2-20260914-12';
const ASSETS=['./','./index.html','./manifest.webmanifest','./fix-v3.7.js','./fix-v3.7.1.js','./fix-v3.9.js','./fix-v3.9.1.js','./fix-v3.9.2.js'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener('activate',e=>{e.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))]))});
self.addEventListener('fetch',e=>{
  const req=e.request,url=new URL(req.url);
  if(url.origin!==location.origin){e.respondWith(fetch(req));return;}
  if(req.mode==='navigate'||url.pathname.endsWith('/index.html')){
    e.respondWith((async()=>{
      try{
        const r=await fetch(req,{cache:'no-store'}),text=await r.text();
        const clean=text
          .replace(/<script src="\.\/fix-v3\.5\.js[^>]*><\/script>/g,'')
          .replace(/<script src="\.\/fix-v3\.6\.js[^>]*><\/script>/g,'')
          .replace(/<script src="\.\/fix-v3\.7\.js[^>]*><\/script>/g,'')
          .replace(/<script src="\.\/fix-v3\.7\.1\.js[^>]*><\/script>/g,'')
          .replace(/<script src="\.\/fix-v3\.8\.js[^>]*><\/script>/g,'')
          .replace(/<script src="\.\/fix-v3\.9\.js[^>]*><\/script>/g,'')
          .replace(/<script src="\.\/fix-v3\.9\.1\.js[^>]*><\/script>/g,'')
          .replace(/<script src="\.\/fix-v3\.9\.2\.js[^>]*><\/script>/g,'');
        const patched=clean.replace('</body>','<script src="./fix-v3.7.js?v=3.7-20260914-07"></script><script src="./fix-v3.7.1.js?v=3.7.1-20260914-08"></script><script src="./fix-v3.9.js?v=3.9-20260914-10"></script><script src="./fix-v3.9.1.js?v=3.9.1-20260914-11"></script><script src="./fix-v3.9.2.js?v=3.9.2-20260914-12"></script></body>');
        return new Response(patched,{status:r.status,statusText:r.statusText,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
      }catch(err){
        const cached=await caches.match('./index.html');
        if(!cached) throw err;
        const text=await cached.text();
        const clean=text
          .replace(/<script src="\.\/fix-v3\.5\.js[^>]*><\/script>/g,'')
          .replace(/<script src="\.\/fix-v3\.6\.js[^>]*><\/script>/g,'')
          .replace(/<script src="\.\/fix-v3\.7\.js[^>]*><\/script>/g,'')
          .replace(/<script src="\.\/fix-v3\.7\.1\.js[^>]*><\/script>/g,'')
          .replace(/<script src="\.\/fix-v3\.8\.js[^>]*><\/script>/g,'')
          .replace(/<script src="\.\/fix-v3\.9\.js[^>]*><\/script>/g,'')
          .replace(/<script src="\.\/fix-v3\.9\.1\.js[^>]*><\/script>/g,'')
          .replace(/<script src="\.\/fix-v3\.9\.2\.js[^>]*><\/script>/g,'');
        const patched=clean.replace('</body>','<script src="./fix-v3.7.js?v=3.7-20260914-07"></script><script src="./fix-v3.7.1.js?v=3.7.1-20260914-08"></script><script src="./fix-v3.9.js?v=3.9-20260914-10"></script><script src="./fix-v3.9.1.js?v=3.9.1-20260914-11"></script><script src="./fix-v3.9.2.js?v=3.9.2-20260914-12"></script></body>');
        return new Response(patched,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
      }
    })());return;
  }
  e.respondWith((async()=>{try{const r=await fetch(req,{cache:'no-store'});const cache=await caches.open(CACHE);cache.put(req,r.clone());return r}catch(err){return caches.match(req)}})());
});
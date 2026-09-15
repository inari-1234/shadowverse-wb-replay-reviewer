const CACHE='wb-review-v4-9-4-20260915-14b';
const ASSETS=['./','./index.html','./manifest.webmanifest','./fix-v3.7.js','./fix-v3.7.1.js','./fix-v3.9.js','./fix-v3.9.1.js','./fix-v3.9.2.js','./fix-v4.0.js','./fix-v4.1.js','./fix-v4.2.js','./fix-v4.3.js','./fix-v4.3.1.js','./fix-v4.4.2.js','./fix-v4.4.3.js','./fix-v4.6.2.js','./fix-v4.6.3.js','./fix-v4.6.4.js','./fix-v4.6.5.js','./fix-v4.6.6.js','./fix-v4.6.7.js','./fix-v4.6.8.js','./fix-v4.6.9.js','./fix-v4.7.0.js','./fix-v4.7.1.js','./fix-v4.7.2.js','./fix-v4.8.0.js','./fix-v4.8.1.js','./fix-v4.9.0.js','./fix-v4.9.1.js','./fix-v4.9.2.js','./fix-v4.9.3.js','./fix-v4.9.4.js','./strategy/sea-pirate-royal-coaching-v1.json','./strategy/sea-pirate-royal-coaching-v2.json'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener('activate',e=>{e.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))]))});
function patchHtml(text){
  const clean=text
    .replace(/<script src="\.\/fix-v3\.5\.js[^>]*><\/script>/g,'')
    .replace(/<script src="\.\/fix-v3\.6\.js[^>]*><\/script>/g,'')
    .replace(/<script src="\.\/fix-v3\.7\.js[^>]*><\/script>/g,'')
    .replace(/<script src="\.\/fix-v3\.7\.1\.js[^>]*><\/script>/g,'')
    .replace(/<script src="\.\/fix-v3\.8\.js[^>]*><\/script>/g,'')
    .replace(/<script src="\.\/fix-v3\.9\.js[^>]*><\/script>/g,'')
    .replace(/<script src="\.\/fix-v3\.9\.1\.js[^>]*><\/script>/g,'')
    .replace(/<script src="\.\/fix-v3\.9\.2\.js[^>]*><\/script>/g,'')
    .replace(/<script src="\.\/fix-v4\.0\.js[^>]*><\/script>/g,'')
    .replace(/<script src="\.\/fix-v4\.1\.js[^>]*><\/script>/g,'')
    .replace(/<script src="\.\/fix-v4\.2\.js[^>]*><\/script>/g,'')
    .replace(/<script src="\.\/fix-v4\.3\.js[^>]*><\/script>/g,'')
    .replace(/<script src="\.\/fix-v4\.3\.1\.js[^>]*><\/script>/g,'')
    .replace(/<script src="\.\/fix-v4\.4\.js[^>]*><\/script>/g,'')
    .replace(/<script src="\.\/fix-v4\.4\.1\.js[^>]*><\/script>/g,'')
    .replace(/<script src="\.\/fix-v4\.4\.2\.js[^>]*><\/script>/g,'')
    .replace(/<script src="\.\/fix-v4\.4\.3\.js[^>]*><\/script>/g,'')
    .replace(/<script src="\.\/fix-v4\.5\.js[^>]*><\/script>/g,'')
    .replace(/<script src="\.\/fix-v4\.5\.1\.js[^>]*><\/script>/g,'')
    .replace(/<script src="\.\/fix-v4\.5\.2\.js[^>]*><\/script>/g,'')
    .replace(/<script src="\.\/fix-v4\.5\.3\.js[^>]*><\/script>/g,'')
    .replace(/<script src="\.\/fix-v4\.5\.4\.js[^>]*><\/script>/g,'')
    .replace(/<script src="\.\/fix-v4\.6\.js[^>]*><\/script>/g,'')
    .replace(/<script src="\.\/fix-v4\.6\.1\.js[^>]*><\/script>/g,'')
    .replace(/<script src="\.\/fix-v4\.6\.2\.js[^>]*><\/script>/g,'')
    .replace(/<script src="\.\/fix-v4\.6\.3\.js[^>]*><\/script>/g,'')
    .replace(/<script src="\.\/fix-v4\.6\.4\.js[^>]*><\/script>/g,'')
    .replace(/<script src="\.\/fix-v4\.6\.5\.js[^>]*><\/script>/g,'')
    .replace(/<script src="\.\/fix-v4\.6\.6\.js[^>]*><\/script>/g,'')
    .replace(/<script src="\.\/fix-v4\.6\.7\.js[^>]*><\/script>/g,'')
    .replace(/<script src="\.\/fix-v4\.6\.8\.js[^>]*><\/script>/g,'')
    .replace(/<script src="\.\/fix-v4\.6\.9\.js[^>]*><\/script>/g,'')
    .replace(/<script src="\.\/fix-v4\.7\.0\.js[^>]*><\/script>/g,'')
    .replace(/<script src="\.\/fix-v4\.7\.1\.js[^>]*><\/script>/g,'')
    .replace(/<script src="\.\/fix-v4\.7\.2\.js[^>]*><\/script>/g,'')
    .replace(/<script src="\.\/fix-v4\.8\.0\.js[^>]*><\/script>/g,'')
    .replace(/<script src="\.\/fix-v4\.8\.1\.js[^>]*><\/script>/g,'')
    .replace(/<script src="\.\/fix-v4\.9\.0\.js[^>]*><\/script>/g,'')
    .replace(/<script src="\.\/fix-v4\.9\.1\.js[^>]*><\/script>/g,'')
    .replace(/<script src="\.\/fix-v4\.9\.2\.js[^>]*><\/script>/g,'')
    .replace(/<script src="\.\/fix-v4\.9\.3\.js[^>]*><\/script>/g,'')
    .replace(/<script src="\.\/fix-v4\.9\.4\.js[^>]*><\/script>/g,'');
  return clean.replace('</body>','<script src="./fix-v3.7.js?v=3.7-20260914-07"></script><script src="./fix-v3.7.1.js?v=3.7.1-20260914-08"></script><script src="./fix-v3.9.js?v=3.9-20260914-10"></script><script src="./fix-v3.9.1.js?v=3.9.1-20260914-11"></script><script src="./fix-v3.9.2.js?v=3.9.2-20260914-12"></script><script src="./fix-v4.0.js?v=4.0-20260914-13"></script><script src="./fix-v4.1.js?v=4.1-20260914-14"></script><script src="./fix-v4.2.js?v=4.2-20260914-15"></script><script src="./fix-v4.3.js?v=4.7.0-bootstrap-20260915-05"></script><script src="./fix-v4.7.1.js?v=4.7.1-20260915-06"></script><script src="./fix-v4.7.2.js?v=4.7.2-20260915-07"></script><script src="./fix-v4.8.0.js?v=4.8.0-20260915-08b"></script><script src="./fix-v4.8.1.js?v=4.8.1-20260915-09"></script><script src="./fix-v4.9.0.js?v=4.9.0-20260915-10"></script><script src="./fix-v4.9.1.js?v=4.9.1-20260915-11"></script><script src="./fix-v4.9.2.js?v=4.9.2-20260915-12c"></script><script src="./fix-v4.9.3.js?v=4.9.3-20260915-13d"></script><script src="./fix-v4.9.4.js?v=4.9.4-20260915-14b"></script></body>');
}
self.addEventListener('fetch',e=>{
  const req=e.request,url=new URL(req.url);
  if(url.origin!==location.origin){e.respondWith(fetch(req));return;}
  if(req.mode==='navigate'||url.pathname.endsWith('/index.html')){
    e.respondWith((async()=>{try{const r=await fetch(req,{cache:'no-store'}),text=await r.text();return new Response(patchHtml(text),{status:r.status,statusText:r.statusText,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}})}catch(err){const cached=await caches.match('./index.html');if(!cached)throw err;return new Response(patchHtml(await cached.text()),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}})}})());return;
  }
  e.respondWith((async()=>{try{const r=await fetch(req,{cache:'no-store'});const cache=await caches.open(CACHE);cache.put(req,r.clone());return r}catch(err){return caches.match(req)}})());
});
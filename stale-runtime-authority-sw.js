self.addEventListener('install',event=>{self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(self.clients.claim())});
self.addEventListener('fetch',event=>{
  const req=event.request,url=new URL(req.url);
  const verifierFetch=url.origin===location.origin&&url.pathname.endsWith('.js')&&url.searchParams.has('_wb')&&req.destination==='';
  if(verifierFetch){
    event.respondWith(new Response('// intentionally stale verifier payload\n',{status:200,headers:{'content-type':'application/javascript','cache-control':'no-store','x-wb-test-stale':'1'}}));
    return;
  }
  event.respondWith(fetch(req,{cache:'no-store'}));
});

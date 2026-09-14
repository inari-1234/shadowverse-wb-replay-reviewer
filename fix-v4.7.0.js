(()=>{
  const PATCH='4.7.0-20260915-05';
  const $q=s=>document.querySelector(s);
  const safeLog=(type,data={})=>{try{log(type,{patch:PATCH,...data})}catch{}};
  function finalize(){
    const tracker=$q('#publicInfoPanel466');
    if(!tracker)return false;
    const h=tracker.querySelector('h2');if(h)h.textContent='公開情報トラッカー v2.1';
    const header=$q('header h1'),sub=$q('header p');if(header)header.textContent='シャドバWB リプレイ診断 v4.7.0';if(sub)sub.textContent='Build 2026.09.15-05 / 公開情報トラッカー v2.1 検証版';
    const old=$q('#wbForceLatest463');
    if(old&&old.dataset.wb470!=='1'){
      const b=old.cloneNode(true);b.dataset.wb470='1';old.replaceWith(b);const st=$q('#wbUpdateStatus463');if(st)st.textContent='v4.7.0 / トラッカーv2.1';
      b.addEventListener('click',async()=>{if(b.disabled)return;b.disabled=true;if(st)st.textContent='最新版を確認中…';try{if('serviceWorker'in navigator){const reg=await navigator.serviceWorker.register('./sw.js?v=4.7.0-20260915-05',{updateViaCache:'none'});await reg.update()}if('caches'in window){const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('wb-review-')&&k!=='wb-review-v4-7-0-20260915-05').map(k=>caches.delete(k)))}if(st)st.textContent='更新完了。v4.7.0で再起動します…';setTimeout(()=>{const u=new URL(location.href);u.searchParams.set('latest','470-'+Date.now());u.hash='';location.replace(u.href)},180)}catch(e){if(st)st.textContent='更新確認に失敗しました。';b.disabled=false;safeLog('force-latest-error-v470',{message:e?.message||String(e)})}})
    }
    safeLog('patch-v470-active',{feature:'tracker-v2.1-verification-release'});return true;
  }
  let n=0;const tm=setInterval(()=>{n++;if(finalize()||n>160)clearInterval(tm)},120);
})();
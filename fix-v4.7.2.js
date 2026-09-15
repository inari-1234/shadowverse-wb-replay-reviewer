(()=>{
  const PATCH='4.7.2-20260915-07';
  const $q=s=>document.querySelector(s);
  const safeLog=(type,data={})=>{try{log(type,{patch:PATCH,...data})}catch{}};

  function refreshTrackerCards(){
    const t=window.__wbPublicInfoV2,events=Array.isArray(t?.events)?t.events:[],list=$q('#piList466');
    if(!list||!events.length)return false;
    const byId=new Map(events.map(e=>[e.id,e]));
    const resolvedBy=new Map(events.filter(e=>e.status==='retrospective'&&e.resolvesEventId).map(e=>[e.resolvesEventId,e]));
    for(const e of events){
      const del=list.querySelector(`[data-del="${e.id}"]`),card=del?.closest('div[style*="border"]');
      if(!card)continue;
      const helps=Array.from(card.children).filter(x=>x.classList?.contains('help'));
      if(helps[0])helps[0].textContent=`判明 ${e.observedAtSeconds??'?'}s / 利用開始 ${e.knowledgeAvailableFromSeconds??e.observedAtSeconds??'?'}s`;
      if(e.status==='candidate'){
        const r=resolvedBy.get(e.id);
        if(r&&helps[1])helps[1].textContent=`↳ ${r.turn}T / ${r.observedAtSeconds}s で答え合わせ済み`;
      }else if(e.resolvesEventId&&helps[1]){
        const src=byId.get(e.resolvesEventId);
        helps[1].textContent=`↳ 元候補：${src?.text||e.resolvesEventId}`;
      }
    }
    return true;
  }

  document.addEventListener('click',e=>{
    if(!e.target?.closest?.('[data-retime471]'))return;
    setTimeout(()=>{refreshTrackerCards();safeLog('tracker-card-display-refreshed-v472')},30);
  },true);

  function replaceUpdater(){
    const old=$q('#wbForceLatest463')||$q('#wbForceLatest462');
    if(!old||old.dataset.wb472==='1')return false;
    const b=old.cloneNode(true);b.dataset.wb472='1';old.replaceWith(b);
    const st=$q('#wbUpdateStatus463')||$q('#wbUpdateStatus462');if(st)st.textContent='v4.7.2 / 時刻修正表示同期';
    b.addEventListener('click',async()=>{if(b.disabled)return;b.disabled=true;if(st)st.textContent='最新版を確認中…';try{if('serviceWorker'in navigator){const reg=await navigator.serviceWorker.register('./sw.js?v=4.7.2-20260915-07',{updateViaCache:'none'});await reg.update()}if('caches'in window){const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('wb-review-')&&k!=='wb-review-v4-7-2-20260915-07').map(k=>caches.delete(k)))}if(st)st.textContent='更新完了。v4.7.2で再起動します…';setTimeout(()=>{const u=new URL(location.href);u.searchParams.set('latest','472-'+Date.now());u.hash='';location.replace(u.href)},180)}catch(err){if(st)st.textContent='更新確認に失敗しました。';b.disabled=false;safeLog('force-latest-error-v472',{message:err?.message||String(err)})}});
    return true;
  }

  let n=0;const tm=setInterval(()=>{n++;refreshTrackerCards();replaceUpdater();const h=$q('header h1'),s=$q('header p');if(h)h.textContent='シャドバWB リプレイ診断 v4.7.2';if(s)s.textContent='Build 2026.09.15-07 / 記録時刻の表示同期修正';if(n>200)clearInterval(tm)},120);
  safeLog('patch-v472-active',{feature:'retime-display-sync'});
})();
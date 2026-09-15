(()=>{
  const PATCH='4.10.2-20260915-15d';
  const STORE='wb-counterfactual-v1';
  const $q=s=>document.querySelector(s);
  const clone=x=>{try{return structuredClone(x)}catch{return JSON.parse(JSON.stringify(x))}};
  const safeLog=(type,data={})=>{try{log(type,{patch:PATCH,...data})}catch{}};
  window.__wbV410Active=true;
  window.__wbUiFinalVersion='4.10.2';
  document.documentElement.dataset.wbLatestUi='4102';

  function sourceKey(){return window.__wbCounterfactualV1?.sourceKey||window.__wbLethalV2?.sourceKey||window.__wbPublicInfoV2?.sourceKey||null}
  function readDb(){try{return JSON.parse(localStorage.getItem(STORE)||'null')}catch{return null}}
  function getSession(db){const k=sourceKey();return k?db?.sessions?.[k]||null:null}
  function writeDb(db){try{localStorage.setItem(STORE,JSON.stringify(db));return true}catch{return false}}
  function syncWindow(s){
    if(!s)return;
    const cur=window.__wbCounterfactualV1||{};
    window.__wbCounterfactualV1={...cur,sourceKey:s.sourceKey,branches:clone(s.branches||[]),protocol:{...(cur.protocol||{}),cutoffRepair:{version:'v4.10.2',rule:'0秒の相手手番起点は、実戦の同ターン相手開始時刻の0.1秒前へ補正し、子枝は親のcutoffを継承する。'}}};
  }
  function opponentTurnTime(turn){
    const target=$q('#targetSide')?.value||'bottom',rows=Array.isArray(window.turnTimeline39)?window.turnTimeline39:[];
    const r=rows.find(x=>Number(x.turn)===Number(turn)&&x.side!==target);
    return r&&Number.isFinite(Number(r.time))?Number(r.time):null;
  }
  function safeCutoff(b,byId){
    const cur=Number(b?.knowledgeCutoffSeconds);if(cur>0)return cur;
    if(b?.state?.sideToAct==='相手'){
      const t=opponentTurnTime(b.state?.turn);if(Number.isFinite(t)&&t>.15)return +(t-.10).toFixed(2);
    }
    const p=byId?.get?.(b?.parentId),pc=Number(p?.knowledgeCutoffSeconds);return pc>0?pc:null;
  }
  function repairZeroCutoffs(){
    const db=readDb(),s=getSession(db);if(!s)return false;let changed=false;
    for(let pass=0;pass<4;pass++){
      const byId=new Map((s.branches||[]).map(b=>[b.id,b]));let passChanged=false;
      for(const b of s.branches||[]){if(Number(b.knowledgeCutoffSeconds)>0)continue;const c=safeCutoff(b,byId);if(c>0){b.knowledgeCutoffSeconds=c;b.updatedAt=new Date().toISOString();changed=passChanged=true}}
      if(!passChanged)break;
    }
    if(changed){s.updatedAt=new Date().toISOString();writeDb(db);syncWindow(s);safeLog('zero-cutoff-repaired-v4102',{branches:(s.branches||[]).length})}
    return changed;
  }

  function videoEl(){try{return typeof video!=='undefined'?video:$q('#video')}catch{return $q('#video')}}
  function waitPresentedFrame(target){
    const vid=videoEl();if(!vid)return Promise.resolve();
    if(typeof vid.requestVideoFrameCallback==='function'){
      return new Promise(resolve=>{
        let done=false,tries=0,timer=null;
        const finish=()=>{if(done)return;done=true;if(timer)clearTimeout(timer);resolve()};
        timer=setTimeout(finish,900);
        const cb=(_now,meta)=>{if(done)return;const mt=Number(meta?.mediaTime);if(!Number.isFinite(mt)||Math.abs(mt-Number(target))<.35||tries++>=4)finish();else{try{vid.requestVideoFrameCallback(cb)}catch{finish()}}};
        try{vid.requestVideoFrameCallback(cb)}catch{finish()}
      });
    }
    return new Promise(resolve=>setTimeout(()=>requestAnimationFrame(()=>requestAnimationFrame(resolve)),120));
  }
  function installRobustSeek(){
    if(window.__wbRobustSeek4102?.installed)return true;
    const base=typeof window.seek==='function'?window.seek.bind(window):null;if(!base)return false;
    const wrapped=async(t,reason='seek')=>{await base(t,reason);await waitPresentedFrame(t)};
    try{window.seek=wrapped}catch{return false}
    const installed=window.seek===wrapped;window.__wbRobustSeek4102={installed,policy:'seeked後に描画済みvideo frameを待つ'};safeLog('robust-seek-v4102',{installed});return installed;
  }
  function fingerprintBytes(a){let h=2166136261>>>0;for(let i=0;i<a.length;i++){h^=a[i];h=Math.imul(h,16777619)>>>0}return `${a.length}:${h.toString(16)}`}
  async function validateFullMatchZip(zip){
    const names=Object.keys(zip?.files||{}).filter(n=>/^full-match\/frames\/.*\.jpe?g$/i.test(n));
    if(names.length<8)return{checked:false,count:names.length,unique:null,passed:true,version:PATCH};
    const sigs=[];for(const n of names){const a=await zip.files[n].async('uint8array');sigs.push(fingerprintBytes(a))}
    const unique=new Set(sigs).size,minUnique=Math.min(6,Math.max(2,Math.ceil(names.length*.08))),passed=unique>=minUnique;
    const result={checked:true,count:names.length,unique,minUnique,passed,version:PATCH};
    const mf=zip.files?.['range-review.json'];if(mf){try{const m=JSON.parse(await mf.async('string'));m.captureValidation=result;zip.file('range-review.json',JSON.stringify(m,null,2))}catch{}}
    if(!passed){safeLog('full-match-stale-frame-blocked-v4102',result);throw new Error(`画像抽出が固定フレームになったためZIP作成を停止しました（異なる画像 ${unique}/${names.length}）。動画を再選択してもう一度実行してください。`)}
    safeLog('full-match-frame-validation-v4102',result);return result;
  }
  function patchZipGuard(Z){
    if(!Z?.prototype?.generateAsync)return false;if(Z.prototype.__wb4102FrameGuard)return true;const original=Z.prototype.generateAsync;
    Z.prototype.generateAsync=async function(...args){await validateFullMatchZip(this);return original.apply(this,args)};
    Object.defineProperty(Z.prototype,'__wb4102FrameGuard',{value:true});return true;
  }
  function armZipGuard(){if(patchZipGuard(window.JSZip))return true;let n=0;const tm=setInterval(()=>{n++;if(patchZipGuard(window.JSZip)||n>500)clearInterval(tm)},10);return true}

  function recoverMain(){
    const main=$q('main');if(!main)return false;
    main.style.display='block';main.style.visibility='visible';main.style.opacity='1';
    if(main.style.height==='0px')main.style.removeProperty('height');if(main.style.maxHeight==='0px')main.style.removeProperty('max-height');
    return main.querySelectorAll('.panel').length>0;
  }
  function resetScrollAfterUpdate(){
    if(!new URL(location.href).searchParams.has('latest'))return;
    try{history.scrollRestoration='manual'}catch{}
    const go=()=>{recoverMain();try{window.scrollTo(0,0)}catch{}};go();requestAnimationFrame(go);setTimeout(go,100);setTimeout(go,450);
  }
  function mountLatestBar(){
    const header=$q('header');if(!header)return false;
    for(const id of ['wbLatestBar462','wbLatestBar463'])$q('#'+id)?.remove();
    let bar=$q('#wbLatestBar4102');if(bar)return true;
    bar=document.createElement('div');bar.id='wbLatestBar4102';bar.style.cssText='display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:8px';
    bar.innerHTML='<button id="wbForceLatest4102" type="button" style="padding:7px 10px;background:#2563eb">最新版に更新</button><button id="wbRecoverView4102" type="button" style="padding:7px 10px">表示を復旧</button><span id="wbUpdateStatus4102" style="font-size:11px;color:#9ba8bf">v4.10.2 / Build 15d</span>';
    header.appendChild(bar);
    $q('#wbRecoverView4102')?.addEventListener('click',()=>{recoverMain();window.scrollTo(0,0)});
    $q('#wbForceLatest4102')?.addEventListener('click',async()=>{
      const b=$q('#wbForceLatest4102'),st=$q('#wbUpdateStatus4102');if(!b||b.disabled)return;b.disabled=true;if(st)st.textContent='最新版を確認中…';
      try{
        if('serviceWorker'in navigator){const reg=await navigator.serviceWorker.register('./sw.js?v=4.10.2-20260915-15d',{updateViaCache:'none'});await reg.update()}
        if('caches'in window){const ks=await caches.keys();await Promise.all(ks.filter(k=>k.startsWith('wb-review-')&&k!=='wb-review-v4-10-2-20260915-15d').map(k=>caches.delete(k)))}
        if(st)st.textContent='更新完了。v4.10.2で再起動します…';setTimeout(()=>{const u=new URL(location.href);u.searchParams.set('latest','4102-'+Date.now());u.hash='';location.replace(u.href)},180);
      }catch(err){if(st)st.textContent='更新確認に失敗しました。';b.disabled=false;safeLog('force-latest-error-v4102',{message:err?.message||String(err)})}
    });
    return true;
  }

  try{window.__wbHeaderObserver494?.disconnect?.()}catch{}
  try{window.__wbHeaderObserver4101?.disconnect?.()}catch{}
  installRobustSeek();armZipGuard();repairZeroCutoffs();recoverMain();mountLatestBar();resetScrollAfterUpdate();
  if(!document.documentElement.dataset.wb4102Events){
    document.documentElement.dataset.wb4102Events='1';
    document.addEventListener('click',e=>{
      if(e.target?.closest?.('#asRun410,#cfSave490,#cfNew490,[data-clone-cf],[data-edit-cf]'))repairZeroCutoffs();
      if(e.target?.closest?.('#exportFullMatch465')){installRobustSeek();armZipGuard()}
    },true);
    $q('#videoFile')?.addEventListener('change',()=>setTimeout(()=>{repairZeroCutoffs();installRobustSeek()},350));
  }
  [120,500,1500,3500].forEach(ms=>setTimeout(()=>{recoverMain();mountLatestBar();repairZeroCutoffs();patchZipGuard(window.JSZip)},ms));
  window.__wbExportSafety4102={version:PATCH,repairZeroCutoffs,validateFullMatchZip,fingerprintBytes,recoverMain};
  safeLog('patch-v4102-active',{feature:'legacy-ui-quarantine-main-recovery-stale-frame-guard'});
})();

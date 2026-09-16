(()=>{
  const PATCH='4.10.5-20260916-17';
  const $q=s=>document.querySelector(s);
  const safeLog=(type,data={})=>{try{log(type,{patch:PATCH,...data})}catch{}};
  let publicInfoHandler=null,lethalFillHandler=null;

  function targetSide(){
    const s=$q('#targetSide')?.value;
    return s==='top'||s==='bottom'?s:'bottom';
  }
  function timelineContext(){
    const v=typeof video!=='undefined'?video:$q('#video'),t=Number(v?.currentTime),rows=Array.isArray(window.turnTimeline39)?window.turnTimeline39:[];
    let row=null;
    if(Number.isFinite(t))for(const r of rows){if(Number(r.time)<=t&&(!row||Number(r.time)>Number(row.time)))row=r}
    const side=row?.side==='top'||row?.side==='bottom'?row.side:null,reviewed=targetSide();
    return{time:Number.isFinite(t)?+t.toFixed(3):null,row,turn:Number(row?.turn)||null,absoluteSide:side,reviewedSide:reviewed,relativeSide:side?(side===reviewed?'自分':'相手'):null};
  }

  function installPublicInfoFill(){
    const b=$q('#piFill466');if(!b)return false;
    if(!publicInfoHandler)publicInfoHandler=()=>{
      const c=timelineContext(),turnEl=$q('#piTurn466'),sideEl=$q('#piSide466'),st=$q('#piActionStatus467')||$q('#piActionStatus466');
      if(c.turn&&turnEl)turnEl.value=c.turn;
      if(c.relativeSide&&sideEl)sideEl.value=c.relativeSide;
      if(st){st.textContent=c.turn?`${c.turn}T / ${c.relativeSide||'手番不明'}（${c.absoluteSide||'?'}側）をターンタイムラインから入力しました。`:'現在位置は認識済みターンより前です。ターン・手番は変更していません。';st.style.color=c.turn?'#86efac':'#facc15'}
      safeLog('public-info-auto-fill-v4105',{turn:c.turn,absoluteSide:c.absoluteSide,targetSide:c.reviewedSide,relativeSide:c.relativeSide,time:c.time});
    };
    if(b.onclick!==publicInfoHandler)b.onclick=publicInfoHandler;
    b.dataset.wbState4105='1';b.textContent='現在のターン・手番を入れる';
    return true;
  }

  function installPpTracking(){
    const pp=$q('#lePp480');if(!pp)return false;
    if(pp.dataset.wbPpTracking4105!=='1'){
      pp.dataset.wbPpTracking4105='1';
      pp.dataset.wbPpSource=String(pp.value||'').trim()?'preexisting-manual':'unknown';
      pp.addEventListener('input',()=>{pp.dataset.wbPpSource=String(pp.value||'').trim()?'manual':'unknown'});
    }
    return true;
  }

  function installLethalFill(){
    const b=$q('#leFill480');if(!b)return false;
    installPpTracking();
    if(!lethalFillHandler)lethalFillHandler=()=>{
      const c=timelineContext(),turnEl=$q('#leTurn480'),pp=$q('#lePp480'),st=$q('#leStatus480');
      if(c.turn&&turnEl)turnEl.value=c.turn;
      const ppRaw=String(pp?.value||'').trim(),ppValue=ppRaw===''?null:Number(ppRaw),ppSource=pp?.dataset?.wbPpSource||'unknown';
      if(st){
        st.textContent=c.turn
          ?`${c.turn}Tをターンタイムラインから入力しました。PPはターン数から推定しません。${ppValue==null?'実映像から未認識のため空欄のままです。':'現在のPP入力値 '+ppValue+' を保持します。'}`
          :'現在位置のターンを確定できません。PPも自動推定しません。';
        st.style.color=c.turn?'#86efac':'#facc15';
      }
      $q('#leCalc480')?.click();
      safeLog('lethal-video-fill-v4105',{turn:c.turn,absoluteSide:c.absoluteSide,targetSide:c.reviewedSide,relativeSide:c.relativeSide,time:c.time,pp:ppValue,ppSource,ppAutoDerived:false});
    };
    if(b.onclick!==lethalFillHandler)b.onclick=lethalFillHandler;
    b.dataset.wbState4105='1';b.textContent='動画位置からターン入力';
    const panel=$q('#lethalPanel480');
    if(panel&&!$q('#leStateSourceNote4105')){
      const n=document.createElement('p');n.id='leStateSourceNote4105';n.className='help';
      n.textContent='状態取得方針：ターンは認識済みタイムラインから取得します。PPはターン数から作らず、実映像で認識できるまでは手動確認値または不明として扱います。';
      const st=$q('#leStatus480');st?.insertAdjacentElement('afterend',n);
    }
    return true;
  }

  function installLatestUi(){
    window.__wbUiFinalVersion='4.10.5';document.documentElement.dataset.wbLatestUi='4105';
    let style=$q('#wbUiFinal4105');if(!style){style=document.createElement('style');style.id='wbUiFinal4105';document.head.appendChild(style)}
    style.textContent="header h1::after{content:'シャドバWB リプレイ診断 v4.10.5' !important}header>p:first-of-type::after{content:'Build 2026.09.16-17 / 状態取得の誤推定防止' !important}";
    const st=$q('#wbUpdateStatus4104');if(st)st.textContent='v4.10.5 / 状態取得安全化';
    const old=$q('#wbForceLatest4104');
    if(old&&old.dataset.wb4105!=='1'){
      const b=old.cloneNode(true);b.dataset.wb4105='1';old.replaceWith(b);
      b.addEventListener('click',async()=>{
        const s=$q('#wbUpdateStatus4104');if(b.disabled)return;b.disabled=true;if(s)s.textContent='最新版を確認中…';
        try{
          if('serviceWorker'in navigator){const reg=await navigator.serviceWorker.register('./sw.js?v=4.10.5-20260916-17',{updateViaCache:'none'});await reg.update()}
          if('caches'in window){const ks=await caches.keys();await Promise.all(ks.filter(k=>k.startsWith('wb-review-')&&k!=='wb-review-v4-10-5-20260916-27').map(k=>caches.delete(k)))}
          if(s)s.textContent='更新完了。v4.10.5で再起動します…';
          setTimeout(()=>{const u=new URL(location.href);u.searchParams.set('latest','4105-'+Date.now());u.hash='';location.replace(u.href)},180);
        }catch(err){if(s)s.textContent='更新確認に失敗しました。';b.disabled=false;safeLog('force-latest-error-v4105',{message:err?.message||String(err)})}
      });
    }
  }

  function verify(){
    const pi=$q('#piFill466'),le=$q('#leFill480'),pp=$q('#lePp480');
    const state={publicInfoMounted:!!pi,publicInfoHandlerOk:!pi||pi.onclick===publicInfoHandler,lethalMounted:!!le,lethalHandlerOk:!le||le.onclick===lethalFillHandler,ppTracking:!pp||pp.dataset.wbPpTracking4105==='1',targetSide:targetSide(),checkedAt:new Date().toISOString()};
    state.ok=state.publicInfoHandlerOk&&state.lethalHandlerOk&&state.ppTracking;
    window.__wbStateSafety4105=state;safeLog('state-safety-invariant-v4105',state);return state.ok;
  }

  let tries=0;const tm=setInterval(()=>{tries++;installLatestUi();installPublicInfoFill();installLethalFill();if(tries%10===0)verify();if(tries>300)clearInterval(tm)},120);
  [50,300,900,2200,5000].forEach(ms=>setTimeout(()=>{installLatestUi();installPublicInfoFill();installLethalFill();verify()},ms));
  window.__wbStateAcquisition4105={timelineContext,verify,ppMode:'manual-or-unknown-no-turn-derivation'};
  safeLog('patch-v4105-active',{feature:'state-source-safety-side-mapping-no-fake-pp'});
})();

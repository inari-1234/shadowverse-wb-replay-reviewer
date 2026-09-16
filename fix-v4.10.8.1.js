(()=>{
  const PATCH='4.10.8.1-20260917-20b', $q=s=>document.querySelector(s);
  const safeLog=(type,data={})=>{try{log(type,{patch:PATCH,...data})}catch{}};
  const olderStyles=['wbUiFinal4104','wbUiFinal4105','wbUiFinal4106','wbUiFinal4107','wbUiFinal4108'];
  function claimButton(){
    const b=$q('#wbForceLatest4104');
    if(!b)return false;
    ['wb4104','wb4105','wb4106','wb4107','wb4108','wb41081'].forEach(k=>b.dataset[k]='1');
    return true;
  }
  function lockHeader(){
    for(const id of olderStyles){const s=$q('#'+id);if(s)s.disabled=true}
    let s=$q('#wbUiFinal41081');
    if(!s){s=document.createElement('style');s.id='wbUiFinal41081';document.head.appendChild(s)}
    s.disabled=false;
    s.textContent=`
      header h1{font-size:0!important}
      header h1::after{content:'シャドバWB リプレイ診断 v4.10.8';font-size:18px!important;font-weight:700}
      header>p:first-of-type{font-size:0!important}
      header>p:first-of-type::after{content:'Build 2026.09.17-20b / 更新基盤固定';font-size:12px!important;color:#9ba8bf}
      #wbLatestBar462,#wbLatestBar463,#wbLatestBar4102,#wbLatestBar4103{display:none!important}
    `;
    window.__wbUiFinalVersion='4.10.8';
    document.documentElement.dataset.wbLatestUi='4108';
  }
  function lockStatus(){
    const st=$q('#wbUpdateStatus4104');
    if(!st)return;
    const t=String(st.textContent||'');
    if(!/(準備中|更新中|確認中|再起動|復旧|失敗)/.test(t))st.textContent='v4.10.8 / Build 20b / 更新基盤固定';
  }
  function stabilize(){lockHeader();claimButton();lockStatus()}
  function verify(){
    const b=$q('#wbForceLatest4104'),own=$q('#wbUiFinal41081');
    const oldEnabled=olderStyles.filter(id=>{const s=$q('#'+id);return s&&!s.disabled});
    const state={patch:PATCH,uiVersion:window.__wbUiFinalVersion||null,latestUi:document.documentElement.dataset.wbLatestUi||null,button:!!b,buttonClaims:b?{wb4107:b.dataset.wb4107||null,wb4108:b.dataset.wb4108||null,wb41081:b.dataset.wb41081||null}:null,ownerStyle:!!own&&!own.disabled,oldEnabled,canonicalUpdater:document.documentElement.dataset.wbCanonicalUpdateGuard==='1',checkedAt:new Date().toISOString()};
    state.ok=state.uiVersion==='4.10.8'&&state.latestUi==='4108'&&state.ownerStyle&&state.oldEnabled.length===0&&(!b||(b.dataset.wb4107==='1'&&b.dataset.wb4108==='1'));
    window.__wbUiOwnerSafety41081=state;safeLog('ui-owner-invariant-v41081',state);return state.ok;
  }
  stabilize();
  let ticks=0;const tm=setInterval(()=>{ticks++;stabilize();if(ticks%10===0)verify();if(ticks>=120){clearInterval(tm);stabilize();verify()}},100);
  [50,250,800,1800,3500,6000,9000,10500,12100].forEach(ms=>setTimeout(()=>{stabilize();verify()},ms));
  window.__wbUiOwner41081={stabilize,verify};
  safeLog('patch-v41081-active',{feature:'single-ui-owner-and-old-updater-button-claim'});
})();

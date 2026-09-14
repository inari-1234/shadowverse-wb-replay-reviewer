(()=>{
  const PATCH='4.3-bootstrap-20260914-17b';
  const $q=s=>document.querySelector(s);

  // 旧Service Worker(v4.3)に捕まっていても、最新v4.3.1を直接読み込めるようにする互換ブートストラップ。
  // v4.3.1側が参照するマリガン表示パネルだけ先に確保する。
  const prepPanel=$q('#autoPrepPanel42');
  let mullPanel=$q('#mulliganPanel43');
  if(!mullPanel){
    mullPanel=document.createElement('section');
    mullPanel.id='mulliganPanel43';
    mullPanel.className='panel';
    mullPanel.innerHTML='<h2>3. マリガン自動抽出</h2><p id="mulliganStatus43" class="help">最新版を読み込み中…</p><div id="mulliganDetail43" class="ocrRead">v4.3.1 を準備しています。</div>';
    const anchor=prepPanel||$q('#scanTurns')?.closest('.panel');
    if(anchor) anchor.parentNode.insertBefore(mullPanel,anchor.nextSibling);
  }

  function loadLatest(){
    if(window.__wb431Loading)return;
    window.__wb431Loading=true;
    const s=document.createElement('script');
    s.src='./fix-v4.3.1.js?v=4.3.1-20260914-17b';
    s.dataset.wbLatest='431';
    s.onload=()=>{window.__wb431Loaded=true;try{log('patch-v431-bootstrap-loaded',{patch:PATCH})}catch{}};
    s.onerror=()=>{window.__wb431Loading=false;const st=$q('#mulliganStatus43');if(st)st.textContent='v4.3.1の読み込みに失敗しました。Safariを再読み込みしてください。';};
    document.head.appendChild(s);
  }

  loadLatest();
  try{log('patch-v43-bootstrap',{patch:PATCH})}catch{}
})();
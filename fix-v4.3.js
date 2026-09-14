(()=>{
  const PATCH='4.4-bootstrap-20260914-18';
  const $q=s=>document.querySelector(s);

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

  function load44(){
    if(window.__wb44Loading)return;
    window.__wb44Loading=true;
    const s=document.createElement('script');
    s.src='./fix-v4.4.js?v=4.4-20260914-18';
    s.dataset.wbLatest='44';
    s.onload=()=>{window.__wb44Loaded=true;try{log('patch-v44-bootstrap-loaded',{patch:PATCH})}catch{}};
    s.onerror=()=>{window.__wb44Loading=false;const st=$q('#mulliganStatus43');if(st)st.textContent='v4.4の読み込みに失敗しました。Safariを再読み込みしてください。';};
    document.head.appendChild(s);
  }

  function load431(){
    if(window.__wb431Loading){setTimeout(load44,250);return}
    window.__wb431Loading=true;
    const s=document.createElement('script');
    s.src='./fix-v4.3.1.js?v=4.3.1-20260914-17c';
    s.dataset.wbLatest='431';
    s.onload=()=>{window.__wb431Loaded=true;try{log('patch-v431-bootstrap-loaded',{patch:PATCH})}catch{};load44();};
    s.onerror=()=>{window.__wb431Loading=false;const st=$q('#mulliganStatus43');if(st)st.textContent='v4.3.1の読み込みに失敗しました。Safariを再読み込みしてください。';};
    document.head.appendChild(s);
  }

  load431();
  try{log('patch-v44-bootstrap',{patch:PATCH})}catch{}
})();
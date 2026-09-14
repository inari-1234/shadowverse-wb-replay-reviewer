(()=>{
  const PATCH='4.4.2-bootstrap-20260914-20';
  const $q=s=>document.querySelector(s);
  const prepPanel=$q('#autoPrepPanel42');
  let mullPanel=$q('#mulliganPanel43');
  if(!mullPanel){
    mullPanel=document.createElement('section');mullPanel.id='mulliganPanel43';mullPanel.className='panel';
    mullPanel.innerHTML='<h2>3. マリガン自動抽出</h2><p id="mulliganStatus43" class="help">最新版を読み込み中…</p><div id="mulliganDetail43" class="ocrRead">v4.4.2 を準備しています。</div>';
    const anchor=prepPanel||$q('#scanTurns')?.closest('.panel');if(anchor)anchor.parentNode.insertBefore(mullPanel,anchor.nextSibling);
  }
  function load442(){
    if(window.__wb442Loading||window.__wb442Loaded)return;
    window.__wb442Loading=true;
    const s=document.createElement('script');s.src='./fix-v4.4.2.js?v=4.4.2-20260914-20';s.dataset.wbLatest='442';
    s.onload=()=>{window.__wb442Loaded=true;try{log('patch-v442-bootstrap-loaded',{patch:PATCH})}catch{}};
    s.onerror=()=>{window.__wb442Loading=false;const st=$q('#mulliganStatus43');if(st)st.textContent='v4.4.2の読み込みに失敗しました。Safariを再読み込みしてください。';};document.head.appendChild(s);
  }
  function load431(){
    if(window.__wb431Loading){setTimeout(load442,250);return}
    window.__wb431Loading=true;const s=document.createElement('script');s.src='./fix-v4.3.1.js?v=4.3.1-20260914-17e';s.dataset.wbLatest='431';
    s.onload=()=>{window.__wb431Loaded=true;try{log('patch-v431-bootstrap-loaded',{patch:PATCH})}catch{};load442();};
    s.onerror=()=>{window.__wb431Loading=false;const st=$q('#mulliganStatus43');if(st)st.textContent='v4.3.1の読み込みに失敗しました。Safariを再読み込みしてください。';};document.head.appendChild(s);
  }
  load431();try{log('patch-v442-root-bootstrap',{patch:PATCH})}catch{}
})();
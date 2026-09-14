(()=>{
  const PATCH='4.4.3-bootstrap-20260914-21';
  const $q=s=>document.querySelector(s);
  const prepPanel=$q('#autoPrepPanel42');
  let mullPanel=$q('#mulliganPanel43');
  if(!mullPanel){
    mullPanel=document.createElement('section');mullPanel.id='mulliganPanel43';mullPanel.className='panel';
    mullPanel.innerHTML='<h2>3. マリガン自動抽出</h2><p id="mulliganStatus43" class="help">最新版を読み込み中…</p><div id="mulliganDetail43" class="ocrRead">v4.4.3 を準備しています。</div>';
    const anchor=prepPanel||$q('#scanTurns')?.closest('.panel');if(anchor)anchor.parentNode.insertBefore(mullPanel,anchor.nextSibling);
  }
  function load443(){
    if(window.__wb443Loading||window.__wb443Loaded)return;
    window.__wb443Loading=true;
    const a=document.createElement('script');a.src='./fix-v4.4.2.js?v=4.4.2-20260914-20b';a.dataset.wbLatest='442';
    a.onload=()=>{window.__wb442Loaded=true;const b=document.createElement('script');b.src='./fix-v4.4.3.js?v=4.4.3-20260914-21';b.dataset.wbLatest='443';b.onload=()=>{window.__wb443Loaded=true;try{log('patch-v443-bootstrap-loaded',{patch:PATCH})}catch{}};b.onerror=()=>{window.__wb443Loading=false;const st=$q('#mulliganStatus43');if(st)st.textContent='v4.4.3の読み込みに失敗しました。Safariを再読み込みしてください。';};document.head.appendChild(b)};
    a.onerror=()=>{window.__wb443Loading=false;const st=$q('#mulliganStatus43');if(st)st.textContent='v4.4.2の読み込みに失敗しました。Safariを再読み込みしてください。';};document.head.appendChild(a);
  }
  function load431(){
    if(window.__wb431Loading){setTimeout(load443,250);return}
    window.__wb431Loading=true;const s=document.createElement('script');s.src='./fix-v4.3.1.js?v=4.3.1-20260914-17f';s.dataset.wbLatest='431';
    s.onload=()=>{window.__wb431Loaded=true;try{log('patch-v431-bootstrap-loaded',{patch:PATCH})}catch{};load443();};
    s.onerror=()=>{window.__wb431Loading=false;const st=$q('#mulliganStatus43');if(st)st.textContent='v4.3.1の読み込みに失敗しました。Safariを再読み込みしてください。';};document.head.appendChild(s);
  }
  load431();try{log('patch-v443-root-bootstrap',{patch:PATCH})}catch{}
})();
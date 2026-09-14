(()=>{
  const PATCH='4.6.4-bootstrap-20260914-31';
  const $q=s=>document.querySelector(s);
  const prepPanel=$q('#autoPrepPanel42');
  let mullPanel=$q('#mulliganPanel43');
  if(!mullPanel){
    mullPanel=document.createElement('section');mullPanel.id='mulliganPanel43';mullPanel.className='panel';
    mullPanel.innerHTML='<h2>3. マリガン自動抽出</h2><p id="mulliganStatus43" class="help">最新版を読み込み中…</p><div id="mulliganDetail43" class="ocrRead">v4.6.4 を準備しています。</div>';
    const anchor=prepPanel||$q('#scanTurns')?.closest('.panel');if(anchor)anchor.parentNode.insertBefore(mullPanel,anchor.nextSibling);
  }
  function load464(){
    if(window.__wb464Loaded)return;
    if(window.__wb464Loading){setTimeout(load464,180);return}
    window.__wb464Loading=true;
    const s=document.createElement('script');s.src='./fix-v4.6.4.js?v=4.6.4-20260914-31';s.dataset.wbLatest='464';
    s.onload=()=>{window.__wb464Loaded=true;try{log('patch-v464-bootstrap-loaded',{patch:PATCH})}catch{}};
    s.onerror=()=>{window.__wb464Loading=false;const st=$q('#mulliganStatus43');if(st)st.textContent='v4.6.4の読み込みに失敗しました。最新版に更新してください。';};document.head.appendChild(s);
  }
  function load463(){
    if(window.__wb463Loaded){load464();return}
    if(window.__wb463Loading){setTimeout(load463,180);return}
    window.__wb463Loading=true;
    const s=document.createElement('script');s.src='./fix-v4.6.3.js?v=4.6.3-20260914-30';s.dataset.wbLatest='463';
    s.onload=()=>{window.__wb463Loaded=true;try{log('patch-v463-bootstrap-loaded',{patch:PATCH})}catch{};load464()};
    s.onerror=()=>{window.__wb463Loading=false;const st=$q('#mulliganStatus43');if(st)st.textContent='v4.6.3の読み込みに失敗しました。最新版に更新してください。';};document.head.appendChild(s);
  }
  function load462(){
    if(window.__wb462Loaded){load463();return}
    if(window.__wb462Loading){setTimeout(load462,180);return}
    window.__wb462Loading=true;
    const s=document.createElement('script');s.src='./fix-v4.6.2.js?v=4.6.2-20260914-29';s.dataset.wbLatest='462';
    s.onload=()=>{window.__wb462Loaded=true;try{log('patch-v462-bootstrap-loaded',{patch:PATCH})}catch{};load463()};
    s.onerror=()=>{window.__wb462Loading=false;const st=$q('#mulliganStatus43');if(st)st.textContent='v4.6.2の読み込みに失敗しました。最新版に更新してください。';};document.head.appendChild(s);
  }
  function load443(){
    if(window.__wb443Loading||window.__wb443Loaded){setTimeout(load462,180);return}
    window.__wb443Loading=true;
    const a=document.createElement('script');a.src='./fix-v4.4.2.js?v=4.4.2-20260914-20j';a.dataset.wbLatest='442';
    a.onload=()=>{window.__wb442Loaded=true;const b=document.createElement('script');b.src='./fix-v4.4.3.js?v=4.4.3-20260914-21i';b.dataset.wbLatest='443';b.onload=()=>{window.__wb443Loaded=true;try{log('patch-v443-bootstrap-loaded',{patch:PATCH})}catch{};load462()};b.onerror=()=>{window.__wb443Loading=false;const st=$q('#mulliganStatus43');if(st)st.textContent='v4.4.3の読み込みに失敗しました。';};document.head.appendChild(b)};
    a.onerror=()=>{window.__wb443Loading=false;const st=$q('#mulliganStatus43');if(st)st.textContent='v4.4.2の読み込みに失敗しました。';};document.head.appendChild(a);
  }
  function load431(){
    if(window.__wb431Loading){setTimeout(load443,250);return}
    window.__wb431Loading=true;const s=document.createElement('script');s.src='./fix-v4.3.1.js?v=4.3.1-20260914-17n';s.dataset.wbLatest='431';
    s.onload=()=>{window.__wb431Loaded=true;try{log('patch-v431-bootstrap-loaded',{patch:PATCH})}catch{};load443()};
    s.onerror=()=>{window.__wb431Loading=false;const st=$q('#mulliganStatus43');if(st)st.textContent='v4.3.1の読み込みに失敗しました。Safariを再読み込みしてください。';};document.head.appendChild(s);
  }
  load431();try{log('patch-v464-root-bootstrap',{patch:PATCH})}catch{}
})();
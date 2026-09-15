(()=>{
  const VERSION='4.10.4',BUILD='2026.09.15-16a';
  window.__wbUiFinalVersion=VERSION;
  window.__wbLegacyUiFrozen=true;
  document.documentElement.dataset.wbLatestUi='4104';

  // v4.10.2の全seekラップを防ぎ、v4.10.3のfull-match限定待ちだけを使う。
  window.__wbRobustSeek4102={installed:true,scopedBy:'v4.10.3-performance-fix'};

  const legacyIds=['wbLatestBar462','wbLatestBar463','wbLatestBar4102','wbLatestBar4103'];
  const style=document.createElement('style');
  style.id='wbUiPre4104';
  style.textContent=`
    #wbLatestBar462,#wbLatestBar463,#wbLatestBar4102,#wbLatestBar4103{display:none!important}
  `;
  document.head.appendChild(style);

  function removeLegacyUpdateUi(){
    for(const id of legacyIds) document.getElementById(id)?.remove();
  }
  removeLegacyUpdateUi();

  try{window.__wbHeaderObserver494?.disconnect?.()}catch{}
  try{window.__wbHeaderObserver4101?.disconnect?.()}catch{}
  try{window.__wbLegacyUpdateUiObserver4102?.disconnect?.()}catch{}

  if(window.MutationObserver){
    const h=document.querySelector('header');
    if(h){
      const mo=new MutationObserver(()=>removeLegacyUpdateUi());
      mo.observe(h,{childList:true,subtree:true});
      window.__wbLegacyUpdateUiObserver4104=mo;
    }
  }

  try{history.scrollRestoration='manual'}catch{}
  if(new URL(location.href).searchParams.has('latest')){
    const reset=()=>{try{window.scrollTo(0,0)}catch{}};
    reset();requestAnimationFrame(reset);setTimeout(reset,120);setTimeout(reset,600);
  }
})();
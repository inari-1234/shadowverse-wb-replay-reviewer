(()=>{
  const VERSION='4.10.2',BUILD='2026.09.15-15e';
  window.__wbUiFinalVersion=VERSION;
  window.__wbLegacyUiFrozen=true;
  document.documentElement.dataset.wbLatestUi='4102';

  const style=document.createElement('style');
  style.id='wbUiQuarantine4102';
  style.textContent=`
    header h1{font-size:0!important}
    header h1::after{content:'シャドバWB リプレイ診断 v4.10.2';font-size:18px!important;font-weight:700}
    header>p:first-of-type{font-size:0!important}
    header>p:first-of-type::after{content:'Build 2026.09.15-15e / UI競合・本文描画・画像抽出を安定化';font-size:12px!important;color:#9ba8bf}
  `;
  document.head.appendChild(style);

  function nativeTextDescriptor(){
    let p=Node.prototype;
    while(p){const d=Object.getOwnPropertyDescriptor(p,'textContent');if(d?.get&&d?.set)return d;p=Object.getPrototypeOf(p)}
    return null;
  }
  const textDesc=nativeTextDescriptor();
  function freezeText(el,target){
    if(!el)return false;
    try{if(textDesc)textDesc.set.call(el,target);else el.textContent=target}catch{}
    if(!textDesc)return true;
    try{
      Object.defineProperty(el,'textContent',{configurable:true,enumerable:true,get(){return textDesc.get.call(this)},set(v){if(String(v)===target)textDesc.set.call(this,target)}});
      return true;
    }catch{return false}
  }
  freezeText(document.querySelector('header h1'),'シャドバWB リプレイ診断 v4.10.2');
  freezeText(document.querySelector('header p'),`Build ${BUILD} / UI競合・本文描画・画像抽出を安定化`);

  function removeLegacyUpdateUi(){
    for(const id of ['wbLatestBar462','wbLatestBar463'])document.getElementById(id)?.remove();
  }
  removeLegacyUpdateUi();
  if(window.MutationObserver){
    const h=document.querySelector('header');
    if(h){
      const mo=new MutationObserver(()=>removeLegacyUpdateUi());
      mo.observe(h,{childList:true,subtree:true});
      window.__wbLegacyUpdateUiObserver4102=mo;
    }
  }

  try{window.__wbHeaderObserver494?.disconnect?.()}catch{}
  try{window.__wbHeaderObserver4101?.disconnect?.()}catch{}
  try{history.scrollRestoration='manual'}catch{}
  if(new URL(location.href).searchParams.has('latest')){
    const reset=()=>{try{window.scrollTo(0,0)}catch{}};
    reset();requestAnimationFrame(reset);setTimeout(reset,120);setTimeout(reset,600);
  }
})();

(()=>{
  const PATCH='4.6.9-20260915-04';
  const $q=s=>document.querySelector(s);
  const safeLog=(type,data={})=>{try{log(type,{patch:PATCH,...data})}catch{}};

  function installTxtFilter(){
    const Z=window.JSZip;
    if(!Z?.prototype?.generateAsync)return false;
    if(Z.prototype.__wbNoTxt469)return true;
    const original=Z.prototype.generateAsync;
    Z.prototype.generateAsync=async function(...args){
      try{
        const names=Object.keys(this.files||{});
        const removed=[];
        for(const name of names){
          if(/\.txt$/i.test(name)){
            this.remove(name);
            removed.push(name);
          }
        }
        if(removed.length)safeLog('zip-txt-removed-v469',{removed});
      }catch(e){safeLog('zip-txt-filter-error-v469',{message:e?.message||String(e)})}
      return original.apply(this,args);
    };
    Object.defineProperty(Z.prototype,'__wbNoTxt469',{value:true});
    safeLog('zip-txt-filter-installed-v469');
    return true;
  }

  function hardDisableLegacyExport(){
    const btn=$q('#exportJson');
    const panel=btn?.closest?.('.panel');
    if(panel)panel.style.display='none';
    if(btn)btn.disabled=true;
    return !!btn;
  }

  document.addEventListener('click',e=>{
    const t=e.target?.closest?.('#exportJson');
    if(!t)return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation?.();
    const modern=$q('#fullMatchPanel465')||$q('#rangeReviewPanel462');
    modern?.scrollIntoView?.({behavior:'smooth',block:'start'});
    safeLog('legacy-export-blocked-v469');
  },true);

  function labelDiagnostic(){
    const btn=$q('#exportDiag');
    if(!btn)return false;
    const panel=btn.closest('.panel');
    if(panel&&!$q('#diagNote469')){
      const p=document.createElement('p');
      p.id='diagNote469';p.className='help';
      p.textContent='診断レポートは不具合確認用のJSONを1ファイルだけ出力します。ZIPやREADME.txtは生成しません。';
      btn.closest('.buttons')?.insertAdjacentElement('afterend',p);
    }
    return true;
  }

  let n=0;const tm=setInterval(()=>{
    n++;installTxtFilter();hardDisableLegacyExport();labelDiagnostic();
    if(n>200)clearInterval(tm);
  },100);

  const header=$q('header h1'),sub=$q('header p');
  if(header)header.textContent='シャドバWB リプレイ診断 v4.6.9';
  if(sub)sub.textContent='Build 2026.09.15-04 / ZIP内の不要TXTを完全除去';
  safeLog('patch-v469-active',{feature:'global-remove-txt-from-all-zip-exports'});
})();
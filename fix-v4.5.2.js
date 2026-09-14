(()=>{
  const PATCH='4.5.2-20260914-24';
  const $q=s=>document.querySelector(s);
  const header=$q('header h1'),sub=$q('header p');
  if(header)header.textContent='シャドバWB リプレイ診断 v4.5.2';
  if(sub)sub.textContent='Build 2026.09.14-24 / iPhone保存・共有フロー修正';

  const status=$q('#rangeStatus45');
  const detail=$q('#rangeDetail45');
  const rangePanel=$q('#rangeReviewPanel45');
  if(!rangePanel)return;

  let saveWrap=$q('#rangeSaveWrap452');
  if(!saveWrap){
    saveWrap=document.createElement('div');
    saveWrap.id='rangeSaveWrap452';
    saveWrap.style.cssText='display:none;margin-top:12px;padding:12px;border:1px solid rgba(255,255,255,.15);border-radius:10px';
    saveWrap.innerHTML=`<div id="rangeSaveInfo452" class="help" style="margin-bottom:8px"></div><div class="buttons"><button id="rangeShare452" class="good">ZIPを保存・共有</button><button id="rangeDiscard452">破棄</button></div><div class="muted" style="margin-top:6px">iPhoneでは「ZIPを保存・共有」→「ファイルに保存」を選べます。ChatGPTが共有先に表示される場合は、そのまま送ることもできます。</div>`;
    const detailNode=$q('#rangeDetail45');
    if(detailNode)detailNode.parentNode.insertBefore(saveWrap,detailNode.nextSibling);else rangePanel.appendChild(saveWrap);
  }
  const saveInfo=$q('#rangeSaveInfo452'),shareBtn=$q('#rangeShare452'),discardBtn=$q('#rangeDiscard452');
  let pendingFile=null;

  function humanSize(n){if(!Number.isFinite(n))return '';if(n<1024*1024)return `${(n/1024).toFixed(0)} KB`;return `${(n/1024/1024).toFixed(1)} MB`}
  function showPending(file){
    pendingFile=file;
    saveWrap.style.display='block';
    if(saveInfo)saveInfo.textContent=`ZIP準備完了：${file.name}（${humanSize(file.size)}）`;
    if(status)status.textContent='ZIPの作成は完了しました。「ZIPを保存・共有」をタップしてください。';
    try{log('range-zip-ready-v452',{patch:PATCH,name:file.name,size:file.size})}catch{}
  }
  async function sharePending(){
    if(!pendingFile)return;
    const file=pendingFile;
    try{
      if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){
        await navigator.share({files:[file],title:'Shadowverse WB 診断ZIP'});
        if(status)status.textContent='保存・共有画面を開きました。必要な保存先を選んでください。';
        try{log('range-zip-share-v452',{patch:PATCH,name:file.name,size:file.size,method:'web-share'})}catch{}
        return;
      }
      const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;document.body.appendChild(a);nativeClick.call(a);a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
      if(status)status.textContent='ダウンロードを開始しました。';
      try{log('range-zip-share-v452',{patch:PATCH,name:file.name,size:file.size,method:'download-fallback'})}catch{}
    }catch(err){
      if(err?.name==='AbortError'){if(status)status.textContent='保存・共有をキャンセルしました。ZIPはこの画面に残っています。';return}
      console.error(err);if(status)status.textContent='保存・共有を開けませんでした：'+(err?.message||String(err));
      try{log('range-zip-share-error-v452',{patch:PATCH,message:err?.message||String(err)})}catch{}
    }
  }
  function clearPending(){pendingFile=null;saveWrap.style.display='none';if(saveInfo)saveInfo.textContent='';if(status)status.textContent='ZIPを破棄しました。必要ならもう一度作成してください。'}
  shareBtn?.addEventListener('click',sharePending);
  discardBtn?.addEventListener('click',clearPending);

  // v4.5.1 は非同期処理の最後に <a download>.click() を呼ぶため、
  // iOS Safari が user gesture を失い Quick Look へ遷移することがある。
  // 対象ZIPだけ横取りして Blob を File として保持し、次の明示タップで Web Share を開く。
  const nativeClick=HTMLAnchorElement.prototype.click;
  if(!window.__wb452AnchorPatched){
    window.__wb452AnchorPatched=true;
    HTMLAnchorElement.prototype.click=function(){
      const name=String(this.download||'');
      const href=String(this.href||'');
      if(name.includes('-review-v4.5.1.zip')&&href.startsWith('blob:')){
        const url=href;
        fetch(url).then(r=>r.blob()).then(blob=>{
          const file=new File([blob],name,{type:'application/zip',lastModified:Date.now()});
          showPending(file);
        }).catch(err=>{
          console.error(err);if(status)status.textContent='ZIPは作成されましたが、保存準備に失敗しました：'+(err?.message||String(err));
        });
        return;
      }
      return nativeClick.apply(this,arguments);
    };
  }

  $q('#exportRange45')?.addEventListener('click',()=>{pendingFile=null;saveWrap.style.display='none';});
  try{log('patch-v452-active',{patch:PATCH,mode:'intercept-async-download-then-user-share'})}catch{}
})();
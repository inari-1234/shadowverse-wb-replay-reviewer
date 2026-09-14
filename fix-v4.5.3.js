(()=>{
  const PATCH='4.5.3-20260914-25';
  const $q=s=>document.querySelector(s);
  const header=$q('header h1'),sub=$q('header p');
  if(header)header.textContent='シャドバWB リプレイ診断 v4.5.3';
  if(sub)sub.textContent='Build 2026.09.14-25 / ZIPダウンロード修正';

  const rangePanel=$q('#rangeReviewPanel45');
  const status=$q('#rangeStatus45');
  if(!rangePanel)return;

  const old452=$q('#rangeSaveWrap452');
  if(old452)old452.style.display='none';

  let wrap=$q('#rangeDownloadWrap453');
  if(!wrap){
    wrap=document.createElement('div');
    wrap.id='rangeDownloadWrap453';
    wrap.style.cssText='display:none;margin-top:12px;padding:12px;border:1px solid rgba(255,255,255,.15);border-radius:10px';
    wrap.innerHTML=`
      <div id="rangeDownloadInfo453" class="help" style="margin-bottom:8px"></div>
      <div class="buttons">
        <a id="rangeDownload453" class="good" href="#" download style="display:inline-flex;align-items:center;justify-content:center;text-decoration:none">ZIPをダウンロード</a>
        <button id="rangeShare453">共有シートを開く</button>
        <button id="rangeDiscard453">破棄</button>
      </div>
      <div class="muted" style="margin-top:6px">ZIP作成後はこの画面に留まります。まず「ZIPをダウンロード」をタップしてください。iPhoneの共有先は端末側で決まります。</div>`;
    const detail=$q('#rangeDetail45');
    if(detail)detail.parentNode.insertBefore(wrap,detail.nextSibling);else rangePanel.appendChild(wrap);
  }

  const info=$q('#rangeDownloadInfo453'),downloadLink=$q('#rangeDownload453'),shareBtn=$q('#rangeShare453'),discardBtn=$q('#rangeDiscard453');
  let pendingFile=null,pendingUrl=null;
  function humanSize(n){if(!Number.isFinite(n))return '';return n<1024*1024?`${(n/1024).toFixed(0)} KB`:`${(n/1024/1024).toFixed(1)} MB`}
  function revoke(){if(pendingUrl){try{URL.revokeObjectURL(pendingUrl)}catch{}pendingUrl=null}}
  function clearPending(message='ZIPを破棄しました。必要ならもう一度作成してください。'){
    revoke();pendingFile=null;wrap.style.display='none';if(downloadLink){downloadLink.removeAttribute('href');downloadLink.removeAttribute('download')}if(info)info.textContent='';if(status&&message)status.textContent=message;
  }
  function showFile(file){
    revoke();pendingFile=file;pendingUrl=URL.createObjectURL(file);
    downloadLink.href=pendingUrl;downloadLink.download=file.name;
    wrap.style.display='block';
    if(info)info.textContent=`ZIP準備完了：${file.name}（${humanSize(file.size)}）`;
    if(status)status.textContent='ZIP作成完了。「ZIPをダウンロード」をタップしてください。';
    try{log('range-zip-ready-v453',{patch:PATCH,name:file.name,size:file.size})}catch{}
  }

  downloadLink?.addEventListener('click',()=>{
    if(!pendingFile){event?.preventDefault?.();return}
    if(status)status.textContent='ZIPのダウンロードを開始しました。Safariのダウンロード一覧を確認してください。';
    try{log('range-zip-download-v453',{patch:PATCH,name:pendingFile.name,size:pendingFile.size,method:'visible-anchor-user-tap'})}catch{}
  });
  shareBtn?.addEventListener('click',async()=>{
    if(!pendingFile)return;
    try{
      if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[pendingFile]}))){
        await navigator.share({files:[pendingFile],title:'Shadowverse WB 診断ZIP'});
        if(status)status.textContent='共有シートを開きました。';
        try{log('range-zip-share-v453',{patch:PATCH,name:pendingFile.name,size:pendingFile.size})}catch{}
      }else if(status)status.textContent='この環境ではファイル共有を開けません。「ZIPをダウンロード」を使ってください。';
    }catch(err){if(err?.name==='AbortError'){if(status)status.textContent='共有をキャンセルしました。ZIPはこの画面に残っています。';return}if(status)status.textContent='共有に失敗しました。「ZIPをダウンロード」を使ってください。';}
  });
  discardBtn?.addEventListener('click',()=>clearPending());

  // v4.5.1 の非同期 export が最後に programmatic click した時だけ横取りする。
  // 生成された Blob を保持し、実際の保存はユーザーが見える <a download> を直接タップして行う。
  const previousClick=HTMLAnchorElement.prototype.click;
  if(!window.__wb453AnchorPatched){
    window.__wb453AnchorPatched=true;
    HTMLAnchorElement.prototype.click=function(){
      const name=String(this.download||'');
      const href=String(this.href||'');
      if(name.includes('-review-v4.5.1.zip')&&href.startsWith('blob:')){
        fetch(href).then(r=>r.blob()).then(blob=>{
          const file=new File([blob],name,{type:'application/zip',lastModified:Date.now()});
          showFile(file);
        }).catch(err=>{console.error(err);if(status)status.textContent='ZIPは作成されましたが、ダウンロード準備に失敗しました：'+(err?.message||String(err));});
        return;
      }
      return previousClick.apply(this,arguments);
    };
  }

  $q('#exportRange45')?.addEventListener('click',()=>clearPending('ZIPを作成しています…'));
  window.addEventListener('pagehide',revoke,{once:false});
  try{log('patch-v453-active',{patch:PATCH,mode:'visible-download-anchor-after-generation'})}catch{}
})();
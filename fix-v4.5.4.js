(()=>{
  const PATCH='4.5.4-20260914-26';
  const $q=s=>document.querySelector(s);
  const header=$q('header h1'),sub=$q('header p');
  if(header)header.textContent='シャドバWB リプレイ診断 v4.5.4';
  if(sub)sub.textContent='Build 2026.09.14-26 / ZIP保存安定化 + 表示競合修正';

  const panel=$q('#rangeReviewPanel45');
  const hiddenStatus=$q('#rangeStatus45');
  const exportBtn=$q('#exportRange45');
  if(!panel||!hiddenStatus||!exportBtn)return;

  // v4.5 と v4.5.1 が同じ status 要素を書き換えるため、表示専用statusを分離する。
  hiddenStatus.style.display='none';
  let visibleStatus=$q('#rangeStatus454');
  if(!visibleStatus){
    visibleStatus=document.createElement('p');
    visibleStatus.id='rangeStatus454';visibleStatus.className='help';
    hiddenStatus.parentNode.insertBefore(visibleStatus,hiddenStatus.nextSibling);
  }

  // 旧保存UIは使用しない。
  for(const id of ['#rangeSaveWrap452','#rangeDownloadWrap453']){const x=$q(id);if(x)x.style.display='none'}

  let wrap=$q('#rangeDownloadWrap454');
  if(!wrap){
    wrap=document.createElement('div');wrap.id='rangeDownloadWrap454';
    wrap.style.cssText='display:none;margin-top:12px;padding:12px;border:1px solid rgba(255,255,255,.15);border-radius:10px';
    wrap.innerHTML=`
      <div id="rangeDownloadInfo454" class="help" style="margin-bottom:8px"></div>
      <div class="buttons">
        <a id="rangeDownload454" class="good" href="#" style="display:inline-flex;align-items:center;justify-content:center;text-decoration:none">ZIPをダウンロード</a>
        <button id="rangeShare454">共有シート</button>
        <button id="rangeDiscard454">破棄</button>
      </div>
      <div class="muted" style="margin-top:6px">「ZIPをダウンロード」はSafariの通常ダウンロードとして保存するための専用リンクです。プレビュー表示ではなくDownloadsへの保存を優先します。</div>`;
    const detail=$q('#rangeDetail45');
    if(detail)detail.parentNode.insertBefore(wrap,detail.nextSibling);else panel.appendChild(wrap);
  }
  const info=$q('#rangeDownloadInfo454'),downloadLink=$q('#rangeDownload454'),shareBtn=$q('#rangeShare454'),discardBtn=$q('#rangeDiscard454');

  const DOWNLOAD_CACHE='wb-generated-downloads-v454';
  let pendingFile=null,pendingRoute=null,busy=false;
  function humanSize(n){return !Number.isFinite(n)?'':n<1048576?`${Math.round(n/1024)} KB`:`${(n/1048576).toFixed(1)} MB`}
  function readyText(){
    const a=Number($q('#rangeStart45')?.value),b=Number($q('#rangeEnd45')?.value);
    if(!exportBtn.disabled&&Number.isInteger(a)&&Number.isInteger(b))return `${a}T〜${b}Tを軽量ZIPで診断できます。`;
    const raw=hiddenStatus.textContent||'';
    if(/先に動画|未認識|範囲|開始ターン|までにしてください/.test(raw))return raw;
    return 'ターン解析後、開始・終了ターンを選んでください。';
  }
  function setVisible(text){if(visibleStatus)visibleStatus.textContent=text}
  setVisible(readyText());

  const progressPattern=/^(重要場面|重要画像|ZIPを仕上げ|区間ZIP作成失敗|完了：|ZIPの作成|ZIP作成完了|ダウンロード|共有|保存)/;
  new MutationObserver(()=>{
    const t=(hiddenStatus.textContent||'').trim();
    if(progressPattern.test(t)){setVisible(t);if(/^完了：|区間ZIP作成失敗/.test(t))busy=false;}
    else if(!busy)setVisible(readyText());
  }).observe(hiddenStatus,{childList:true,subtree:true,characterData:true});

  async function clearRoute(){
    if(pendingRoute){try{const c=await caches.open(DOWNLOAD_CACHE);await c.delete(pendingRoute)}catch{}pendingRoute=null}
  }
  async function clearPending(msg='ZIPを破棄しました。必要ならもう一度作成してください。'){
    await clearRoute();pendingFile=null;wrap.style.display='none';downloadLink.removeAttribute('href');if(info)info.textContent='';if(msg)setVisible(msg);
  }
  function safeAsciiName(name){return String(name||'shadowverse-review.zip').replace(/[^A-Za-z0-9._-]/g,'_').slice(0,160)||'shadowverse-review.zip'}

  async function prepareDownload(file){
    await clearRoute();pendingFile=file;
    const id=`${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
    const route=new URL(`./__wb_download__/${id}.zip`,location.href).href;
    const ascii=safeAsciiName(file.name);
    const headers=new Headers({
      'Content-Type':'application/octet-stream',
      'Content-Disposition':`attachment; filename="${ascii}"`,
      'Cache-Control':'no-store, max-age=0',
      'X-WB-Filename':encodeURIComponent(file.name)
    });
    const cache=await caches.open(DOWNLOAD_CACHE);
    await cache.put(route,new Response(file,{status:200,headers}));
    pendingRoute=route;
    downloadLink.href=route;
    downloadLink.removeAttribute('download');
    wrap.style.display='block';
    if(info)info.textContent=`ZIP準備完了：${file.name}（${humanSize(file.size)}）`;
    setVisible('ZIP作成完了。「ZIPをダウンロード」をタップしてください。');
    try{log('range-zip-ready-v454',{patch:PATCH,name:file.name,size:file.size,route})}catch{}
  }

  downloadLink?.addEventListener('click',e=>{
    if(!pendingFile||!pendingRoute){e.preventDefault();return}
    setVisible('Safariのダウンロードを開始します。完了後はダウンロード一覧／ファイルを確認してください。');
    try{log('range-zip-download-v454',{patch:PATCH,name:pendingFile.name,size:pendingFile.size,method:'service-worker-attachment-route'})}catch{}
  });
  shareBtn?.addEventListener('click',async()=>{
    if(!pendingFile)return;
    try{
      if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[pendingFile]}))){
        await navigator.share({files:[pendingFile],title:'Shadowverse WB 診断ZIP'});setVisible('共有シートを開きました。');
      }else setVisible('この環境ではファイル共有を開けません。「ZIPをダウンロード」を使ってください。');
    }catch(err){if(err?.name==='AbortError'){setVisible('共有をキャンセルしました。ZIPは残っています。');return}setVisible('共有に失敗しました。「ZIPをダウンロード」を使ってください。');}
  });
  discardBtn?.addEventListener('click',()=>clearPending());

  // v4.5.1 が生成完了時に行う programmatic <a>.click() のみ横取りし、
  // Blobを同一オリジンのSWダウンロード経路へ保存する。
  const previousClick=HTMLAnchorElement.prototype.click;
  if(!window.__wb454AnchorPatched){
    window.__wb454AnchorPatched=true;
    HTMLAnchorElement.prototype.click=function(){
      const name=String(this.download||''),href=String(this.href||'');
      if(name.includes('-review-v4.5.1.zip')&&href.startsWith('blob:')){
        fetch(href).then(r=>r.blob()).then(blob=>prepareDownload(new File([blob],name,{type:'application/zip',lastModified:Date.now()}))).catch(err=>{
          console.error(err);setVisible('ZIPは生成されましたが、保存準備に失敗しました：'+(err?.message||String(err)));
        });
        return;
      }
      return previousClick.apply(this,arguments);
    };
  }

  exportBtn.addEventListener('click',()=>{busy=true;clearPending('重要場面を抽出しています…')});
  for(const el of [$q('#rangeStart45'),$q('#rangeEnd45'),$q('#targetSide'),$q('#playOrder')])el?.addEventListener('change',()=>{if(!busy)setTimeout(()=>setVisible(readyText()),30)});
  setInterval(()=>{if(!busy&&wrap.style.display==='none')setVisible(readyText())},1200);
  try{log('patch-v454-active',{patch:PATCH,mode:'sw-attachment-download-route+separate-visible-status'})}catch{}
})();
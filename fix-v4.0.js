(()=>{
  const PATCH='4.0-20260914-13';
  const $q=s=>document.querySelector(s);
  const header=$q('header h1'),sub=$q('header p');
  if(header) header.textContent='シャドバWB リプレイ診断 v4.0';
  if(sub) sub.textContent='Build 2026.09.14-13 / ChatGPT画像パッケージ出力';

  const exportBtn=$q('#exportJson');
  const panel=exportBtn?.closest('.panel');
  const status=$q('#status');
  if(exportBtn){
    exportBtn.textContent='ChatGPT用ZIPを書き出す（推奨）';
    exportBtn.title='review.jsonとターン内の連続画像を1つのZIPにまとめます';
  }
  let jsonOnly=$q('#exportJsonOnly40');
  if(panel&&exportBtn&&!jsonOnly){
    const wrap=document.createElement('div');wrap.className='buttons';
    exportBtn.parentNode.insertBefore(wrap,exportBtn);wrap.appendChild(exportBtn);
    jsonOnly=document.createElement('button');jsonOnly.id='exportJsonOnly40';jsonOnly.textContent='review.jsonのみ';wrap.appendChild(jsonOnly);
    const p=document.createElement('p');p.className='help';p.id='exportHelp40';p.textContent='ZIPには review.json と、保存した各ターンの開始〜終了までを約0.75秒間隔で切り出した画像を入れます。ChatGPTにはZIPだけ送れば局面の流れまで確認できます。';wrap.after(p);
  }

  function firstSide40(){const p=$q('#playOrder');return p?.value==='先攻'?'bottom':'top'}
  function targetSide40(){return $q('#targetSide')?.value||'bottom'}
  function normalizeTurnMap40(){
    const out={};
    for(const [k,v] of Object.entries(turnMap||{})){
      out[k]={timeSeconds:Number(v.time),confidence:Number(v.confidence)||0,raw:v.raw||'',source:v.source||''};
    }
    return out;
  }
  function sceneBase40(s,i){
    const turn=Number(s.turn)||0;
    const t=Number(s.time ?? s.timeSeconds ?? turnMap?.[turn]?.time ?? 0);
    return {
      no:i+1,turn,timeSeconds:+t.toFixed(3),
      firstSide:firstSide40(),targetSide:targetSide40(),
      matchup:s.matchup||$q('#matchup')?.value||'',
      deck:s.deck||$q('#deck')?.value||'',
      note:s.note||'',
      recognition:s.recognition||{
        turnSource:turnMap?.[turn]?.source||'max-pp-ocr',
        side:targetSide40(),confidence:Number(turnMap?.[turn]?.confidence)||0,raw:turnMap?.[turn]?.raw||''
      },
      frames:[]
    };
  }
  function buildManifest40(){
    return {
      format:'shadowverse-wb-review-v4.0',build:PATCH,source:videoName,createdAt:new Date().toISOString(),
      turnRecognition:{
        method:'maximum-pp-ocr+sequence-validation',
        points:window.v39Points||points,
        targetSide:targetSide40(),firstSide:firstSide40(),playOrder:$q('#playOrder')?.value,
        turnMap:normalizeTurnMap40(),rejectedTurns:window.rejectedTurns392||[]
      },
      scenes:(scenes||[]).map(sceneBase40)
    };
  }
  function nextOpponentTime40(start){
    const target=targetSide40();
    const rows=(window.turnTimeline39||[]).slice().sort((a,b)=>a.time-b.time);
    const next=rows.find(x=>x.time>start+.25&&x.side!==target);
    return next?Number(next.time):Math.min(video.duration-.1,start+6);
  }
  function frameTimes40(start,end){
    const lo=Math.max(0,start+.10),hi=Math.max(lo,Math.min(video.duration-.10,end-.12));
    const a=[];
    for(let t=lo;t<=hi+.001&&a.length<12;t+=.75)a.push(+t.toFixed(3));
    if(!a.length)a.push(+lo.toFixed(3));
    if(hi-a[a.length-1]>.30&&a.length<12)a.push(+hi.toFixed(3));
    return [...new Set(a)];
  }
  async function seekSafe40(t){
    t=Math.max(0,Math.min(video.duration-.05,t));
    if(Math.abs(video.currentTime-t)>.025) await seek(t,'review-package-v40');
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  }
  function download40(blob,name){
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),3000);
  }
  function ensureJSZip40(){
    if(window.JSZip)return Promise.resolve(window.JSZip);
    return new Promise((resolve,reject)=>{
      const existing=document.querySelector('script[data-jszip-v40]');
      if(existing){existing.addEventListener('load',()=>resolve(window.JSZip),{once:true});existing.addEventListener('error',()=>reject(new Error('ZIP機能の読み込みに失敗しました')),{once:true});return;}
      const s=document.createElement('script');s.dataset.jszipV40='1';s.src='https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';s.onload=()=>window.JSZip?resolve(window.JSZip):reject(new Error('ZIP機能を初期化できませんでした'));s.onerror=()=>reject(new Error('ZIP機能の読み込みに失敗しました'));document.head.appendChild(s);
    });
  }
  function readme40(){return `Shadowverse: Worlds Beyond ChatGPT review package\n\nreview.json と scenes/ 以下の画像を一緒に確認してください。\n各 scene は、指定ターンの開始から相手の次ターン開始直前までを約0.75秒間隔で切り出しています。\n\nレビュー形式:\nTurn | Play | Grade (◎/○/△/×) | 一行理由 | 有意な場合のみ最善代替\n\n注意:\n- Extra PP と EP は別物として扱ってください。\n- firstSide は画面上で先攻の側、targetSide はレビュー対象側です。\n- 相手の非公開手札は断定しないでください。\n`;}

  async function exportPackage40(){
    if(!scenes?.length){if(status)status.textContent='保存済み局面がありません。';return;}
    const original=video.currentTime;
    video.pause();
    exportBtn.disabled=true;
    try{
      if(status)status.textContent='ZIP準備中…';
      const JSZip=await ensureJSZip40(),zip=new JSZip(),manifest=buildManifest40();
      let done=0,total=0;
      for(const sc of manifest.scenes){const end=nextOpponentTime40(sc.timeSeconds);sc.endTimeSeconds=+end.toFixed(3);sc._times=frameTimes40(sc.timeSeconds,end);total+=sc._times.length;}
      for(const sc of manifest.scenes){
        const folder=`scenes/scene-${String(sc.no).padStart(2,'0')}-turn-${String(sc.turn).padStart(2,'0')}`;
        for(let i=0;i<sc._times.length;i++){
          const t=sc._times[i];await seekSafe40(t);
          const c=frameCanvas(1600),blob=await canvasBlob(c,.80);
          const file=`${folder}/frame-${String(i+1).padStart(2,'0')}-${t.toFixed(2)}s.jpg`;
          zip.file(file,blob);sc.frames.push({file,timeSeconds:t});done++;
          if(status)status.textContent=`画像を作成中… ${done}/${total}`;
        }
        delete sc._times;
      }
      zip.file('review.json',JSON.stringify(manifest,null,2));
      zip.file('README.txt',readme40());
      if(status)status.textContent='ZIP圧縮中…';
      const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}});
      download40(blob,`${videoName||'shadowverse'}-review-package.zip`);
      if(status)status.textContent=`完了：${manifest.scenes.length}局面 / ${total}枚をZIPにまとめました。ChatGPTにはこのZIPだけ送ってください。`;
      try{log('review-package-export-v40',{scenes:manifest.scenes.length,frames:total})}catch{}
    }catch(err){
      console.error(err);if(status)status.textContent='ZIP作成失敗：'+(err?.message||String(err));
      try{log('review-package-error-v40',{message:err?.message||String(err)})}catch{}
    }finally{
      try{await seekSafe40(original)}catch{}
      exportBtn.disabled=!(scenes?.length);
    }
  }
  function exportJsonOnly40(){
    if(!scenes?.length){if(status)status.textContent='保存済み局面がありません。';return;}
    const manifest=buildManifest40();
    for(const sc of manifest.scenes){sc.endTimeSeconds=+nextOpponentTime40(sc.timeSeconds).toFixed(3);}
    const blob=new Blob([JSON.stringify(manifest,null,2)],{type:'application/json'});download40(blob,'review.json');
    if(status)status.textContent='review.jsonを書き出しました。実際のプレイ判断レビューには画像入りZIPを推奨します。';
  }

  if(exportBtn) exportBtn.onclick=exportPackage40;
  if(jsonOnly) jsonOnly.onclick=exportJsonOnly40;
  try{log('patch-v40-active',{patch:PATCH})}catch{}
})();
(()=>{
  const PATCH='4.1-20260914-14';
  const $q=s=>document.querySelector(s);
  const PRE_ROLL=2.0;
  const STEP=.5;
  const header=$q('header h1'),sub=$q('header p');
  if(header) header.textContent='シャドバWB リプレイ診断 v4.1';
  if(sub) sub.textContent='Build 2026.09.14-14 / 判断前2秒 + 0.5秒連続画像';

  const exportBtn=$q('#exportJson'),status=$q('#status'),help=$q('#exportHelp40');
  if(exportBtn){
    exportBtn.textContent='ChatGPT用ZIPを書き出す（推奨）';
    exportBtn.title='判断直前2秒を含め、0.5秒間隔で連続画像を書き出します';
  }
  if(help) help.textContent='ZIPには review.json と、指定ターン認識時刻の2秒前〜相手の次ターン開始直前までを約0.5秒間隔で切り出した画像を入れます。最初のカードを出す前の手札・盤面も確認しやすくします。';

  function firstSide(){const p=$q('#playOrder');return p?.value==='先攻'?'bottom':'top'}
  function targetSide(){return $q('#targetSide')?.value||'bottom'}
  function normalizeTurnMap(){const out={};for(const [k,v] of Object.entries(turnMap||{}))out[k]={timeSeconds:Number(v.time),confidence:Number(v.confidence)||0,raw:v.raw||'',source:v.source||''};return out}
  function sceneBase(s,i){
    const turn=Number(s.turn)||0,recognized=Number(s.time ?? s.timeSeconds ?? turnMap?.[turn]?.time ?? 0);
    return {no:i+1,turn,timeSeconds:+recognized.toFixed(3),recognizedTurnTimeSeconds:+recognized.toFixed(3),preRollSeconds:PRE_ROLL,firstSide:firstSide(),targetSide:targetSide(),matchup:s.matchup||$q('#matchup')?.value||'',deck:s.deck||$q('#deck')?.value||'',note:s.note||'',recognition:s.recognition||{turnSource:turnMap?.[turn]?.source||'max-pp-ocr',side:targetSide(),confidence:Number(turnMap?.[turn]?.confidence)||0,raw:turnMap?.[turn]?.raw||''},frames:[]};
  }
  function buildManifest(){return {format:'shadowverse-wb-review-v4.1',build:PATCH,source:videoName,createdAt:new Date().toISOString(),capture:{preRollSeconds:PRE_ROLL,intervalSeconds:STEP},turnRecognition:{method:'maximum-pp-ocr+sequence-validation',points:window.v39Points||points,targetSide:targetSide(),firstSide:firstSide(),playOrder:$q('#playOrder')?.value,turnMap:normalizeTurnMap(),rejectedTurns:window.rejectedTurns392||[]},scenes:(scenes||[]).map(sceneBase)}}
  function nextOpponentTime(start){const target=targetSide(),rows=(window.turnTimeline39||[]).slice().sort((a,b)=>a.time-b.time),next=rows.find(x=>x.time>start+.25&&x.side!==target);return next?Number(next.time):Math.min(video.duration-.1,start+6)}
  function frameTimes(recognized,end){
    const lo=Math.max(0,recognized-PRE_ROLL),hi=Math.max(lo,Math.min(video.duration-.1,end-.12)),a=[];
    for(let t=lo;t<=hi+.001&&a.length<20;t+=STEP)a.push(+t.toFixed(3));
    if(!a.some(t=>Math.abs(t-recognized)<.03)&&a.length<20)a.push(+recognized.toFixed(3));
    if(hi-Math.max(...a)>.2&&a.length<20)a.push(+hi.toFixed(3));
    return [...new Set(a)].sort((x,y)=>x-y);
  }
  async function seekSafe(t){t=Math.max(0,Math.min(video.duration-.05,t));if(Math.abs(video.currentTime-t)>.025)await seek(t,'review-package-v41');await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))}
  function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),3000)}
  function ensureJSZip(){if(window.JSZip)return Promise.resolve(window.JSZip);return new Promise((resolve,reject)=>{const old=document.querySelector('script[data-jszip-v40],script[data-jszip-v41]');if(old){if(window.JSZip){resolve(window.JSZip);return}old.addEventListener('load',()=>resolve(window.JSZip),{once:true});old.addEventListener('error',()=>reject(new Error('ZIP機能の読み込みに失敗しました')),{once:true});return}const s=document.createElement('script');s.dataset.jszipV41='1';s.src='https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';s.onload=()=>window.JSZip?resolve(window.JSZip):reject(new Error('ZIP機能を初期化できませんでした'));s.onerror=()=>reject(new Error('ZIP機能の読み込みに失敗しました'));document.head.appendChild(s)})}
  function readme(){return `Shadowverse: Worlds Beyond ChatGPT review package v4.1\n\nreview.json と scenes/ 以下の画像を一緒に確認してください。\n各 scene は、認識したターン開始の2秒前から相手の次ターン開始直前までを約0.5秒間隔で切り出しています。\nrecognizedTurnTimeSeconds より前の画像は判断前の手札・盤面確認用です。\n\nレビュー形式:\nTurn | Play | Grade (◎/○/△/×) | 一行理由 | 有意な場合のみ最善代替\n\n注意:\n- Extra PP と EP は別物として扱ってください。\n- firstSide は画面上で先攻の側、targetSide はレビュー対象側です。\n- 相手の非公開手札は断定しないでください。\n`;}

  async function exportPackage(){
    if(!scenes?.length){if(status)status.textContent='保存済み局面がありません。';return}
    const original=video.currentTime;video.pause();exportBtn.disabled=true;
    try{
      if(status)status.textContent='ZIP準備中…';const JSZip=await ensureJSZip(),zip=new JSZip(),manifest=buildManifest();let done=0,total=0;
      for(const sc of manifest.scenes){const end=nextOpponentTime(sc.recognizedTurnTimeSeconds);sc.analysisStartTimeSeconds=+Math.max(0,sc.recognizedTurnTimeSeconds-PRE_ROLL).toFixed(3);sc.endTimeSeconds=+end.toFixed(3);sc._times=frameTimes(sc.recognizedTurnTimeSeconds,end);total+=sc._times.length}
      for(const sc of manifest.scenes){const folder=`scenes/scene-${String(sc.no).padStart(2,'0')}-turn-${String(sc.turn).padStart(2,'0')}`;for(let i=0;i<sc._times.length;i++){const t=sc._times[i];await seekSafe(t);const c=frameCanvas(1600),blob=await canvasBlob(c,.82),file=`${folder}/frame-${String(i+1).padStart(2,'0')}-${t.toFixed(2)}s.jpg`;zip.file(file,blob);sc.frames.push({file,timeSeconds:t,relativeToRecognizedTurnSeconds:+(t-sc.recognizedTurnTimeSeconds).toFixed(3)});done++;if(status)status.textContent=`画像を作成中… ${done}/${total}`;}delete sc._times}
      zip.file('review.json',JSON.stringify(manifest,null,2));zip.file('README.txt',readme());if(status)status.textContent='ZIP圧縮中…';const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}});download(blob,`${videoName||'shadowverse'}-review-package-v4.1.zip`);if(status)status.textContent=`完了：${manifest.scenes.length}局面 / ${total}枚。判断前2秒を含むZIPです。`;try{log('review-package-export-v41',{scenes:manifest.scenes.length,frames:total,preRoll:PRE_ROLL,step:STEP})}catch{}
    }catch(err){console.error(err);if(status)status.textContent='ZIP作成失敗：'+(err?.message||String(err));try{log('review-package-error-v41',{message:err?.message||String(err)})}catch{}
    }finally{try{await seekSafe(original)}catch{}exportBtn.disabled=!(scenes?.length)}
  }
  if(exportBtn)exportBtn.onclick=exportPackage;
  try{log('patch-v41-active',{patch:PATCH,preRoll:PRE_ROLL,step:STEP})}catch{}
})();
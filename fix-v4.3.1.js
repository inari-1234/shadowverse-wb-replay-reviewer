(()=>{
  const PATCH='4.3.1-20260914-17';
  const $q=s=>document.querySelector(s);
  const PRE_ROLL=2.0,TURN_STEP=.5,MULLIGAN_STEP=.5;
  const header=$q('header h1'),sub=$q('header p');
  if(header) header.textContent='シャドバWB リプレイ診断 v4.3.1';
  if(sub) sub.textContent='Build 2026.09.14-17 / マリガン冒頭区間の確実抽出';

  const exportBtn=$q('#exportJson'),status=$q('#status'),help=$q('#exportHelp40');
  const mullStatus=$q('#mulliganStatus43'),mullDetail=$q('#mulliganDetail43');
  if(exportBtn){
    exportBtn.textContent='ChatGPT用ZIPを書き出す（推奨）';
    exportBtn.title='冒頭のマリガン区間と保存ターンをまとめて書き出します';
  }
  if(help) help.textContent='マリガンはCHANGE文字のOCR成否に依存せず、動画冒頭から最初のPP確認直前までを0.5秒間隔で保存します。';
  if(mullStatus)mullStatus.textContent='v4.3.1ではCHANGE文字OCRを必須にせず、冒頭のマリガン区間を丸ごと保存します。';
  if(mullDetail)mullDetail.textContent='動画選択後、ZIP出力時に0.5秒間隔で自動抽出します。';

  function firstSide(){const p=$q('#playOrder');return p?.value==='先攻'?'bottom':'top'}
  function targetSide(){return $q('#targetSide')?.value||'bottom'}
  function normalizeTurnMap(){const out={};for(const [k,v] of Object.entries(turnMap||{}))out[k]={timeSeconds:Number(v.time),confidence:Number(v.confidence)||0,raw:v.raw||'',source:v.source||''};return out}
  function sceneBase(s,i){
    const turn=Number(s.turn)||0,recognized=Number(s.time ?? s.timeSeconds ?? turnMap?.[turn]?.time ?? 0);
    return {no:i+1,turn,timeSeconds:+recognized.toFixed(3),recognizedTurnTimeSeconds:+recognized.toFixed(3),preRollSeconds:PRE_ROLL,firstSide:firstSide(),targetSide:targetSide(),matchup:s.matchup||$q('#matchup')?.value||'',deck:s.deck||$q('#deck')?.value||'',note:s.note||'',recognition:s.recognition||{turnSource:turnMap?.[turn]?.source||'max-pp-ocr',side:targetSide(),confidence:Number(turnMap?.[turn]?.confidence)||0,raw:turnMap?.[turn]?.raw||''},frames:[]};
  }
  function buildManifest(){return {format:'shadowverse-wb-review-v4.3.1',build:PATCH,source:videoName,createdAt:new Date().toISOString(),deck:$q('#deck')?.value||'',matchup:$q('#matchup')?.value||'',capture:{turnPreRollSeconds:PRE_ROLL,turnIntervalSeconds:TURN_STEP,mulliganIntervalSeconds:MULLIGAN_STEP},autoPrep:window.autoPrep42||null,turnRecognition:{method:'maximum-pp-ocr+sequence-validation',points:window.v39Points||points,targetSide:targetSide(),firstSide:firstSide(),playOrder:$q('#playOrder')?.value,turnMap:normalizeTurnMap(),rejectedTurns:window.rejectedTurns392||[]},mulligan:null,scenes:(scenes||[]).map(sceneBase)}}
  function nextOpponentTime(start){const target=targetSide(),rows=(window.turnTimeline39||[]).slice().sort((a,b)=>a.time-b.time),next=rows.find(x=>x.time>start+.25&&x.side!==target);return next?Number(next.time):Math.min(video.duration-.1,start+6)}
  function turnFrameTimes(recognized,end){const lo=Math.max(0,recognized-PRE_ROLL),hi=Math.max(lo,Math.min(video.duration-.1,end-.12)),a=[];for(let t=lo;t<=hi+.001&&a.length<20;t+=TURN_STEP)a.push(+t.toFixed(3));if(!a.some(t=>Math.abs(t-recognized)<.03)&&a.length<20)a.push(+recognized.toFixed(3));if(a.length&&hi-Math.max(...a)>.2&&a.length<20)a.push(+hi.toFixed(3));return [...new Set(a)].sort((x,y)=>x-y)}
  async function seekSafe(t,reason='review-package-v431'){t=Math.max(0,Math.min(video.duration-.05,t));if(Math.abs(video.currentTime-t)>.025)await seek(t,reason);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))}
  function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),3000)}
  function ensureJSZip(){if(window.JSZip)return Promise.resolve(window.JSZip);return new Promise((resolve,reject)=>{const old=document.querySelector('script[data-jszip-v40],script[data-jszip-v41],script[data-jszip-v43],script[data-jszip-v431]');if(old){if(window.JSZip){resolve(window.JSZip);return}old.addEventListener('load',()=>resolve(window.JSZip),{once:true});old.addEventListener('error',()=>reject(new Error('ZIP機能の読み込みに失敗しました')),{once:true});return}const s=document.createElement('script');s.dataset.jszipV431='1';s.src='https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';s.onload=()=>window.JSZip?resolve(window.JSZip):reject(new Error('ZIP機能を初期化できませんでした'));s.onerror=()=>reject(new Error('ZIP機能の読み込みに失敗しました'));document.head.appendChild(s)})}

  function earliestPPBoundary(){
    const vals=[];
    const times=window.autoPrep42?.summary?.times;
    if(times){for(const side of ['top','bottom'])for(const v of Object.values(times[side]||{})){const n=Number(v);if(Number.isFinite(n)&&n>0)vals.push(n)}}
    for(const x of (window.turnTimeline39||[])){const n=Number(x?.time);if(Number.isFinite(n)&&n>0)vals.push(n)}
    for(const v of Object.values(turnMap||{})){const n=Number(v?.time);if(Number.isFinite(n)&&n>0)vals.push(n)}
    return vals.length?Math.min(...vals):null;
  }
  function mulliganPlan(){
    const firstPP=earliestPPBoundary();
    let end=firstPP!=null?firstPP-.7:Math.min(16,video.duration-.2);
    end=Math.max(8,Math.min(end,16,video.duration-.2));
    const start=Math.min(.5,Math.max(0,video.duration-.2)),times=[];
    for(let t=start;t<=end+.001&&times.length<34;t+=MULLIGAN_STEP)times.push(+t.toFixed(3));
    if(times.length&&end-times[times.length-1]>.2&&times.length<34)times.push(+end.toFixed(3));
    return {detected:true,detectionMode:firstPP!=null?'early-phase-until-first-pp':'early-phase-fixed-window',confidence:firstPP!=null?'high':'medium',firstPPBoundarySeconds:firstPP==null?null:+firstPP.toFixed(3),captureStartTimeSeconds:+start.toFixed(3),captureEndTimeSeconds:+end.toFixed(3),frames:[],_times:times};
  }

  function readme(){return `Shadowverse: Worlds Beyond ChatGPT review package v4.3.1\n\nreview.json と画像を一緒に確認してください。\n\n[mulligan/]\n- CHANGE文字のOCR成否に依存せず、動画冒頭から最初のPP確認直前までを0.5秒間隔で保存しています。\n- 初期手札、交換対象、交換後が含まれる連続画像からマリガンを評価してください。\n- カード名が不鮮明なら断定しないでください。\n\n[scenes/]\n- 保存ターンの認識時刻2秒前から相手の次ターン開始直前までを約0.5秒間隔で保存しています。\n\nレビュー形式:\nTurn | Play | Grade (◎/○/△/×) | 一行理由 | 有意な場合のみ最善代替\n\n注意:\n- Extra PP と EP は別物です。\n- firstSide は画面上の先攻側、targetSide はレビュー対象側です。\n- 相手の非公開手札は断定しないでください。\n`;}

  async function exportPackage(){
    if(!video?.src||!isFinite(video.duration)||video.duration<=0){if(status)status.textContent='先に動画を選んでください。';return}
    const original=video.currentTime;video.pause();exportBtn.disabled=true;
    try{
      if(status)status.textContent='ZIP準備中…';const JSZip=await ensureJSZip(),zip=new JSZip(),manifest=buildManifest(),mull=mulliganPlan();
      manifest.mulligan={...mull};delete manifest.mulligan._times;window.mulligan431=manifest.mulligan;
      if(mullStatus)mullStatus.textContent=`マリガン区間：${fmt(mull.captureStartTimeSeconds)}〜${fmt(mull.captureEndTimeSeconds)} を保存します。`;
      if(mullDetail)mullDetail.textContent=`方式: ${mull.detectionMode}\n最初のPP根拠: ${mull.firstPPBoundarySeconds==null?'未取得':fmt(mull.firstPPBoundarySeconds)}\n画像間隔: 0.5秒`;
      let mDone=0;
      for(const t of mull._times){await seekSafe(t,'mulligan-capture-v431');const c=frameCanvas(1600),blob=await canvasBlob(c,.84),file=`mulligan/frame-${String(mDone+1).padStart(2,'0')}-${t.toFixed(2)}s.jpg`;zip.file(file,blob);manifest.mulligan.frames.push({file,timeSeconds:t});mDone++;if(status)status.textContent=`マリガン画像を作成中… ${mDone}/${mull._times.length}`;}
      for(const sc of manifest.scenes){const end=nextOpponentTime(sc.recognizedTurnTimeSeconds);sc.analysisStartTimeSeconds=+Math.max(0,sc.recognizedTurnTimeSeconds-PRE_ROLL).toFixed(3);sc.endTimeSeconds=+end.toFixed(3);sc._times=turnFrameTimes(sc.recognizedTurnTimeSeconds,end)}
      let turnDone=0,turnTotal=manifest.scenes.reduce((s,x)=>s+(x._times?.length||0),0);
      for(const sc of manifest.scenes){const folder=`scenes/scene-${String(sc.no).padStart(2,'0')}-turn-${String(sc.turn).padStart(2,'0')}`;for(let i=0;i<sc._times.length;i++){const t=sc._times[i];await seekSafe(t);const c=frameCanvas(1600),blob=await canvasBlob(c,.82),file=`${folder}/frame-${String(i+1).padStart(2,'0')}-${t.toFixed(2)}s.jpg`;zip.file(file,blob);sc.frames.push({file,timeSeconds:t,relativeToRecognizedTurnSeconds:+(t-sc.recognizedTurnTimeSeconds).toFixed(3)});turnDone++;if(status)status.textContent=`ターン画像を作成中… ${turnDone}/${turnTotal}`;}delete sc._times}
      zip.file('review.json',JSON.stringify(manifest,null,2));zip.file('README.txt',readme());if(status)status.textContent='ZIP圧縮中…';const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}});download(blob,`${videoName||'shadowverse'}-review-package-v4.3.1.zip`);if(status)status.textContent=`完了：マリガン${manifest.mulligan.frames.length}枚 / 保存局面${manifest.scenes.length}件。`;try{log('review-package-export-v431',{mulliganFrames:manifest.mulligan.frames.length,scenes:manifest.scenes.length,firstPPBoundary:manifest.mulligan.firstPPBoundarySeconds})}catch{}
    }catch(err){console.error(err);if(status)status.textContent='ZIP作成失敗：'+(err?.message||String(err));try{log('review-package-error-v431',{message:err?.message||String(err)})}catch{}
    }finally{try{await seekSafe(original,'review-package-return-v431')}catch{}exportBtn.disabled=false}
  }

  if(exportBtn)exportBtn.onclick=exportPackage;
  $q('#videoFile')?.addEventListener('change',()=>{if(exportBtn)exportBtn.disabled=false;window.mulligan431=null;if(mullStatus)mullStatus.textContent='動画冒頭のマリガン区間をZIP出力時に自動保存します。';if(mullDetail)mullDetail.textContent='未出力';});
  video?.addEventListener('loadedmetadata',()=>{if(exportBtn)exportBtn.disabled=false});
  try{log('patch-v431-active',{patch:PATCH,mode:'early-phase-continuous'})}catch{}
})();
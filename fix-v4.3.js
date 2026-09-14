(()=>{
  const PATCH='4.3-20260914-16';
  const $q=s=>document.querySelector(s);
  const PRE_ROLL=2.0,TURN_STEP=.5,MULLIGAN_STEP=.5;
  const header=$q('header h1'),sub=$q('header p');
  if(header) header.textContent='シャドバWB リプレイ診断 v4.3';
  if(sub) sub.textContent='Build 2026.09.14-16 / マリガン自動検出 + ZIP追加';

  const exportBtn=$q('#exportJson'),status=$q('#status'),help=$q('#exportHelp40');
  if(exportBtn){
    exportBtn.textContent='ChatGPT用ZIPを書き出す（推奨）';
    exportBtn.title='マリガン画面と保存ターンの連続画像をまとめて書き出します';
  }
  if(help) help.textContent='ZIPにはマリガン画面の自動抽出と、保存したターンの判断前2秒〜相手ターン開始直前までの連続画像を入れます。マリガンだけ確認したい場合もZIPを書き出せます。';

  const prepPanel=$q('#autoPrepPanel42');
  let mullPanel=$q('#mulliganPanel43');
  if(!mullPanel){
    mullPanel=document.createElement('section');mullPanel.id='mulliganPanel43';mullPanel.className='panel';
    mullPanel.innerHTML='<h2>3. マリガン自動抽出</h2><p id="mulliganStatus43" class="help">ZIP出力時に動画冒頭から CHANGE 画面を自動検出します。</p><div id="mulliganDetail43" class="ocrRead">未解析</div>';
    const anchor=prepPanel||$q('#scanTurns')?.closest('.panel');
    if(anchor) anchor.parentNode.insertBefore(mullPanel,anchor.nextSibling);
  }
  const mullStatus=$q('#mulliganStatus43'),mullDetail=$q('#mulliganDetail43');
  window.mulligan43=null;

  function firstSide(){const p=$q('#playOrder');return p?.value==='先攻'?'bottom':'top'}
  function targetSide(){return $q('#targetSide')?.value||'bottom'}
  function normalizeTurnMap(){const out={};for(const [k,v] of Object.entries(turnMap||{}))out[k]={timeSeconds:Number(v.time),confidence:Number(v.confidence)||0,raw:v.raw||'',source:v.source||''};return out}
  function sceneBase(s,i){
    const turn=Number(s.turn)||0,recognized=Number(s.time ?? s.timeSeconds ?? turnMap?.[turn]?.time ?? 0);
    return {no:i+1,turn,timeSeconds:+recognized.toFixed(3),recognizedTurnTimeSeconds:+recognized.toFixed(3),preRollSeconds:PRE_ROLL,firstSide:firstSide(),targetSide:targetSide(),matchup:s.matchup||$q('#matchup')?.value||'',deck:s.deck||$q('#deck')?.value||'',note:s.note||'',recognition:s.recognition||{turnSource:turnMap?.[turn]?.source||'max-pp-ocr',side:targetSide(),confidence:Number(turnMap?.[turn]?.confidence)||0,raw:turnMap?.[turn]?.raw||''},frames:[]};
  }
  function buildManifest(){return {format:'shadowverse-wb-review-v4.3',build:PATCH,source:videoName,createdAt:new Date().toISOString(),deck:$q('#deck')?.value||'',matchup:$q('#matchup')?.value||'',capture:{turnPreRollSeconds:PRE_ROLL,turnIntervalSeconds:TURN_STEP,mulliganIntervalSeconds:MULLIGAN_STEP},autoPrep:window.autoPrep42||null,turnRecognition:{method:'maximum-pp-ocr+sequence-validation',points:window.v39Points||points,targetSide:targetSide(),firstSide:firstSide(),playOrder:$q('#playOrder')?.value,turnMap:normalizeTurnMap(),rejectedTurns:window.rejectedTurns392||[]},mulligan:null,scenes:(scenes||[]).map(sceneBase)}}
  function nextOpponentTime(start){const target=targetSide(),rows=(window.turnTimeline39||[]).slice().sort((a,b)=>a.time-b.time),next=rows.find(x=>x.time>start+.25&&x.side!==target);return next?Number(next.time):Math.min(video.duration-.1,start+6)}
  function turnFrameTimes(recognized,end){const lo=Math.max(0,recognized-PRE_ROLL),hi=Math.max(lo,Math.min(video.duration-.1,end-.12)),a=[];for(let t=lo;t<=hi+.001&&a.length<20;t+=TURN_STEP)a.push(+t.toFixed(3));if(!a.some(t=>Math.abs(t-recognized)<.03)&&a.length<20)a.push(+recognized.toFixed(3));if(a.length&&hi-Math.max(...a)>.2&&a.length<20)a.push(+hi.toFixed(3));return [...new Set(a)].sort((x,y)=>x-y)}
  async function seekSafe(t,reason='review-package-v43'){t=Math.max(0,Math.min(video.duration-.05,t));if(Math.abs(video.currentTime-t)>.025)await seek(t,reason);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))}
  function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),3000)}
  function ensureJSZip(){if(window.JSZip)return Promise.resolve(window.JSZip);return new Promise((resolve,reject)=>{const old=document.querySelector('script[data-jszip-v40],script[data-jszip-v41],script[data-jszip-v43]');if(old){if(window.JSZip){resolve(window.JSZip);return}old.addEventListener('load',()=>resolve(window.JSZip),{once:true});old.addEventListener('error',()=>reject(new Error('ZIP機能の読み込みに失敗しました')),{once:true});return}const s=document.createElement('script');s.dataset.jszipV43='1';s.src='https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';s.onload=()=>window.JSZip?resolve(window.JSZip):reject(new Error('ZIP機能を初期化できませんでした'));s.onerror=()=>reject(new Error('ZIP機能の読み込みに失敗しました'));document.head.appendChild(s)})}

  function changeCrop(variant='gray'){
    const src=frameCanvas(1600),sx=Math.round(src.width*.30),sy=Math.round(src.height*.02),cw=Math.round(src.width*.40),ch=Math.round(src.height*.12),scale=3,c=document.createElement('canvas');
    c.width=cw*scale;c.height=ch*scale;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(src,sx,sy,cw,ch,0,0,c.width,c.height);
    const im=x.getImageData(0,0,c.width,c.height),d=im.data;let sum=0;for(let i=0;i<d.length;i+=4)sum+=.299*d[i]+.587*d[i+1]+.114*d[i+2];const mean=sum/(d.length/4);
    for(let i=0;i<d.length;i+=4){const g=.299*d[i]+.587*d[i+1]+.114*d[i+2],v=variant==='gray'?Math.max(0,Math.min(255,(g-mean)*2.25+128)):(g>mean+8?0:255);d[i]=d[i+1]=d[i+2]=v;d[i+3]=255}x.putImageData(im,0,0);return c;
  }
  function lev(a,b){const dp=Array.from({length:a.length+1},()=>Array(b.length+1).fill(0));for(let i=0;i<=a.length;i++)dp[i][0]=i;for(let j=0;j<=b.length;j++)dp[0][j]=j;for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return dp[a.length][b.length]}
  function changeScore(raw){const s=(raw||'').toUpperCase().replace(/[^A-Z]/g,'');if(!s)return 0;if(s.includes('CHANGE'))return 1;let best=0;for(let i=0;i<s.length;i++)for(let n=4;n<=8;n++){const p=s.slice(i,i+n);if(!p)continue;best=Math.max(best,1-lev(p,'CHANGE')/Math.max(p.length,6))}return best}
  async function readChange(){const w=await initOCR();async function once(variant){const c=changeCrop(variant);try{await w.setParameters({tessedit_char_whitelist:'CHANGE',tessedit_pageseg_mode:'7'})}catch{}const r=await w.recognize(c),raw=(r.data.text||'').trim(),confidence=+(r.data.confidence||0).toFixed(1);return {raw,confidence,variant,score:+changeScore(raw).toFixed(3)}}const a=await once('gray');if(a.score>=.72)return a;const b=await once('binary');return b.score>a.score?b:a}
  function chooseCluster(hits){if(!hits.length)return null;const clusters=[];let cur=[hits[0]];for(let i=1;i<hits.length;i++){if(hits[i].time-hits[i-1].time<=2.6)cur.push(hits[i]);else{clusters.push(cur);cur=[hits[i]]}}clusters.push(cur);clusters.sort((a,b)=>{const sa=a.reduce((s,x)=>s+x.score,0),sb=b.reduce((s,x)=>s+x.score,0);return (b.length-a.length)||(sb-sa)});return clusters[0]}
  async function detectMulligan(){
    if(mullStatus)mullStatus.textContent='マリガン画面を検出中…';
    const firstTurn=(window.turnTimeline39||[]).map(x=>Number(x.time)).filter(Number.isFinite).sort((a,b)=>a-b)[0];
    const scanEnd=Math.max(3,Math.min(video.duration-.2,firstTurn?firstTurn-.4:18,18)),rows=[];
    for(let t=.4;t<=scanEnd+.001;t+=1.2){await seekSafe(t,'mulligan-scan-v43');const r=await readChange();rows.push({time:+t.toFixed(2),...r});if(mullDetail)mullDetail.textContent=`走査 ${fmt(t)} / ${fmt(scanEnd)}  CHANGE score=${r.score.toFixed(2)} raw="${r.raw}"`;}
    const hits=rows.filter(x=>x.score>=.64),cluster=chooseCluster(hits),strong=cluster&&(cluster.length>=2||cluster.some(x=>x.score>=.90));
    let start,end,mode,confidence;
    if(strong){start=Math.max(0,cluster[0].time-1.2);end=Math.min(scanEnd,cluster[cluster.length-1].time+1.8);mode='change-header-ocr';const avg=cluster.reduce((s,x)=>s+x.score,0)/cluster.length;confidence=cluster.length>=3&&avg>=.75?'high':'medium';}
    else{start=Math.max(0,.5);end=Math.min(scanEnd,12);mode='fallback-early-frames';confidence='low';}
    const times=[];const step=strong?MULLIGAN_STEP:1.0;for(let t=start;t<=end+.001&&times.length<28;t+=step)times.push(+t.toFixed(3));if(times.length&&end-times[times.length-1]>.2&&times.length<28)times.push(+end.toFixed(3));
    const result={detected:!!strong,detectionMode:mode,confidence,scanEndSeconds:+scanEnd.toFixed(3),captureStartTimeSeconds:+start.toFixed(3),captureEndTimeSeconds:+end.toFixed(3),ocrHits:(cluster||[]).map(x=>({timeSeconds:x.time,raw:x.raw,score:x.score,confidence:x.confidence,variant:x.variant})),frames:[],_times:times};
    window.mulligan43=result;try{await (await initOCR()).setParameters({tessedit_char_whitelist:'0123456789/',tessedit_pageseg_mode:'7'})}catch{}
    if(mullStatus)mullStatus.textContent=strong?`マリガン検出：${fmt(start)}〜${fmt(end)}（${confidence}）`:'CHANGE文字を確定できなかったため、冒頭候補画像を保存します。';
    if(mullDetail)mullDetail.textContent=strong?`CHANGE検出 ${cluster.length}点 / ${confidence}\n${cluster.map(x=>`${fmt(x.time)} score=${x.score.toFixed(2)} raw="${x.raw}"`).join('\n')}`:'OCR検出は不十分でした。ZIP内の mulligan/ に冒頭候補画像を入れます。';
    try{log('mulligan-detect-v43',{detected:result.detected,mode,confidence,start:result.captureStartTimeSeconds,end:result.captureEndTimeSeconds,hits:result.ocrHits})}catch{}
    return result;
  }

  function readme(){return `Shadowverse: Worlds Beyond ChatGPT review package v4.3\n\nreview.json と画像を一緒に確認してください。\n\n[mulligan/]\n- 動画冒頭の CHANGE 画面を自動検出して連続画像化しています。\n- detected=false の場合はOCR確定に失敗したため、冒頭候補画像を保存しています。\n- 初期手札、交換対象、交換後が画像から判別できる範囲でマリガンを評価してください。カード名が不鮮明なら断定しないでください。\n\n[scenes/]\n- 保存ターンの認識時刻2秒前から相手の次ターン開始直前までを約0.5秒間隔で保存しています。\n\nレビュー形式:\nTurn | Play | Grade (◎/○/△/×) | 一行理由 | 有意な場合のみ最善代替\n\n注意:\n- Extra PP と EP は別物です。\n- firstSide は画面上の先攻側、targetSide はレビュー対象側です。\n- 相手の非公開手札は断定しないでください。\n`;}

  async function exportPackage(){
    if(!video?.src||!isFinite(video.duration)||video.duration<=0){if(status)status.textContent='先に動画を選んでください。';return}
    const original=video.currentTime;video.pause();exportBtn.disabled=true;
    try{
      if(status)status.textContent='ZIP準備中…';const JSZip=await ensureJSZip(),zip=new JSZip(),manifest=buildManifest();
      const mull=await detectMulligan();manifest.mulligan={...mull};delete manifest.mulligan._times;
      let total=0,done=0;
      for(const t of mull._times){await seekSafe(t,'mulligan-capture-v43');const c=frameCanvas(1600),blob=await canvasBlob(c,.84),file=`mulligan/frame-${String(done+1).padStart(2,'0')}-${t.toFixed(2)}s.jpg`;zip.file(file,blob);manifest.mulligan.frames.push({file,timeSeconds:t});done++;total++;if(status)status.textContent=`マリガン画像を作成中… ${done}/${mull._times.length}`;}
      for(const sc of manifest.scenes){const end=nextOpponentTime(sc.recognizedTurnTimeSeconds);sc.analysisStartTimeSeconds=+Math.max(0,sc.recognizedTurnTimeSeconds-PRE_ROLL).toFixed(3);sc.endTimeSeconds=+end.toFixed(3);sc._times=turnFrameTimes(sc.recognizedTurnTimeSeconds,end);total+=sc._times.length}
      let turnDone=0,turnTotal=manifest.scenes.reduce((s,x)=>s+(x._times?.length||0),0);
      for(const sc of manifest.scenes){const folder=`scenes/scene-${String(sc.no).padStart(2,'0')}-turn-${String(sc.turn).padStart(2,'0')}`;for(let i=0;i<sc._times.length;i++){const t=sc._times[i];await seekSafe(t);const c=frameCanvas(1600),blob=await canvasBlob(c,.82),file=`${folder}/frame-${String(i+1).padStart(2,'0')}-${t.toFixed(2)}s.jpg`;zip.file(file,blob);sc.frames.push({file,timeSeconds:t,relativeToRecognizedTurnSeconds:+(t-sc.recognizedTurnTimeSeconds).toFixed(3)});turnDone++;if(status)status.textContent=`ターン画像を作成中… ${turnDone}/${turnTotal}`;}delete sc._times}
      zip.file('review.json',JSON.stringify(manifest,null,2));zip.file('README.txt',readme());if(status)status.textContent='ZIP圧縮中…';const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}});download(blob,`${videoName||'shadowverse'}-review-package-v4.3.zip`);
      if(status)status.textContent=`完了：マリガン ${manifest.mulligan.frames.length}枚 / 保存局面 ${manifest.scenes.length}件。`;
      try{log('review-package-export-v43',{mulliganFrames:manifest.mulligan.frames.length,mulliganDetected:manifest.mulligan.detected,scenes:manifest.scenes.length,totalFrames:total})}catch{}
    }catch(err){console.error(err);if(status)status.textContent='ZIP作成失敗：'+(err?.message||String(err));try{log('review-package-error-v43',{message:err?.message||String(err)})}catch{}
    }finally{try{await seekSafe(original,'review-package-return-v43')}catch{}refreshExport()}
  }
  function refreshExport(){if(exportBtn)exportBtn.disabled=!(video?.src&&isFinite(video.duration)&&video.duration>0)}
  if(exportBtn)exportBtn.onclick=exportPackage;
  video?.addEventListener('loadedmetadata',()=>setTimeout(refreshExport,250));
  $q('#videoFile')?.addEventListener('change',()=>{window.mulligan43=null;if(mullStatus)mullStatus.textContent='ZIP出力時に動画冒頭から CHANGE 画面を自動検出します。';if(mullDetail)mullDetail.textContent='未解析';setTimeout(refreshExport,300)});
  $q('#capture')?.addEventListener('click',()=>setTimeout(refreshExport,50));
  $q('#clear')?.addEventListener('click',()=>setTimeout(refreshExport,50));
  refreshExport();
  try{log('patch-v43-active',{patch:PATCH})}catch{}
})();
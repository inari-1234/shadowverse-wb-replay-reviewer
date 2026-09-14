(()=>{
  const PATCH='4.5.1-20260914-23';
  const $q=s=>document.querySelector(s);
  const header=$q('header h1'),sub=$q('header p');
  if(header)header.textContent='シャドバWB リプレイ診断 v4.5.1';
  if(sub)sub.textContent='Build 2026.09.14-23 / 重要場面抽出 + 軽量ZIP';

  const startEl=$q('#rangeStart45'),endEl=$q('#rangeEnd45'),noteEl=$q('#rangeNote45'),oldBtn=$q('#exportRange45'),status=$q('#rangeStatus45'),detail=$q('#rangeDetail45');
  if(!oldBtn)return;
  const btn=oldBtn.cloneNode(true);oldBtn.replaceWith(btn);
  btn.id='exportRange45';btn.textContent='この区間を軽量ZIPにする';

  const PRE=2.0,MAX_TURNS=5,SCAN_STEP=.5,HEARTBEAT=2.0,MAX_FRAMES=44,OUT_WIDTH=1280,JPEG_Q=.72;
  function targetSide(){return $q('#targetSide')?.value||'bottom'}
  function firstSide(){return $q('#playOrder')?.value==='先攻'?'bottom':'top'}
  function ttime(t){const v=turnMap?.[Number(t)]?.time;return Number.isFinite(Number(v))?Number(v):null}
  function timeline(){return (window.turnTimeline39||[]).map(x=>({side:x.side,turn:Number(x.turn),time:Number(x.time)})).filter(x=>Number.isFinite(x.time)).sort((a,b)=>a.time-b.time)}
  function endBoundary(endTurn,endTime){const side=targetSide(),rows=timeline(),opp=rows.find(x=>x.time>endTime+.25&&x.side!==side);if(opp)return Math.min(video.duration-.1,opp.time+.12);const next=ttime(Number(endTurn)+1);if(next!=null)return Math.min(video.duration-.1,next-.15);return Math.min(video.duration-.1,endTime+7)}
  function validate(){
    const a=Number(startEl?.value),b=Number(endEl?.value),ta=ttime(a),tb=ttime(b),loaded=video?.src&&Number.isFinite(video.duration)&&video.duration>0;let ok=true,msg='';
    if(!loaded){ok=false;msg='先に動画を選んでください。'}
    else if(!Number.isInteger(a)||!Number.isInteger(b)||a<1||b<1||a>10||b>10){ok=false;msg='1〜10Tの範囲で指定してください。'}
    else if(a>b){ok=false;msg='開始ターンは終了ターン以下にしてください。'}
    else if(b-a+1>MAX_TURNS){ok=false;msg=`一度に${MAX_TURNS}ターンまでにしてください。`}
    else if(ta==null||tb==null){ok=false;msg=`${ta==null?a+'T ':''}${tb==null&&b!==a?b+'T ':''}が未認識です。先にターン自動解析を実行してください。`}
    const end=ok?endBoundary(b,tb):null,start=ok?Math.max(0,ta-PRE):null;
    btn.disabled=!ok;if(status)status.textContent=ok?`${a}T〜${b}Tを軽量解析できます。`:msg;
    if(detail)detail.textContent=ok?`収録予定：${fmt(start)} 〜 ${fmt(end)}\n0.5秒ごとに軽量走査 → 変化点・ターン境界・約2秒ごとの保険画像だけ保存\n画像：最大${MAX_FRAMES}枚 / 横${OUT_WIDTH}px / JPEG ${Math.round(JPEG_Q*100)}%`:'';
    return {ok,a,b,ta,tb,start,end};
  }
  async function seekSafe(t,reason='range-review-v451'){t=Math.max(0,Math.min(video.duration-.05,t));if(Math.abs(video.currentTime-t)>.025)await seek(t,reason);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))}
  function signature(){
    const src=frameCanvas(360),c=document.createElement('canvas');c.width=48;c.height=22;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(src,0,0,c.width,c.height);const d=x.getImageData(0,0,c.width,c.height).data,a=new Uint8Array(c.width*c.height);let j=0;for(let i=0;i<d.length;i+=4)a[j++]=Math.round(.299*d[i]+.587*d[i+1]+.114*d[i+2]);return a;
  }
  function sigDiff(a,b){if(!a||!b||a.length!==b.length)return 0;let s=0;for(let i=0;i<a.length;i++)s+=Math.abs(a[i]-b[i]);return s/(a.length*255)}
  function median(a){if(!a.length)return 0;const b=a.slice().sort((x,y)=>x-y),m=b.length>>1;return b.length%2?b[m]:(b[m-1]+b[m])/2}
  function percentile(a,p){if(!a.length)return 0;const b=a.slice().sort((x,y)=>x-y),i=Math.min(b.length-1,Math.max(0,Math.floor((b.length-1)*p)));return b[i]}
  function nearestIndex(rows,t){let bi=0,bd=Infinity;for(let i=0;i<rows.length;i++){const d=Math.abs(rows[i].time-t);if(d<bd){bd=d;bi=i}}return bi}
  function mergeNear(items,minGap=.13){const a=items.slice().sort((x,y)=>x.time-y.time),out=[];for(const it of a){const last=out[out.length-1];if(last&&it.time-last.time<minGap){if(it.priority>last.priority)out[out.length-1]=it}else out.push(it)}return out}

  async function selectKeyframes(v){
    const rows=[];let prev=null,scanCount=0;for(let t=v.start;t<=v.end+.001;t+=SCAN_STEP){await seekSafe(t,'range-scan-v451');const sig=signature(),diff=prev?sigDiff(prev,sig):0;rows.push({time:+t.toFixed(3),diff});prev=sig;scanCount++;if(status)status.textContent=`重要場面を軽量走査中… ${scanCount}`}
    const diffs=rows.slice(1).map(r=>r.diff),med=median(diffs),mad=median(diffs.map(x=>Math.abs(x-med))),p70=percentile(diffs,.70),threshold=Math.max(.026,med+mad*2.0,p70*.82);
    const picks=[];const add=(time,priority,reason,diff=0)=>{if(time<v.start-.02||time>v.end+.02)return;picks.push({time:+time.toFixed(3),priority,reason,diff})};
    add(v.start,100,'range-start');add(v.end,100,'range-end');add(v.ta,120,'start-turn');add(v.tb,120,'end-turn');
    const anchors=timeline().filter(x=>x.time>=v.start-.1&&x.time<=v.end+.1);for(const a of anchors){add(a.time,115,`turn-${a.side}-${a.turn}`);const i=nearestIndex(rows,a.time);if(i>0)add(rows[i-1].time,88,'before-turn');if(i<rows.length-1)add(rows[i+1].time,88,'after-turn')}
    for(let t=v.start;t<=v.end+.001;t+=HEARTBEAT){const i=nearestIndex(rows,t);add(rows[i].time,36,'continuity',rows[i].diff)}
    for(let i=1;i<rows.length;i++){const cur=rows[i].diff,pr=rows[i-1]?.diff??0,nx=rows[i+1]?.diff??0;if(cur>=threshold&&cur>=pr&&cur>=nx){add(rows[i-1].time,72+cur*100,'before-change',cur);add(rows[i].time,82+cur*120,'change',cur)}}
    const strongest=rows.slice(1).sort((a,b)=>b.diff-a.diff).slice(0,10);for(const r of strongest){add(r.time,68+r.diff*100,'strong-change',r.diff)}
    let merged=mergeNear(picks);
    // 大きな空白が出ないよう、2.6秒超の隙間には保険画像を1枚追加。
    const gapAdds=[];for(let i=1;i<merged.length;i++){const a=merged[i-1],b=merged[i];if(b.time-a.time>2.6){const mid=(a.time+b.time)/2,j=nearestIndex(rows,mid);gapAdds.push({time:rows[j].time,priority:44,reason:'gap-fill',diff:rows[j].diff})}}
    merged=mergeNear([...merged,...gapAdds]);
    if(merged.length>MAX_FRAMES){const must=merged.filter(x=>x.priority>=100),rest=merged.filter(x=>x.priority<100).sort((a,b)=>b.priority-a.priority||b.diff-a.diff).slice(0,Math.max(0,MAX_FRAMES-must.length));merged=mergeNear([...must,...rest]).sort((a,b)=>a.time-b.time)}
    return {rows,selected:merged,threshold:+threshold.toFixed(4),medianDiff:+med.toFixed(4),mad:+mad.toFixed(4)};
  }
  function ensureJSZip(){if(window.JSZip)return Promise.resolve(window.JSZip);return new Promise((resolve,reject)=>{const old=document.querySelector('script[data-jszip-v451],script[data-jszip-v45],script[data-jszip-v40],script[data-jszip-v41],script[data-jszip-v43],script[data-jszip-v431]');if(old){if(window.JSZip)return resolve(window.JSZip);old.addEventListener('load',()=>resolve(window.JSZip),{once:true});old.addEventListener('error',()=>reject(new Error('ZIP機能の読み込みに失敗しました')),{once:true});return}const s=document.createElement('script');s.dataset.jszipV451='1';s.src='https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';s.onload=()=>window.JSZip?resolve(window.JSZip):reject(new Error('ZIP機能を初期化できませんでした'));s.onerror=()=>reject(new Error('ZIP機能の読み込みに失敗しました'));document.head.appendChild(s)})}
  function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),3000)}
  function safeName(s){return String(s||'replay').replace(/\.[^.]+$/,'').replace(/[^\w\u3040-\u30ff\u3400-\u9fff-]+/g,'_').slice(0,54)}
  function readme(v){return `Shadowverse: Worlds Beyond 複数ターン診断パッケージ v4.5.1\n\n対象：${v.a}T〜${v.b}T\n\n画像は0.5秒ごとの全保存ではなく、画面変化・ターン境界・約2秒ごとの保険画像から自動選別しています。時刻の飛びは意図的です。\nrange/frames/ をファイル名の時刻順に確認してください。\n\n重点評価：\n1. 各ターン開始時点のリーサル有無／リーサル逃し\n2. 顔・盤面処理・ドロー・展開の優先順位\n3. PP、EP、Extra PP、疾走・バーン等の温存\n4. ${v.a}Tの判断が${v.b}Tまでの勝ち筋へ与えた影響\n5. 実戦ルートと意味のある代替ルートの比較\n\n出力：区間総評、各ターン短評、リーサル／打点計算、最大の改善点1つ。\n相手の非公開手札は断定しないでください。Extra PPとEPは別物です。\n`;}

  async function exportRange(){
    const v=validate();if(!v.ok)return;const original=video.currentTime;video.pause();btn.disabled=true;const started=performance.now();
    try{
      const JSZip=await ensureJSZip();if(status)status.textContent='重要場面を抽出しています…';const sel=await selectKeyframes(v),zip=new JSZip(),rows=timeline(),times=sel.selected.map(x=>x.time);
      const manifest={format:'shadowverse-wb-range-review-v4.5.1',build:PATCH,source:videoName,createdAt:new Date().toISOString(),deck:$q('#deck')?.value||'',matchup:$q('#matchup')?.value||'',classDetection:window.classDetection442||null,mulliganPreview:window.mulliganPreview442||null,turnRecognition:{targetSide:targetSide(),firstSide:firstSide(),playOrder:$q('#playOrder')?.value||'',points:window.v39Points||points},range:{startTurn:v.a,endTurn:v.b,note:noteEl?.value||'',analysisStartTimeSeconds:+v.start.toFixed(3),analysisEndTimeSeconds:+v.end.toFixed(3),startTurnTimeSeconds:+v.ta.toFixed(3),endTurnTimeSeconds:+v.tb.toFixed(3),selection:{method:'adaptive-keyframes',scanIntervalSeconds:SCAN_STEP,continuityIntervalSeconds:HEARTBEAT,scanFrames:sel.rows.length,selectedFrames:times.length,changeThreshold:sel.threshold,medianDiff:sel.medianDiff,mad:sel.mad,outputWidth:OUT_WIDTH,jpegQuality:JPEG_Q,maxFrames:MAX_FRAMES},turnAnchors:rows.filter(x=>x.time>=v.start-.05&&x.time<=v.end+.05),frames:[]}};
      let done=0;for(const item of sel.selected){await seekSafe(item.time,'range-capture-v451');const c=frameCanvas(OUT_WIDTH),blob=await canvasBlob(c,JPEG_Q),file=`range/frames/frame-${String(done+1).padStart(3,'0')}-${item.time.toFixed(2)}s.jpg`;zip.file(file,blob,{compression:'STORE'});manifest.range.frames.push({file,timeSeconds:item.time,reason:item.reason,diff:+(item.diff||0).toFixed(4)});done++;if(status)status.textContent=`重要画像だけ保存中… ${done}/${times.length}`}
      const mt=window.mulliganPreview442?.time;if(Number.isFinite(Number(mt))){await seekSafe(Number(mt),'range-context-mulligan-v451');const c=frameCanvas(OUT_WIDTH),blob=await canvasBlob(c,JPEG_Q);zip.file('context/mulligan-initial-hand.jpg',blob,{compression:'STORE'});manifest.mulliganPreview={...(manifest.mulliganPreview||{}),file:'context/mulligan-initial-hand.jpg'}}
      manifest.performance={elapsedBeforeZipMs:Math.round(performance.now()-started)};zip.file('range-review.json',JSON.stringify(manifest,null,2));zip.file('README.txt',readme(v));if(status)status.textContent='ZIPを仕上げています…';const blob=await zip.generateAsync({type:'blob',compression:'STORE'});manifest.performance.totalElapsedMs=Math.round(performance.now()-started);download(blob,`${safeName(videoName)}-turn-${v.a}-to-${v.b}-review-v4.5.1.zip`);if(status)status.textContent=`完了：${sel.rows.length}枚を走査 → ${times.length}枚だけ保存（約${((performance.now()-started)/1000).toFixed(1)}秒）。`;try{log('range-review-export-v451',{patch:PATCH,startTurn:v.a,endTurn:v.b,scanFrames:sel.rows.length,selectedFrames:times.length,threshold:sel.threshold,elapsedMs:Math.round(performance.now()-started)})}catch{}
    }catch(err){console.error(err);if(status)status.textContent='区間ZIP作成失敗：'+(err?.message||String(err));try{log('range-review-error-v451',{message:err?.message||String(err)})}catch{}
    }finally{try{await seekSafe(original,'range-review-return-v451')}catch{}validate()}
  }

  btn.addEventListener('click',exportRange);startEl?.addEventListener('input',validate);endEl?.addEventListener('input',validate);$q('#targetSide')?.addEventListener('change',validate);$q('#playOrder')?.addEventListener('change',validate);video?.addEventListener('loadedmetadata',()=>setTimeout(validate,300));$q('#videoFile')?.addEventListener('change',()=>setTimeout(validate,350));
  const watch=setInterval(validate,1200);setTimeout(()=>clearInterval(watch),120000);validate();
  try{log('patch-v451-active',{patch:PATCH,scanStep:SCAN_STEP,maxFrames:MAX_FRAMES,width:OUT_WIDTH,quality:JPEG_Q})}catch{}
})();
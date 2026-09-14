(()=>{
  const PATCH='4.5-20260914-22';
  const $q=s=>document.querySelector(s);
  const header=$q('header h1'),sub=$q('header p');
  if(header)header.textContent='シャドバWB リプレイ診断 v4.5';
  if(sub)sub.textContent='Build 2026.09.14-22 / 複数ターン区間診断';

  const capturePanel=$q('#capture')?.closest('.panel');
  let panel=$q('#rangeReviewPanel45');
  if(!panel){
    panel=document.createElement('section');panel.id='rangeReviewPanel45';panel.className='panel';
    if(capturePanel)capturePanel.parentNode.insertBefore(panel,capturePanel.nextSibling);
  }
  panel.innerHTML=`
    <h2>複数ターンをまとめて診断</h2>
    <p class="help">例：6T〜8Tを、開始前2秒から8T終了後まで連続画像としてまとめます。相手ターンも途中に含めます。</p>
    <div class="grid">
      <label>開始ターン<input id="rangeStart45" type="number" min="1" max="10" value="6"></label>
      <label>終了ターン<input id="rangeEnd45" type="number" min="1" max="10" value="8"></label>
    </div>
    <label>迷った点 / 見てほしいこと<textarea id="rangeNote45" placeholder="例：6〜8Tの打点温存とドロー判断。8Tリーサルを逃していないか"></textarea></label>
    <div class="buttons"><button id="exportRange45" class="good" disabled>この区間をChatGPT用ZIPにする</button></div>
    <p id="rangeStatus45" class="help">ターン解析後、開始・終了ターンを選んでください。</p>
    <div id="rangeDetail45" class="ocrRead"></div>`;

  const startEl=$q('#rangeStart45'),endEl=$q('#rangeEnd45'),noteEl=$q('#rangeNote45'),btn=$q('#exportRange45'),status=$q('#rangeStatus45'),detail=$q('#rangeDetail45');
  const STEP=.5,PRE=2.0,MAX_TURNS=5;
  function targetSide(){return $q('#targetSide')?.value||'bottom'}
  function firstSide(){return $q('#playOrder')?.value==='先攻'?'bottom':'top'}
  function ttime(t){const v=turnMap?.[Number(t)]?.time;return Number.isFinite(Number(v))?Number(v):null}
  function timeline(){return (window.turnTimeline39||[]).map(x=>({side:x.side,turn:Number(x.turn),time:Number(x.time)})).filter(x=>Number.isFinite(x.time)).sort((a,b)=>a.time-b.time)}
  function endBoundary(endTurn,endTime){
    const side=targetSide(),rows=timeline(),opp=rows.find(x=>x.time>endTime+.25&&x.side!==side);
    if(opp)return Math.min(video.duration-.1,opp.time+.12);
    const next=ttime(Number(endTurn)+1);if(next!=null)return Math.min(video.duration-.1,next-.15);
    return Math.min(video.duration-.1,endTime+7);
  }
  function validate(){
    const a=Number(startEl?.value),b=Number(endEl?.value),ta=ttime(a),tb=ttime(b),loaded=video?.src&&Number.isFinite(video.duration)&&video.duration>0;
    let msg='',ok=true;
    if(!loaded){ok=false;msg='先に動画を選んでください。'}
    else if(!Number.isInteger(a)||!Number.isInteger(b)||a<1||b<1||a>10||b>10){ok=false;msg='1〜10Tの範囲で指定してください。'}
    else if(a>b){ok=false;msg='開始ターンは終了ターン以下にしてください。'}
    else if(b-a+1>MAX_TURNS){ok=false;msg=`一度に${MAX_TURNS}ターンまでにしてください。`}
    else if(ta==null||tb==null){ok=false;msg=`${ta==null?a+'T ':''}${tb==null&&b!==a?b+'T ':''}が未認識です。先にターン自動解析を実行してください。`}
    const end=ok?endBoundary(b,tb):null,start=ok?Math.max(0,ta-PRE):null;
    if(btn)btn.disabled=!ok;
    if(status)status.textContent=ok?`${a}T〜${b}Tをまとめて診断できます。`:msg;
    if(detail)detail.textContent=ok?`収録予定：${fmt(start)} 〜 ${fmt(end)}\n対象側：${targetSide()==='bottom'?'下側':'上側'} / 先攻側：${firstSide()==='bottom'?'下側':'上側'}\n0.5秒間隔＋認識ターン境界を追加`:'';
    return {ok,a,b,ta,tb,start,end};
  }

  async function seekSafe(t,reason='range-review-v45'){
    t=Math.max(0,Math.min(video.duration-.05,t));if(Math.abs(video.currentTime-t)>.025)await seek(t,reason);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  }
  function frameTimes(v){
    const a=[];for(let t=v.start;t<=v.end+.001&&a.length<90;t+=STEP)a.push(+t.toFixed(3));
    const anchors=timeline().filter(x=>x.time>=v.start-.05&&x.time<=v.end+.05).map(x=>+x.time.toFixed(3));anchors.push(+v.ta.toFixed(3),+v.tb.toFixed(3));
    return [...new Set([...a,...anchors])].sort((x,y)=>x-y).slice(0,90);
  }
  function ensureJSZip(){
    if(window.JSZip)return Promise.resolve(window.JSZip);
    return new Promise((resolve,reject)=>{const old=document.querySelector('script[data-jszip-v45],script[data-jszip-v40],script[data-jszip-v41],script[data-jszip-v43],script[data-jszip-v431]');if(old){if(window.JSZip)return resolve(window.JSZip);old.addEventListener('load',()=>resolve(window.JSZip),{once:true});old.addEventListener('error',()=>reject(new Error('ZIP機能の読み込みに失敗しました')),{once:true});return}const s=document.createElement('script');s.dataset.jszipV45='1';s.src='https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';s.onload=()=>window.JSZip?resolve(window.JSZip):reject(new Error('ZIP機能を初期化できませんでした'));s.onerror=()=>reject(new Error('ZIP機能の読み込みに失敗しました'));document.head.appendChild(s)})
  }
  function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),3000)}
  function safeName(s){return String(s||'replay').replace(/\.[^.]+$/,'').replace(/[^\w\u3040-\u30ff\u3400-\u9fff-]+/g,'_').slice(0,54)}
  function readme(v){return `Shadowverse: Worlds Beyond 複数ターン診断パッケージ v4.5\n\n対象：${v.a}T〜${v.b}T\n\nrange/frames/ を時系列順に確認してください。相手ターンも含まれています。\n\n重点評価：\n1. 各ターン開始時点でリーサルが存在したか／リーサル逃しがないか\n2. 顔・盤面処理・ドロー・展開の優先順位\n3. PP、EP、Extra PP、疾走・バーン等の打点札を早く使いすぎていないか\n4. ${v.a}Tの判断が${v.b}Tまでの勝ち筋にどう影響したか\n5. 実戦ルートと、意味のある最善代替ルートを比較\n\n出力希望：\n- 区間総評：◎/○/△/× + 2〜4行\n- 各ターン：Turn | Play | Grade | 一行理由 | 有意な場合のみ最善代替\n- リーサル／打点計算：あれば明示\n- 最大の改善点：1つ\n\n相手の非公開手札は断定しないでください。Extra PPとEPは別物です。\n`;}

  async function exportRange(){
    const v=validate();if(!v.ok)return;const original=video.currentTime;video.pause();btn.disabled=true;
    try{
      if(status)status.textContent='区間ZIPを準備中…';const JSZip=await ensureJSZip(),zip=new JSZip(),times=frameTimes(v),rows=timeline();
      const manifest={format:'shadowverse-wb-range-review-v4.5',build:PATCH,source:videoName,createdAt:new Date().toISOString(),deck:$q('#deck')?.value||'',matchup:$q('#matchup')?.value||'',classDetection:window.classDetection442||null,mulliganPreview:window.mulliganPreview442||null,turnRecognition:{targetSide:targetSide(),firstSide:firstSide(),playOrder:$q('#playOrder')?.value||'',points:window.v39Points||points},range:{startTurn:v.a,endTurn:v.b,note:noteEl?.value||'',analysisStartTimeSeconds:+v.start.toFixed(3),analysisEndTimeSeconds:+v.end.toFixed(3),startTurnTimeSeconds:+v.ta.toFixed(3),endTurnTimeSeconds:+v.tb.toFixed(3),frameIntervalSeconds:STEP,turnAnchors:rows.filter(x=>x.time>=v.start-.05&&x.time<=v.end+.05),frames:[]}};
      let done=0;for(const t of times){await seekSafe(t);const c=frameCanvas(1600),blob=await canvasBlob(c,.83),file=`range/frames/frame-${String(done+1).padStart(3,'0')}-${t.toFixed(2)}s.jpg`;zip.file(file,blob);manifest.range.frames.push({file,timeSeconds:t});done++;if(status)status.textContent=`区間画像を作成中… ${done}/${times.length}`}
      const mt=window.mulliganPreview442?.time;if(Number.isFinite(Number(mt))){await seekSafe(Number(mt),'range-context-mulligan-v45');const c=frameCanvas(1600),blob=await canvasBlob(c,.84);zip.file('context/mulligan-initial-hand.jpg',blob);manifest.mulliganPreview={...(manifest.mulliganPreview||{}),file:'context/mulligan-initial-hand.jpg'}}
      zip.file('range-review.json',JSON.stringify(manifest,null,2));zip.file('README.txt',readme(v));if(status)status.textContent='ZIP圧縮中…';const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}});download(blob,`${safeName(videoName)}-turn-${v.a}-to-${v.b}-review-v4.5.zip`);if(status)status.textContent=`完了：${v.a}T〜${v.b}T / ${times.length}枚を書き出しました。`;try{log('range-review-export-v45',{patch:PATCH,startTurn:v.a,endTurn:v.b,start:v.start,end:v.end,frames:times.length,note:noteEl?.value||''})}catch{}
    }catch(err){console.error(err);if(status)status.textContent='区間ZIP作成失敗：'+(err?.message||String(err));try{log('range-review-error-v45',{message:err?.message||String(err)})}catch{}
    }finally{try{await seekSafe(original,'range-review-return-v45')}catch{}validate()}
  }

  startEl?.addEventListener('input',validate);endEl?.addEventListener('input',validate);$q('#targetSide')?.addEventListener('change',validate);$q('#playOrder')?.addEventListener('change',validate);btn?.addEventListener('click',exportRange);
  $q('#scanTurns')?.addEventListener('click',()=>setTimeout(validate,1200));video?.addEventListener('loadedmetadata',()=>setTimeout(validate,300));$q('#videoFile')?.addEventListener('change',()=>setTimeout(validate,350));
  const watcher=setInterval(validate,1200);setTimeout(()=>clearInterval(watcher),120000);validate();
  try{log('patch-v45-active',{patch:PATCH,maxTurns:MAX_TURNS,step:STEP})}catch{}
})();
(()=>{
  const PATCH='4.6-20260914-27';
  const $q=s=>document.querySelector(s);
  const header=$q('header h1'),sub=$q('header p');
  if(header)header.textContent='シャドバWB リプレイ診断 v4.6';
  if(sub)sub.textContent='Build 2026.09.14-27 / 複数ターン診断統合 + iPhone ZIP保存';

  // 旧v4.5系のUIを完全に捨て、競合しない単一パネルへ統合する。
  for(const sel of ['#rangeReviewPanel45','#rangeSaveWrap452','#rangeDownloadWrap453','#rangeDownloadWrap454']){
    const el=$q(sel); if(el) el.remove();
  }

  const capturePanel=$q('#capture')?.closest('.panel');
  const panel=document.createElement('section');
  panel.id='rangeReviewPanel46'; panel.className='panel';
  panel.innerHTML=`
    <h2>複数ターンをまとめて診断</h2>
    <p class="help">指定した複数ターンを、重要場面だけに絞ってZIPへまとめます。相手ターンも途中に含めます。</p>
    <div class="grid">
      <label>開始ターン<input id="rangeStart46" type="number" min="1" max="10" value="5"></label>
      <label>終了ターン<input id="rangeEnd46" type="number" min="1" max="10" value="7"></label>
    </div>
    <label>迷った点 / 見てほしいこと<textarea id="rangeNote46" placeholder="例：5〜7Tの打点温存、ドロー判断、リーサル逃しを確認"></textarea></label>
    <div class="buttons"><button id="exportRange46" class="good" disabled>重要場面を抽出してZIPを作る</button></div>
    <p id="rangeStatus46" class="help">ターン解析後、開始・終了ターンを選んでください。</p>
    <div id="rangeDetail46" class="ocrRead"></div>
    <div id="rangeSave46" style="display:none;margin-top:12px;padding:12px;border:1px solid rgba(255,255,255,.15);border-radius:10px">
      <div id="rangeSaveInfo46" class="help" style="margin-bottom:8px"></div>
      <div class="buttons"><button id="rangeSaveBtn46" class="good">ZIPをファイルに保存</button><button id="rangeDiscard46">破棄</button></div>
      <div class="muted" style="margin-top:6px">iPhoneでは「ZIPをファイルに保存」→ 共有シートの「ファイルに保存」を選んでください。Quick Lookへ直接開く方式は使用しません。</div>
    </div>`;
  if(capturePanel)capturePanel.parentNode.insertBefore(panel,capturePanel.nextSibling);else document.body.appendChild(panel);

  const startEl=$q('#rangeStart46'),endEl=$q('#rangeEnd46'),noteEl=$q('#rangeNote46'),btn=$q('#exportRange46'),status=$q('#rangeStatus46'),detail=$q('#rangeDetail46');
  const saveWrap=$q('#rangeSave46'),saveInfo=$q('#rangeSaveInfo46'),saveBtn=$q('#rangeSaveBtn46'),discardBtn=$q('#rangeDiscard46');
  const PRE=2.0,MAX_TURNS=5,SCAN_STEP=1.0,HEARTBEAT=2.5,MAX_FRAMES=30,OUT_WIDTH=1200,JPEG_Q=.68;
  let pendingFile=null,busy=false;

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
  function validate(show=true){
    const a=Number(startEl.value),b=Number(endEl.value),ta=ttime(a),tb=ttime(b),loaded=video?.src&&Number.isFinite(video.duration)&&video.duration>0;
    let ok=true,msg='';
    if(!loaded){ok=false;msg='先に動画を選んでください。'}
    else if(!Number.isInteger(a)||!Number.isInteger(b)||a<1||b<1||a>10||b>10){ok=false;msg='1〜10Tの範囲で指定してください。'}
    else if(a>b){ok=false;msg='開始ターンは終了ターン以下にしてください。'}
    else if(b-a+1>MAX_TURNS){ok=false;msg=`一度に${MAX_TURNS}ターンまでにしてください。`}
    else if(ta==null||tb==null){ok=false;msg=`${ta==null?a+'T ':''}${tb==null&&b!==a?b+'T ':''}が未認識です。先にターン自動解析を実行してください。`}
    const start=ok?Math.max(0,ta-PRE):null,end=ok?endBoundary(b,tb):null;
    btn.disabled=!ok||busy;
    if(show&&!busy)status.textContent=ok?`${a}T〜${b}Tをまとめて診断できます。`:msg;
    if(detail)detail.textContent=ok?`収録予定：${fmt(start)} 〜 ${fmt(end)}\n軽量走査：1.0秒間隔 / 保存：最大${MAX_FRAMES}枚\n画像：横${OUT_WIDTH}px / JPEG ${Math.round(JPEG_Q*100)}%\n保存後はiPhone共有シートから「ファイルに保存」`:'';
    return {ok,a,b,ta,tb,start,end};
  }
  async function seekSafe(t,reason='range-review-v46'){
    t=Math.max(0,Math.min(video.duration-.05,t));
    if(Math.abs(video.currentTime-t)>.025)await seek(t,reason);
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  }
  function signature(){
    const src=frameCanvas(320),c=document.createElement('canvas');c.width=40;c.height=18;
    const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(src,0,0,c.width,c.height);
    const d=x.getImageData(0,0,c.width,c.height).data,a=new Uint8Array(c.width*c.height);let j=0;
    for(let i=0;i<d.length;i+=4)a[j++]=Math.round(.299*d[i]+.587*d[i+1]+.114*d[i+2]);
    return a;
  }
  function sigDiff(a,b){if(!a||!b||a.length!==b.length)return 0;let s=0;for(let i=0;i<a.length;i++)s+=Math.abs(a[i]-b[i]);return s/(a.length*255)}
  function median(a){if(!a.length)return 0;const b=a.slice().sort((x,y)=>x-y),m=b.length>>1;return b.length%2?b[m]:(b[m-1]+b[m])/2}
  function percentile(a,p){if(!a.length)return 0;const b=a.slice().sort((x,y)=>x-y),i=Math.min(b.length-1,Math.max(0,Math.floor((b.length-1)*p)));return b[i]}
  function nearest(rows,t){let best=rows[0],bd=Infinity;for(const r of rows){const d=Math.abs(r.time-t);if(d<bd){bd=d;best=r}}return best}
  function merge(items,gap=.18){const a=items.slice().sort((x,y)=>x.time-y.time),out=[];for(const it of a){const last=out[out.length-1];if(last&&it.time-last.time<gap){if(it.priority>last.priority)out[out.length-1]=it}else out.push(it)}return out}

  async function selectFrames(v){
    const rows=[];let prev=null,n=0;
    for(let t=v.start;t<=v.end+.001;t+=SCAN_STEP){
      await seekSafe(t,'range-scan-v46');const sig=signature(),diff=prev?sigDiff(prev,sig):0;rows.push({time:+t.toFixed(3),diff});prev=sig;n++;
      status.textContent=`重要場面を走査中… ${n}`;
    }
    const diffs=rows.slice(1).map(r=>r.diff),med=median(diffs),mad=median(diffs.map(x=>Math.abs(x-med))),p70=percentile(diffs,.70);
    const threshold=Math.max(.025,med+mad*1.8,p70*.82),picks=[];
    const add=(time,priority,reason,diff=0)=>{if(time<v.start-.05||time>v.end+.05)return;picks.push({time:+time.toFixed(3),priority,reason,diff})};
    add(v.start,120,'range-start');add(v.end,120,'range-end');add(v.ta,140,'start-turn');add(v.tb,140,'end-turn');
    const anchors=timeline().filter(x=>x.time>=v.start-.1&&x.time<=v.end+.1);
    for(const a of anchors){add(a.time,135,`turn-${a.side}-${a.turn}`);add(a.time-.35,98,'before-turn');add(a.time+.35,98,'after-turn')}
    for(let t=v.start;t<=v.end+.001;t+=HEARTBEAT){const r=nearest(rows,t);add(r.time,45,'continuity',r.diff)}
    for(let i=1;i<rows.length;i++){
      const cur=rows[i].diff,prevD=rows[i-1]?.diff??0,nextD=rows[i+1]?.diff??0;
      if(cur>=threshold&&cur>=prevD&&cur>=nextD){
        const mid=(rows[i-1].time+rows[i].time)/2;
        add(rows[i-1].time,82+cur*100,'before-change',cur);add(mid,90+cur*115,'change-midpoint',cur);add(rows[i].time,88+cur*110,'change',cur);
      }
    }
    for(const r of rows.slice(1).sort((a,b)=>b.diff-a.diff).slice(0,8)){add(r.time,78+r.diff*100,'strong-change',r.diff);if(r.time-SCAN_STEP/2>=v.start)add(r.time-SCAN_STEP/2,74+r.diff*90,'strong-change-midpoint',r.diff)}
    let selected=merge(picks);
    // 3秒以上空かないよう最低限の連続性を確保。
    for(let pass=0;pass<2;pass++){
      const extra=[];for(let i=1;i<selected.length;i++){const a=selected[i-1],b=selected[i];if(b.time-a.time>3.0){const r=nearest(rows,(a.time+b.time)/2);extra.push({time:r.time,priority:52,reason:'gap-fill',diff:r.diff})}}
      selected=merge([...selected,...extra]);
    }
    if(selected.length>MAX_FRAMES){
      const must=selected.filter(x=>x.priority>=120),rest=selected.filter(x=>x.priority<120).sort((a,b)=>b.priority-a.priority||b.diff-a.diff).slice(0,Math.max(0,MAX_FRAMES-must.length));
      selected=merge([...must,...rest]).sort((a,b)=>a.time-b.time);
    }
    return {rows,selected,threshold:+threshold.toFixed(4),medianDiff:+med.toFixed(4),mad:+mad.toFixed(4)};
  }
  function ensureJSZip(){
    if(window.JSZip)return Promise.resolve(window.JSZip);
    return new Promise((resolve,reject)=>{
      const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';s.dataset.jszipV46='1';
      s.onload=()=>window.JSZip?resolve(window.JSZip):reject(new Error('ZIP機能を初期化できませんでした'));
      s.onerror=()=>reject(new Error('ZIP機能の読み込みに失敗しました'));document.head.appendChild(s);
    });
  }
  function safeName(s){return String(s||'replay').replace(/\.[^.]+$/,'').replace(/[^\w\u3040-\u30ff\u3400-\u9fff-]+/g,'_').slice(0,54)}
  function humanSize(n){return n<1048576?`${Math.round(n/1024)} KB`:`${(n/1048576).toFixed(1)} MB`}
  function readme(v){return `Shadowverse: Worlds Beyond 複数ターン診断パッケージ v4.6\n\n対象：${v.a}T〜${v.b}T\n画像は重要場面・ターン境界・連続性用フレームだけに自動選別しています。\nrange/frames/ をファイル名の時刻順に確認してください。\n\n重点評価：\n1. 各ターン開始時点のリーサル有無／リーサル逃し\n2. 顔・盤面処理・ドロー・展開の優先順位\n3. PP、EP、Extra PP、疾走・バーン等の温存\n4. ${v.a}Tの判断が${v.b}Tまでの勝ち筋へ与えた影響\n5. 実戦ルートと意味のある代替ルートの比較\n\n相手の非公開手札は断定しないでください。Extra PPとEPは別物です。\n`;}

  async function exportRange(){
    const v=validate(false);if(!v.ok||busy)return;busy=true;btn.disabled=true;pendingFile=null;saveWrap.style.display='none';const original=video.currentTime,started=performance.now();video.pause();
    try{
      const JSZip=await ensureJSZip();status.textContent='重要場面を抽出しています…';const sel=await selectFrames(v),zip=new JSZip(),rows=timeline();
      const manifest={format:'shadowverse-wb-range-review-v4.6',build:PATCH,source:videoName,createdAt:new Date().toISOString(),deck:$q('#deck')?.value||'',matchup:$q('#matchup')?.value||'',classDetection:window.classDetection442||null,mulliganPreview:window.mulliganPreview442||null,turnRecognition:{targetSide:targetSide(),firstSide:firstSide(),playOrder:$q('#playOrder')?.value||'',points:window.v39Points||points},range:{startTurn:v.a,endTurn:v.b,note:noteEl.value||'',analysisStartTimeSeconds:+v.start.toFixed(3),analysisEndTimeSeconds:+v.end.toFixed(3),startTurnTimeSeconds:+v.ta.toFixed(3),endTurnTimeSeconds:+v.tb.toFixed(3),selection:{method:'coarse-adaptive-keyframes-v46',scanIntervalSeconds:SCAN_STEP,continuityIntervalSeconds:HEARTBEAT,scanFrames:sel.rows.length,selectedFrames:sel.selected.length,changeThreshold:sel.threshold,medianDiff:sel.medianDiff,mad:sel.mad,outputWidth:OUT_WIDTH,jpegQuality:JPEG_Q,maxFrames:MAX_FRAMES},turnAnchors:rows.filter(x=>x.time>=v.start-.05&&x.time<=v.end+.05),frames:[]}};
      let done=0;for(const item of sel.selected){
        await seekSafe(item.time,'range-capture-v46');const c=frameCanvas(OUT_WIDTH),blob=await canvasBlob(c,JPEG_Q),file=`range/frames/frame-${String(done+1).padStart(3,'0')}-${item.time.toFixed(2)}s.jpg`;
        zip.file(file,blob,{compression:'STORE'});manifest.range.frames.push({file,timeSeconds:item.time,reason:item.reason,diff:+(item.diff||0).toFixed(4)});done++;status.textContent=`重要画像を保存中… ${done}/${sel.selected.length}`;
      }
      const mt=window.mulliganPreview442?.time;if(Number.isFinite(Number(mt))){await seekSafe(Number(mt),'range-context-mulligan-v46');const c=frameCanvas(OUT_WIDTH),blob=await canvasBlob(c,JPEG_Q);zip.file('context/mulligan-initial-hand.jpg',blob,{compression:'STORE'});manifest.mulliganPreview={...(manifest.mulliganPreview||{}),file:'context/mulligan-initial-hand.jpg'}}
      manifest.performance={elapsedBeforeZipMs:Math.round(performance.now()-started)};zip.file('range-review.json',JSON.stringify(manifest,null,2));zip.file('README.txt',readme(v));status.textContent='ZIPを仕上げています…';
      const blob=await zip.generateAsync({type:'blob',compression:'STORE'}),name=`${safeName(videoName)}-turn-${v.a}-to-${v.b}-review-v4.6.zip`;
      pendingFile=new File([blob],name,{type:'application/zip',lastModified:Date.now()});
      saveInfo.textContent=`ZIP準備完了：${name}（${humanSize(pendingFile.size)}） / ${sel.rows.length}枚走査 → ${sel.selected.length}枚保存 / 約${((performance.now()-started)/1000).toFixed(1)}秒`;
      saveWrap.style.display='block';status.textContent='ZIP作成完了。「ZIPをファイルに保存」をタップしてください。';
      try{log('range-review-ready-v46',{patch:PATCH,startTurn:v.a,endTurn:v.b,scanFrames:sel.rows.length,selectedFrames:sel.selected.length,size:pendingFile.size,elapsedMs:Math.round(performance.now()-started)})}catch{}
    }catch(err){console.error(err);status.textContent='ZIP作成失敗：'+(err?.message||String(err));try{log('range-review-error-v46',{message:err?.message||String(err)})}catch{}
    finally{try{await seekSafe(original,'range-review-return-v46')}catch{}busy=false;validate(false);btn.disabled=!validate(false).ok}
  }

  async function saveFile(){
    if(!pendingFile)return;
    try{
      if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[pendingFile]}))){
        await navigator.share({files:[pendingFile],title:'Shadowverse WB 診断ZIP'});
        status.textContent='保存／共有画面を開きました。「ファイルに保存」を選べます。';
        try{log('range-review-save-v46',{patch:PATCH,name:pendingFile.name,size:pendingFile.size,method:'web-share-file'})}catch{}
      }else{
        status.textContent='このSafariではファイル保存用共有シートを利用できません。';
      }
    }catch(err){
      if(err?.name==='AbortError'){status.textContent='保存をキャンセルしました。ZIPはこの画面に残っています。';return}
      console.error(err);status.textContent='保存画面を開けませんでした：'+(err?.message||String(err));
    }
  }
  function discard(){pendingFile=null;saveWrap.style.display='none';saveInfo.textContent='';validate(true)}

  btn.addEventListener('click',exportRange);saveBtn.addEventListener('click',saveFile);discardBtn.addEventListener('click',discard);
  for(const el of [startEl,endEl,$q('#targetSide'),$q('#playOrder')])el?.addEventListener('change',()=>validate(true));
  video?.addEventListener('loadedmetadata',()=>setTimeout(()=>validate(true),250));$q('#videoFile')?.addEventListener('change',()=>setTimeout(()=>{pendingFile=null;saveWrap.style.display='none';validate(true)},350));
  const watcher=setInterval(()=>{if(!busy)validate(true)},1200);setTimeout(()=>clearInterval(watcher),120000);
  validate(true);
  try{log('patch-v46-active',{patch:PATCH,saveFlow:'explicit-web-share-file',maxFrames:MAX_FRAMES,scanStep:SCAN_STEP})}catch{}
})();
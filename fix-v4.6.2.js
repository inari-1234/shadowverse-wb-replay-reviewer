(()=>{
  const PATCH='4.6.2-20260914-29';
  const $q=s=>document.querySelector(s);
  const safeLog=(type,data={})=>{try{log(type,{patch:PATCH,...data})}catch{}};

  // Header + update control first. This must survive even if later range logic fails.
  const header=$q('header h1'),sub=$q('header p'),head=$q('header');
  if(header)header.textContent='シャドバWB リプレイ診断 v4.6.2';
  if(sub)sub.textContent='Build 2026.09.14-29 / 複数ターンUI復旧 + iPhone保存安定化';
  $q('#wbLatestBar461')?.remove();
  let updateBar=$q('#wbLatestBar462');
  if(head&&!updateBar){
    updateBar=document.createElement('div');updateBar.id='wbLatestBar462';
    updateBar.style.cssText='display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:8px';
    updateBar.innerHTML='<button id="wbForceLatest462" type="button" style="padding:7px 10px;background:#2563eb">最新版に更新</button><span id="wbUpdateStatus462" style="font-size:11px;color:#9ba8bf">最新版を確認できます。</span>';
    head.appendChild(updateBar);
  }
  const updateBtn=$q('#wbForceLatest462'),updateSt=$q('#wbUpdateStatus462');
  updateBtn?.addEventListener('click',async()=>{
    if(updateBtn.disabled)return;updateBtn.disabled=true;if(updateSt)updateSt.textContent='最新版を確認中…';
    try{
      if('serviceWorker'in navigator){
        const reg=await navigator.serviceWorker.register('./sw.js?v=4.6.2-20260914-29',{updateViaCache:'none'});await reg.update();
      }
      if('caches'in window){const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('wb-review-')&&k!=='wb-review-v4-6-2-20260914-29').map(k=>caches.delete(k)));}
      if(updateSt)updateSt.textContent='更新確認完了。最新版で再起動します…';
      setTimeout(()=>{const u=new URL(location.href);u.searchParams.set('latest','462-'+Date.now());u.hash='';location.replace(u.href)},180);
    }catch(e){if(updateSt)updateSt.textContent='更新確認に失敗しました。通信を確認してください。';updateBtn.disabled=false;safeLog('force-latest-error-v462',{message:e?.message||String(e)});}
  });
  safeLog('patch-v462-header-active');

  try{
    // Remove all previous multi-turn panels to prevent duplicate/competing UI.
    for(const sel of ['#rangeReviewPanel45','#rangeReviewPanel46','#rangeReviewPanel462','#rangeSaveWrap452','#rangeDownloadWrap453','#rangeDownloadWrap454'])$q(sel)?.remove();

    const anchor=$q('#capture')?.closest('.panel')||$q('#turnMap')?.closest('.panel')||document.querySelector('main .panel');
    const panel=document.createElement('section');panel.id='rangeReviewPanel462';panel.className='panel';
    panel.innerHTML=`
      <h2>複数ターンをまとめて診断</h2>
      <p class="help">複数ターンの流れを、重要場面だけに絞ってZIPへまとめます。相手ターンも含めます。</p>
      <div class="grid">
        <label>開始ターン<input id="rangeStart462" type="number" min="1" max="10" value="5"></label>
        <label>終了ターン<input id="rangeEnd462" type="number" min="1" max="10" value="7"></label>
      </div>
      <label>迷った点 / 見てほしいこと<textarea id="rangeNote462" placeholder="例：5〜7Tの打点温存、ドロー判断、リーサル逃しを確認"></textarea></label>
      <div class="buttons"><button id="exportRange462" class="good" disabled>重要場面を抽出してZIPを作る</button></div>
      <p id="rangeStatus462" class="help">ターン解析後、開始・終了ターンを選んでください。</p>
      <div id="rangeDetail462" class="ocrRead"></div>
      <div id="rangeSave462" style="display:none;margin-top:12px;padding:12px;border:1px solid rgba(255,255,255,.15);border-radius:10px">
        <div id="rangeSaveInfo462" class="help" style="margin-bottom:8px"></div>
        <div class="buttons"><button id="rangeSaveBtn462" class="good">ZIPをファイルに保存</button><button id="rangeDiscard462">破棄</button></div>
        <div class="muted" style="margin-top:6px">ZIPはQuick Lookへ直接開きません。「ZIPをファイルに保存」を押し、iPhone共有シートで「ファイルに保存」を選んでください。</div>
      </div>`;
    if(anchor?.parentNode)anchor.parentNode.insertBefore(panel,anchor.nextSibling);else document.querySelector('main')?.appendChild(panel);
    safeLog('range-ui-mounted-v462',{anchor:anchor?.querySelector('h2')?.textContent||null});

    const startEl=$q('#rangeStart462'),endEl=$q('#rangeEnd462'),noteEl=$q('#rangeNote462'),btn=$q('#exportRange462'),status=$q('#rangeStatus462'),detail=$q('#rangeDetail462');
    const saveWrap=$q('#rangeSave462'),saveInfo=$q('#rangeSaveInfo462'),saveBtn=$q('#rangeSaveBtn462'),discardBtn=$q('#rangeDiscard462');
    const PRE=2,MAX_TURNS=5,SCAN_STEP=1,HEARTBEAT=2.5,MAX_FRAMES=30,OUT_WIDTH=1200,JPEG_Q=.68;
    let pendingFile=null,busy=false;
    const getVideo=()=>typeof video!=='undefined'?video:$q('#video');
    const getTurnMap=()=>typeof turnMap!=='undefined'?turnMap:{};
    const targetSide=()=>$q('#targetSide')?.value||'bottom';
    const firstSide=()=>$q('#playOrder')?.value==='先攻'?'bottom':'top';
    const ttime=t=>{const v=getTurnMap()?.[Number(t)]?.time;return Number.isFinite(Number(v))?Number(v):null};
    const timeline=()=>Array.isArray(window.turnTimeline39)?window.turnTimeline39.map(x=>({side:x.side,turn:Number(x.turn),time:Number(x.time)})).filter(x=>Number.isFinite(x.time)).sort((a,b)=>a.time-b.time):[];
    const fmt2=s=>{try{return fmt(s)}catch{return Number(s).toFixed(1)+'s'}};
    const endBoundary=(endTurn,endTime)=>{const v=getVideo(),rows=timeline(),side=targetSide(),opp=rows.find(x=>x.time>endTime+.25&&x.side!==side);if(opp)return Math.min(v.duration-.1,opp.time+.12);const next=ttime(Number(endTurn)+1);if(next!=null)return Math.min(v.duration-.1,next-.15);return Math.min(v.duration-.1,endTime+7)};
    function validate(show=true){
      const v=getVideo(),a=Number(startEl?.value),b=Number(endEl?.value),ta=ttime(a),tb=ttime(b),loaded=!!v?.src&&Number.isFinite(v.duration)&&v.duration>0;let ok=true,msg='';
      if(!loaded){ok=false;msg='先に動画を選んでください。'}else if(!Number.isInteger(a)||!Number.isInteger(b)||a<1||b<1||a>10||b>10){ok=false;msg='1〜10Tの範囲で指定してください。'}else if(a>b){ok=false;msg='開始ターンは終了ターン以下にしてください。'}else if(b-a+1>MAX_TURNS){ok=false;msg=`一度に${MAX_TURNS}ターンまでにしてください。`}else if(ta==null||tb==null){ok=false;msg=`${ta==null?a+'T ':''}${tb==null&&b!==a?b+'T ':''}が未認識です。先にターン自動解析を実行してください。`}
      const start=ok?Math.max(0,ta-PRE):null,end=ok?endBoundary(b,tb):null;if(btn)btn.disabled=!ok||busy;if(show&&!busy&&status)status.textContent=ok?`${a}T〜${b}Tをまとめて診断できます。`:msg;if(detail)detail.textContent=ok?`収録予定：${fmt2(start)} 〜 ${fmt2(end)}\n走査：1秒間隔 / 保存：最大${MAX_FRAMES}枚\n画像：横${OUT_WIDTH}px / JPEG ${Math.round(JPEG_Q*100)}%`:'';return{ok,a,b,ta,tb,start,end};
    }
    async function seekSafe(t,reason='range-v462'){const v=getVideo();t=Math.max(0,Math.min(v.duration-.05,t));if(Math.abs(v.currentTime-t)>.025){if(typeof seek==='function')await seek(t,reason);else{await new Promise((res,rej)=>{const done=()=>res();v.addEventListener('seeked',done,{once:true});v.currentTime=t;setTimeout(()=>rej(new Error('シーク失敗')),5000)})}}await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))}
    function frameSig(){const src=typeof frameCanvas==='function'?frameCanvas(320):null;if(!src)throw new Error('フレーム取得機能がありません');const c=document.createElement('canvas');c.width=40;c.height=18;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(src,0,0,c.width,c.height);const d=x.getImageData(0,0,c.width,c.height).data,a=new Uint8Array(c.width*c.height);let j=0;for(let i=0;i<d.length;i+=4)a[j++]=Math.round(.299*d[i]+.587*d[i+1]+.114*d[i+2]);return a}
    const diff=(a,b)=>{if(!a||!b)return 0;let s=0;for(let i=0;i<a.length;i++)s+=Math.abs(a[i]-b[i]);return s/(a.length*255)};
    const med=a=>{if(!a.length)return 0;const b=a.slice().sort((x,y)=>x-y),m=b.length>>1;return b.length%2?b[m]:(b[m-1]+b[m])/2};
    const pct=(a,p)=>{if(!a.length)return 0;const b=a.slice().sort((x,y)=>x-y);return b[Math.min(b.length-1,Math.max(0,Math.floor((b.length-1)*p)))]};
    const nearest=(rows,t)=>rows.reduce((best,r)=>!best||Math.abs(r.time-t)<Math.abs(best.time-t)?r:best,null);
    function merge(items,gap=.18){const a=items.slice().sort((x,y)=>x.time-y.time),out=[];for(const it of a){const last=out[out.length-1];if(last&&it.time-last.time<gap){if(it.priority>last.priority)out[out.length-1]=it}else out.push(it)}return out}
    async function selectFrames(vv){
      const rows=[];let prev=null,n=0;for(let t=vv.start;t<=vv.end+.001;t+=SCAN_STEP){await seekSafe(t,'range-scan-v462');const s=frameSig(),d=prev?diff(prev,s):0;rows.push({time:+t.toFixed(3),diff:d});prev=s;n++;if(status)status.textContent=`重要場面を走査中… ${n}`}
      const ds=rows.slice(1).map(r=>r.diff),m=med(ds),mad=med(ds.map(x=>Math.abs(x-m))),thr=Math.max(.025,m+mad*1.8,pct(ds,.7)*.82),picks=[];const add=(time,priority,reason,d=0)=>{if(time>=vv.start-.05&&time<=vv.end+.05)picks.push({time:+time.toFixed(3),priority,reason,diff:d})};
      add(vv.start,120,'range-start');add(vv.end,120,'range-end');add(vv.ta,140,'start-turn');add(vv.tb,140,'end-turn');for(const a of timeline().filter(x=>x.time>=vv.start-.1&&x.time<=vv.end+.1)){add(a.time,135,`turn-${a.side}-${a.turn}`);add(a.time-.35,98,'before-turn');add(a.time+.35,98,'after-turn')}
      for(let t=vv.start;t<=vv.end+.001;t+=HEARTBEAT){const r=nearest(rows,t);if(r)add(r.time,45,'continuity',r.diff)}
      for(let i=1;i<rows.length;i++){const c=rows[i].diff,p=rows[i-1]?.diff??0,nx=rows[i+1]?.diff??0;if(c>=thr&&c>=p&&c>=nx){add(rows[i-1].time,82+c*100,'before-change',c);add(rows[i].time,88+c*110,'change',c)}}
      for(const r of rows.slice(1).sort((a,b)=>b.diff-a.diff).slice(0,8))add(r.time,78+r.diff*100,'strong-change',r.diff);
      let selected=merge(picks);if(selected.length>MAX_FRAMES){const must=selected.filter(x=>x.priority>=120),rest=selected.filter(x=>x.priority<120).sort((a,b)=>b.priority-a.priority||b.diff-a.diff).slice(0,Math.max(0,MAX_FRAMES-must.length));selected=merge([...must,...rest]).sort((a,b)=>a.time-b.time)}return{rows,selected,threshold:+thr.toFixed(4)};
    }
    function ensureZip(){if(window.JSZip)return Promise.resolve(window.JSZip);return new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';s.onload=()=>window.JSZip?res(window.JSZip):rej(new Error('ZIP初期化失敗'));s.onerror=()=>rej(new Error('ZIPライブラリ読込失敗'));document.head.appendChild(s)})}
    const safeName=s=>String(s||'replay').replace(/\.[^.]+$/,'').replace(/[^\w\u3040-\u30ff\u3400-\u9fff-]+/g,'_').slice(0,54);
    const size=n=>n<1048576?`${Math.round(n/1024)} KB`:`${(n/1048576).toFixed(1)} MB`;
    async function exportRange(){
      const vv=validate(false);if(!vv.ok||busy)return;busy=true;btn.disabled=true;pendingFile=null;saveWrap.style.display='none';const v=getVideo(),orig=v.currentTime,started=performance.now();v.pause();
      try{const JSZip=await ensureZip();status.textContent='重要場面を抽出しています…';const sel=await selectFrames(vv),zip=new JSZip(),manifest={format:'shadowverse-wb-range-review-v4.6.2',build:PATCH,source:typeof videoName!=='undefined'?videoName:'replay',createdAt:new Date().toISOString(),deck:$q('#deck')?.value||'',matchup:$q('#matchup')?.value||'',classDetection:window.classDetection442||null,mulliganPreview:window.mulliganPreview442||null,range:{startTurn:vv.a,endTurn:vv.b,note:noteEl?.value||'',analysisStartTimeSeconds:+vv.start.toFixed(3),analysisEndTimeSeconds:+vv.end.toFixed(3),frames:[]}};let done=0;for(const it of sel.selected){await seekSafe(it.time,'range-capture-v462');const c=frameCanvas(OUT_WIDTH),blob=await canvasBlob(c,JPEG_Q),file=`range/frames/frame-${String(done+1).padStart(3,'0')}-${it.time.toFixed(2)}s.jpg`;zip.file(file,blob,{compression:'STORE'});manifest.range.frames.push({file,timeSeconds:it.time,reason:it.reason,diff:+(it.diff||0).toFixed(4)});done++;status.textContent=`重要画像を保存中… ${done}/${sel.selected.length}`}
        const mt=window.mulliganPreview442?.time;if(Number.isFinite(Number(mt))){await seekSafe(Number(mt),'range-mulligan-v462');const c=frameCanvas(OUT_WIDTH),blob=await canvasBlob(c,JPEG_Q);zip.file('context/mulligan-initial-hand.jpg',blob,{compression:'STORE'})}
        zip.file('range-review.json',JSON.stringify(manifest,null,2));zip.file('README.txt',`Shadowverse WB 複数ターン診断 v4.6.2\n対象 ${vv.a}T〜${vv.b}T\n画像は重要場面のみです。\n`);status.textContent='ZIPを仕上げています…';const blob=await zip.generateAsync({type:'blob',compression:'STORE'}),name=`${safeName(typeof videoName!=='undefined'?videoName:'replay')}-turn-${vv.a}-to-${vv.b}-review-v4.6.2.zip`;pendingFile=new File([blob],name,{type:'application/zip',lastModified:Date.now()});saveInfo.textContent=`ZIP準備完了：${name}（${size(pendingFile.size)}） / ${sel.rows.length}枚走査 → ${sel.selected.length}枚保存 / 約${((performance.now()-started)/1000).toFixed(1)}秒`;saveWrap.style.display='block';status.textContent='ZIP作成完了。「ZIPをファイルに保存」をタップしてください。';safeLog('range-review-ready-v462',{size:pendingFile.size,scanFrames:sel.rows.length,selectedFrames:sel.selected.length});
      }catch(e){console.error(e);status.textContent='ZIP作成失敗：'+(e?.message||String(e));safeLog('range-review-error-v462',{message:e?.message||String(e)})}finally{try{await seekSafe(orig,'range-return-v462')}catch{}busy=false;validate(false);}
    }
    async function savePending(){if(!pendingFile)return;try{if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[pendingFile]}))){await navigator.share({files:[pendingFile],title:'Shadowverse WB 診断ZIP'});status.textContent='共有シートを開きました。「ファイルに保存」を選んでください。';safeLog('range-review-save-v462',{name:pendingFile.name,size:pendingFile.size})}else status.textContent='この環境ではファイル保存用共有シートを利用できません。';}catch(e){if(e?.name==='AbortError'){status.textContent='保存をキャンセルしました。ZIPは残っています。';return}status.textContent='保存画面を開けませんでした：'+(e?.message||String(e));}}
    btn?.addEventListener('click',exportRange);saveBtn?.addEventListener('click',savePending);discardBtn?.addEventListener('click',()=>{pendingFile=null;saveWrap.style.display='none';validate(true)});for(const el of [startEl,endEl,$q('#targetSide'),$q('#playOrder')])el?.addEventListener('change',()=>validate(true));getVideo()?.addEventListener('loadedmetadata',()=>setTimeout(()=>validate(true),250));setInterval(()=>{if(!busy)validate(true)},1200);validate(true);
    safeLog('patch-v462-range-active',{maxFrames:MAX_FRAMES,scanStep:SCAN_STEP});
  }catch(e){
    console.error(e);safeLog('patch-v462-range-mount-error',{message:e?.message||String(e),stack:String(e?.stack||'')});
    const main=document.querySelector('main');if(main&&!$q('#rangeFallback462')){const p=document.createElement('section');p.id='rangeFallback462';p.className='panel';p.innerHTML='<h2>複数ターンをまとめて診断</h2><p class="warn">複数ターンUIの初期化でエラーが発生しました。診断レポートを送ってください。</p>';main.appendChild(p)}
  }

  // Override diagnostic export: on iPhone use share sheet instead of direct anchor/Quick Look navigation.
  const diagBtn=$q('#exportDiag');
  if(diagBtn){diagBtn.onclick=async()=>{
    try{
      safeLog('diagnostic-export-v462');
      const data={format:'shadowverse-wb-diagnostic-v4.6.2',build:PATCH,createdAt:new Date().toISOString(),userAgent:navigator.userAgent,video:typeof videoFileMeta!=='undefined'&&videoFileMeta?{...videoFileMeta,duration:getSafeVideo()?.duration||null,currentTime:getSafeVideo()?.currentTime||0,width:getSafeVideo()?.videoWidth||0,height:getSafeVideo()?.videoHeight||0}:null,ppPoints:window.v39Points||(typeof points!=='undefined'?points:null),targetSide:$q('#targetSide')?.value,playOrder:$q('#playOrder')?.value,turnTimeline:window.turnTimeline39||[],rejectedTurns:window.rejectedTurns392||[],classDetection:window.classDetection442||null,mulliganPreview:window.mulliganPreview442||null,rangePanelPresent:!!$q('#rangeReviewPanel462'),events:typeof events!=='undefined'?events:[]};
      const file=new File([JSON.stringify(data,null,2)],'shadowverse-wb-diagnostic-v4.6.2.json',{type:'application/json',lastModified:Date.now()});
      if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]})))await navigator.share({files:[file],title:'Shadowverse WB 診断レポート'});else{const a=document.createElement('a');a.href=URL.createObjectURL(file);a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)}
    }catch(e){if(e?.name!=='AbortError')safeLog('diagnostic-export-error-v462',{message:e?.message||String(e)})}
  }}
  function getSafeVideo(){try{return typeof video!=='undefined'?video:$q('#video')}catch{return $q('#video')}}

  safeLog('patch-v462-active',{rangePanel:!!$q('#rangeReviewPanel462')});
})();
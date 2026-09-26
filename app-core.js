(()=>{
'use strict';
const APP={version:'4.13.78',build:'4.13.78-20260926-clean-13-78',revision:'clean-13-78',subtitle:'Build 2026.09.26-clean-13-78 / 観測事実表現の厳密化'};
const EXPECTED_MODULE_VERSIONS=Object.freeze({
  'turn-recognition':'turn-clean-1.3',
  'mulligan-class':'mulligan-class-clean-1.5.3',
  'card-db':'card-db-clean-1.23',
  'hand-recognition':'hand-clean-1.50',
  'state-recognition':'state-clean-1.8.15',
  'replay-session':'replay-session-clean-1.5',
  'review-engine':'review-clean-1.5.5',
  'diagnostics':'diagnostics-clean-1.54'
});
const WB=window.WB={APP,expectedModules:EXPECTED_MODULE_VERSIONS,modules:[],moduleRegistrations:[],moduleRegistrationDuplicates:[],events:[],errors:[],readyQueue:[],ready:false,video:null,videoMeta:null,videoName:'replay',objectUrl:null,turnTimeline:[],turnValidation:null,mulligan:null,classDetection:null,stateCapture:null,matchAnalysisLast:null,scenes:[],seekCount:0,seekReasons:{},task:null,cancelRequested:false,swInfo:null};
WB.$=s=>document.querySelector(s);
WB.evaluateModuleIntegrity=(expected=WB.expectedModules,registrations=WB.moduleRegistrations)=>{
  const expectedModules={...(expected||{})},rows=Array.isArray(registrations)?registrations.map(x=>({name:String(x?.name??''),version:String(x?.version??'')})):[],byName=new Map(),moduleVersionMismatches=[];
  for(const row of rows){if(!byName.has(row.name))byName.set(row.name,[]);byName.get(row.name).push(row.version)}
  for(const [name,versions] of byName){
    if(!Object.prototype.hasOwnProperty.call(expectedModules,name))moduleVersionMismatches.push({type:'unexpected',name,expectedVersion:null,loadedVersions:versions.slice()});
    if(versions.length>1)moduleVersionMismatches.push({type:'duplicate',name,expectedVersion:expectedModules[name]??null,loadedVersions:versions.slice()});
  }
  for(const [name,expectedVersion] of Object.entries(expectedModules)){
    const versions=byName.get(name)||[];
    if(!versions.length)moduleVersionMismatches.push({type:'missing',name,expectedVersion,loadedVersions:[]});
    else if(!versions.every(version=>version===expectedVersion))moduleVersionMismatches.push({type:'version-mismatch',name,expectedVersion,loadedVersions:versions.slice()});
  }
  const loadedModules=[];for(const row of rows)if(!loadedModules.some(x=>x.name===row.name))loadedModules.push({...row});
  return{ok:moduleVersionMismatches.length===0,expectedModules,loadedModules,moduleVersionMismatches};
};
WB.registerModule=(name,version)=>{const row={name:String(name??''),version:String(version??'')};WB.moduleRegistrations.push({...row});const existing=WB.modules.find(x=>x.name===row.name);if(existing){WB.moduleRegistrationDuplicates.push({name:row.name,firstVersion:existing.version,duplicateVersion:row.version});return existing}WB.modules.push(row);return row};
WB.log=(type,data={})=>{const now=WB.video&&Number.isFinite(WB.video.currentTime)?+WB.video.currentTime.toFixed(3):null;WB.events.push({at:new Date().toISOString(),type,currentTime:now,...data});if(WB.events.length>2500)WB.events.shift()};
window.log=WB.log;
WB.recordError=(scope,err,data={})=>{const row={at:new Date().toISOString(),scope,message:err?.message||String(err),...data};WB.errors.push(row);if(WB.errors.length>120)WB.errors.shift();WB.log('error',{...row});return row};
WB.onReady=fn=>{if(WB.ready)Promise.resolve().then(fn);else WB.readyQueue.push(fn)};
WB.emit=(name,detail={})=>window.dispatchEvent(new CustomEvent('wb:'+name,{detail}));
WB.on=(name,fn)=>window.addEventListener('wb:'+name,e=>fn(e.detail,e));
WB.fmt=sec=>{if(!Number.isFinite(Number(sec)))return'00:00.0';sec=Number(sec);const m=Math.floor(sec/60),s=(sec-m*60).toFixed(1).padStart(4,'0');return String(m).padStart(2,'0')+':'+s};
WB.safeName=s=>(s||'replay').replace(/\.[^.]+$/,'').replace(/[^\w\u3040-\u30ff\u3400-\u9fff-]+/g,'_').slice(0,60);
WB.targetSide=()=>{const s=WB.$('#targetSide')?.value;return s==='top'||s==='bottom'?s:'bottom'};
WB.playOrder=()=>WB.$('#playOrder')?.value==='先攻'?'先攻':'後攻';
WB.videoKey=()=>WB.videoMeta?`${WB.videoMeta.name}|${WB.videoMeta.size}|${WB.videoMeta.lastModified}`:String(WB.video?.currentSrc||WB.video?.src||'no-video');
WB.currentTurnContext=()=>{const t=Number(WB.video?.currentTime),rows=WB.turnTimeline||[];let row=null;if(Number.isFinite(t))for(const r of rows){if(Number(r.time)<=t&&(!row||Number(r.time)>Number(row.time)))row=r}const reviewed=WB.targetSide(),side=row?.side==='top'||row?.side==='bottom'?row.side:null;return{time:Number.isFinite(t)?+t.toFixed(3):null,row,turn:Number(row?.turn)||null,absoluteSide:side,targetSide:reviewed,relativeSide:side?(side===reviewed?'自分':'相手'):null,playOrder:WB.playOrder(),videoKey:WB.videoKey()}};
WB.frameCanvas=(maxW=1200)=>{const v=WB.video;if(!v?.videoWidth||!v?.videoHeight)return null;const scale=Math.min(1,maxW/v.videoWidth),c=document.createElement('canvas');c.width=Math.max(1,Math.round(v.videoWidth*scale));c.height=Math.max(1,Math.round(v.videoHeight*scale));c.getContext('2d',{willReadFrequently:true}).drawImage(v,0,0,c.width,c.height);return c};
WB.canvasBlob=(c,q=.82,type='image/jpeg')=>new Promise((res,rej)=>{const mime=String(type||'image/jpeg');c.toBlob(b=>b?res(b):rej(new Error('画像化失敗')),mime,mime==='image/jpeg'?q:undefined)});
WB.downloadJSON=(obj,name)=>{const b=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1500)};
WB.shareJsonFile=async(obj,name)=>{const file=new File([JSON.stringify(obj,null,2)],name,{type:'application/json',lastModified:Date.now()});if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){try{await navigator.share({files:[file]});return}catch(e){if(e?.name==='AbortError')return}}WB.downloadJSON(obj,name)};

WB.setTaskLock=(on,title='',text='')=>{const box=WB.$('#taskLock');if(!box)return;if(on){WB.$('#taskLockTitle').textContent=title||'処理中';WB.$('#taskLockText').textContent=text||'動画位置を自動操作しています。';box.classList.remove('hidden')}else box.classList.add('hidden')};
WB.runTask=async(name,fn,{lockText='動画位置を自動操作しています。'}={})=>{if(WB.task)throw new Error(`別処理を実行中です: ${WB.task}`);WB.task=name;WB.cancelRequested=false;WB.setTaskLock(true,name,lockText);WB.log('task-start',{name});try{return await fn()}catch(err){WB.recordError(name,err);throw err}finally{WB.log('task-finish',{name,cancelRequested:WB.cancelRequested});WB.task=null;WB.cancelRequested=false;WB.setTaskLock(false);if(typeof WB.updateTurnPick==='function')WB.updateTurnPick();WB.log('task-controls-synced',{name,turn:Number(WB.$('#turnPick')?.value)||1})}};
WB.requestCancel=()=>{if(WB.task){WB.cancelRequested=true;WB.log('task-cancel-request',{name:WB.task})}};
WB.setProgress=p=>{const w=WB.$('#progressWrap'),b=WB.$('#progress');if(!w||!b)return;if(p==null){w.classList.add('hidden');b.style.width='0%'}else{w.classList.remove('hidden');b.style.width=Math.max(0,Math.min(100,p))+'%'}};
WB.setScanStatus=(msg,cls='help')=>{const e=WB.$('#scanStatus');if(e){e.className=cls;e.textContent=msg}};
WB.pauseVideo=(reason='stability-guard')=>{const v=WB.video;if(!v)return false;const wasPaused=!!v.paused;if(!wasPaused)v.pause();WB.log('video-pause-guard',{reason,wasPaused,currentTime:Number.isFinite(v.currentTime)?+v.currentTime.toFixed(3):null});return !wasPaused};

function seekPositionReached(v,target,tol=.06){const current=Number(v?.currentTime),ready=Number(v?.readyState||0);return Number.isFinite(current)&&Math.abs(current-Number(target))<=tol&&v?.seeking!==true&&ready>=2}
WB.seekPositionReached=seekPositionReached;
WB.seekTo=async(t,reason='seek')=>{const v=WB.video;if(!v||!Number.isFinite(v.duration))throw new Error('動画未読込');const target=Math.max(0,Math.min(Math.max(0,v.duration-.05),Number(t)||0));if(Math.abs(v.currentTime-target)<=.025){await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return +v.currentTime.toFixed(3)}WB.seekCount++;WB.seekReasons[reason]=(WB.seekReasons[reason]||0)+1;WB.log('seek-start',{reason,target,from:+v.currentTime.toFixed(3)});return await new Promise((resolve,reject)=>{let done=false,poll=null;const cleanup=()=>{v.removeEventListener('seeked',onSeek);clearTimeout(timer);if(poll!==null)clearInterval(poll)};const finish=(ok,err,completion='seeked')=>{if(done)return;done=true;cleanup();if(ok){WB.log('seek-complete',{reason,target,actual:+v.currentTime.toFixed(3),completion,safariFallback:completion!=='seeked'});requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(+v.currentTime.toFixed(3))))}else reject(err||new Error('シーク失敗'))};const check=(completion)=>{if(seekPositionReached(v,target)){finish(true,null,completion);return true}return false};const onSeek=()=>finish(true,null,'seeked');const timer=setTimeout(()=>{if(!check('timeout-currentTime'))finish(false,new Error(`シーク失敗: ${reason}`),'timeout')},3500);v.addEventListener('seeked',onSeek,{once:true});poll=setInterval(()=>check('currentTime-fallback'),80);v.currentTime=target})};
window.seek=WB.seekTo;

WB.ocrWorker=null;
WB.initOCR=async()=>{if(WB.ocrWorker)return WB.ocrWorker;if(!window.Tesseract)throw new Error('OCRライブラリを読み込めません');WB.log('ocr-init-start');WB.ocrWorker=await Tesseract.createWorker('eng',1);await WB.restoreOCRDefaults();WB.log('ocr-ready');return WB.ocrWorker};
WB.restoreOCRDefaults=async()=>{if(!WB.ocrWorker)return false;try{await WB.ocrWorker.setParameters({tessedit_char_whitelist:'0123456789',tessedit_pageseg_mode:'10'});WB.log('ocr-defaults-restored',{pageseg:'10'});return true}catch(err){WB.recordError('ocr-default-restore',err);return false}};

WB.setTimeline=rows=>{WB.turnTimeline=Array.isArray(rows)?rows.slice().sort((a,b)=>a.time-b.time):[];window.turnTimeline39=WB.turnTimeline;WB.renderTimeline();WB.updateTurnPick();WB.emit('timeline',{timeline:WB.turnTimeline});};
WB.renderTimeline=()=>{const out=WB.$('#turnTimeline');if(!out)return;if(!WB.turnTimeline.length){out.textContent='';return}out.textContent=WB.turnTimeline.map(r=>`${r.side==='top'?'上':'下'}${r.turn}T  ${WB.fmt(r.time)}  ${r.source||'turn-indicator'}${r.boardValidated?' / HUD確認':''}`).join('\n')};
WB.turnForTarget=n=>WB.turnTimeline.find(r=>r.side===WB.targetSide()&&Number(r.turn)===Number(n))||null;
WB.updateTurnPick=()=>{const n=Number(WB.$('#turnPick')?.value)||1,row=WB.turnForTarget(n),go=WB.$('#goTurn'),cap=WB.$('#captureScene'),cmp=WB.$('#leAnalyzeTurn'),match=WB.$('#analyzeMatch'),cancelMatch=WB.$('#cancelMatch');if(go)go.disabled=!row||!!WB.task;if(cap)cap.disabled=!WB.videoMeta||!!WB.task;if(cmp)cmp.disabled=!WB.videoMeta||!WB.turnTimeline.length||!!WB.task;if(match)match.disabled=!WB.videoMeta||!WB.turnTimeline.length||!!WB.task;if(cancelMatch)cancelMatch.disabled=WB.task!=='試合全体を解析';const time=WB.$('#turnTime'),st=WB.$('#turnStatus');if(time)time.value=row?WB.fmt(row.time):'未認識';if(st)st.textContent=row?`${n}Tを ${WB.fmt(row.time)} と認識しています。`:`${n}Tはまだ認識されていません。`};

WB.resetForVideo=()=>{WB.turnTimeline=[];window.turnTimeline39=[];WB.turnValidation=null;WB.mulligan=null;WB.classDetection=null;WB.stateCapture=null;WB.seekCount=0;WB.seekReasons={};WB.cancelRequested=false;WB.setProgress(null);WB.renderTimeline();for(const s of WB.scenes)if(s.url)URL.revokeObjectURL(s.url);WB.scenes=[];WB.renderScenes();for(const id of ['#leTurn','#leOppHp','#lePp','#leBoard']){const e=WB.$(id);if(e){e.value='';delete e.dataset.source;delete e.dataset.manualVideo}}for(const id of ['#leExtra','#leEp','#leSep','#leWard']){const e=WB.$(id);if(e){e.value='unknown';delete e.dataset.source;delete e.dataset.manualVideo}}for(const id of ['#cfName','#cfNote','#asName','#asOppHp','#asSelfHp','#asFlags','#asBoard','#asOther','#asNote']){const e=WB.$(id);if(e)e.value=''}const mm=WB.$('#mulliganStill');if(mm){mm.removeAttribute('src');mm.style.display='none'}if(WB.$('#mulliganStillTime'))WB.$('#mulliganStillTime').textContent='';if(WB.$('#previewStatus'))WB.$('#previewStatus').textContent='ターン確定後にマリガンを取得し、その後にVS画面のクラスアイコンを判定します。';WB.clearClassUi();WB.updateTurnPick();WB.emit('video-reset',{videoKey:WB.videoKey()})};
WB.clearClassUi=()=>{const c=WB.$('#classMark'),p=WB.$('#classMarkPlaceholder'),sel=WB.$('#classSelect'),st=WB.$('#classStatus');if(c){c.getContext('2d').clearRect(0,0,c.width,c.height);c.classList.add('hidden')}if(p){p.textContent='クラス画像を確認できません';p.classList.remove('hidden')}if(sel)sel.value='';if(st)st.textContent='未判定'};
WB.renderScenes=()=>{const out=WB.$('#savedScenes');if(!out)return;out.innerHTML='';WB.scenes.forEach((s,i)=>{const d=document.createElement('div');d.className='savedItem';d.innerHTML=`<img src="${s.url}" alt="局面"><div><span class="badge">${s.turn?`${s.turn}T`:'T不明'}</span><span class="badge">${WB.fmt(s.time)}</span><div class="muted">${WB.escape(s.note||'メモなし')}</div></div>`;out.appendChild(d)})};
WB.escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

async function queryServiceWorker(reg){const target=navigator.serviceWorker.controller||reg?.active||reg?.waiting;if(!target)return null;return await new Promise(resolve=>{const ch=new MessageChannel(),timer=setTimeout(()=>resolve(null),1200);ch.port1.onmessage=e=>{clearTimeout(timer);resolve(e.data||null)};try{target.postMessage({type:'wb-version-query'},[ch.port2])}catch{clearTimeout(timer);resolve(null)}})}
WB.registerServiceWorker=async()=>{if(!('serviceWorker'in navigator))return;try{
  const reloadKey='wb-clean-controller-'+APP.build;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{try{if(sessionStorage.getItem(reloadKey)!=='1'){sessionStorage.setItem(reloadKey,'1');WB.log('service-worker-controllerchange-reload',{build:APP.build});location.reload()}}catch{}},{once:true});
  const reg=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});await reg.update();
  const installing=reg.installing;if(installing&&installing.state!=='activated'){await Promise.race([new Promise(resolve=>installing.addEventListener('statechange',()=>{if(installing.state==='activated'||installing.state==='redundant')resolve() })),new Promise(resolve=>setTimeout(resolve,4000))])}
  WB.swInfo=await queryServiceWorker(reg);WB.log('service-worker-register-managed',{scope:reg.scope,mode:'clean-single-sw',info:WB.swInfo})
}catch(err){WB.recordError('service-worker',err)}};

function init(){
  const head=document.querySelector('header h1'),sub=document.querySelector('header p'),shellHeader=head?.textContent||'',shellSub=sub?.textContent||'',shellOk=shellHeader.includes(`v${APP.version}`)&&shellSub.includes(APP.revision);
  if(!shellOk){const key='wb-shell-reload-'+APP.build;let shouldReload=false;try{if(sessionStorage.getItem(key)!=='1'){sessionStorage.setItem(key,'1');shouldReload=true}}catch{}WB.log('shell-version-mismatch',{build:APP.build,shellHeader,shellSub,shouldReload});if(shouldReload){location.reload();return}}
  if(head)head.textContent=`シャドバWB リプレイ診断 v${APP.version}`;if(sub)sub.textContent=APP.subtitle;document.title=`シャドバWB リプレイ診断 v${APP.version}`;
  WB.video=WB.$('#video');
  const file=WB.$('#videoFile'),scrub=WB.$('#scrub');
  let pickerStartPerf=null,pickerStartedAt=null,fileReceivedPerf=null;
  const timingEl=()=>WB.$('#videoLoadTiming');
  const markPickerStart=()=>{pickerStartPerf=performance.now();pickerStartedAt=new Date().toISOString();const t=timingEl();if(t)t.textContent='動画を選択中…';WB.log('video-picker-open',{pickerStartedAt})};
  file?.addEventListener('pointerdown',markPickerStart,{passive:true});
  file?.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')markPickerStart()});
  file?.addEventListener('change',e=>{const f=e.target.files?.[0];if(!f)return;const receivedPerf=performance.now(),fileReceivedAt=new Date().toISOString(),pickerElapsedMs=Number.isFinite(pickerStartPerf)?Math.max(0,Math.round(receivedPerf-pickerStartPerf)):null;fileReceivedPerf=receivedPerf;if(WB.objectUrl)URL.revokeObjectURL(WB.objectUrl);WB.videoMeta={name:f.name,size:f.size,type:f.type,lastModified:f.lastModified,inputTiming:{pickerStartedAt,fileReceivedAt,pickerElapsedMs,fileToMetadataMs:null,pickerElapsedIncludesUserSelection:true}};WB.videoName=WB.safeName(f.name);WB.objectUrl=URL.createObjectURL(f);WB.video.src=WB.objectUrl;WB.resetForVideo();WB.$('#videoStatus').textContent='動画情報を読み込み中…';const t=timingEl();if(t)t.textContent=pickerElapsedMs==null?'Fileを受領しました。':`選択開始→File受領: ${(pickerElapsedMs/1000).toFixed(1)}秒（選択操作時間を含む）`;WB.log('video-selected',WB.videoMeta)});
  WB.video?.addEventListener('loadedmetadata',()=>{const fileToMetadataMs=Number.isFinite(fileReceivedPerf)?Math.max(0,Math.round(performance.now()-fileReceivedPerf)):null;if(WB.videoMeta?.inputTiming)WB.videoMeta.inputTiming.fileToMetadataMs=fileToMetadataMs;if(scrub)scrub.max=WB.video.duration;if(WB.$('#dur'))WB.$('#dur').textContent=WB.fmt(WB.video.duration);WB.$('#scanTurns').disabled=false;WB.$('#leFill').disabled=false;WB.$('#previewMulligan').disabled=!WB.turnTimeline.length;WB.$('#videoStatus').textContent=`${WB.videoMeta?.name||'動画'} / ${WB.fmt(WB.video.duration)} / ${WB.video.videoWidth}×${WB.video.videoHeight}`;const t=timingEl(),pickerMs=WB.videoMeta?.inputTiming?.pickerElapsedMs;if(t)t.textContent=[pickerMs==null?null:`選択開始→File受領 ${(pickerMs/1000).toFixed(1)}秒※操作時間含む`,fileToMetadataMs==null?null:`File受領→再生準備 ${(fileToMetadataMs/1000).toFixed(2)}秒`].filter(Boolean).join(' / ');WB.log('metadata',{duration:+WB.video.duration.toFixed(3),videoWidth:WB.video.videoWidth,videoHeight:WB.video.videoHeight,inputTiming:WB.videoMeta?.inputTiming||null});WB.emit('metadata',{videoKey:WB.videoKey()})});
  WB.video?.addEventListener('timeupdate',()=>{if(WB.$('#now'))WB.$('#now').textContent=WB.fmt(WB.video.currentTime);if(scrub&&!WB.task)scrub.value=WB.video.currentTime});
  scrub?.addEventListener('change',()=>{if(WB.task){scrub.value=WB.video.currentTime;return}WB.video.currentTime=Number(scrub.value);WB.log('scrub',{to:Number(scrub.value)})});
  document.querySelectorAll('[data-jump]').forEach(b=>b.addEventListener('click',()=>{if(WB.task||!Number.isFinite(WB.video?.duration))return;const d=Number(b.dataset.jump);WB.video.currentTime=Math.max(0,Math.min(WB.video.duration,WB.video.currentTime+d));WB.log('jump',{delta:d})}));
  WB.$('#turnPick')?.addEventListener('input',WB.updateTurnPick);
  WB.$('#targetSide')?.addEventListener('change',()=>{WB.updateTurnPick();WB.log('target-side-change',{targetSide:WB.targetSide()})});
  WB.$('#playOrder')?.addEventListener('change',()=>WB.log('play-order-change',{playOrder:WB.playOrder()}));
  WB.$('#goTurn')?.addEventListener('click',async()=>{const n=Number(WB.$('#turnPick').value)||1,row=WB.turnForTarget(n);if(!row||WB.task)return;WB.pauseVideo('go-selected-turn');try{await WB.runTask('ターン移動',async()=>{await WB.seekTo(row.time,'go-selected-turn');WB.log('turn-move-stable',{turn:n,target:+Number(row.time).toFixed(3),actual:+WB.video.currentTime.toFixed(3),paused:!!WB.video.paused})},{lockText:`${n}Tへ移動しています。`})}catch{}});
  WB.$('#leFill')?.addEventListener('click',()=>{if(!WB.task)WB.pauseVideo('state-capture-start')},{capture:true});
  WB.$('#classSelect')?.addEventListener('change',e=>{const v=e.target.value,match=WB.$('#matchup');if(v&&match)match.value=v;WB.log('class-manual',{value:v,videoKey:WB.videoKey()})});
  WB.$('#captureScene')?.addEventListener('click',async()=>{if(!WB.videoMeta||WB.task)return;try{await WB.runTask('局面保存',async()=>{const c=WB.frameCanvas(1200);if(!c)throw new Error('画像を取得できません');const blob=await WB.canvasBlob(c,.84),ctx=WB.currentTurnContext(),scene={id:`s${Date.now().toString(36)}`,turn:ctx.turn,time:+WB.video.currentTime.toFixed(3),playOrder:WB.playOrder(),matchup:WB.$('#matchup').value.trim()||null,deck:WB.$('#deck').value.trim()||null,note:WB.$('#note').value.trim()||null,blob,url:URL.createObjectURL(blob)};WB.scenes.push(scene);WB.renderScenes();WB.emit('scene-saved',{scene});WB.$('#captureStatus').textContent=`${ctx.turn?ctx.turn+'T / ':''}${WB.fmt(scene.time)} を保存しました。`;WB.log('scene-save',{turn:ctx.turn,time:scene.time})},{lockText:'現在フレームを保存しています。'})}catch(err){WB.$('#captureStatus').textContent='保存エラー: '+err.message}});
  WB.$('#clearScenes')?.addEventListener('click',()=>{const sceneIds=WB.scenes.map(s=>s.id);for(const s of WB.scenes)if(s.url)URL.revokeObjectURL(s.url);WB.scenes=[];WB.renderScenes();WB.emit('scenes-cleared',{sceneIds});WB.log('scenes-clear')});
  WB.$('#cancelScan')?.addEventListener('click',WB.requestCancel);
  WB.log('app-start',{build:APP.build,href:location.href,standalone:matchMedia('(display-mode: standalone)').matches});
  WB.registerServiceWorker();
  WB.ready=true;for(const fn of WB.readyQueue.splice(0)){try{fn()}catch(err){WB.recordError('module-init',err)}}
}

document.addEventListener('DOMContentLoaded',init,{once:true});
})();

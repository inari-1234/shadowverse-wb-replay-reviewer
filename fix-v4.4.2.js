(()=>{
  const PATCH='4.4.2-20260916-23';
  const $q=s=>document.querySelector(s);
  const header=$q('header h1'),sub=$q('header p');
  if(header) header.textContent='シャドバWB リプレイ診断 v4.4.2';
  if(sub) sub.textContent='Build 2026.09.16-23 / 初回ターン基準でマリガン区間を抽出';

  const oldMull=$q('#mulliganPanel43'); if(oldMull) oldMull.style.display='none';
  let panel=$q('#mulliganClassPanel44');
  if(!panel){panel=document.createElement('section');panel.id='mulliganClassPanel44';panel.className='panel';const a=$q('#autoPrepPanel42')||$q('#scanTurns')?.closest('.panel');if(a)a.parentNode.insertBefore(panel,a.nextSibling)}
  panel.innerHTML=`
    <h2>3. マリガン・クラス確認</h2>
    <p id="previewStatus442" class="help">ターン解析後、初回ターンの直前区間から初期4枚を自動抽出します。</p>
    <div class="buttons"><button id="previewMulligan442" class="primary">マリガン画像を再取得</button></div>
    <div style="margin-top:10px"><img id="mulliganStill442" alt="マリガン代表画像" style="display:none;width:100%;max-width:760px;border-radius:10px;background:#000"><div id="mulliganStillTime442" class="muted" style="margin-top:5px"></div></div>
    <div class="grid" style="margin-top:12px">
      <div><div class="muted">検出したクラスマーク</div><canvas id="classMark442" width="180" height="180" style="width:100%;max-width:180px;background:#000;border-radius:10px"></canvas></div>
      <label>対面クラス<select id="classSelect442"><option value="">未判定</option><option>エルフ</option><option>ロイヤル</option><option>ウィッチ</option><option>ドラゴン</option><option>ナイトメア</option><option>ビショップ</option><option>ネメシス</option></select><div id="classStatus442" class="help">クラス判定はv4.6.8の固定アイコン時系列アンカーだけを使用します。</div></label>
    </div>`;

  const still=$q('#mulliganStill442'),stillTime=$q('#mulliganStillTime442'),previewStatus=$q('#previewStatus442'),classStatus=$q('#classStatus442'),classSelect=$q('#classSelect442');
  let running=false,runToken=0;window.classDetection442=null;window.mulliganPreview442=null;

  function currentFirstTurn(){const a=window.turnTimeline39;const n=Number(Array.isArray(a)&&a.length?a[0]?.time:NaN);return Number.isFinite(n)?n:null}
  function plan(firstTurn){const start=Math.max(.5,firstTurn-8),end=Math.min(video.duration-.2,firstTurn-2),target=Math.max(start,Math.min(end,firstTurn-3)),times=[];for(let t=start;t<=end+.001&&times.length<30;t+=.5)times.push(+t.toFixed(2));return {firstTurn,start,end,target,times}}
  async function seekSafe(t){t=Math.max(0,Math.min(video.duration-.05,t));if(Math.abs(video.currentTime-t)>.025)await seek(t,'preview-v442');await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))}
  function rgbToHsv(r,g,b){r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;let h=0;if(d){if(max===r)h=((g-b)/d)%6;else if(max===g)h=(b-r)/d+2;else h=(r-g)/d+4;h*=60;if(h<0)h+=360}return {h,s:max?d/max:0,v:max}}
  function cardSlotScore(src,cx){const x0=Math.max(0,Math.floor(src.width*(cx-.043))),x1=Math.min(src.width,Math.ceil(src.width*(cx+.043))),y0=Math.floor(src.height*.49),y1=Math.min(src.height,Math.ceil(src.height*.84));const ctx=src.getContext('2d',{willReadFrequently:true}),im=ctx.getImageData(x0,y0,Math.max(1,x1-x0),Math.max(1,y1-y0)),d=im.data;let n=0,color=0,sum=0,sum2=0,edges=0,prev=null;const w=im.width;for(let y=1;y<im.height-1;y+=3){for(let x=1;x<im.width-1;x+=3){const i=(y*w+x)*4,r=d[i],g=d[i+1],b=d[i+2],lum=.299*r+.587*g+.114*b,h=rgbToHsv(r,g,b);n++;sum+=lum;sum2+=lum*lum;if(h.s>.18&&h.v>.24)color++;if(prev!==null&&Math.abs(lum-prev)>34)edges++;prev=lum}}if(!n)return {occupied:false,score:0};const mean=sum/n,std=Math.sqrt(Math.max(0,sum2/n-mean*mean)),colorRatio=color/n,edgeRatio=edges/Math.max(1,n-1),score=colorRatio*.48+Math.min(1,std/68)*.32+Math.min(1,edgeRatio/.30)*.20;return {occupied:score>.40&&colorRatio>.20,score:+score.toFixed(3)}}
  function handScore(src){const centers=[.305,.425,.545,.665],slots=centers.map(x=>cardSlotScore(src,x));return {count:slots.filter(x=>x.occupied).length,total:+slots.reduce((s,x)=>s+x.score,0).toFixed(3)}}
  function firstFourRun(rows){let run=[];for(const r of rows){if(r.handCount===4){run.push(r)}else if(run.length){if(run.length>=2)return run;run=[]}}if(run.length>=2)return run;return []}
  function copyFrame(src){const c=document.createElement('canvas');c.width=src.width;c.height=src.height;c.getContext('2d').drawImage(src,0,0);return c}

  async function buildPreview(firstTurnOverride=null){if(running||!video?.src||!isFinite(video.duration)||video.duration<=0)return;const firstTurn=Number.isFinite(Number(firstTurnOverride))?Number(firstTurnOverride):currentFirstTurn();if(!Number.isFinite(firstTurn)){if(previewStatus)previewStatus.textContent='先にターン解析を実行してください。初回ターン確定後にマリガン区間を自動抽出します。';return}running=true;const token=++runToken,original=video.currentTime;video.pause();if(still)still.style.display='none';if(stillTime)stillTime.textContent='';if(previewStatus)previewStatus.textContent='初回ターン直前から初期4枚区間を探しています…';try{const p=plan(firstTurn),rows=[];for(const t of p.times){if(token!==runToken)throw new Error('cancelled');await seekSafe(t);const src=frameCanvas(1200),hs=handScore(src);rows.push({time:t,handCount:hs.count,handScore:hs.total})}const run=firstFourRun(rows);let chosen;if(run.length){chosen=run.slice().sort((a,b)=>Math.abs(a.time-p.target)-Math.abs(b.time-p.target)||b.handScore-a.handScore)[0]}else{chosen=rows.slice().sort((a,b)=>b.handCount-a.handCount||Math.abs(a.time-p.target)-Math.abs(b.time-p.target)||b.handScore-a.handScore)[0]}if(chosen){await seekSafe(chosen.time);const src=frameCanvas(1500),copy=copyFrame(src);if(still){still.src=copy.toDataURL('image/jpeg',.88);still.style.display='block'}if(stillTime)stillTime.textContent=`初期4枚：${fmt(chosen.time)} / 初回ターン ${fmt(firstTurn)}`;window.mulliganPreview442={patch:PATCH,time:chosen.time,handCount:chosen.handCount,score:chosen.handScore,firstPP:null,firstTurn:+firstTurn.toFixed(3),targetTime:+p.target.toFixed(3),scanStart:+p.start.toFixed(3),scanEnd:+p.end.toFixed(3),run:run.map(r=>r.time),sampleCount:rows.length};window.classDetection442=window.classDetection442?.accepted?window.classDetection442:null;try{log('class-detect-v442-skipped',{patch:PATCH,reason:'delegated-to-v468',time:chosen.time})}catch{}}if(previewStatus)previewStatus.textContent=chosen?.handCount===4?'初回ターン直前の4枚表示区間から代表画像を選びました。':'4枚区間を確定できなかったため候補画像を表示しています。';try{log('mulligan-preview-v442',{...window.mulliganPreview442,samples:rows})}catch{}}catch(err){if(err?.message!=='cancelled'&&previewStatus)previewStatus.textContent='プレビュー作成失敗：'+(err?.message||String(err))}finally{try{if(token===runToken)await seekSafe(original)}catch{}running=false}}
  function scheduleFromTurn(t){let tries=0;const id=setInterval(()=>{tries++;if(window.classDetection442?.accepted||tries>=9){clearInterval(id);buildPreview(t)}},200)}
  $q('#previewMulligan442')?.addEventListener('click',()=>{runToken++;running=false;buildPreview()});
  classSelect?.addEventListener('change',()=>{const m=$q('#matchup');if(m&&classSelect.value)m.value=classSelect.value;try{log('class-manual-v442',{value:classSelect.value})}catch{}});
  $q('#videoFile')?.addEventListener('change',()=>{runToken++;running=false;window.classDetection442=null;window.mulliganPreview442=null;if(still)still.style.display='none';if(classSelect)classSelect.value='';if(previewStatus)previewStatus.textContent='ターン解析後に初期4枚を自動表示します。'});
  video?.addEventListener('loadedmetadata',()=>{if(previewStatus)previewStatus.textContent='ターン解析後に初期4枚を自動表示します。PP OCRは使用しません。'});
  window.addEventListener('wb-turn-timeline-ready',e=>{const t=Number(e?.detail?.firstTurnTime);if(Number.isFinite(t))scheduleFromTurn(t)});
  if(currentFirstTurn()!=null)setTimeout(()=>scheduleFromTurn(currentFirstTurn()),300);
  try{log('patch-v442-active',{patch:PATCH,feature:'first-turn-anchored-mulligan-preview-class-delegated-to-v468'})}catch{}
})();
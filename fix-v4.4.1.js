(()=>{
  const PATCH='4.4.1-20260914-19';
  const $q=s=>document.querySelector(s);
  const header=$q('header h1'),sub=$q('header p');
  if(header) header.textContent='シャドバWB リプレイ診断 v4.4.1';
  if(sub) sub.textContent='Build 2026.09.14-19 / 4枚マリガン1枚表示 + クラス判定補正';

  const oldMull=$q('#mulliganPanel43');
  if(oldMull) oldMull.style.display='none';
  let panel=$q('#mulliganClassPanel44');
  if(!panel){
    panel=document.createElement('section');panel.id='mulliganClassPanel44';panel.className='panel';
    const anchor=$q('#autoPrepPanel42')||$q('#scanTurns')?.closest('.panel');
    if(anchor) anchor.parentNode.insertBefore(panel,anchor.nextSibling);
  }
  panel.innerHTML=`
    <h2>3. マリガン・クラス確認</h2>
    <p id="previewStatus441" class="help">4枚の初期手札が最も見やすい1枚を自動選択します。</p>
    <div class="buttons"><button id="previewMulligan441" class="primary">マリガン画像を再取得</button></div>
    <div style="margin-top:10px"><img id="mulliganStill441" alt="マリガン代表画像" style="display:none;width:100%;max-width:760px;border-radius:10px;background:#000"><div id="mulliganStillTime441" class="muted" style="margin-top:5px"></div></div>
    <div class="grid" style="margin-top:12px">
      <div><div class="muted">検出したクラスマーク</div><canvas id="classMark441" width="180" height="180" style="width:100%;max-width:180px;background:#000;border-radius:10px"></canvas></div>
      <label>対面クラス<select id="classSelect441"><option value="">未判定</option><option>エルフ</option><option>ロイヤル</option><option>ウィッチ</option><option>ドラゴン</option><option>ナイトメア</option><option>ビショップ</option><option>ネメシス</option></select><div id="classStatus441" class="help">現段階では誤判定防止を優先し、確実な場合だけ自動入力します。</div></label>
    </div>`;

  const still=$q('#mulliganStill441'),stillTime=$q('#mulliganStillTime441'),previewStatus=$q('#previewStatus441'),classCanvas=$q('#classMark441'),classStatus=$q('#classStatus441'),classSelect=$q('#classSelect441');
  let running=false,runToken=0;
  window.classDetection441=null;window.mulliganPreview441=null;

  function firstPPBoundary(){
    const vals=[],times=window.autoPrep42?.summary?.times;
    if(times)for(const side of ['top','bottom'])for(const v of Object.values(times[side]||{})){const n=Number(v);if(Number.isFinite(n)&&n>0)vals.push(n)}
    for(const x of (window.turnTimeline39||[])){const n=Number(x?.time);if(Number.isFinite(n)&&n>0)vals.push(n)}
    for(const v of Object.values(turnMap||{})){const n=Number(v?.time);if(Number.isFinite(n)&&n>0)vals.push(n)}
    return vals.length?Math.min(...vals):null;
  }
  function plan(){const first=firstPPBoundary();let end=first!=null?first-.7:Math.min(12,video.duration-.2);end=Math.max(7,Math.min(end,16,video.duration-.2));const start=Math.max(.5,end-12),times=[];for(let t=start;t<=end+.001&&times.length<28;t+=.5)times.push(+t.toFixed(2));return {first,start,end,times}}
  async function seekSafe(t){t=Math.max(0,Math.min(video.duration-.05,t));if(Math.abs(video.currentTime-t)>.025)await seek(t,'preview-v441');await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))}
  function rgbToHsv(r,g,b){r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;let h=0;if(d){if(max===r)h=((g-b)/d)%6;else if(max===g)h=(b-r)/d+2;else h=(r-g)/d+4;h*=60;if(h<0)h+=360}return {h,s:max?d/max:0,v:max}}

  function cardSlotScore(src,cx){
    const x0=Math.max(0,Math.floor(src.width*(cx-.043))),x1=Math.min(src.width,Math.ceil(src.width*(cx+.043))),y0=Math.floor(src.height*.49),y1=Math.min(src.height,Math.ceil(src.height*.84));
    const ctx=src.getContext('2d',{willReadFrequently:true}),im=ctx.getImageData(x0,y0,Math.max(1,x1-x0),Math.max(1,y1-y0)),d=im.data;let n=0,color=0,sum=0,sum2=0,edges=0,prev=null;
    const w=im.width;
    for(let y=1;y<im.height-1;y+=3){for(let x=1;x<im.width-1;x+=3){const i=(y*w+x)*4,r=d[i],g=d[i+1],b=d[i+2],lum=.299*r+.587*g+.114*b,h=rgbToHsv(r,g,b);n++;sum+=lum;sum2+=lum*lum;if(h.s>.18&&h.v>.24)color++;if(prev!==null&&Math.abs(lum-prev)>34)edges++;prev=lum}}
    if(!n)return {occupied:false,score:0};const mean=sum/n,std=Math.sqrt(Math.max(0,sum2/n-mean*mean)),colorRatio=color/n,edgeRatio=edges/Math.max(1,n-1),score=colorRatio*.48+Math.min(1,std/68)*.32+Math.min(1,edgeRatio/.30)*.20;
    return {occupied:score>.40&&colorRatio>.20,score:+score.toFixed(3),colorRatio:+colorRatio.toFixed(3),std:+std.toFixed(1)};
  }
  function handScore(src){const centers=[.305,.425,.545,.665],slots=centers.map(x=>cardSlotScore(src,x)),count=slots.filter(x=>x.occupied).length,total=slots.reduce((s,x)=>s+x.score,0);return {count,total:+total.toFixed(3),slots}}

  function analyzeMark(src){
    // 参考画面から、右上通知内のクラスアイコンだけを狭く切り出す。
    const cx=.809,cy=.095,cw=.030,ch=.066,sx=Math.max(0,Math.round(src.width*(cx-cw/2))),sy=Math.max(0,Math.round(src.height*(cy-ch/2))),sw=Math.max(12,Math.round(src.width*cw)),sh=Math.max(12,Math.round(src.height*ch));
    const c=document.createElement('canvas');c.width=108;c.height=108;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(src,sx,sy,Math.min(sw,src.width-sx),Math.min(sh,src.height-sy),0,0,c.width,c.height);
    const im=x.getImageData(0,0,c.width,c.height),d=im.data;let inside=0,blue=0,sat=0,sxv=0,syv=0,swv=0;
    for(let yy=0;yy<c.height;yy++)for(let xx=0;xx<c.width;xx++){const dx=(xx-c.width/2)/(c.width/2),dy=(yy-c.height/2)/(c.height/2);if(dx*dx+dy*dy>.72)continue;const i=(yy*c.width+xx)*4,h=rgbToHsv(d[i],d[i+1],d[i+2]);if(h.v<.22)continue;inside++;if(h.s>.24&&h.v>.32){sat++;const wt=h.s*h.v,rad=h.h*Math.PI/180;sxv+=Math.cos(rad)*wt;syv+=Math.sin(rad)*wt;swv+=wt;if(h.h>=180&&h.h<=290)blue++}}
    let hue=null;if(swv>0){hue=Math.atan2(syv,sxv)*180/Math.PI;if(hue<0)hue+=360}
    const blueRatio=blue/Math.max(1,inside),satRatio=sat/Math.max(1,inside),witch=blueRatio>=.14&&satRatio>=.18;
    const confidence=witch?Math.min(.98,.48+blueRatio*1.9+satRatio*.35):Math.min(.55,blueRatio*1.4);
    return {candidate:witch?'ウィッチ':'',confidence:+confidence.toFixed(3),blueRatio:+blueRatio.toFixed(3),satRatio:+satRatio.toFixed(3),hue:hue==null?null:+hue.toFixed(1),canvas:c};
  }
  function drawMark(c){if(!classCanvas||!c)return;const x=classCanvas.getContext('2d');x.clearRect(0,0,classCanvas.width,classCanvas.height);x.imageSmoothingEnabled=false;x.drawImage(c,0,0,classCanvas.width,classCanvas.height)}
  function copyFrame(src){const c=document.createElement('canvas');c.width=src.width;c.height=src.height;c.getContext('2d').drawImage(src,0,0);return c}

  function finishClass(results){
    const eligible=results.filter(r=>r.handCount>=3),witch=eligible.filter(r=>r.mark.candidate==='ウィッチ'&&r.mark.confidence>=.58);let accepted=false,bestMark=null;
    if(witch.length>=2){accepted=true;witch.sort((a,b)=>b.mark.confidence-a.mark.confidence);bestMark=witch[0].mark;classSelect.value='ウィッチ';const m=$q('#matchup');if(m&&!m.value.trim())m.value='ウィッチ'}
    else{const marks=eligible.map(r=>r.mark).sort((a,b)=>b.confidence-a.confidence);bestMark=marks[0]||null;classSelect.value=''}
    if(bestMark)drawMark(bestMark.canvas);
    window.classDetection441={patch:PATCH,accepted,candidate:accepted?'ウィッチ':'',votes:witch.length,confidence:witch.length?+(witch.reduce((s,r)=>s+r.mark.confidence,0)/witch.length).toFixed(3):+(bestMark?.confidence||0),method:'tight-mark-crop; witch-calibrated only',samples:eligible.map(r=>({time:r.time,handCount:r.handCount,candidate:r.mark.candidate,confidence:r.mark.confidence,blueRatio:r.mark.blueRatio,satRatio:r.mark.satRatio,hue:r.mark.hue}))};
    if(classStatus)classStatus.textContent=accepted?`自動判定：ウィッチ（${witch.length}フレーム一致）。`:'自動判定は保留しました。現段階ではウィッチだけ実画面で校正済みです。ほかのクラスは手動選択してください。';
    try{log('class-detect-v441',window.classDetection441)}catch{}
  }

  async function buildPreview(){
    if(running||!video?.src||!isFinite(video.duration)||video.duration<=0)return;running=true;const token=++runToken,original=video.currentTime;video.pause();if(still)still.style.display='none';if(stillTime)stillTime.textContent='';if(previewStatus)previewStatus.textContent='4枚の初期手札を探しています…';if(classStatus)classStatus.textContent='クラスマークを確認中…';
    try{
      const p=plan(),rows=[];for(const t of p.times){if(token!==runToken)throw new Error('cancelled');await seekSafe(t);const src=frameCanvas(1200),hs=handScore(src),mark=analyzeMark(src);rows.push({time:t,handCount:hs.count,handScore:hs.total,slots:hs.slots,mark})}
      const four=rows.filter(r=>r.handCount===4);let chosen;if(four.length){const max=Math.max(...four.map(r=>r.handScore));const near=four.filter(r=>r.handScore>=max*.92);chosen=near[Math.floor((near.length-1)/2)]||four.sort((a,b)=>b.handScore-a.handScore)[0]}else{chosen=rows.slice().sort((a,b)=>b.handCount-a.handCount||b.handScore-a.handScore)[0]}
      if(chosen){await seekSafe(chosen.time);const src=frameCanvas(1500),copy=copyFrame(src);if(still){still.src=copy.toDataURL('image/jpeg',.86);still.style.display='block'}if(stillTime)stillTime.textContent=`初期4枚候補：${fmt(chosen.time)} / 4枚判定 ${chosen.handCount}/4`;window.mulliganPreview441={patch:PATCH,time:chosen.time,handCount:chosen.handCount,score:chosen.handScore,firstPP:p.first};}
      finishClass(rows);if(previewStatus)previewStatus.textContent=chosen?.handCount===4?'初期手札4枚が見える代表画像を表示しています。':'4枚を確定できなかったため、最も手札が見える候補を表示しています。';try{log('mulligan-preview-v441',{...window.mulliganPreview441,scanStart:p.start,scanEnd:p.end,samples:rows.map(r=>({time:r.time,count:r.handCount,score:r.handScore}))})}catch{}
    }catch(err){if(err?.message!=='cancelled'&&previewStatus)previewStatus.textContent='プレビュー作成失敗：'+(err?.message||String(err));}
    finally{try{if(token===runToken)await seekSafe(original)}catch{}running=false}
  }
  function waitAndPreview(){let n=0;const id=setInterval(()=>{n++;if(window.autoPrep42||n>18){clearInterval(id);setTimeout(buildPreview,120)}},350)}

  $q('#previewMulligan441')?.addEventListener('click',()=>{runToken++;running=false;buildPreview()});
  classSelect?.addEventListener('change',()=>{const m=$q('#matchup');if(m&&classSelect.value)m.value=classSelect.value;try{log('class-manual-v441',{value:classSelect.value})}catch{}});
  $q('#videoFile')?.addEventListener('change',()=>{runToken++;running=false;window.classDetection441=null;window.mulliganPreview441=null;if(still)still.style.display='none';if(classSelect)classSelect.value='';if(previewStatus)previewStatus.textContent='動画読込後に初期4枚を自動表示します。'});
  video?.addEventListener('loadedmetadata',()=>setTimeout(waitAndPreview,250));
  try{log('patch-v441-active',{patch:PATCH})}catch{}
})();
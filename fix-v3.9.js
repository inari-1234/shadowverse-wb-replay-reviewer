(()=>{
  const PATCH='3.9-20260914-10';
  const $q=s=>document.querySelector(s);
  const header=$q('header h1'),sub=$q('header p');
  if(header) header.textContent='シャドバWB リプレイ診断 v3.9';
  if(sub) sub.textContent='Build 2026.09.14-10 / OCR時系列DP + 局所補完';

  const DEFAULTS={top:{x:.8811,y:.2905},bottom:{x:.8822,y:.6065}};
  let v39Points={top:{...DEFAULTS.top},bottom:{...DEFAULTS.bottom}};
  window.v39Points=v39Points;

  const oldCal=$q('#drawCal37')?.closest('.panel') || $q('#drawCal')?.closest('.panel');
  if(oldCal){
    oldCal.innerHTML=`
      <h2>2. PP位置の調整</h2>
      <p class="help">小さい数字をタップする必要はありません。赤・緑の四角が <b>PP ○ / ○ の右側の最大PP数字</b> を囲むように、必要なときだけ矢印で調整してください。</p>
      <div class="buttons"><button id="drawCal39" class="primary">現在画面を表示</button><button id="resetCal39">標準位置に戻す</button></div>
      <div class="calWrap"><canvas id="calCanvas39" width="1200" height="552"></canvas></div>
      <div class="grid" style="margin-top:10px">
        <div><div class="muted">上側 最大PP（赤）</div><canvas id="zoomTop39" width="300" height="170" style="width:100%;background:#000;border-radius:10px"></canvas><div class="buttons" style="justify-content:center"><button class="v39nudge" data-v39="top,0,-1">↑</button><button class="v39nudge" data-v39="top,-1,0">←</button><button class="v39nudge" data-v39="top,1,0">→</button><button class="v39nudge" data-v39="top,0,1">↓</button></div></div>
        <div><div class="muted">下側 最大PP（緑）</div><canvas id="zoomBottom39" width="300" height="170" style="width:100%;background:#000;border-radius:10px"></canvas><div class="buttons" style="justify-content:center"><button class="v39nudge" data-v39="bottom,0,-1">↑</button><button class="v39nudge" data-v39="bottom,-1,0">←</button><button class="v39nudge" data-v39="bottom,1,0">→</button><button class="v39nudge" data-v39="bottom,0,1">↓</button></div></div>
      </div>
      <p id="calStatus39" class="help">標準位置を設定済みです。数字を囲んでいれば調整不要です。</p>`;
  }

  const cal=$q('#calCanvas39'),cc=cal?.getContext('2d');
  function syncLegacyPoints(){try{points={top:{...v39Points.top},bottom:{...v39Points.bottom}};}catch{}}
  function drawZoom39(side){
    const c=$q(side==='top'?'#zoomTop39':'#zoomBottom39');
    if(!c||!video.videoWidth)return;
    const z=c.getContext('2d'),p=v39Points[side];
    const sx=Math.max(0,p.x*video.videoWidth-video.videoWidth*.050),sy=Math.max(0,p.y*video.videoHeight-video.videoHeight*.075),sw=Math.min(video.videoWidth-sx,video.videoWidth*.100),sh=Math.min(video.videoHeight-sy,video.videoHeight*.150);
    z.clearRect(0,0,c.width,c.height);z.drawImage(video,sx,sy,sw,sh,0,0,c.width,c.height);
    z.strokeStyle=side==='top'?'#ef4444':'#22c55e';z.lineWidth=4;z.strokeRect(c.width*.43,c.height*.31,c.width*.14,c.height*.38);
  }
  function drawCalibration39(){
    if(!cal||!cc||!video.videoWidth)return;
    const ar=video.videoWidth/video.videoHeight;cal.width=1200;cal.height=Math.round(1200/ar);cc.drawImage(video,0,0,cal.width,cal.height);
    for(const side of ['top','bottom']){const p=v39Points[side],x=p.x*cal.width,y=p.y*cal.height,w=cal.width*.018,h=cal.height*.052;cc.save();cc.strokeStyle=side==='top'?'#ef4444':'#22c55e';cc.lineWidth=4;cc.strokeRect(x-w/2,y-h/2,w,h);cc.restore();drawZoom39(side);}
    syncLegacyPoints();try{log('calibration-frame-v39',{time:+video.currentTime.toFixed(3),points:v39Points})}catch{}
  }
  $q('#drawCal39')?.addEventListener('click',drawCalibration39);
  $q('#resetCal39')?.addEventListener('click',()=>{v39Points={top:{...DEFAULTS.top},bottom:{...DEFAULTS.bottom}};window.v39Points=v39Points;syncLegacyPoints();drawCalibration39();const s=$q('#calStatus39');if(s)s.textContent='標準位置に戻しました。';try{log('calibration-reset-v39',{points:v39Points})}catch{}});
  document.querySelectorAll('[data-v39]').forEach(b=>b.addEventListener('click',()=>{const [side,dx,dy]=b.dataset.v39.split(','),step=.0012;v39Points[side].x=Math.max(.02,Math.min(.98,v39Points[side].x+Number(dx)*step));v39Points[side].y=Math.max(.02,Math.min(.98,v39Points[side].y+Number(dy)*step));syncLegacyPoints();drawCalibration39();const s=$q('#calStatus39');if(s)s.textContent=`${side==='top'?'上側':'下側'}: x=${v39Points[side].x.toFixed(4)} / y=${v39Points[side].y.toFixed(4)}`;try{log('pp-nudge-v39',{side,dx:Number(dx),dy:Number(dy),point:{...v39Points[side]}})}catch{}}));
  $q('#videoFile')?.addEventListener('change',()=>setTimeout(()=>{v39Points={top:{...DEFAULTS.top},bottom:{...DEFAULTS.bottom}};window.v39Points=v39Points;syncLegacyPoints();const b=$q('#scanTurns');if(b)b.disabled=!(video?.src&&isFinite(video.duration)&&video.duration>0);},0));
  video?.addEventListener('loadedmetadata',()=>{syncLegacyPoints();const b=$q('#scanTurns');if(b)b.disabled=false;setTimeout(drawCalibration39,0);});

  const scanPanel=$q('#scanTurns')?.closest('.panel'),warn=scanPanel?.querySelector('.warn');
  if(warn)warn.textContent='v3.9はOCRの単発値をそのまま採用しません。上→下→上→下…の順序全体で最も整合する候補列を選び、OCRが1ターンだけ欠けた区間だけ画像変化で補完します。根拠がない後半ターンは作りません。';
  const intervalSel=$q('#scanInterval');if(intervalSel)intervalSel.innerHTML='<option value="0.75">0.75秒（高精度・時間長め）</option><option value="1" selected>1秒（推奨）</option><option value="1.5">1.5秒（高速）</option>';
  const stableSel=$q('#stableCount');if(stableSel)stableSel.closest('label').style.display='none';
  let timeline=$q('#turnTimeline39');if(!timeline){timeline=document.createElement('div');timeline.id='turnTimeline39';timeline.className='ocrRead';timeline.textContent='v3.9 ターン解析は未実行です。';$q('#turnMap')?.parentNode?.insertBefore(timeline,$q('#turnMap'));}
  for(const id of ['#turnTimeline37','#turnTimeline38']){const e=$q(id);if(e)e.style.display='none';}
  window.ocrSamples39=[];window.turnTimeline39=[];window.inference39=[];

  function ppLineCrop39(side,variant='gray'){
    const p=v39Points[side];if(!p)throw new Error(side+' PP位置未設定');const src=frameCanvas(1900),left=.090,right=.022,hh=.056;
    let sx=Math.round((p.x-left)*src.width),sy=Math.round((p.y-hh/2)*src.height),cw=Math.round((left+right)*src.width),ch=Math.round(hh*src.height);
    sx=Math.max(0,Math.min(src.width-1,sx));sy=Math.max(0,Math.min(src.height-1,sy));cw=Math.max(30,Math.min(src.width-sx,cw));ch=Math.max(24,Math.min(src.height-sy,ch));
    const scale=4,c=document.createElement('canvas');c.width=cw*scale;c.height=ch*scale;const x=c.getContext('2d',{willReadFrequently:true});x.imageSmoothingEnabled=true;x.drawImage(src,sx,sy,cw,ch,0,0,c.width,c.height);
    const im=x.getImageData(0,0,c.width,c.height),d=im.data;let sum=0;for(let i=0;i<d.length;i+=4)sum+=.299*d[i]+.587*d[i+1]+.114*d[i+2];const mean=sum/(d.length/4);
    for(let i=0;i<d.length;i+=4){const g=.299*d[i]+.587*d[i+1]+.114*d[i+2],v=variant==='gray'?Math.max(0,Math.min(255,(g-mean)*2.0+128)):(g>mean?0:255);d[i]=d[i+1]=d[i+2]=v;d[i+3]=255;}x.putImageData(im,0,0);return c;
  }
  function digitVector39(side){
    const p=v39Points[side],src=frameCanvas(1900),cw=Math.max(22,Math.round(src.width*.016)),ch=Math.max(28,Math.round(src.height*.043));let sx=Math.round(p.x*src.width-cw/2),sy=Math.round(p.y*src.height-ch/2);sx=Math.max(0,Math.min(src.width-cw,sx));sy=Math.max(0,Math.min(src.height-ch,sy));
    const c=document.createElement('canvas');c.width=28;c.height=34;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(src,sx,sy,cw,ch,0,0,c.width,c.height);const d=x.getImageData(0,0,c.width,c.height).data,a=new Float32Array(c.width*c.height);let sum=0;
    for(let i=0,j=0;i<d.length;i+=4,j++){a[j]=.299*d[i]+.587*d[i+1]+.114*d[i+2];sum+=a[j];}const mean=sum/a.length;let ss=0;for(const v of a)ss+=(v-mean)*(v-mean);const sd=Math.max(8,Math.sqrt(ss/a.length));for(let i=0;i<a.length;i++)a[i]=(a[i]-mean)/sd;return a;
  }
  function parse39(text){const s=(text||'').replace(/[Oo]/g,'0').replace(/\s+/g,'');let m=s.match(/\/(10|[1-9])/);if(m)return {n:Number(m[1]),quality:5,pattern:'slash'};m=s.match(/(10|[0-9])[/|](10|[1-9])/);if(m)return {n:Number(m[2]),quality:4.5,pattern:'pair'};const ds=(s.match(/\d/g)||[]).join('');if(!ds)return {n:null,quality:0,pattern:'none'};if(ds.endsWith('10'))return {n:10,quality:2.2,pattern:'digits'};const n=Number(ds.slice(-1));if(n<1||n>9)return {n:null,quality:0,pattern:'zero'};const exact=ds===String(n);return {n,quality:exact?2:1.15,pattern:exact?'single':'digits'};}
  async function recognizeVariant(side,variant){const w=await initOCR(),c=ppLineCrop39(side,variant);try{await w.setParameters({tessedit_char_whitelist:'0123456789/',tessedit_pageseg_mode:'7'});}catch{}const r=await w.recognize(c),raw=(r.data.text||'').trim(),confidence=+(r.data.confidence||0).toFixed(1),p=parse39(raw);return {...p,raw,confidence,variant};}
  async function ocr39(side){const a=await recognizeVariant(side,'gray');if(a.pattern==='slash'||a.pattern==='pair'||(a.pattern==='single'&&a.confidence>=25))return a;const b=await recognizeVariant(side,'binary'),score=x=>x.quality+(x.confidence||0)/60;return score(b)>score(a)?b:a;}
  function vdist39(a,b){if(!a||!b)return 0;let s=0;for(let i=0;i<a.length;i++)s+=Math.min(3,Math.abs(a[i]-b[i]));return s/a.length/3;}
  function supportScore39(sample,samples){let s=sample.quality+(sample.confidence||0)/45,near=0;for(const y of samples){if(y===sample||y.side!==sample.side||y.n!==sample.n)continue;if(Math.abs(y.time-sample.time)<=7)near++;}s+=Math.min(3,near*.8);return s;}
  function expectedEvents39(playOrder,maxTurn=10){const first=playOrder==='先攻'?'bottom':'top',second=first==='top'?'bottom':'top',out=[];for(let n=1;n<=maxTurn;n++){out.push({side:first,turn:n});out.push({side:second,turn:n});}return out;}
  function decodeDP39(samples,playOrder){
    const eventsSeq=expectedEvents39(playOrder,10),cand=eventsSeq.map(ev=>samples.filter(x=>x.side===ev.side&&x.n===ev.turn).map(x=>({...x,score:supportScore39(x,samples)})).sort((a,b)=>a.time-b.time));let states=[{score:0,lastTime:-1,path:[]}];
    for(let i=0;i<eventsSeq.length;i++){const next=[];for(const st of states){next.push({score:st.score,lastTime:st.lastTime,path:[...st.path,{event:eventsSeq[i],sample:null}]});for(const c of cand[i]){if(c.time<=st.lastTime+.35)continue;next.push({score:st.score+c.score,lastTime:c.time,path:[...st.path,{event:eventsSeq[i],sample:c}]});}}next.sort((a,b)=>b.score-a.score);states=next.slice(0,450);}
    states.sort((a,b)=>b.score-a.score);const best=states[0]||{score:0,path:[]};let prev=-1;
    for(let i=0;i<best.path.length;i++){const item=best.path[i];if(!item.sample)continue;const selected=item.sample,eligible=cand[i].filter(x=>x.time>prev+.35&&x.time<=selected.time+.01&&selected.time-x.time<=8);if(eligible.length)item.sample=eligible[0];prev=item.sample.time;}
    return {events:eventsSeq,path:best.path,score:+best.score.toFixed(2)};
  }
  function inferSingleGaps39(decoded,samples){const path=decoded.path,inferred=[],selectedIdx=path.map((x,i)=>x.sample?i:-1).filter(i=>i>=0);for(let k=0;k<selectedIdx.length-1;k++){const a=selectedIdx[k],b=selectedIdx[k+1];if(b-a!==2)continue;const miss=path[a+1],lo=path[a].sample.time,hi=path[b].sample.time;if(hi-lo<1.0)continue;const rows=samples.filter(x=>x.side===miss.event.side&&x.time>lo+.25&&x.time<hi-.15).sort((x,y)=>x.time-y.time);let best=null;for(let i=1;i<rows.length;i++){const jump=vdist39(rows[i-1].vec,rows[i].vec),post=i+1<rows.length?vdist39(rows[i].vec,rows[i+1].vec):0,score=jump-.28*post;if(!best||score>best.score)best={time:rows[i].time,score,jump,post};}if(best&&best.score>=.055){miss.sample={side:miss.event.side,time:best.time,n:miss.event.turn,raw:'',confidence:0,quality:0,pattern:'inferred',score:0,source:'inferred-local',inferScore:+best.score.toFixed(3)};inferred.push({side:miss.event.side,turn:miss.event.turn,time:best.time,window:[lo,hi],score:+best.score.toFixed(3)});}}return inferred;}
  function render39(decoded){const rows=[];for(const item of decoded.path){if(!item.sample)continue;const s=item.sample;rows.push({side:item.event.side,turn:item.event.turn,time:s.time,source:s.source==='inferred-local'?'inferred-local':'ocr-dp',confidence:s.confidence||0,raw:s.raw||'',score:s.score||0,inferScore:s.inferScore||null});}rows.sort((a,b)=>a.time-b.time);window.turnTimeline39=rows;timeline.textContent=rows.length?rows.map(r=>`${r.side==='top'?'上':'下'}${r.turn}T  ${fmt(r.time)}  ${r.source==='ocr-dp'?'OCR-DP':'局所補完'}${r.source==='ocr-dp'?`  score=${r.score.toFixed(1)}`:`  score=${r.inferScore}`}`).join('\n'):'ターンを認識できませんでした。';return rows;}

  const btn=$q('#scanTurns');
  if(btn)btn.onclick=async()=>{
    if(!video?.src||!isFinite(video.duration)||video.duration<=0){$q('#scanStatus').textContent='先に動画を読み込んでください。';return;}
    const returnTime=video.currentTime,interval=Math.max(.7,Number($q('#scanInterval').value)||1),targetSide=$q('#targetSide').value,playOrder=$q('#playOrder').value;
    cancelled=false;turnMap={};renderTurnMap();window.ocrSamples39=[];window.turnTimeline39=[];window.inference39=[];timeline.textContent='PP OCR + 時系列DP解析中…';btn.disabled=true;$q('#cancelScan').disabled=false;$q('#progressWrap').classList.remove('hidden');syncLegacyPoints();try{log('turn-scan-start-v39',{interval,targetSide,playOrder,points:v39Points,patch:PATCH})}catch{}
    try{await initOCR();for(let t=.1;t<video.duration;t+=interval){if(cancelled)break;await seek(t,'pp-ocr-dp-v39');for(const side of ['top','bottom']){const rr=await ocr39(side),vec=digitVector39(side),row={side,time:+t.toFixed(2),n:rr.n,raw:rr.raw,confidence:rr.confidence,quality:rr.quality,pattern:rr.pattern,variant:rr.variant,vec};window.ocrSamples39.push(row);try{log('pp-ocr-v39',{side,time:row.time,value:row.n,raw:row.raw,confidence:row.confidence,quality:row.quality,pattern:row.pattern,variant:row.variant})}catch{}}$q('#progress').style.width=Math.min(100,t/video.duration*100)+'%';$q('#scanStatus').textContent=`PP解析 ${Math.min(100,t/video.duration*100).toFixed(0)}%`;}
      const decoded=decodeDP39(window.ocrSamples39,playOrder);window.inference39=inferSingleGaps39(decoded,window.ocrSamples39);const rows=render39(decoded),target=rows.filter(r=>r.side===targetSide);for(const r of target)turnMap[r.turn]={time:r.time,source:'pp-v3.9-'+r.source,side:r.side,confidence:r.source==='ocr-dp'?Math.min(99,Math.round(40+r.score*8)):50,raw:r.raw||`local inference score=${r.inferScore}`};renderTurnMap();updateTurnPick();$q('#scanStatus').textContent=cancelled?'解析を中止しました。':`解析完了：確定/補完 ${rows.length}件（DP score=${decoded.score}）`;try{log('turn-scan-finish-v39',{cancelled,score:decoded.score,timeline:rows,inference:window.inference39,targetTurns:Object.fromEntries(Object.entries(turnMap).map(([k,v])=>[k,v.time]))})}catch{}
    }catch(e){$q('#scanStatus').textContent='解析エラー: '+e.message;try{log('turn-scan-error-v39',{message:e.message,stack:String(e.stack||'')})}catch{}}
    finally{try{await seek(returnTime,'return-after-turn-scan-v39')}catch{}btn.disabled=false;$q('#cancelScan').disabled=true;}
  };

  const exportBtn=$q('#exportDiag');
  if(exportBtn)exportBtn.onclick=()=>{try{log('diagnostic-export-v39',{timelineCount:window.turnTimeline39.length})}catch{}const compact=window.ocrSamples39.map(x=>({side:x.side,time:x.time,n:x.n,raw:x.raw,confidence:x.confidence,quality:x.quality,pattern:x.pattern,variant:x.variant})),data={format:'shadowverse-wb-diagnostic-v3.9',build:PATCH,createdAt:new Date().toISOString(),userAgent:navigator.userAgent,video:videoFileMeta?{...videoFileMeta,duration:video.duration,currentTime:video.currentTime,width:video.videoWidth,height:video.videoHeight}:null,ppPoints:v39Points,targetSide:$q('#targetSide')?.value,playOrder:$q('#playOrder')?.value,turnTimeline:window.turnTimeline39,inference:window.inference39,ocrSamples:compact,turnMap,events};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='shadowverse-wb-diagnostic-v3.9.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);};

  syncLegacyPoints();const sb=$q('#scanTurns');if(sb&&video?.src&&isFinite(video.duration)&&video.duration>0)sb.disabled=false;try{log('patch-v39-active',{patch:PATCH,points:v39Points})}catch{}
})();
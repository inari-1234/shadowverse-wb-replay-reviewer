(()=>{
  const PATCH='3.7-20260914-07';
  const $q=s=>document.querySelector(s);
  const header=$q('header h1'), sub=$q('header p');
  if(header) header.textContent='シャドバWB リプレイ診断 v3.7';
  if(sub) sub.textContent='Build 2026.09.14-07 / PP位置かんたん調整 + 狭域ターン検出';

  // v3.7: no tiny direct-tap calibration. Start from known WB layout defaults,
  // then allow large-button nudging while showing enlarged crops.
  points={
    top:{x:0.8886,y:0.2920},
    bottom:{x:0.8837,y:0.6005}
  };

  const oldCal=$q('#drawCal')?.closest('.panel');
  if(oldCal){
    oldCal.innerHTML=`
      <h2>2. PP位置の調整</h2>
      <p class="help">小さい数字を直接タップする必要はありません。まず「現在画面を表示」を押してください。赤・緑の四角が <b>PP ○ / ○ の右側の最大PP数字</b> に重なっていればそのままでOKです。ずれている場合だけ矢印で微調整します。</p>
      <div class="buttons"><button id="drawCal37" class="primary">現在画面を表示</button><button id="resetCal37">標準位置に戻す</button></div>
      <div class="calWrap"><canvas id="calCanvas37" width="1200" height="552"></canvas></div>
      <div class="grid" style="margin-top:10px">
        <div><div class="muted">上側 最大PP（赤）</div><canvas id="zoomTop37" width="220" height="130" style="width:100%;background:#000;border-radius:10px"></canvas><div class="buttons"><button data-nudge="top,0,-1">↑</button><button data-nudge="top,-1,0">←</button><button data-nudge="top,1,0">→</button><button data-nudge="top,0,1">↓</button></div></div>
        <div><div class="muted">下側 最大PP（緑）</div><canvas id="zoomBottom37" width="220" height="130" style="width:100%;background:#000;border-radius:10px"></canvas><div class="buttons"><button data-nudge="bottom,0,-1">↑</button><button data-nudge="bottom,-1,0">←</button><button data-nudge="bottom,1,0">→</button><button data-nudge="bottom,0,1">↓</button></div></div>
      </div>
      <p id="calStatus37" class="help">標準位置を設定済みです。数字に四角が重なっていれば調整不要です。</p>`;
  }

  const mainCal=$q('#calCanvas37'), mcx=mainCal?.getContext('2d');
  function drawBox(side){
    if(!mainCal||!mcx||!points[side]) return;
    const p=points[side], x=p.x*mainCal.width, y=p.y*mainCal.height;
    const w=mainCal.width*.018, h=mainCal.height*.055;
    mcx.save();
    mcx.strokeStyle=side==='top'?'#ef4444':'#22c55e'; mcx.lineWidth=4;
    mcx.strokeRect(x-w/2,y-h/2,w,h);
    mcx.restore();
  }
  function drawZoom(side){
    const c=$q(side==='top'?'#zoomTop37':'#zoomBottom37');
    if(!c||!video.videoWidth||!points[side]) return;
    const z=c.getContext('2d'),p=points[side];
    const sx=Math.max(0,p.x*video.videoWidth-video.videoWidth*.045),
          sy=Math.max(0,p.y*video.videoHeight-video.videoHeight*.07),
          sw=Math.min(video.videoWidth-sx,video.videoWidth*.09),
          sh=Math.min(video.videoHeight-sy,video.videoHeight*.14);
    z.clearRect(0,0,c.width,c.height); z.drawImage(video,sx,sy,sw,sh,0,0,c.width,c.height);
    z.strokeStyle=side==='top'?'#ef4444':'#22c55e'; z.lineWidth=3;
    z.strokeRect(c.width*.5-c.width*.10,c.height*.5-c.height*.20,c.width*.20,c.height*.40);
  }
  function drawCalibration37(){
    if(!mainCal||!video.videoWidth) return;
    const ar=video.videoWidth/video.videoHeight;
    mainCal.width=1200; mainCal.height=Math.round(1200/ar);
    mcx.drawImage(video,0,0,mainCal.width,mainCal.height);
    drawBox('top'); drawBox('bottom'); drawZoom('top'); drawZoom('bottom');
    log('calibration-frame-v37',{time:+video.currentTime.toFixed(3),points});
  }
  $q('#drawCal37')?.addEventListener('click',drawCalibration37);
  $q('#resetCal37')?.addEventListener('click',()=>{points={top:{x:.8886,y:.2920},bottom:{x:.8837,y:.6005}};drawCalibration37();log('calibration-reset-v37',{points});});
  document.querySelectorAll('[data-nudge]').forEach(b=>b.addEventListener('click',()=>{
    const [side,dx,dy]=b.dataset.nudge.split(','); const step=.0025;
    points[side].x=Math.max(.02,Math.min(.98,points[side].x+Number(dx)*step));
    points[side].y=Math.max(.02,Math.min(.98,points[side].y+Number(dy)*step));
    drawCalibration37();
    $q('#calStatus37').textContent=`${side==='top'?'上側':'下側'}を微調整しました。四角が最大PP数字だけを囲んでいるか確認してください。`;
    log('pp-nudge-v37',{side,dx:Number(dx),dy:Number(dy),point:points[side]});
  }));

  const scanPanel=$q('#scanTurns')?.closest('.panel');
  const warn=scanPanel?.querySelector('.warn');
  if(warn) warn.textContent='v3.7では最大PP数字の「狭い領域」だけを追跡します。現在PPやカード使用による変化をなるべく除外し、各側で数字の状態が安定して切り替わった回数を1T、2T…として数えます。';
  const intervalSel=$q('#scanInterval');
  if(intervalSel){
    if(!intervalSel.querySelector('option[value="0.5"]')){const o=document.createElement('option');o.value='.5';o.textContent='0.5秒（推奨）';intervalSel.insertBefore(o,intervalSel.firstChild)}
    intervalSel.value='.5';
  }
  const stableSel=$q('#stableCount'); if(stableSel) stableSel.closest('label').style.display='none';

  let timeline=$q('#turnTimeline37');
  if(!timeline){timeline=document.createElement('div');timeline.id='turnTimeline37';timeline.className='ocrRead';timeline.textContent='ターン遷移は未解析です。';$q('#turnMap')?.parentNode?.insertBefore(timeline,$q('#turnMap'));}
  window.turnTimeline37=[]; window.turnCandidates37=[];

  function tightVector(side){
    const p=points[side]; if(!p) throw new Error('PP位置未設定');
    const src=frameCanvas(2000);
    // Deliberately narrow: denominator digit only.
    const cw=Math.max(20,Math.round(src.width*.015));
    const ch=Math.max(26,Math.round(src.height*.040));
    let sx=Math.round(p.x*src.width-cw/2),sy=Math.round(p.y*src.height-ch/2);
    sx=Math.max(0,Math.min(src.width-cw,sx));sy=Math.max(0,Math.min(src.height-ch,sy));
    const c=document.createElement('canvas'); c.width=24;c.height=30;
    const x=c.getContext('2d',{willReadFrequently:true}); x.drawImage(src,sx,sy,cw,ch,0,0,c.width,c.height);
    const d=x.getImageData(0,0,c.width,c.height).data,out=new Float32Array(c.width*c.height);
    let sum=0;for(let i=0,j=0;i<d.length;i+=4,j++){out[j]=.299*d[i]+.587*d[i+1]+.114*d[i+2];sum+=out[j]}
    const mean=sum/out.length; let ss=0;for(const v of out)ss+=(v-mean)*(v-mean);const sd=Math.max(8,Math.sqrt(ss/out.length));
    for(let i=0;i<out.length;i++)out[i]=(out[i]-mean)/sd;
    return out;
  }
  function dist(a,b){if(!a||!b)return 0;let s=0;for(let i=0;i<a.length;i++)s+=Math.min(3,Math.abs(a[i]-b[i]));return s/a.length/3}
  function median(a){if(!a.length)return 0;const b=[...a].sort((x,y)=>x-y),m=b.length>>1;return b.length%2?b[m]:(b[m-1]+b[m])/2}
  function percentile(a,p){if(!a.length)return 0;const b=[...a].sort((x,y)=>x-y),i=Math.min(b.length-1,Math.max(0,Math.floor((b.length-1)*p)));return b[i]}

  function detectStates(samples,side){
    const diffs=[];for(let i=1;i<samples.length;i++)diffs.push(dist(samples[i-1].vec,samples[i].vec));
    const med=median(diffs),p85=percentile(diffs,.85);
    const threshold=Math.min(.18,Math.max(.075,med*2.4,p85*.72));
    const stable=Math.min(.07,Math.max(.028,med*1.7));
    const raw=[];
    for(let i=2;i<samples.length-3;i++){
      const jump=dist(samples[i-1].vec,samples[i].vec);
      const s1=dist(samples[i].vec,samples[i+1].vec),s2=dist(samples[i+1].vec,samples[i+2].vec);
      const pre=dist(samples[i-2].vec,samples[i-1].vec);
      const net=dist(samples[i-1].vec,samples[i+2].vec);
      if(jump>=threshold && net>=threshold*.82 && s1<=stable && s2<=stable*1.25 && pre<=threshold*.85){
        raw.push({side,time:samples[i].time,score:+jump.toFixed(4),net:+net.toFixed(4),stable:+((s1+s2)/2).toFixed(4),threshold:+threshold.toFixed(4)});
      }
    }
    const kept=[];
    for(const c of raw){
      const prev=kept[kept.length-1];
      if(prev&&c.time-prev.time<3.5){if(c.score>prev.score)kept[kept.length-1]=c}
      else kept.push(c);
    }
    // Assign each side independently. Missing one side no longer blocks the other.
    kept.forEach((c,i)=>{c.turn=i+1;c.label=(side==='bottom'?'下':'上')+(i+1)+'T'});
    log('state-threshold-v37',{side,median:+med.toFixed(4),p85:+p85.toFixed(4),threshold:+threshold.toFixed(4),stable:+stable.toFixed(4),candidates:kept});
    return kept;
  }
  function renderTimeline37(){
    const rows=[...window.turnTimeline37].sort((a,b)=>a.time-b.time);
    timeline.textContent=rows.length?rows.map(x=>`${x.label}  ${fmt(x.time)}  score=${x.score}`).join('\n'):'ターン遷移を認識できませんでした。診断レポートを送ってください。';
  }

  const btn=$q('#scanTurns');
  if(btn)btn.onclick=async()=>{
    const returnTime=video.currentTime,interval=Math.max(.35,Number($q('#scanInterval').value)||.5),targetSide=$q('#targetSide').value;
    cancelled=false;turnMap={};renderTurnMap();window.turnTimeline37=[];window.turnCandidates37=[];timeline.textContent='解析中…';
    btn.disabled=true;$q('#cancelScan').disabled=false;$q('#progressWrap').classList.remove('hidden');
    log('turn-scan-start-v37',{interval,targetSide,playOrder:$q('#playOrder').value,returnTime:+returnTime.toFixed(3),points,patch:PATCH});
    const samples={top:[],bottom:[]};
    try{
      for(let t=.1;t<video.duration;t+=interval){
        if(cancelled)break;await seek(t,'pp-state-scan-v37');
        for(const side of ['top','bottom'])samples[side].push({time:+t.toFixed(2),vec:tightVector(side)});
        $q('#progress').style.width=Math.min(100,t/video.duration*100)+'%';
        if(Math.round(t/interval)%12===0)$q('#scanStatus').textContent=`ターン解析 ${Math.min(100,t/video.duration*100).toFixed(0)}%`;
      }
      const top=detectStates(samples.top,'top'),bottom=detectStates(samples.bottom,'bottom');
      window.turnCandidates37=[...top,...bottom].sort((a,b)=>a.time-b.time);window.turnTimeline37=window.turnCandidates37;renderTimeline37();
      const target=targetSide==='bottom'?bottom:top;
      for(const e of target)turnMap[e.turn]={time:e.time,source:'pp-state-v3.7',side:e.side,confidence:Math.min(99,Math.round(e.score/Math.max(.001,e.threshold)*60)),raw:`state score=${e.score}, net=${e.net}`};
      renderTurnMap();updateTurnPick();
      $q('#scanStatus').textContent=cancelled?'解析を中止しました。':`解析完了：上側 ${top.length}ターン / 下側 ${bottom.length}ターン`;
      log('turn-scan-finish-v37',{cancelled,top:top.map(x=>({turn:x.turn,time:x.time,score:x.score})),bottom:bottom.map(x=>({turn:x.turn,time:x.time,score:x.score})),targetTurns:Object.fromEntries(Object.entries(turnMap).map(([k,v])=>[k,v.time]))});
    }catch(e){$q('#scanStatus').textContent='解析エラー: '+e.message;log('turn-scan-error-v37',{message:e.message,stack:String(e.stack||'')})}
    finally{try{await seek(returnTime,'return-after-turn-scan-v37')}catch{}btn.disabled=false;$q('#cancelScan').disabled=true}
  };

  const exportBtn=$q('#exportDiag');
  if(exportBtn)exportBtn.onclick=()=>{
    log('diagnostic-export-v37',{timelineCount:window.turnTimeline37.length});
    const data={format:'shadowverse-wb-diagnostic-v3.7',build:PATCH,createdAt:new Date().toISOString(),userAgent:navigator.userAgent,video:videoFileMeta?{...videoFileMeta,duration:video.duration,currentTime:video.currentTime,width:video.videoWidth,height:video.videoHeight}:null,ppPoints:points,targetSide:$q('#targetSide')?.value,playOrder:$q('#playOrder')?.value,turnTimeline:window.turnTimeline37,turnMap,scenes:scenes.map(s=>({turn:s.turn,timeSeconds:s.timeSeconds,playOrder:s.playOrder,matchup:s.matchup,deck:s.deck,note:s.note})),events};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='shadowverse-wb-diagnostic-v3.7.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)
  };

  log('patch-v37-active',{patch:PATCH,points});
})();
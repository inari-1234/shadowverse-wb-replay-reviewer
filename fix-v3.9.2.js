(()=>{
  const PATCH='3.9.2-20260915-stable-05';
  const $q=s=>document.querySelector(s);
  const header=$q('header h1'),sub=$q('header p');
  if(header) header.textContent='シャドバWB リプレイ診断 v3.9.2';
  if(sub) sub.textContent='Build 2026.09.15-stable-05 / ターン表示先行・OCR自動フォールバック';

  const play=$q('#playOrder');
  const scanPanel=$q('#scanTurns')?.closest('.panel');
  const warn=scanPanel?.querySelector('.warn');
  if(warn) warn.textContent='通常は右側ターンボタンだけを高速走査します。演出中は判定保留し、ターン列を安定取得できない場合だけ従来PP OCRへ自動フォールバックします。';

  window.rejectedTurns392=[];
  let indicatorSeekCount392=0;
  function firstSide(){return play?.value==='先攻'?'bottom':'top'}
  function key(x){return `${x.side}:${x.turn}`}
  function seqIndex(side,turn){const first=firstSide(),second=first==='top'?'bottom':'top';return (turn-1)*2+(side===first?0:side===second?1:99)}
  function confidenceFrom(item){if(item.source==='ocr-stable-v3.9.1')return 92;if(item.source?.includes('inferred'))return 55;const s=Number(item.score)||0;return Math.max(45,Math.min(95,Math.round(45+s*6)))}
  function samplesFor(side,turn){return (window.ocrSamples39||[]).filter(x=>x.side===side&&Number(x.n)===Number(turn)).sort((a,b)=>a.time-b.time)}
  function hasNeighbor(rows,i,span=2.1){return rows.some((x,j)=>j!==i&&Math.abs(x.time-rows[i].time)<=span)}
  function stableStarts(side,turn){const rows=samplesFor(side,turn),out=[];for(let i=0;i<rows.length;i++){if(!hasNeighbor(rows,i))continue;let j=i;while(j>0&&rows[j].time-rows[j-1].time<=2.1)j--;if(!out.some(x=>Math.abs(x.time-rows[j].time)<.01))out.push(rows[j]);}return out}
  function rawKind(raw){const s=String(raw||'').replace(/\s+/g,'');if(s.includes('/'))return 'slash';if(/^\d+$/.test(s)&&s.length===1)return 'single';return 'noisy'}
  function reanchor392(item,rejected){
    if(item.source==='ocr-stable-v3.9.1')return item;
    const rows=samplesFor(item.side,item.turn),near=rows.filter(x=>Math.abs(x.time-item.time)<=2.1&&Math.abs(x.time-item.time)>.05);
    if(item.source?.includes('inferred')){
      if(!rows.some((x,i)=>hasNeighbor(rows,i)&&Math.abs(x.time-item.time)<=4.5)){rejected.push({...item,reason:'unsupported-inferred-turn'});return null}
      return item;
    }
    if(near.length)return item;
    const starts=stableStarts(item.side,item.turn).filter(x=>x.time>item.time+.1&&x.time-item.time<=8);
    if(starts.length){
      const next=starts[0],gap=next.time-item.time,kind=rawKind(item.raw),conf=Number(item.confidence)||0;
      const shouldMove=(kind==='slash'&&conf<25&&gap>=2.5)||(kind==='single'&&conf<25&&gap>=4)||(kind==='noisy'&&conf<35&&gap>=1.5);
      if(shouldMove){
        try{log('turn-reanchored-v392',{side:item.side,turn:item.turn,from:item.time,to:next.time,raw:item.raw||'',reason:'stable-forward-evidence'})}catch{}
        return {...item,time:next.time,source:'ocr-stable-forward-v3.9.2',reanchoredFrom:item.time}
      }
    }
    return item;
  }

  function indicatorSignal392(){
    const vid=typeof video!=='undefined'?video:$q('#video');
    if(!vid?.videoWidth||!vid?.videoHeight)return {side:null,diff:0,pixels:0,visible:false};
    const c=document.createElement('canvas');c.width=48;c.height=64;
    const x=c.getContext('2d',{willReadFrequently:true});
    const sx=Math.round(vid.videoWidth*.82),sy=Math.round(vid.videoHeight*.34),sw=Math.max(8,Math.round(vid.videoWidth*.09)),sh=Math.max(8,Math.round(vid.videoHeight*.21));
    x.drawImage(vid,sx,sy,sw,sh,0,0,c.width,c.height);
    const d=x.getImageData(0,0,c.width,c.height).data,total=Math.max(1,d.length/4);
    let red=0,blue=0,count=0,dark=0,white=0,gold=0;
    for(let i=0;i<d.length;i+=4){
      const r=d[i],g=d[i+1],b=d[i+2],mx=Math.max(r,g,b),mn=Math.min(r,g,b),sat=mx-mn;
      if(mx<60)dark++;
      if(mn>150&&sat<65)white++;
      if(r>120&&g>70&&g<190&&b<110&&r-b>50)gold++;
      if(mx<80||sat<40)continue;
      red+=Math.max(0,r-(b+g)/2);
      blue+=Math.max(0,b-(r+g)/2);
      count++;
    }
    const darkFrac=dark/total,whiteFrac=white/total,goldFrac=gold/total;
    const visible=(darkFrac>=.08&&(goldFrac>=.008||whiteFrac>=.012))||(goldFrac>=.015&&whiteFrac>=.012);
    if(!visible||count<900)return {side:null,diff:0,pixels:count,visible:false,dark:+darkFrac.toFixed(3),white:+whiteFrac.toFixed(3),gold:+goldFrac.toFixed(3)};
    const diff=(red-blue)/count,target=$q('#targetSide')?.value||'bottom',opponent=target==='top'?'bottom':'top';
    const base={diff:+diff.toFixed(2),pixels:count,visible:true,dark:+darkFrac.toFixed(3),white:+whiteFrac.toFixed(3),gold:+goldFrac.toFixed(3)};
    if(diff>15)return {side:opponent,...base};
    if(diff<-15)return {side:target,...base};
    return {side:null,...base};
  }
  async function indicatorAt392(t){
    const vid=typeof video!=='undefined'?video:$q('#video');
    if(!vid?.src||!Number.isFinite(vid.duration))return {time:t,side:null,diff:0,pixels:0,visible:false};
    t=Math.max(.05,Math.min(vid.duration-.08,t));indicatorSeekCount392++;
    try{
      if(typeof seek==='function')await seek(t,'turn-indicator-v392');
      else if(Math.abs(vid.currentTime-t)>.025)await new Promise((resolve,reject)=>{
        const done=()=>resolve();vid.addEventListener('seeked',done,{once:true});vid.currentTime=t;setTimeout(()=>reject(new Error('indicator seek timeout')),2500);
      });
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    }catch{}
    return {time:+t.toFixed(3),...indicatorSignal392()};
  }
  async function usableIndicator392(anchor,side){
    for(const off of [0,-.25,.25,-.5,.5,-1,1,-1.5,1.5,-2,2]){
      const s=await indicatorAt392(anchor+off);
      if(s.side===side)return s;
    }
    return null;
  }
  async function resolvedIndicator392(t){
    let s=await indicatorAt392(t);
    if(s.side)return s;
    for(const off of [-.12,.12,-.28,.28]){
      const p=await indicatorAt392(t+off);
      if(p.side)return p;
    }
    return s;
  }
  async function refineTurnStart392(item){
    const anchor=Number(item.time);
    if(!Number.isFinite(anchor)||anchor<.7)return item;
    const usable=await usableIndicator392(anchor,item.side);
    if(!usable)return item;
    let hi=usable.time,lo=null,lastSame=hi;
    for(const back of [.75,1.5,3,4.5,6,7.5,8.5]){
      const s=await resolvedIndicator392(Math.max(.1,hi-back));
      if(s.side===item.side){lastSame=s.time;continue}
      if(s.side&&s.side!==item.side){lo=s.time;break}
    }
    if(lo==null||lastSame<=lo)return item;
    hi=lastSame;
    for(let i=0;i<6;i++){
      const mid=(lo+hi)/2,s=await resolvedIndicator392(mid);
      if(s.side===item.side)hi=s.time;
      else if(s.side&&s.side!==item.side)lo=s.time;
      else break;
    }
    const refined=+hi.toFixed(3),delta=anchor-refined;
    if(delta<.08||delta>8.7)return item;
    const out={...item,time:refined,source:'turn-indicator-refined-v3.9.2',ppStableTime:anchor,indicatorRefinedFrom:anchor};
    try{log('turn-indicator-refined-v392',{side:item.side,turn:item.turn,from:anchor,to:refined,delta:+delta.toFixed(3),priorSource:item.source||'',buttonCrop:'tight-v4',search:'exponential'})}catch{}
    return out;
  }
  async function refineAcceptedStarts392(clean){
    const vid=typeof video!=='undefined'?video:$q('#video'),restore=Number(vid?.currentTime)||0,out=[];
    try{
      let prevTime=-1;
      for(const item of clean){
        const refined=await refineTurnStart392(item);
        if(refined.time>prevTime+.2){out.push(refined);prevTime=refined.time}
        else{out.push(item);prevTime=item.time}
      }
    }finally{
      try{if(typeof seek==='function')await seek(restore,'return-after-indicator-v392');else if(vid)vid.currentTime=restore}catch{}
    }
    return out;
  }
  async function recoverMissingFirstTurn392(clean){
    const first=firstSide(),second=first==='top'?'bottom':'top';
    if(clean.some(x=>x.side===first&&Number(x.turn)===1))return clean;
    const second1=clean.find(x=>x.side===second&&Number(x.turn)===1);
    if(!second1)return clean;
    const mulliganTime=Number(window.mulliganPreview442?.time);
    const floor=Number.isFinite(mulliganTime)?Math.max(.1,mulliganTime-.6):Math.max(.1,second1.time-10);
    let seed=null;
    for(let t=second1.time-.15;t>=floor-.001;t-=.2){
      const s=await indicatorAt392(t);
      if(s.side===first){seed=t;break}
    }
    if(seed==null)return clean;
    let hi=seed,lo=null,nullRun=0;
    for(let t=seed-.2;t>=floor-.001;t-=.2){
      const s=await indicatorAt392(t);
      if(s.side===first){hi=t;nullRun=0;continue}
      if(s.side&&s.side!==first){lo=t;break}
      nullRun+=.2;
      if(nullRun>=.6)break;
    }
    let recovered=hi;
    if(lo!=null&&hi>lo){
      for(let i=0;i<5;i++){
        const mid=(lo+hi)/2,s=await resolvedIndicator392(mid);
        if(s.side===first)hi=mid;
        else if(s.side&&s.side!==first)lo=mid;
        else break;
      }
      recovered=hi;
    }
    recovered=+recovered.toFixed(3);
    if(!Number.isFinite(recovered)||recovered>=second1.time-.2)return clean;
    const item={side:first,turn:1,time:recovered,source:'turn-indicator-recovered-v3.9.2',confidence:80,raw:'',score:6,inferScore:null,recoveredWithoutPPOCR:true};
    try{log('turn-1-recovered-v392',{side:first,turn:1,time:recovered,nextSide:second,nextTime:second1.time,floor})}catch{}
    return [...clean,item].sort((a,b)=>seqIndex(a.side,a.turn)-seqIndex(b.side,b.turn)||a.time-b.time);
  }

  async function refineFastBoundary392(priorSide,nextSide,scanStart,firstHit){
    let lo=Math.max(.05,Number(scanStart)||.05),hi=Number(firstHit);
    if(!Number.isFinite(hi)||hi<=lo)return hi;
    let lastPrior=null,firstNext=null;
    for(let t=lo;t<=hi+.001;t+=.1){
      const s=await indicatorAt392(t);
      if(s.side===priorSide)lastPrior=s.time;
      else if(s.side===nextSide&&lastPrior!=null&&firstNext==null)firstNext=s.time;
    }
    if(firstNext==null)return hi;
    if(lastPrior==null)return firstNext;
    let a=lastPrior,b=firstNext;
    for(let i=0;i<5;i++){
      const mid=(a+b)/2,s=await indicatorAt392(mid);
      if(s.side===nextSide)b=s.time;
      else if(s.side===priorSide)a=s.time;
      else{
        const p=await indicatorAt392(Math.min(b,mid+.03));
        if(p.side===nextSide)b=p.time;
        else a=mid;
      }
    }
    return +b.toFixed(3);
  }

  async function refineFastFirst392(side,start,firstHit){
    let earliest=Number(firstHit);
    for(let t=firstHit;t>=start-.001;t-=.1){
      const s=await indicatorAt392(t);
      if(s.side===side)earliest=s.time;
      else if(earliest<firstHit-.05&&s.side&&s.side!==side)break;
    }
    return +earliest.toFixed(3);
  }

  function renderTimeline392(clean,rejected=[],mode='fast'){
    window.turnTimeline39=clean;window.rejectedTurns392=rejected;
    const target=$q('#targetSide')?.value||'bottom';
    for(const k of Object.keys(turnMap))delete turnMap[k];
    for(const r of clean.filter(x=>x.side===target))turnMap[r.turn]={time:r.time,source:`pp-v3.9.2-${r.source||'validated'}`,side:target,confidence:confidenceFrom(r),raw:r.raw||String(r.turn)};
    renderTurnMap();updateTurnPick();
    const tlEl=$q('#turnTimeline39');
    if(tlEl){
      const rows=clean.map(r=>`${r.side==='top'?'上':'下'}${r.turn}T  ${fmt(r.time)}  ${mode==='fast'?'ターン表示高速検出':'検証済み'}`);
      if(rejected.length)rows.push(`除外 ${rejected.length}件：`+rejected.map(x=>`${x.side==='top'?'上':'下'}${x.turn}T(${x.reason})`).join('、'));
      tlEl.textContent=rows.join('\n');
    }
  }

  async function fastIndicatorTimeline392(){
    const vid=typeof video!=='undefined'?video:$q('#video'),status=$q('#scanStatus');
    const mulliganTime=Number(window.mulliganPreview442?.time);
    if(!vid?.src||!Number.isFinite(vid.duration)||!Number.isFinite(mulliganTime))return null;
    const first=firstSide(),other=first==='top'?'bottom':'top',start=Math.max(.1,mulliganTime+.5),step=.75,stableGap=1.6;
    if(status)status.textContent='高速解析：ターンボタンを走査中…';
    indicatorSeekCount392=0;
    const coarse=[];
    for(let t=start;t<vid.duration-.08;t+=step){
      const s=await indicatorAt392(t);
      coarse.push({time:+t.toFixed(3),side:s.side});
      if(coarse.length%24===0&&status)status.textContent=`高速解析：${Math.min(99,Math.round(t/vid.duration*100))}% / OCRなし`;
    }
    let expected=first,prior=other,pending=[],lastAccepted=start;
    const out=[],counts={top:0,bottom:0};
    for(const row of coarse){
      if(row.side===expected){
        pending.push(row.time);
        pending=pending.filter(x=>row.time-x<=stableGap);
        if(pending.length>=2){
          const firstHit=pending[0];
          const priorHits=coarse.filter(x=>x.time>=lastAccepted&&x.time<firstHit&&x.side===prior);
          const lo=priorHits.length?priorHits[priorHits.length-1].time:Math.max(start,firstHit-1.5);
          const refined=out.length?await refineFastBoundary392(prior,expected,lo,firstHit):await refineFastFirst392(expected,start,firstHit);
          counts[expected]++;
          out.push({side:expected,turn:counts[expected],time:refined,source:'turn-indicator-fast-v3.9.2',confidence:88,raw:'',score:7,inferScore:null,indicatorOnly:true});
          lastAccepted=refined;prior=expected;expected=expected==='top'?'bottom':'top';pending=[];
        }
      }else if(row.side===prior){
        pending=[];
      }
    }
    const firstCount=out.filter(x=>x.side===first).length,otherCount=out.filter(x=>x.side===other).length;
    const structurallyValid=out.length>=4&&firstCount>=2&&otherCount>=1&&Math.abs(firstCount-otherCount)<=1&&out[0]?.side===first;
    if(!structurallyValid){
      try{log('fast-indicator-fallback-v392',{count:out.length,firstCount,otherCount,indicatorSeeks:indicatorSeekCount392})}catch{}
      return null;
    }
    renderTimeline392(out,[],'fast');
    if(status)status.textContent=`高速解析完了：${out.length}件 / PP OCR省略 / ターン表示シーク ${indicatorSeekCount392}回`;
    try{log('fast-indicator-finish-v392',{patch:PATCH,firstSide:first,indicatorSeeks:indicatorSeekCount392,timeline:out.map(x=>({side:x.side,turn:x.turn,time:x.time,source:x.source}))})}catch{}
    return out;
  }

  async function sanitizeTimeline392(){
    indicatorSeekCount392=0;
    const rejected=[];
    let tl=(window.turnTimeline39||[]).map(x=>reanchor392({...x},rejected)).filter(Boolean);
    const first=firstSide(),second=first==='top'?'bottom':'top';
    let map=new Map(tl.map(x=>[key(x),x]));

    for(let pass=0;pass<2;pass++)for(const side of ['top','bottom']){
      const allowMissingOne=side===first;
      for(let n=2;n<=10;n++){
        const cur=map.get(`${side}:${n}`);if(!cur)continue;
        if(!map.get(`${side}:${n-1}`)&&!(allowMissingOne&&n===2)){
          rejected.push({...cur,reason:pass?'chain-break-before-'+n+'T':'missing-'+(n-1)+'T-same-side'});
          map.delete(`${side}:${n}`);
        }
      }
    }

    for(let n=1;n<=10;n++){
      const a=map.get(`${first}:${n}`),b=map.get(`${second}:${n}`);
      if(a&&b&&b.time<=a.time+.25){
        const drop=confidenceFrom(b)>confidenceFrom(a)+12?a:b;
        rejected.push({...drop,reason:'same-turn-order-conflict'});map.delete(key(drop));
      }
    }

    const ordered=[...map.values()].sort((a,b)=>seqIndex(a.side,a.turn)-seqIndex(b.side,b.turn));
    let lastIdx=-1;
    for(const cur of ordered){
      const idx=seqIndex(cur.side,cur.turn);
      if(lastIdx>=1&&idx>lastIdx+1){rejected.push({...cur,reason:'alternating-sequence-gap'});map.delete(key(cur));continue}
      lastIdx=idx;
    }

    let clean=[...map.values()].sort((a,b)=>seqIndex(a.side,a.turn)-seqIndex(b.side,b.turn)||a.time-b.time);
    const status=$q('#scanStatus');
    if(status)status.textContent='PP列を検証済み。ターン開始表示を高速補正中…';
    clean=await refineAcceptedStarts392(clean);
    clean=await recoverMissingFirstTurn392(clean);

    window.turnTimeline39=clean;window.rejectedTurns392=rejected;
    const target=$q('#targetSide')?.value||'bottom';
    for(const k of Object.keys(turnMap))delete turnMap[k];
    for(const r of clean.filter(x=>x.side===target))turnMap[r.turn]={time:r.time,source:'pp-v3.9.2-'+(r.source||'validated'),side:target,confidence:confidenceFrom(r),raw:r.raw||String(r.turn)};
    renderTurnMap();updateTurnPick();

    const tlEl=$q('#turnTimeline39');
    if(tlEl){
      const rows=[];
      if(!clean.find(x=>x.side===first&&x.turn===1))rows.push(`${first==='top'?'上':'下'}1T  未確定（初期OCR根拠不足）`);
      for(const r of [...clean].sort((a,b)=>a.time-b.time||seqIndex(a.side,a.turn)-seqIndex(b.side,b.turn))){
        const src=r.source==='turn-indicator-recovered-v3.9.2'?'ターン表示復元':r.source==='turn-indicator-refined-v3.9.2'?'ターン表示補正':r.source==='ocr-stable-v3.9.1'?'安定OCR':r.source==='ocr-stable-forward-v3.9.2'?'連続OCR':(r.source?.includes('ocr')?'OCR':'補完');
        rows.push(`${r.side==='top'?'上':'下'}${r.turn}T  ${fmt(r.time)}  ${src}`);
      }
      if(rejected.length)rows.push(`除外 ${rejected.length}件：`+rejected.map(x=>`${x.side==='top'?'上':'下'}${x.turn}T(${x.reason})`).join('、'));
      tlEl.textContent=rows.join('\n');
    }
    if(status)status.textContent=`解析完了：${clean.length}件 / 誤認除外 ${rejected.length}件 / ターン補正シーク ${indicatorSeekCount392}回`;
    try{log('postprocess-v392',{patch:PATCH,firstSide:first,indicatorSeeks:indicatorSeekCount392,rejected:rejected.map(x=>({side:x.side,turn:x.turn,time:x.time,reason:x.reason})),timeline:clean.map(x=>({side:x.side,turn:x.turn,time:x.time,source:x.source,reanchoredFrom:x.reanchoredFrom||null,ppStableTime:x.ppStableTime||null,recoveredWithoutPPOCR:!!x.recoveredWithoutPPOCR}))})}catch{}
  }

  const btn=$q('#scanTurns');
  if(btn&&typeof btn.onclick==='function'){
    const base=btn.onclick;
    btn.onclick=async function(e){
      if(window.turnAnalysisBusy392)return;
      window.turnAnalysisBusy392=true;
      const diag=$q('#exportDiag'),diagWas=diag?.disabled;
      if(diag)diag.disabled=true;
      this.disabled=true;
      const started=performance.now();
      try{
        const fast=await fastIndicatorTimeline392();
        if(!fast){
          const st=$q('#scanStatus');if(st)st.textContent='高速判定を確定できないため、従来PP OCRで再確認中…';
          await base.call(this,e);await sanitizeTimeline392();
          try{log('turn-analysis-mode-v392',{mode:'ocr-fallback',elapsedMs:Math.round(performance.now()-started)})}catch{}
        }else{
          try{log('turn-analysis-mode-v392',{mode:'indicator-fast',elapsedMs:Math.round(performance.now()-started),count:fast.length,indicatorSeeks:indicatorSeekCount392})}catch{}
        }
      }finally{
        window.turnAnalysisBusy392=false;
        this.disabled=false;
        if(diag)diag.disabled=!!diagWas;
      }
    }
  }
  const exportBtn=$q('#exportDiag');
  if(exportBtn){
    exportBtn.onclick=()=>{
      try{log('diagnostic-export-v392',{timelineCount:window.turnTimeline39?.length||0,rejectedCount:window.rejectedTurns392?.length||0,firstSide:firstSide(),indicatorSeeks:indicatorSeekCount392})}catch{}
      const compact=(window.ocrSamples39||[]).map(x=>({side:x.side,time:x.time,n:x.n,raw:x.raw,confidence:x.confidence,quality:x.quality,pattern:x.pattern,variant:x.variant}));
      const data={format:'shadowverse-wb-diagnostic-v3.9.2',build:PATCH,createdAt:new Date().toISOString(),userAgent:navigator.userAgent,video:videoFileMeta?{...videoFileMeta,duration:video.duration,currentTime:video.currentTime,width:video.videoWidth,height:video.videoHeight}:null,ppPoints:window.v39Points||points,targetSide:$q('#targetSide')?.value,playOrder:play?.value,firstSide:firstSide(),turnTimeline:window.turnTimeline39||[],rejectedTurns:window.rejectedTurns392||[],inference:window.inference39||[],ocrSamples:compact,turnMap,events};
      const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),a=document.createElement('a');
      a.href=URL.createObjectURL(blob);a.download='shadowverse-wb-diagnostic-v3.9.2.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);
    }
  }
  try{log('patch-v392-active',{patch:PATCH,firstSide:firstSide()})}catch{}
})();
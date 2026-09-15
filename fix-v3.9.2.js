(()=>{
  const PATCH='3.9.2-20260915-stable-06';
  const $q=s=>document.querySelector(s);
  const header=$q('header h1'),sub=$q('header p');
  if(header) header.textContent='シャドバWB リプレイ診断 v3.9.2';
  if(sub) sub.textContent='Build 2026.09.15-stable-06 / 適応走査でターン解析を高速化';

  const play=$q('#playOrder');
  const scanPanel=$q('#scanTurns')?.closest('.panel');
  const warn=scanPanel?.querySelector('.warn');
  if(warn) warn.textContent='通常は右側ターンボタンを粗く高速走査し、切替候補だけ細かく確認します。判定が不安定な場合だけ従来PP OCRへ自動フォールバックします。';

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
      if(shouldMove){try{log('turn-reanchored-v392',{side:item.side,turn:item.turn,from:item.time,to:next.time,raw:item.raw||'',reason:'stable-forward-evidence'})}catch{};return {...item,time:next.time,source:'ocr-stable-forward-v3.9.2',reanchoredFrom:item.time}}
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
    for(let i=0;i<d.length;i+=4){const r=d[i],g=d[i+1],b=d[i+2],mx=Math.max(r,g,b),mn=Math.min(r,g,b),sat=mx-mn;if(mx<60)dark++;if(mn>150&&sat<65)white++;if(r>120&&g>70&&g<190&&b<110&&r-b>50)gold++;if(mx<80||sat<40)continue;red+=Math.max(0,r-(b+g)/2);blue+=Math.max(0,b-(r+g)/2);count++}
    const darkFrac=dark/total,whiteFrac=white/total,goldFrac=gold/total;
    const visible=(darkFrac>=.08&&(goldFrac>=.008||whiteFrac>=.012))||(goldFrac>=.015&&whiteFrac>=.012);
    if(!visible||count<900)return {side:null,diff:0,pixels:count,visible:false,dark:+darkFrac.toFixed(3),white:+whiteFrac.toFixed(3),gold:+goldFrac.toFixed(3)};
    const diff=(red-blue)/count,target=$q('#targetSide')?.value||'bottom',opponent=target==='top'?'bottom':'top';
    const base={diff:+diff.toFixed(2),pixels:count,visible:true,dark:+darkFrac.toFixed(3),white:+whiteFrac.toFixed(3),gold:+goldFrac.toFixed(3)};
    if(diff>15)return {side:opponent,...base};if(diff<-15)return {side:target,...base};return {side:null,...base};
  }
  async function indicatorAt392(t){
    const vid=typeof video!=='undefined'?video:$q('#video');
    if(!vid?.src||!Number.isFinite(vid.duration))return {time:t,side:null,diff:0,pixels:0,visible:false};
    t=Math.max(.05,Math.min(vid.duration-.08,t));indicatorSeekCount392++;
    try{if(typeof seek==='function')await seek(t,'turn-indicator-v392');else if(Math.abs(vid.currentTime-t)>.025)await new Promise((resolve,reject)=>{const done=()=>resolve();vid.addEventListener('seeked',done,{once:true});vid.currentTime=t;setTimeout(()=>reject(new Error('indicator seek timeout')),2500)});await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))}catch{}
    return {time:+t.toFixed(3),...indicatorSignal392()};
  }
  async function resolvedIndicator392(t){let s=await indicatorAt392(t);if(s.side)return s;for(const off of [-.12,.12,-.28,.28]){const p=await indicatorAt392(t+off);if(p.side)return p}return s}

  async function refineBoundary06(priorSide,nextSide,lo,hi){
    let a=Number(lo),b=Number(hi),lastPrior=null,firstNext=null;
    for(let t=a;t<=b+.001;t+=.2){const s=await indicatorAt392(t);if(s.side===priorSide)lastPrior=s.time;else if(s.side===nextSide&&lastPrior!=null){firstNext=s.time;break}}
    if(firstNext==null)return null;if(lastPrior==null)return firstNext;a=lastPrior;b=firstNext;
    for(let i=0;i<5;i++){const mid=(a+b)/2,s=await resolvedIndicator392(mid);if(s.side===nextSide)b=s.time;else if(s.side===priorSide)a=s.time;else{const p=await indicatorAt392(Math.min(b,mid+.04));if(p.side===nextSide)b=p.time;else a=mid}}
    return +b.toFixed(3);
  }
  async function refineFirst06(side,start,hit){let earliest=hit;for(let t=hit;t>=start-.001;t-=.2){const s=await indicatorAt392(t);if(s.side===side)earliest=s.time;else if(earliest<hit-.05&&s.side&&s.side!==side)break}return +earliest.toFixed(3)}
  function renderTimeline392(clean,rejected=[],mode='fast'){
    window.turnTimeline39=clean;window.rejectedTurns392=rejected;const target=$q('#targetSide')?.value||'bottom';for(const k of Object.keys(turnMap))delete turnMap[k];for(const r of clean.filter(x=>x.side===target))turnMap[r.turn]={time:r.time,source:`pp-v3.9.2-${r.source||'validated'}`,side:target,confidence:confidenceFrom(r),raw:r.raw||String(r.turn)};renderTurnMap();updateTurnPick();const tlEl=$q('#turnTimeline39');if(tlEl){const rows=clean.map(r=>`${r.side==='top'?'上':'下'}${r.turn}T  ${fmt(r.time)}  ${mode==='fast'?'ターン表示高速検出':'検証済み'}`);if(rejected.length)rows.push(`除外 ${rejected.length}件：`+rejected.map(x=>`${x.side==='top'?'上':'下'}${x.turn}T(${x.reason})`).join('、'));tlEl.textContent=rows.join('\n')}
  }

  async function fastIndicatorTimeline392(){
    const vid=typeof video!=='undefined'?video:$q('#video'),status=$q('#scanStatus');const mulliganTime=Number(window.mulliganPreview442?.time);if(!vid?.src||!Number.isFinite(vid.duration)||!Number.isFinite(mulliganTime))return null;
    const first=firstSide(),other=first==='top'?'bottom':'top',start=Math.max(.1,mulliganTime+.5),step=1.5;indicatorSeekCount392=0;if(status)status.textContent='高速解析：1.5秒粗走査→切替だけ精査中…';
    const coarse=[];for(let t=start;t<vid.duration-.08;t+=step){const s=await indicatorAt392(t);coarse.push({time:+t.toFixed(3),side:s.side});if(coarse.length%12===0&&status)status.textContent=`高速解析：${Math.min(99,Math.round(t/vid.duration*100))}% / OCRなし`}
    const out=[],counts={top:0,bottom:0};let expected=first,prior=other,lastBoundary=start,prev=null;
    for(let i=0;i<coarse.length;i++){
      const row=coarse[i];
      if(row.side!==expected){if(row.side)prev=row;continue}
      const next=coarse[i+1];
      const confirmed=(next&&next.side===expected)||(prev&&prev.side===expected);
      if(!confirmed){prev=row;continue}
      let lo=Math.max(lastBoundary, row.time-step*1.35);
      for(let j=i-1;j>=0&&coarse[j].time>=lastBoundary;j--){if(coarse[j].side===prior){lo=coarse[j].time;break}}
      let refined=out.length?await refineBoundary06(prior,expected,lo,row.time):await refineFirst06(expected,start,row.time);
      if(refined==null){prev=row;continue}
      counts[expected]++;out.push({side:expected,turn:counts[expected],time:refined,source:'turn-indicator-fast-v3.9.2',confidence:88,raw:'',score:7,inferScore:null,indicatorOnly:true});lastBoundary=refined;prior=expected;expected=expected==='top'?'bottom':'top';prev=row;
    }
    const firstCount=out.filter(x=>x.side===first).length,otherCount=out.filter(x=>x.side===other).length;let monotonic=true;for(let i=1;i<out.length;i++)if(out[i].time<=out[i-1].time+.2)monotonic=false;
    const structurallyValid=out.length>=4&&firstCount>=2&&otherCount>=1&&Math.abs(firstCount-otherCount)<=1&&out[0]?.side===first&&monotonic;
    if(!structurallyValid){try{log('fast-indicator-fallback-v392',{patch:PATCH,count:out.length,firstCount,otherCount,indicatorSeeks:indicatorSeekCount392,coarseStep:step})}catch{};return null}
    renderTimeline392(out,[],'fast');if(status)status.textContent=`高速解析完了：${out.length}件 / PP OCR省略 / シーク ${indicatorSeekCount392}回`;
    try{log('fast-indicator-finish-v392',{patch:PATCH,firstSide:first,coarseStep:step,indicatorSeeks:indicatorSeekCount392,timeline:out.map(x=>({side:x.side,turn:x.turn,time:x.time,source:x.source}))})}catch{};return out;
  }

  async function sanitizeTimeline392(){
    indicatorSeekCount392=0;const rejected=[];let tl=(window.turnTimeline39||[]).map(x=>reanchor392({...x},rejected)).filter(Boolean);const first=firstSide(),second=first==='top'?'bottom':'top';let map=new Map(tl.map(x=>[key(x),x]));
    for(let pass=0;pass<2;pass++)for(const side of ['top','bottom']){const allowMissingOne=side===first;for(let n=2;n<=10;n++){const cur=map.get(`${side}:${n}`);if(!cur)continue;if(!map.get(`${side}:${n-1}`)&&!(allowMissingOne&&n===2)){rejected.push({...cur,reason:pass?'chain-break-before-'+n+'T':'missing-'+(n-1)+'T-same-side'});map.delete(`${side}:${n}`)}}}
    for(let n=1;n<=10;n++){const a=map.get(`${first}:${n}`),b=map.get(`${second}:${n}`);if(a&&b&&b.time<=a.time+.25){const drop=confidenceFrom(b)>confidenceFrom(a)+12?a:b;rejected.push({...drop,reason:'same-turn-order-conflict'});map.delete(key(drop))}}
    const ordered=[...map.values()].sort((a,b)=>seqIndex(a.side,a.turn)-seqIndex(b.side,b.turn));let lastIdx=-1;for(const cur of ordered){const idx=seqIndex(cur.side,cur.turn);if(lastIdx>=1&&idx>lastIdx+1){rejected.push({...cur,reason:'alternating-sequence-gap'});map.delete(key(cur));continue}lastIdx=idx}
    const clean=[...map.values()].sort((a,b)=>seqIndex(a.side,a.turn)-seqIndex(b.side,b.turn)||a.time-b.time);renderTimeline392(clean,rejected,'fallback');try{log('postprocess-v392',{patch:PATCH,firstSide:first,rejected:rejected.map(x=>({side:x.side,turn:x.turn,time:x.time,reason:x.reason})),timeline:clean})}catch{}
  }

  const btn=$q('#scanTurns');if(btn&&typeof btn.onclick==='function'){const base=btn.onclick;btn.onclick=async function(e){if(window.turnAnalysisBusy392)return;window.turnAnalysisBusy392=true;const diag=$q('#exportDiag'),diagWas=diag?.disabled;if(diag)diag.disabled=true;this.disabled=true;const started=performance.now();try{const fast=await fastIndicatorTimeline392();if(!fast){const st=$q('#scanStatus');if(st)st.textContent='高速判定を確定できないため、従来PP OCRで再確認中…';await base.call(this,e);await sanitizeTimeline392();try{log('turn-analysis-mode-v392',{mode:'ocr-fallback',elapsedMs:Math.round(performance.now()-started),indicatorSeeks:indicatorSeekCount392})}catch{}}else{try{log('turn-analysis-mode-v392',{mode:'indicator-fast-adaptive',elapsedMs:Math.round(performance.now()-started),count:fast.length,indicatorSeeks:indicatorSeekCount392})}catch{}}}finally{window.turnAnalysisBusy392=false;this.disabled=false;if(diag)diag.disabled=!!diagWas}}}
  try{log('patch-v392-active',{patch:PATCH,firstSide:firstSide()})}catch{}
})();
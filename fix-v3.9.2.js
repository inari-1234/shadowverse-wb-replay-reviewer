(()=>{
  const PATCH='3.9.2-20260916-stable-07';
  const $q=s=>document.querySelector(s);
  const header=$q('header h1'),sub=$q('header p');
  if(header) header.textContent='シャドバWB リプレイ診断 v3.9.2';
  if(sub) sub.textContent='Build 2026.09.16-stable-07 / 境界二分探索でシーク削減';

  const play=$q('#playOrder');
  const scanPanel=$q('#scanTurns')?.closest('.panel');
  const warn=scanPanel?.querySelector('.warn');
  if(warn) warn.textContent='1.5秒の粗走査精度は維持し、ターン切替候補の境界だけ二分探索します。不確実な場合は従来PP OCRへ自動フォールバックします。';

  window.rejectedTurns392=[];
  let indicatorSeekCount392=0;
  function firstSide(){return play?.value==='先攻'?'bottom':'top'}
  function confidenceFrom(item){const s=Number(item.score)||0;return Math.max(45,Math.min(95,Math.round(45+s*6)))}
  function indicatorSignal392(){
    const vid=typeof video!=='undefined'?video:$q('#video');
    if(!vid?.videoWidth||!vid?.videoHeight)return {side:null,diff:0,pixels:0,visible:false};
    const c=document.createElement('canvas');c.width=48;c.height=64;const x=c.getContext('2d',{willReadFrequently:true});
    const sx=Math.round(vid.videoWidth*.82),sy=Math.round(vid.videoHeight*.34),sw=Math.max(8,Math.round(vid.videoWidth*.09)),sh=Math.max(8,Math.round(vid.videoHeight*.21));
    x.drawImage(vid,sx,sy,sw,sh,0,0,c.width,c.height);
    const d=x.getImageData(0,0,c.width,c.height).data,total=Math.max(1,d.length/4);let red=0,blue=0,count=0,dark=0,white=0,gold=0;
    for(let i=0;i<d.length;i+=4){const r=d[i],g=d[i+1],b=d[i+2],mx=Math.max(r,g,b),mn=Math.min(r,g,b),sat=mx-mn;if(mx<60)dark++;if(mn>150&&sat<65)white++;if(r>120&&g>70&&g<190&&b<110&&r-b>50)gold++;if(mx<80||sat<40)continue;red+=Math.max(0,r-(b+g)/2);blue+=Math.max(0,b-(r+g)/2);count++}
    const darkFrac=dark/total,whiteFrac=white/total,goldFrac=gold/total,visible=(darkFrac>=.08&&(goldFrac>=.008||whiteFrac>=.012))||(goldFrac>=.015&&whiteFrac>=.012);
    if(!visible||count<900)return {side:null,diff:0,pixels:count,visible:false};
    const diff=(red-blue)/count,target=$q('#targetSide')?.value||'bottom',opponent=target==='top'?'bottom':'top',base={diff:+diff.toFixed(2),pixels:count,visible:true};
    if(diff>15)return {side:opponent,...base};if(diff<-15)return {side:target,...base};return {side:null,...base};
  }
  async function indicatorAt392(t){
    const vid=typeof video!=='undefined'?video:$q('#video');if(!vid?.src||!Number.isFinite(vid.duration))return {time:t,side:null,visible:false};
    t=Math.max(.05,Math.min(vid.duration-.08,t));indicatorSeekCount392++;
    try{if(typeof seek==='function')await seek(t,'turn-indicator-v392');else if(Math.abs(vid.currentTime-t)>.025)await new Promise((resolve,reject)=>{const done=()=>resolve();vid.addEventListener('seeked',done,{once:true});vid.currentTime=t;setTimeout(()=>reject(new Error('indicator seek timeout')),2500)});await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))}catch{}
    return {time:+t.toFixed(3),...indicatorSignal392()};
  }
  async function probe392(t,a,b){
    let s=await indicatorAt392(t);if(s.side)return s;
    for(const off of [.08,-.08,.18,-.18]){const q=Math.max(a,Math.min(b,t+off));if(Math.abs(q-t)<.02)continue;const p=await indicatorAt392(q);if(p.side)return p}
    return s;
  }
  async function refineBoundary07(priorSide,nextSide,lo,hi){
    let a=Number(lo),b=Number(hi);if(!(b>a))return null;
    let sa=await indicatorAt392(a),sb=await indicatorAt392(b);
    if(sa.side!==priorSide){for(const off of [-.2,-.4]){const p=await indicatorAt392(Math.max(.05,a+off));if(p.side===priorSide){a=p.time;sa=p;break}}}
    if(sb.side!==nextSide){for(const off of [.2,.4]){const p=await indicatorAt392(b+off);if(p.side===nextSide){b=p.time;sb=p;break}}}
    if(sa.side!==priorSide||sb.side!==nextSide)return null;
    for(let i=0;i<5;i++){
      const mid=(a+b)/2,s=await probe392(mid,a,b);
      if(s.side===nextSide)b=s.time;else if(s.side===priorSide)a=s.time;else return null;
    }
    return +b.toFixed(3);
  }
  async function refineFirst07(side,start,hit){
    let lo=start,hi=hit,shi=await indicatorAt392(hi);if(shi.side!==side)return null;
    const slo=await indicatorAt392(lo);
    if(slo.side===side)return +lo.toFixed(3);
    if(slo.side){for(let i=0;i<5;i++){const mid=(lo+hi)/2,s=await probe392(mid,lo,hi);if(s.side===side)hi=s.time;else if(s.side)lo=s.time;else return null}return +hi.toFixed(3)}
    for(let t=hi-.3;t>=start;t-=.3){const s=await indicatorAt392(t);if(s.side===side)hi=s.time;else if(s.side){lo=s.time;break}}
    return +hi.toFixed(3);
  }
  function renderTimeline392(clean){
    window.turnTimeline39=clean;window.rejectedTurns392=[];const target=$q('#targetSide')?.value||'bottom';for(const k of Object.keys(turnMap))delete turnMap[k];for(const r of clean.filter(x=>x.side===target))turnMap[r.turn]={time:r.time,source:`pp-v3.9.2-${r.source}`,side:target,confidence:confidenceFrom(r),raw:String(r.turn)};renderTurnMap();updateTurnPick();const tlEl=$q('#turnTimeline39');if(tlEl)tlEl.textContent=clean.map(r=>`${r.side==='top'?'上':'下'}${r.turn}T  ${fmt(r.time)}  ターン表示高速検出`).join('\n');
  }
  async function fastIndicatorTimeline392(){
    const vid=typeof video!=='undefined'?video:$q('#video'),status=$q('#scanStatus'),mulliganTime=Number(window.mulliganPreview442?.time);if(!vid?.src||!Number.isFinite(vid.duration)||!Number.isFinite(mulliganTime))return null;
    const first=firstSide(),other=first==='top'?'bottom':'top',start=Math.max(.1,mulliganTime+.5),step=1.5;indicatorSeekCount392=0;if(status)status.textContent='高速解析：1.5秒粗走査→境界だけ二分探索中…';
    const coarse=[];for(let t=start;t<vid.duration-.08;t+=step){const s=await indicatorAt392(t);coarse.push({time:+t.toFixed(3),side:s.side});if(coarse.length%12===0&&status)status.textContent=`高速解析：${Math.min(99,Math.round(t/vid.duration*100))}% / OCRなし`}
    const out=[],counts={top:0,bottom:0};let expected=first,prior=other,lastBoundary=start;
    for(let i=0;i<coarse.length;i++){
      const row=coarse[i];if(row.side!==expected)continue;
      let priorRow=null;for(let j=i-1;j>=0&&coarse[j].time>=lastBoundary-.01;j--){if(coarse[j].side===prior){priorRow=coarse[j];break}}
      const nextSame=coarse[i+1]?.side===expected;
      if(out.length&&(!priorRow||!nextSame))continue;
      let refined;
      if(!out.length)refined=await refineFirst07(expected,start,row.time);
      else refined=await refineBoundary07(prior,expected,priorRow.time,row.time);
      if(refined==null)continue;
      counts[expected]++;out.push({side:expected,turn:counts[expected],time:refined,source:'turn-indicator-fast-v3.9.2',confidence:88,raw:'',score:7,inferScore:null,indicatorOnly:true});lastBoundary=refined;prior=expected;expected=expected==='top'?'bottom':'top';
    }
    const firstCount=out.filter(x=>x.side===first).length,otherCount=out.filter(x=>x.side===other).length;let monotonic=true;for(let i=1;i<out.length;i++)if(out[i].time<=out[i-1].time+.2)monotonic=false;
    const structurallyValid=out.length>=4&&firstCount>=2&&otherCount>=1&&Math.abs(firstCount-otherCount)<=1&&out[0]?.side===first&&monotonic;
    if(!structurallyValid){try{log('fast-indicator-fallback-v392',{patch:PATCH,count:out.length,firstCount,otherCount,indicatorSeeks:indicatorSeekCount392,coarseStep:step})}catch{};return null}
    renderTimeline392(out);if(status)status.textContent=`高速解析完了：${out.length}件 / PP OCR省略 / シーク ${indicatorSeekCount392}回`;
    try{log('fast-indicator-finish-v392',{patch:PATCH,firstSide:first,coarseStep:step,refineMode:'bracket-binary-v1',indicatorSeeks:indicatorSeekCount392,timeline:out.map(x=>({side:x.side,turn:x.turn,time:x.time,source:x.source}))})}catch{};return out;
  }
  const btn=$q('#scanTurns');if(btn&&typeof btn.onclick==='function'){
    const base=btn.onclick;btn.onclick=async function(e){if(window.turnAnalysisBusy392)return;window.turnAnalysisBusy392=true;const diag=$q('#exportDiag'),diagWas=diag?.disabled;if(diag)diag.disabled=true;this.disabled=true;const started=performance.now();try{const fast=await fastIndicatorTimeline392();if(!fast){const st=$q('#scanStatus');if(st)st.textContent='高速判定を確定できないため、従来PP OCRで再確認中…';await base.call(this,e);try{log('turn-analysis-mode-v392',{mode:'ocr-fallback',elapsedMs:Math.round(performance.now()-started),indicatorSeeks:indicatorSeekCount392})}catch{}}else{try{log('turn-analysis-mode-v392',{mode:'indicator-fast-binary',elapsedMs:Math.round(performance.now()-started),count:fast.length,indicatorSeeks:indicatorSeekCount392})}catch{}}}finally{window.turnAnalysisBusy392=false;this.disabled=false;if(diag)diag.disabled=!!diagWas}}
  }
  try{log('patch-v392-active',{patch:PATCH,firstSide:firstSide()})}catch{}
})();
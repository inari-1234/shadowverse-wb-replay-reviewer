(()=>{
  const PATCH='3.9.2-20260914-12';
  const $q=s=>document.querySelector(s);
  const header=$q('header h1'),sub=$q('header p');
  if(header) header.textContent='シャドバWB リプレイ診断 v3.9.2';
  if(sub) sub.textContent='Build 2026.09.14-12 / 連続ターン検証 + 飛び番除外';

  const play=$q('#playOrder');
  const scanPanel=$q('#scanTurns')?.closest('.panel');
  const warn=scanPanel?.querySelector('.warn');
  if(warn) warn.textContent='先攻側は「下側が先攻 / 上側が先攻」から選べます。v3.9.2ではOCR候補があっても、8Tを認識していないのに9Tだけ採用するような飛び番は除外します。最初の先攻1TだけはOCR不能でも2T以降の解析を継続します。';

  window.rejectedTurns392=[];

  function firstSide(){return play?.value==='先攻'?'bottom':'top'}
  function key(x){return `${x.side}:${x.turn}`}
  function seqIndex(side,turn){
    const first=firstSide(),second=first==='top'?'bottom':'top';
    return (turn-1)*2+(side===first?0:side===second?1:99);
  }
  function confidenceFrom(item){
    if(item.source==='ocr-stable-v3.9.1') return 92;
    if(item.source?.includes('inferred')) return 55;
    const s=Number(item.score)||0;
    return Math.max(45,Math.min(95,Math.round(45+s*6)));
  }

  function sanitizeTimeline392(){
    const tl=(window.turnTimeline39||[]).map(x=>({...x}));
    const map=new Map(tl.map(x=>[key(x),x]));
    const rejected=[];
    const first=firstSide(),second=first==='top'?'bottom':'top';

    // After the initial phase, each side must progress 1T at a time.
    // Only the first player's 1T may be absent because some recordings/OCR miss the initial PP state.
    for(const side of ['top','bottom']){
      const allowMissingOne=side===first;
      for(let n=2;n<=10;n++){
        const cur=map.get(`${side}:${n}`); if(!cur) continue;
        const prev=map.get(`${side}:${n-1}`);
        if(!prev && !(allowMissingOne&&n===2)){
          rejected.push({...cur,reason:`missing-${n-1}T-same-side`});
          map.delete(`${side}:${n}`);
        }
      }
    }

    // Repeat once so a rejected skipped turn cannot support an even later one.
    for(const side of ['top','bottom']){
      const allowMissingOne=side===first;
      for(let n=2;n<=10;n++){
        const cur=map.get(`${side}:${n}`); if(!cur) continue;
        if(!map.get(`${side}:${n-1}`) && !(allowMissingOne&&n===2)){
          rejected.push({...cur,reason:`chain-break-before-${n}T`});
          map.delete(`${side}:${n}`);
        }
      }
    }

    // Enforce chronological first/second order for turns that exist on both sides.
    for(let n=1;n<=10;n++){
      const a=map.get(`${first}:${n}`),b=map.get(`${second}:${n}`);
      if(a&&b&&b.time<=a.time+.25){
        // Prefer the stronger item; if similar, keep the first-side event and reject the second-side collision.
        const sa=confidenceFrom(a),sb=confidenceFrom(b);
        const drop=sb>sa+12?a:b;
        rejected.push({...drop,reason:'same-turn-order-conflict'});
        map.delete(key(drop));
      }
    }

    const clean=[...map.values()].sort((a,b)=>seqIndex(a.side,a.turn)-seqIndex(b.side,b.turn)||a.time-b.time);
    window.turnTimeline39=clean;
    window.rejectedTurns392=rejected;

    // Rebuild target turn map only from validated timeline.
    const target=$q('#targetSide')?.value||'bottom';
    for(const k of Object.keys(turnMap)) delete turnMap[k];
    for(const r of clean.filter(x=>x.side===target)){
      turnMap[r.turn]={time:r.time,source:'pp-v3.9.2-'+(r.source||'validated'),side:target,confidence:confidenceFrom(r),raw:r.raw||String(r.turn)};
    }
    renderTurnMap();updateTurnPick();

    const tlEl=$q('#turnTimeline39');
    if(tlEl){
      const first1=clean.find(x=>x.side===first&&x.turn===1);
      const rows=[];
      if(!first1) rows.push(`${first==='top'?'上':'下'}1T  未確定（初期OCR根拠不足）`);
      for(const r of clean.sort((a,b)=>a.time-b.time||seqIndex(a.side,a.turn)-seqIndex(b.side,b.turn))){
        const src=r.source==='ocr-stable-v3.9.1'?'安定OCR':(r.source?.includes('ocr')?'OCR':'補完');
        rows.push(`${r.side==='top'?'上':'下'}${r.turn}T  ${fmt(r.time)}  ${src}`);
      }
      if(rejected.length) rows.push(`除外 ${rejected.length}件：`+rejected.map(x=>`${x.side==='top'?'上':'下'}${x.turn}T`).join('、'));
      tlEl.textContent=rows.join('\n');
    }

    const status=$q('#scanStatus');
    if(status&&rejected.length) status.textContent+=` / 飛び番・矛盾 ${rejected.length}件を除外`;
    try{log('postprocess-v392',{firstSide:first,rejected:rejected.map(x=>({side:x.side,turn:x.turn,time:x.time,reason:x.reason})),timeline:clean.map(x=>({side:x.side,turn:x.turn,time:x.time,source:x.source}))})}catch{}
  }

  const btn=$q('#scanTurns');
  if(btn&&typeof btn.onclick==='function'){
    const base=btn.onclick;
    btn.onclick=async function(e){
      await base.call(this,e);
      sanitizeTimeline392();
    };
  }

  const exportBtn=$q('#exportDiag');
  if(exportBtn){
    exportBtn.onclick=()=>{
      try{log('diagnostic-export-v392',{timelineCount:window.turnTimeline39?.length||0,rejectedCount:window.rejectedTurns392?.length||0,firstSide:firstSide()})}catch{}
      const compact=(window.ocrSamples39||[]).map(x=>({side:x.side,time:x.time,n:x.n,raw:x.raw,confidence:x.confidence,quality:x.quality,pattern:x.pattern,variant:x.variant}));
      const data={format:'shadowverse-wb-diagnostic-v3.9.2',build:PATCH,createdAt:new Date().toISOString(),userAgent:navigator.userAgent,video:videoFileMeta?{...videoFileMeta,duration:video.duration,currentTime:video.currentTime,width:video.videoWidth,height:video.videoHeight}:null,ppPoints:window.v39Points||points,targetSide:$q('#targetSide')?.value,playOrder:play?.value,firstSide:firstSide(),turnTimeline:window.turnTimeline39||[],rejectedTurns:window.rejectedTurns392||[],inference:window.inference39||[],ocrSamples:compact,turnMap,events};
      const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),a=document.createElement('a');
      a.href=URL.createObjectURL(blob);a.download='shadowverse-wb-diagnostic-v3.9.2.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);
    };
  }

  try{log('patch-v392-active',{patch:PATCH,firstSide:firstSide()})}catch{}
})();
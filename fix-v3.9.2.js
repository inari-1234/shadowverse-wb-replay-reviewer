(()=>{
  const PATCH='3.9.2-20260915-stable-01';
  const $q=s=>document.querySelector(s);
  const header=$q('header h1'),sub=$q('header p');
  if(header) header.textContent='シャドバWB リプレイ診断 v3.9.2';
  if(sub) sub.textContent='Build 2026.09.15-stable-01 / PP連続証拠 + 飛び番除外';

  const play=$q('#playOrder');
  const scanPanel=$q('#scanTurns')?.closest('.panel');
  const warn=scanPanel?.querySelector('.warn');
  if(warn) warn.textContent='単発のPP OCRはターン開始根拠にしません。近接フレームの連続証拠を優先し、孤立した早取り・試合終了後の架空ターン・飛び番を除外します。';

  window.rejectedTurns392=[];
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

  function sanitizeTimeline392(){
    const rejected=[];
    let tl=(window.turnTimeline39||[]).map(x=>reanchor392({...x},rejected)).filter(Boolean);
    const first=firstSide(),second=first==='top'?'bottom':'top';
    let map=new Map(tl.map(x=>[key(x),x]));

    // Same-side turns may never skip a number. Only the first player's 1T may be absent.
    for(let pass=0;pass<2;pass++)for(const side of ['top','bottom']){const allowMissingOne=side===first;for(let n=2;n<=10;n++){const cur=map.get(`${side}:${n}`);if(!cur)continue;if(!map.get(`${side}:${n-1}`)&&!(allowMissingOne&&n===2)){rejected.push({...cur,reason:pass?'chain-break-before-'+n+'T':'missing-'+(n-1)+'T-same-side'});map.delete(`${side}:${n}`)}}}

    // Enforce first/second order inside the same turn.
    for(let n=1;n<=10;n++){const a=map.get(`${first}:${n}`),b=map.get(`${second}:${n}`);if(a&&b&&b.time<=a.time+.25){const drop=confidenceFrom(b)>confidenceFrom(a)+12?a:b;rejected.push({...drop,reason:'same-turn-order-conflict'});map.delete(key(drop))}}

    // Enforce the complete alternating sequence for the tail. A later event cannot survive
    // after the immediately preceding event has been rejected. This blocks post-GAME-SET 8T etc.
    const ordered=[...map.values()].sort((a,b)=>seqIndex(a.side,a.turn)-seqIndex(b.side,b.turn));
    let lastIdx=-1;
    for(const cur of ordered){const idx=seqIndex(cur.side,cur.turn);if(lastIdx>=1&&idx>lastIdx+1){rejected.push({...cur,reason:'alternating-sequence-gap'});map.delete(key(cur));continue}lastIdx=idx}

    const clean=[...map.values()].sort((a,b)=>seqIndex(a.side,a.turn)-seqIndex(b.side,b.turn)||a.time-b.time);
    window.turnTimeline39=clean;window.rejectedTurns392=rejected;
    const target=$q('#targetSide')?.value||'bottom';for(const k of Object.keys(turnMap))delete turnMap[k];for(const r of clean.filter(x=>x.side===target))turnMap[r.turn]={time:r.time,source:'pp-v3.9.2-'+(r.source||'validated'),side:target,confidence:confidenceFrom(r),raw:r.raw||String(r.turn)};renderTurnMap();updateTurnPick();

    const tlEl=$q('#turnTimeline39');if(tlEl){const rows=[];if(!clean.find(x=>x.side===first&&x.turn===1))rows.push(`${first==='top'?'上':'下'}1T  未確定（初期OCR根拠不足）`);for(const r of [...clean].sort((a,b)=>a.time-b.time||seqIndex(a.side,a.turn)-seqIndex(b.side,b.turn))){const src=r.source==='ocr-stable-v3.9.1'?'安定OCR':r.source==='ocr-stable-forward-v3.9.2'?'連続OCR':(r.source?.includes('ocr')?'OCR':'補完');rows.push(`${r.side==='top'?'上':'下'}${r.turn}T  ${fmt(r.time)}  ${src}`)}if(rejected.length)rows.push(`除外 ${rejected.length}件：`+rejected.map(x=>`${x.side==='top'?'上':'下'}${x.turn}T(${x.reason})`).join('、'));tlEl.textContent=rows.join('\n')}
    const status=$q('#scanStatus');if(status&&rejected.length)status.textContent+=` / 孤立OCR・飛び番 ${rejected.length}件を除外`;
    try{log('postprocess-v392',{patch:PATCH,firstSide:first,rejected:rejected.map(x=>({side:x.side,turn:x.turn,time:x.time,reason:x.reason})),timeline:clean.map(x=>({side:x.side,turn:x.turn,time:x.time,source:x.source,reanchoredFrom:x.reanchoredFrom||null}))})}catch{}
  }

  const btn=$q('#scanTurns');if(btn&&typeof btn.onclick==='function'){const base=btn.onclick;btn.onclick=async function(e){await base.call(this,e);sanitizeTimeline392()}}
  const exportBtn=$q('#exportDiag');if(exportBtn){exportBtn.onclick=()=>{try{log('diagnostic-export-v392',{timelineCount:window.turnTimeline39?.length||0,rejectedCount:window.rejectedTurns392?.length||0,firstSide:firstSide()})}catch{}const compact=(window.ocrSamples39||[]).map(x=>({side:x.side,time:x.time,n:x.n,raw:x.raw,confidence:x.confidence,quality:x.quality,pattern:x.pattern,variant:x.variant}));const data={format:'shadowverse-wb-diagnostic-v3.9.2',build:PATCH,createdAt:new Date().toISOString(),userAgent:navigator.userAgent,video:videoFileMeta?{...videoFileMeta,duration:video.duration,currentTime:video.currentTime,width:video.videoWidth,height:video.videoHeight}:null,ppPoints:window.v39Points||points,targetSide:$q('#targetSide')?.value,playOrder:play?.value,firstSide:firstSide(),turnTimeline:window.turnTimeline39||[],rejectedTurns:window.rejectedTurns392||[],inference:window.inference39||[],ocrSamples:compact,turnMap,events};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='shadowverse-wb-diagnostic-v3.9.2.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)}}
  try{log('patch-v392-active',{patch:PATCH,firstSide:firstSide()})}catch{}
})();
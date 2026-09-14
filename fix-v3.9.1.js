(()=>{
  const PATCH='3.9.1-20260914-11';
  const $q=s=>document.querySelector(s);
  const header=$q('header h1'),sub=$q('header p');
  if(header) header.textContent='シャドバWB リプレイ診断 v3.9.1';
  if(sub) sub.textContent='Build 2026.09.14-11 / 先攻側明示 + 1T安定化';

  const play=$q('#playOrder');
  if(play){
    const cur=play.value;
    play.innerHTML='<option value="先攻">下側が先攻</option><option value="後攻">上側が先攻</option>';
    play.value=cur==='先攻'?'先攻':'後攻';
    const label=play.closest('label');
    if(label&&label.firstChild&&label.firstChild.nodeType===Node.TEXT_NODE) label.firstChild.nodeValue='先攻側 ';
  }

  const scanPanel=$q('#scanTurns')?.closest('.panel');
  const warn=scanPanel?.querySelector('.warn');
  function updateOrderHelp(){
    if(!warn||!play)return;
    const lowerFirst=play.value==='先攻';
    warn.textContent=`先攻側は固定ではありません。現在は「${lowerFirst?'下側':'上側'}が先攻」です。解析順は ${lowerFirst?'下1→上1→下2→上2':'上1→下1→上2→下2'}…として時系列整合性を確認します。`;
  }
  play?.addEventListener('change',()=>{updateOrderHelp();try{log('first-side-change-v391',{firstSide:play.value==='先攻'?'bottom':'top'})}catch{}});
  updateOrderHelp();

  function groupedStableRuns(side,n,hi=Infinity){
    const rows=(window.ocrSamples39||[]).filter(x=>x.side===side&&x.n===n&&x.time<hi).sort((a,b)=>a.time-b.time);
    const runs=[];let cur=[];
    for(const r of rows){
      if(!cur.length||r.time-cur[cur.length-1].time<=1.6) cur.push(r);
      else{if(cur.length>=2)runs.push(cur);cur=[r];}
    }
    if(cur.length>=2)runs.push(cur);
    return runs;
  }

  function findItem(side,turn){return (window.turnTimeline39||[]).find(x=>x.side===side&&x.turn===turn)}
  function replaceOrAdd(side,turn,row,reason){
    if(!row)return false;
    let item=findItem(side,turn);
    const changed=!item||Math.abs(item.time-row.time)>.01;
    if(!item){item={side,turn};window.turnTimeline39.push(item)}
    Object.assign(item,{time:row.time,source:'ocr-stable-v3.9.1',confidence:row.confidence||0,raw:row.raw||String(turn),score:Math.max(6,row.quality||0),inferScore:null});
    if(changed)try{log('turn-corrected-v391',{side,turn,time:row.time,reason,raw:row.raw})}catch{}
    return changed;
  }

  function stabilizeTurnOne(){
    if(!play||!window.ocrSamples39?.length||!window.turnTimeline39?.length)return;
    const first=play.value==='先攻'?'bottom':'top',second=first==='top'?'bottom':'top';
    const first2=findItem(first,2), second1=findItem(second,1);
    let changed=false;

    // The second player's 1T should be the final stable "1" state immediately before first player's 2T.
    if(first2){
      const runs=groupedStableRuns(second,1,first2.time-.2);
      if(runs.length){
        const run=runs[runs.length-1];
        changed=replaceOrAdd(second,1,run[0],'latest-stable-1-before-first-side-2T')||changed;
      }
    }

    // If the first player's 1T has a stable run before the second player's corrected/known 1T, use its onset.
    const second1Now=findItem(second,1)||second1;
    if(second1Now){
      const runs=groupedStableRuns(first,1,second1Now.time-.2);
      if(runs.length){
        const run=runs[runs.length-1];
        changed=replaceOrAdd(first,1,run[0],'stable-1-before-second-side-1T')||changed;
      }
    }

    window.turnTimeline39.sort((a,b)=>a.time-b.time||a.turn-b.turn);
    const tl=$q('#turnTimeline39');
    if(tl) tl.textContent=window.turnTimeline39.map(r=>`${r.side==='top'?'上':'下'}${r.turn}T  ${fmt(r.time)}  ${r.source==='ocr-stable-v3.9.1'?'安定OCR':(r.source?.includes('ocr')?'OCR':'補完')}`).join('\n');

    const target=$q('#targetSide')?.value||'bottom';
    const t1=findItem(target,1);
    if(t1){
      turnMap[1]={time:t1.time,source:'pp-dp-v3.9.1-'+t1.source,side:target,confidence:t1.confidence||0,raw:t1.raw||'1'};
      renderTurnMap();updateTurnPick();
    }
    if(changed){
      const s=$q('#scanStatus');if(s)s.textContent+=' / 1T安定化済み';
    }
  }

  const btn=$q('#scanTurns');
  if(btn&&typeof btn.onclick==='function'){
    const base=btn.onclick;
    btn.onclick=async function(e){
      await base.call(this,e);
      stabilizeTurnOne();
      try{log('postprocess-v391',{firstSide:play?.value==='先攻'?'bottom':'top',timeline:(window.turnTimeline39||[]).map(x=>({side:x.side,turn:x.turn,time:x.time,source:x.source}))})}catch{}
    };
  }

  const exportBtn=$q('#exportDiag');
  if(exportBtn){
    exportBtn.onclick=()=>{
      try{log('diagnostic-export-v391',{timelineCount:window.turnTimeline39?.length||0,firstSide:play?.value==='先攻'?'bottom':'top'})}catch{}
      const compact=(window.ocrSamples39||[]).map(x=>({side:x.side,time:x.time,n:x.n,raw:x.raw,confidence:x.confidence,quality:x.quality,pattern:x.pattern,variant:x.variant}));
      const data={format:'shadowverse-wb-diagnostic-v3.9.1',build:PATCH,createdAt:new Date().toISOString(),userAgent:navigator.userAgent,video:videoFileMeta?{...videoFileMeta,duration:video.duration,currentTime:video.currentTime,width:video.videoWidth,height:video.videoHeight}:null,ppPoints:window.v39Points||points,targetSide:$q('#targetSide')?.value,playOrder:play?.value,firstSide:play?.value==='先攻'?'bottom':'top',turnTimeline:window.turnTimeline39||[],inference:window.inference39||[],ocrSamples:compact,turnMap,events};
      const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),a=document.createElement('a');
      a.href=URL.createObjectURL(blob);a.download='shadowverse-wb-diagnostic-v3.9.1.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);
    };
  }

  try{log('patch-v391-active',{patch:PATCH,firstSide:play?.value==='先攻'?'bottom':'top'})}catch{}
})();
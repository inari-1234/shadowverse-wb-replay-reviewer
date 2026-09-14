(()=>{
  const PATCH='3.6-20260914-06';
  const $q=s=>document.querySelector(s);
  const header=$q('header h1'), sub=$q('header p');
  if(header) header.textContent='シャドバWB リプレイ診断 v3.6';
  if(sub) sub.textContent='Build 2026.09.14-06 / ターン遷移カウント';

  const panel=$q('#scanTurns')?.closest('.panel');
  const warn=panel?.querySelector('.warn');
  if(warn) warn.textContent='v3.6ではPP数字そのものをターン番号にしません。上側・下側の最大PP数字領域が「別の安定した形へ変化した瞬間」を拾い、先攻→後攻の順番で数えて1T、2T…を割り当てます。OCRは補助情報です。';

  const intervalSel=$q('#scanInterval');
  if(intervalSel && !intervalSel.querySelector('option[value="0.5"]')){
    const o=document.createElement('option'); o.value='0.5'; o.textContent='0.5秒（推奨・遷移検出）';
    intervalSel.insertBefore(o,intervalSel.firstChild); intervalSel.value='0.5';
  }
  const stableSel=$q('#stableCount');
  if(stableSel) stableSel.closest('label').style.display='none';

  let timeline=document.querySelector('#turnTimeline36');
  if(!timeline){
    timeline=document.createElement('div'); timeline.id='turnTimeline36'; timeline.className='ocrRead';
    timeline.textContent='ターン遷移は未解析です。';
    const turnMapEl=$q('#turnMap'); turnMapEl?.parentNode?.insertBefore(timeline,turnMapEl);
  }
  window.turnTimeline36=[];
  window.turnCandidates36=[];

  function cropVector(side){
    const p=points[side];
    if(!p) throw new Error(side+' PP位置未指定');
    const src=frameCanvas(1800);
    const cw=Math.max(40,Math.round(src.width*.032));
    const ch=Math.max(42,Math.round(src.height*.062));
    let sx=Math.round(p.x*src.width-cw/2), sy=Math.round(p.y*src.height-ch/2);
    sx=Math.max(0,Math.min(src.width-cw,sx)); sy=Math.max(0,Math.min(src.height-ch,sy));
    const c=document.createElement('canvas'); c.width=32; c.height=40;
    const x=c.getContext('2d',{willReadFrequently:true});
    x.drawImage(src,sx,sy,cw,ch,0,0,c.width,c.height);
    const d=x.getImageData(0,0,c.width,c.height).data, g=new Float32Array(c.width*c.height);
    let sum=0,sum2=0;
    for(let i=0,j=0;i<d.length;i+=4,j++){
      const v=.299*d[i]+.587*d[i+1]+.114*d[i+2]; g[j]=v; sum+=v; sum2+=v*v;
    }
    const mean=sum/g.length, variance=Math.max(1,sum2/g.length-mean*mean), sd=Math.sqrt(variance);
    const out=new Uint8Array(g.length);
    for(let i=0;i<g.length;i++){
      const z=(g[i]-mean)/sd;
      out[i]=z>0.45?255:(z<-0.45?0:128);
    }
    return out;
  }
  function vdiff(a,b){
    if(!a||!b) return 0;
    let s=0; for(let i=0;i<a.length;i++) s+=Math.abs(a[i]-b[i]);
    return s/a.length/255;
  }
  function median(a){
    if(!a.length) return 0; const b=[...a].sort((x,y)=>x-y),m=b.length>>1;
    return b.length%2?b[m]:(b[m-1]+b[m])/2;
  }
  function detectCandidates(samples,side){
    const diffs=[];
    for(let i=1;i<samples.length;i++) diffs.push(vdiff(samples[i-1].vec,samples[i].vec));
    const med=median(diffs), mad=median(diffs.map(v=>Math.abs(v-med)));
    const threshold=Math.max(.085,med+Math.max(.035,4.5*mad));
    const stableLimit=Math.max(.035,threshold*.58);
    const raw=[];
    for(let i=2;i<samples.length-2;i++){
      const jump=vdiff(samples[i-1].vec,samples[i].vec);
      const pre=vdiff(samples[i-2].vec,samples[i-1].vec);
      const post1=vdiff(samples[i].vec,samples[i+1].vec);
      const post2=vdiff(samples[i+1].vec,samples[i+2].vec);
      const post=(post1+post2)/2;
      if(jump>=threshold && post<=stableLimit && pre<=Math.max(stableLimit,threshold*.78)){
        raw.push({side,time:samples[i].time,score:+jump.toFixed(4),pre:+pre.toFixed(4),post:+post.toFixed(4),threshold:+threshold.toFixed(4)});
      }
    }
    raw.sort((a,b)=>a.time-b.time);
    const kept=[];
    for(const c of raw){
      const prev=kept[kept.length-1];
      if(prev&&c.time-prev.time<2.2){ if(c.score>prev.score) kept[kept.length-1]=c; }
      else kept.push(c);
    }
    log('transition-threshold-v36',{side,median:+med.toFixed(4),mad:+mad.toFixed(4),threshold:+threshold.toFixed(4),stableLimit:+stableLimit.toFixed(4),candidates:kept.map(c=>({time:c.time,score:c.score}))});
    return kept;
  }
  function buildAlternatingTimeline(candidates,playOrder){
    const sorted=[...candidates].sort((a,b)=>a.time-b.time||b.score-a.score);
    const firstSide=playOrder==='先攻'?'bottom':'top';
    let expected=firstSide,lastTime=-999;
    const counts={top:0,bottom:0}, accepted=[];
    for(const c of sorted){
      if(c.time-lastTime<1.0) continue;
      if(c.side!==expected){
        log('transition-rejected-v36',{side:c.side,time:c.time,expected,reason:'wrong-order',score:c.score});
        continue;
      }
      counts[c.side]++;
      const item={...c,turn:counts[c.side],label:(c.side==='bottom'?'下':'上')+counts[c.side]+'T'};
      accepted.push(item); lastTime=c.time; expected=c.side==='top'?'bottom':'top';
      log('turn-transition-v36',{side:c.side,turn:item.turn,time:c.time,score:c.score,nextExpected:expected});
    }
    return accepted;
  }
  function renderTimeline(){
    if(!window.turnTimeline36.length){timeline.textContent='ターン遷移を認識できませんでした。診断レポートを送ってください。';return;}
    timeline.textContent=window.turnTimeline36.map(x=>`${x.label}  ${fmt(x.time)}  score=${x.score}`).join('\n');
  }

  const btn=$q('#scanTurns');
  if(btn){
    btn.onclick=async()=>{
      if(!points.top||!points.bottom){$q('#scanStatus').textContent='先に上側・下側の最大PP数字位置を指定してください。';return;}
      const returnTime=video.currentTime;
      const interval=Math.max(.35,Number($q('#scanInterval').value)||.5);
      const targetSide=$q('#targetSide').value;
      const playOrder=$q('#playOrder').value;
      cancelled=false; turnMap={}; renderTurnMap();
      window.turnTimeline36=[]; window.turnCandidates36=[]; timeline.textContent='解析中…';
      $q('#scanTurns').disabled=true; $q('#cancelScan').disabled=false; $q('#progressWrap').classList.remove('hidden');
      log('turn-scan-start-v36',{interval,targetSide,playOrder,returnTime:+returnTime.toFixed(3),points,patch:PATCH});
      const samples={top:[],bottom:[]};
      try{
        for(let t=.1;t<video.duration;t+=interval){
          if(cancelled) break;
          await seek(t,'pp-transition-scan-v36');
          for(const side of ['top','bottom']) samples[side].push({time:+t.toFixed(2),vec:cropVector(side)});
          $q('#progress').style.width=Math.min(100,t/video.duration*100)+'%';
          if(Math.round(t/interval)%10===0) $q('#scanStatus').textContent=`ターン遷移解析 ${Math.min(100,t/video.duration*100).toFixed(0)}%`;
        }
        const topC=detectCandidates(samples.top,'top'), bottomC=detectCandidates(samples.bottom,'bottom');
        window.turnCandidates36=[...topC,...bottomC].sort((a,b)=>a.time-b.time);
        window.turnTimeline36=buildAlternatingTimeline(window.turnCandidates36,playOrder);
        renderTimeline();
        for(const e of window.turnTimeline36){
          if(e.side!==targetSide) continue;
          turnMap[e.turn]={time:e.time,source:'pp-transition-v3.6',side:e.side,confidence:+Math.min(99,Math.round(e.score/Math.max(.001,e.threshold)*55)).toFixed(0),raw:`transition score=${e.score}`};
        }
        renderTurnMap(); updateTurnPick();
        $q('#scanStatus').textContent=cancelled?'解析を中止しました。':`解析完了：ターン遷移 ${window.turnTimeline36.length}件 / ${targetSide==='bottom'?'下側':'上側'} ${Object.keys(turnMap).length}ターン`;
        log('turn-scan-finish-v36',{cancelled,timeline:window.turnTimeline36.map(x=>({side:x.side,turn:x.turn,time:x.time,score:x.score})),targetTurns:Object.fromEntries(Object.entries(turnMap).map(([k,v])=>[k,v.time]))});
      }catch(e){
        $q('#scanStatus').textContent='解析エラー: '+e.message; log('turn-scan-error-v36',{message:e.message,stack:String(e.stack||'')});
      }finally{
        try{await seek(returnTime,'return-after-turn-scan-v36')}catch{}
        $q('#scanTurns').disabled=false; $q('#cancelScan').disabled=true;
      }
    };
  }

  const exportBtn=$q('#exportDiag');
  if(exportBtn){
    exportBtn.onclick=()=>{
      log('diagnostic-export-v36',{timelineCount:window.turnTimeline36.length,candidateCount:window.turnCandidates36.length});
      const data={format:'shadowverse-wb-diagnostic-v3.6',build:PATCH,createdAt:new Date().toISOString(),userAgent:navigator.userAgent,standalone:matchMedia('(display-mode: standalone)').matches,video:videoFileMeta?{...videoFileMeta,duration:video.duration,currentTime:video.currentTime,width:video.videoWidth,height:video.videoHeight}:null,ppPoints:points,targetSide:$q('#targetSide')?.value,playOrder:$q('#playOrder')?.value,turnTimeline:window.turnTimeline36,transitionCandidates:window.turnCandidates36,turnMap,scenes:scenes.map(s=>({turn:s.turn,timeSeconds:s.timeSeconds,playOrder:s.playOrder,matchup:s.matchup,deck:s.deck,note:s.note})),events};
      const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),a=document.createElement('a');
      a.href=URL.createObjectURL(blob);a.download='shadowverse-wb-diagnostic-v3.6.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);
    };
  }

  log('patch-v36-active',{patch:PATCH});
})();

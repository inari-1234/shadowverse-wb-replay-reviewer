(()=>{
  const PATCH='3.8-20260914-09';
  const $q=s=>document.querySelector(s);
  const header=$q('header h1'),sub=$q('header p');
  if(header) header.textContent='シャドバWB リプレイ診断 v3.8';
  if(sub) sub.textContent='Build 2026.09.14-09 / PP全体OCR + 時系列補完';

  const scanPanel=$q('#scanTurns')?.closest('.panel');
  const warn=scanPanel?.querySelector('.warn');
  if(warn) warn.textContent='v3.8では PP「現在値 / 最大値」を広めにOCRし、/ の右側を最大PPとして読みます。欠けたターンは上下の順番（先攻→後攻）と画像変化から補完します。PP+1は対象外です。';

  // Replace nudge handlers so one tap always changes the stored point.
  document.querySelectorAll('[data-nudge]').forEach(old=>{
    const b=old.cloneNode(true); old.replaceWith(b);
    b.addEventListener('click',()=>{
      const [side,dx,dy]=b.dataset.nudge.split(',');
      if(!points?.[side]) return;
      const step=.0015;
      points[side].x=Math.max(.02,Math.min(.98,points[side].x+Number(dx)*step));
      points[side].y=Math.max(.02,Math.min(.98,points[side].y+Number(dy)*step));
      $q('#drawCal37')?.click();
      const s=$q('#calStatus37'); if(s)s.textContent=`${side==='top'?'上側':'下側'}を調整しました（x=${points[side].x.toFixed(4)}, y=${points[side].y.toFixed(4)}）。`;
      try{log('pp-nudge-v38',{side,dx:Number(dx),dy:Number(dy),point:{...points[side]}})}catch{}
    });
  });

  const intervalSel=$q('#scanInterval');
  if(intervalSel){
    intervalSel.innerHTML='<option value="1">1秒（高精度・時間長め）</option><option value="1.5" selected>1.5秒（推奨）</option><option value="2">2秒（高速）</option>';
  }

  let timeline=$q('#turnTimeline38');
  if(!timeline){
    timeline=document.createElement('div'); timeline.id='turnTimeline38'; timeline.className='ocrRead';
    timeline.textContent='v3.8 ターン解析は未実行です。';
    $q('#turnMap')?.parentNode?.insertBefore(timeline,$q('#turnMap'));
  }
  if($q('#turnTimeline37')) $q('#turnTimeline37').style.display='none';
  window.turnTimeline38=[]; window.ocrSamples38=[];

  function lineCrop(side,forVector=false){
    const p=points?.[side]; if(!p) throw new Error(side+' PP位置未設定');
    const src=frameCanvas(1800);
    const left=.105, right=.026, hh=.060;
    let sx=Math.round((p.x-left)*src.width), sy=Math.round((p.y-hh/2)*src.height);
    let cw=Math.round((left+right)*src.width), ch=Math.round(hh*src.height);
    sx=Math.max(0,Math.min(src.width-1,sx)); sy=Math.max(0,Math.min(src.height-1,sy));
    cw=Math.max(20,Math.min(src.width-sx,cw)); ch=Math.max(20,Math.min(src.height-sy,ch));
    if(forVector){
      const c=document.createElement('canvas');c.width=52;c.height=20;
      const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(src,sx,sy,cw,ch,0,0,c.width,c.height);
      const d=x.getImageData(0,0,c.width,c.height).data,a=new Float32Array(c.width*c.height);
      let sum=0;for(let i=0,j=0;i<d.length;i+=4,j++){a[j]=.299*d[i]+.587*d[i+1]+.114*d[i+2];sum+=a[j]}
      const mean=sum/a.length;let ss=0;for(const v of a)ss+=(v-mean)*(v-mean);const sd=Math.max(8,Math.sqrt(ss/a.length));
      for(let i=0;i<a.length;i++)a[i]=(a[i]-mean)/sd;return a;
    }
    const scale=3,c=document.createElement('canvas');c.width=cw*scale;c.height=ch*scale;
    const x=c.getContext('2d',{willReadFrequently:true});x.imageSmoothingEnabled=true;x.drawImage(src,sx,sy,cw,ch,0,0,c.width,c.height);
    const im=x.getImageData(0,0,c.width,c.height),d=im.data;
    let sum=0;for(let i=0;i<d.length;i+=4)sum+=.299*d[i]+.587*d[i+1]+.114*d[i+2];const mean=sum/(d.length/4);
    for(let i=0;i<d.length;i+=4){const g=.299*d[i]+.587*d[i+1]+.114*d[i+2];const v=g>mean?0:255;d[i]=d[i+1]=d[i+2]=v;d[i+3]=255}x.putImageData(im,0,0);return c;
  }
  function parseMax(text){
    const s=(text||'').replace(/[Oo]/g,'0').replace(/\s+/g,'');
    let m=s.match(/(10|[0-9])[/|](10|[0-9])/); if(m){const n=Number(m[2]);return n>=0&&n<=10?n:null}
    const digits=(s.match(/\d/g)||[]).join(''); if(!digits)return null;
    if(digits.endsWith('10'))return 10; const n=Number(digits.slice(-1));return n>=0&&n<=9?n:null;
  }
  async function ocrLine(side){
    const w=await initOCR(),c=lineCrop(side,false);
    try{await w.setParameters({tessedit_char_whitelist:'0123456789/',tessedit_pageseg_mode:'7'});}catch{}
    const r=await w.recognize(c),raw=(r.data.text||'').trim(),confidence=+(r.data.confidence||0).toFixed(1);
    return {n:parseMax(raw),raw,confidence};
  }
  function vdist(a,b){if(!a||!b)return 0;let s=0;for(let i=0;i<a.length;i++)s+=Math.min(3,Math.abs(a[i]-b[i]));return s/a.length/3}
  function bestChange(samples,side,lo,hi){
    const a=samples.filter(x=>x.side===side&&x.time>lo+.4&&x.time<hi-.2);let best=null;
    for(let i=1;i<a.length;i++){const sc=vdist(a[i-1].vec,a[i].vec);if(!best||sc>best.score)best={time:a[i].time,score:sc};}
    return best;
  }
  function buildDirect(samples,side){
    const arr=samples.filter(x=>x.side===side&&x.n!=null&&x.n>=1&&x.n<=10).sort((a,b)=>a.time-b.time);
    const map={}; let lastN=0,runN=null,run=0,runStart=null,runConf=0;
    for(const x of arr){
      if(x.n<lastN) continue;
      if(x.n===runN){run++;runConf=Math.max(runConf,x.confidence)}else{runN=x.n;run=1;runStart=x.time;runConf=x.confidence}
      if(!map[x.n]&&(run>=2||runConf>=68)){
        map[x.n]={time:runStart,source:'ocr',confidence:runConf,raw:x.raw};lastN=Math.max(lastN,x.n);
      }
    }
    return map;
  }
  function reconstruct(allSamples,top,bottom,playOrder,maxTurn=10){
    const first=playOrder==='先攻'?'bottom':'top';
    for(let n=1;n<=maxTurn;n++){
      const order=first==='top'?['top','bottom']:['bottom','top'];
      for(const side of order){
        const map=side==='top'?top:bottom;if(map[n])continue;
        let lo=0,hi=video.duration;
        if(side==='bottom'){
          if(playOrder==='後攻'){lo=Math.max(lo,top[n]?.time||0,bottom[n-1]?.time||0);hi=Math.min(hi,top[n+1]?.time||hi,bottom[n+1]?.time||hi)}
          else{lo=Math.max(lo,top[n-1]?.time||0,bottom[n-1]?.time||0);hi=Math.min(hi,top[n]?.time||hi,bottom[n+1]?.time||hi)}
        }else{
          if(playOrder==='後攻'){lo=Math.max(lo,bottom[n-1]?.time||0,top[n-1]?.time||0);hi=Math.min(hi,bottom[n]?.time||hi,top[n+1]?.time||hi)}
          else{lo=Math.max(lo,bottom[n]?.time||0,top[n-1]?.time||0);hi=Math.min(hi,bottom[n+1]?.time||hi,top[n+1]?.time||hi)}
        }
        if(hi-lo<1.2)continue;
        const b=bestChange(allSamples,side,lo,hi);if(b)map[n]={time:b.time,source:'inferred-change',confidence:45,raw:`window ${lo.toFixed(1)}-${hi.toFixed(1)} score=${b.score.toFixed(3)}`};
      }
    }
    return {top,bottom};
  }
  function render38(top,bottom){
    const rows=[];for(const side of ['top','bottom']){const map=side==='top'?top:bottom;for(const [n,v] of Object.entries(map))rows.push({side,turn:Number(n),...v})}
    rows.sort((a,b)=>a.time-b.time);window.turnTimeline38=rows;
    timeline.textContent=rows.length?rows.map(r=>`${r.side==='top'?'上':'下'}${r.turn}T  ${fmt(r.time)}  ${r.source==='ocr'?'OCR':'補完'}  conf=${r.confidence}`).join('\n'):'ターンを認識できませんでした。';
  }

  const btn=$q('#scanTurns');
  if(btn)btn.onclick=async()=>{
    const returnTime=video.currentTime,interval=Math.max(1,Number($q('#scanInterval').value)||1.5),targetSide=$q('#targetSide').value,playOrder=$q('#playOrder').value;
    cancelled=false;turnMap={};renderTurnMap();window.turnTimeline38=[];window.ocrSamples38=[];timeline.textContent='PP全体をOCR中…';
    btn.disabled=true;$q('#cancelScan').disabled=false;$q('#progressWrap').classList.remove('hidden');
    log('turn-scan-start-v38',{interval,targetSide,playOrder,points,patch:PATCH});
    try{
      await initOCR();
      for(let t=.1;t<video.duration;t+=interval){
        if(cancelled)break;await seek(t,'pp-line-ocr-v38');
        for(const side of ['top','bottom']){
          const rr=await ocrLine(side),vec=lineCrop(side,true),row={side,time:+t.toFixed(2),n:rr.n,raw:rr.raw,confidence:rr.confidence,vec};window.ocrSamples38.push(row);
          log('pp-line-ocr-v38',{side,time:row.time,value:rr.n,raw:rr.raw,confidence:rr.confidence});
        }
        $q('#progress').style.width=Math.min(100,t/video.duration*100)+'%';
        $q('#scanStatus').textContent=`PP OCR ${Math.min(100,t/video.duration*100).toFixed(0)}%`;
      }
      let top=buildDirect(window.ocrSamples38,'top'),bottom=buildDirect(window.ocrSamples38,'bottom');
      ({top,bottom}=reconstruct(window.ocrSamples38,top,bottom,playOrder,10));render38(top,bottom);
      const target=targetSide==='top'?top:bottom;for(const [n,v] of Object.entries(target))turnMap[n]={time:v.time,source:'pp-hybrid-v3.8-'+v.source,side:targetSide,confidence:v.confidence,raw:v.raw};
      renderTurnMap();updateTurnPick();
      $q('#scanStatus').textContent=cancelled?'解析を中止しました。':`解析完了：上側 ${Object.keys(top).length} / 下側 ${Object.keys(bottom).length} ターン`;
      log('turn-scan-finish-v38',{cancelled,top:Object.fromEntries(Object.entries(top).map(([k,v])=>[k,{time:v.time,source:v.source,confidence:v.confidence}])),bottom:Object.fromEntries(Object.entries(bottom).map(([k,v])=>[k,{time:v.time,source:v.source,confidence:v.confidence}]))});
    }catch(e){$q('#scanStatus').textContent='解析エラー: '+e.message;log('turn-scan-error-v38',{message:e.message,stack:String(e.stack||'')})}
    finally{try{await seek(returnTime,'return-after-turn-scan-v38')}catch{}btn.disabled=false;$q('#cancelScan').disabled=true}
  };

  const exportBtn=$q('#exportDiag');
  if(exportBtn)exportBtn.onclick=()=>{
    log('diagnostic-export-v38',{timelineCount:window.turnTimeline38.length});
    const compact=window.ocrSamples38.map(x=>({side:x.side,time:x.time,n:x.n,raw:x.raw,confidence:x.confidence}));
    const data={format:'shadowverse-wb-diagnostic-v3.8',build:PATCH,createdAt:new Date().toISOString(),userAgent:navigator.userAgent,video:videoFileMeta?{...videoFileMeta,duration:video.duration,currentTime:video.currentTime,width:video.videoWidth,height:video.videoHeight}:null,ppPoints:points,targetSide:$q('#targetSide')?.value,playOrder:$q('#playOrder')?.value,turnTimeline:window.turnTimeline38,ocrSamples:compact,turnMap,events};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='shadowverse-wb-diagnostic-v3.8.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)
  };
  log('patch-v38-active',{patch:PATCH,points});
})();
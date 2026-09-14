(()=>{
  const PATCH='3.5-20260914-05';
  const header=document.querySelector('header h1');
  const sub=document.querySelector('header p');
  if(header) header.textContent='シャドバWB リプレイ診断 v3.5';
  if(sub) sub.textContent='Build 2026.09.14-05 / PP OCR安定化';
  const warn=document.querySelector('#scanTurns')?.closest('.panel')?.querySelector('.warn');
  if(warn) warn.textContent='最大PPだけを判定します。読取失敗は連続判定を必ず切り、同じ数字を連続で読めた場合だけ採用します。PP+1や「5ターン後」は対象外です。';

  function makeVariants(side){
    const p=points[side];
    if(!p) throw new Error(side+' PP位置未指定');
    const src=frameCanvas(1800);
    const cw=Math.max(70,Math.round(src.width*.052));
    const ch=Math.max(72,Math.round(src.height*.105));
    let sx=Math.round(p.x*src.width-cw/2), sy=Math.round(p.y*src.height-ch/2);
    sx=Math.max(0,Math.min(src.width-cw,sx)); sy=Math.max(0,Math.min(src.height-ch,sy));
    const variants=[];
    const thresholds=[null,115,145,175];
    for(const th of thresholds){
      const scale=5,out=document.createElement('canvas');
      out.width=cw*scale; out.height=ch*scale;
      const ox=out.getContext('2d',{willReadFrequently:true});
      ox.imageSmoothingEnabled=true;
      ox.drawImage(src,sx,sy,cw,ch,0,0,out.width,out.height);
      const im=ox.getImageData(0,0,out.width,out.height),d=im.data;
      for(let i=0;i<d.length;i+=4){
        const g=.299*d[i]+.587*d[i+1]+.114*d[i+2];
        let v;
        if(th===null){ v=Math.max(0,Math.min(255,(g-105)*2.1+128)); }
        else { v=g>th?0:255; }
        d[i]=d[i+1]=d[i+2]=v; d[i+3]=255;
      }
      ox.putImageData(im,0,0); variants.push({canvas:out,kind:th===null?'contrast':'th'+th});
    }
    return variants;
  }

  function parseNumber(text){
    const digits=(text||'').replace(/\D/g,'');
    if(!digits) return null;
    if(digits.includes('10')) return 10;
    const one=Number(digits.slice(-1));
    return one>=1&&one<=9?one:null;
  }

  readPP=async function(side){
    const w=await initOCR(), variants=makeVariants(side), results=[];
    for(const v of variants){
      const r=await w.recognize(v.canvas);
      const raw=(r.data.text||'').trim();
      const n=parseNumber(raw), confidence=+(r.data.confidence||0).toFixed(1);
      results.push({n,raw,confidence,variant:v.kind});
    }
    const groups=new Map();
    for(const r of results){
      if(r.n==null) continue;
      if(!groups.has(r.n)) groups.set(r.n,{n:r.n,count:0,total:0,best:0,raws:[]});
      const g=groups.get(r.n); g.count++; g.total+=r.confidence; g.best=Math.max(g.best,r.confidence); g.raws.push(`${r.variant}:${r.raw}:${r.confidence}`);
    }
    let best=null;
    for(const g of groups.values()){
      g.avg=g.total/g.count;
      if(!best||g.count>best.count||(g.count===best.count&&g.avg>best.avg)) best=g;
    }
    const accepted=best&&(best.count>=2||best.best>=58)?best.n:null;
    return {n:accepted,raw:best?best.raws.join('|'):'',confidence:best?+best.avg.toFixed(1):0,variants:results};
  };

  const btn=document.querySelector('#scanTurns');
  if(btn){
    btn.onclick=async()=>{
      if(!points.top||!points.bottom){$('#scanStatus').textContent='先にPP位置を指定してください。';return;}
      const returnTime=video.currentTime,side=$('#targetSide').value,interval=Number($('#scanInterval').value),need=Math.max(2,Number($('#stableCount').value)||2);
      cancelled=false; turnMap={}; renderTurnMap();
      $('#scanTurns').disabled=true; $('#cancelScan').disabled=false; $('#progressWrap').classList.remove('hidden'); $('#ocrRead').textContent='';
      log('turn-scan-start-v35',{side,interval,stableCount:need,returnTime:+returnTime.toFixed(3),points,patch:PATCH});
      let last=null,run=0,runStart=null,lastAcceptedTurn=0;
      try{
        await initOCR();
        for(let t=.1;t<video.duration;t+=interval){
          if(cancelled) break;
          await seek(t,'pp-turn-scan-v35');
          const rr=await readPP(side);
          log('pp-ocr-v35',{side,time:+t.toFixed(2),value:rr.n,raw:rr.raw,confidence:rr.confidence,variants:rr.variants});
          $('#ocrRead').textContent=`${fmt(t)}  ${side==='bottom'?'下側':'上側'}PP最大値 → ${rr.n??'読取失敗'}  conf=${rr.confidence}\n${rr.raw}`;

          if(rr.n===null){
            last=null; run=0; runStart=null;
            $('#progress').style.width=Math.min(100,t/video.duration*100)+'%';
            continue;
          }

          if(rr.n===last){ run++; }
          else { last=rr.n; run=1; runStart=t; }

          if(run>=need&&!turnMap[rr.n]){
            const impossibleBackwards=lastAcceptedTurn>0&&rr.n<lastAcceptedTurn;
            const hugeJump=lastAcceptedTurn>0&&rr.n>lastAcceptedTurn+2;
            if(!impossibleBackwards&&!hugeJump){
              const anchor=Math.max(.1,runStart);
              turnMap[rr.n]={time:anchor,source:'max-pp-ocr-v3.5',side,confidence:rr.confidence,raw:rr.raw};
              lastAcceptedTurn=Math.max(lastAcceptedTurn,rr.n);
              log('turn-detected-v35',{turn:rr.n,time:+anchor.toFixed(3),side,confidence:rr.confidence,run});
              renderTurnMap();
            }else{
              log('turn-rejected-v35',{turn:rr.n,lastAcceptedTurn,reason:impossibleBackwards?'backwards':'jump-too-large',time:+t.toFixed(3)});
            }
          }
          $('#progress').style.width=Math.min(100,t/video.duration*100)+'%';
        }
        $('#scanStatus').textContent=cancelled?'解析を中止しました。':`解析完了：${Object.keys(turnMap).length}ターン認識（v3.5）`;
        log('turn-scan-finish-v35',{cancelled,detected:Object.fromEntries(Object.entries(turnMap).map(([k,v])=>[k,v.time]))});
      }catch(e){
        $('#scanStatus').textContent='解析エラー: '+e.message; log('turn-scan-error-v35',{message:e.message});
      }finally{
        try{await seek(returnTime,'return-after-turn-scan-v35')}catch{}
        $('#scanTurns').disabled=false; $('#cancelScan').disabled=true; updateTurnPick();
      }
    };
  }

  log('patch-v35-active',{patch:PATCH});
})();
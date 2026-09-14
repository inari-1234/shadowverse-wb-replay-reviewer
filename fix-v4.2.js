(()=>{
  const PATCH='4.2-20260914-15';
  const $q=s=>document.querySelector(s);
  const header=$q('header h1'),sub=$q('header p');
  if(header) header.textContent='シャドバWB リプレイ診断 v4.2';
  if(sub) sub.textContent='Build 2026.09.14-15 / PP自動準備 + 先攻側自動判定';

  const play=$q('#playOrder');
  if(play?.options?.length>=2){
    play.options[0].textContent='下側が先攻';
    play.options[1].textContent='上側が先攻';
  }

  const manualPanel=$q('#drawCal39')?.closest('.panel') || $q('#drawCal37')?.closest('.panel') || $q('#drawCal')?.closest('.panel');
  const scanPanel=$q('#scanTurns')?.closest('.panel');
  let prepPanel=$q('#autoPrepPanel42');
  if(!prepPanel&&manualPanel){
    prepPanel=document.createElement('section');
    prepPanel.id='autoPrepPanel42';prepPanel.className='panel';
    prepPanel.innerHTML=`<h2>2. PP・先攻側を自動準備</h2><p id="autoPrepStatus42" class="help">動画を選ぶと自動で準備します。</p><div class="buttons"><button id="rerunAutoPrep42" class="primary">自動準備を再実行</button><button id="showManual42">PP位置を手動調整</button></div><div id="autoPrepDetail42" class="ocrRead"></div>`;
    manualPanel.parentNode.insertBefore(prepPanel,manualPanel);
    manualPanel.style.display='none';
  }
  const status=$q('#autoPrepStatus42'),detail=$q('#autoPrepDetail42'),scanBtn=$q('#scanTurns');
  let prepToken=0,preparing=false;
  window.autoPrep42=null;

  function fmt42(t){try{return fmt(t)}catch{return Number(t).toFixed(1)+'s'}}
  function setStatus(text,ok=false){if(status){status.textContent=text;status.className=ok?'ok':'help'}}
  function syncPoint(side,p){
    if(window.v39Points) window.v39Points[side]={x:p.x,y:p.y};
    try{points[side]={x:p.x,y:p.y}}catch{}
  }
  function currentPoint(side){
    const p=window.v39Points?.[side]||points?.[side];
    return p?{x:Number(p.x),y:Number(p.y)}:null;
  }
  function parse42(text){
    const s=(text||'').replace(/[Oo]/g,'0').replace(/\s+/g,'');
    let m=s.match(/\/(10|[1-9])/);if(m)return {n:Number(m[1]),quality:5,pattern:'slash'};
    m=s.match(/(10|[0-9])[/|](10|[1-9])/);if(m)return {n:Number(m[2]),quality:4.5,pattern:'pair'};
    const ds=(s.match(/\d/g)||[]).join('');if(!ds)return {n:null,quality:0,pattern:'none'};
    if(ds.endsWith('10'))return {n:10,quality:2.2,pattern:'digits'};
    const n=Number(ds.slice(-1));if(n<1||n>9)return {n:null,quality:0,pattern:'zero'};
    return {n,quality:ds===String(n)?2:1.15,pattern:ds===String(n)?'single':'digits'};
  }
  function cropAt42(p,variant='gray'){
    const src=frameCanvas(1900),left=.090,right=.022,hh=.056;
    let sx=Math.round((p.x-left)*src.width),sy=Math.round((p.y-hh/2)*src.height),cw=Math.round((left+right)*src.width),ch=Math.round(hh*src.height);
    sx=Math.max(0,Math.min(src.width-1,sx));sy=Math.max(0,Math.min(src.height-1,sy));cw=Math.max(30,Math.min(src.width-sx,cw));ch=Math.max(24,Math.min(src.height-sy,ch));
    const scale=3,c=document.createElement('canvas');c.width=cw*scale;c.height=ch*scale;const x=c.getContext('2d',{willReadFrequently:true});x.imageSmoothingEnabled=true;x.drawImage(src,sx,sy,cw,ch,0,0,c.width,c.height);
    const im=x.getImageData(0,0,c.width,c.height),d=im.data;let sum=0;for(let i=0;i<d.length;i+=4)sum+=.299*d[i]+.587*d[i+1]+.114*d[i+2];const mean=sum/(d.length/4);
    for(let i=0;i<d.length;i+=4){const g=.299*d[i]+.587*d[i+1]+.114*d[i+2],v=variant==='gray'?Math.max(0,Math.min(255,(g-mean)*2+128)):(g>mean?0:255);d[i]=d[i+1]=d[i+2]=v;d[i+3]=255}x.putImageData(im,0,0);return c;
  }
  async function read42(side,p){
    const w=await initOCR();
    async function once(variant){const c=cropAt42(p,variant);try{await w.setParameters({tessedit_char_whitelist:'0123456789/',tessedit_pageseg_mode:'7'})}catch{}const r=await w.recognize(c),raw=(r.data.text||'').trim(),confidence=+(r.data.confidence||0).toFixed(1),q=parse42(raw);return {...q,raw,confidence,variant}}
    const a=await once('gray');if(a.pattern==='slash'||a.pattern==='pair'||(a.pattern==='single'&&a.confidence>=25))return a;
    const b=await once('binary'),score=x=>x.quality+(x.confidence||0)/70;return score(b)>score(a)?b:a;
  }
  function stableTime42(rows,n){
    const a=rows.filter(x=>x.n===n).sort((x,y)=>x.time-y.time);
    for(let i=0;i<a.length;i++){
      const x=a[i],strong=x.pattern==='slash'||x.pattern==='pair';
      const near=a.find((y,j)=>j!==i&&y.time>x.time&&y.time-x.time<=3.2);
      if(strong||near)return x.time;
    }
    return null;
  }
  function summarize42(samples){
    const by={top:samples.filter(x=>x.side==='top'),bottom:samples.filter(x=>x.side==='bottom')};
    const times={top:{},bottom:{}};
    for(const side of ['top','bottom'])for(const n of [1,2,3,4])times[side][n]=stableTime42(by[side],n);
    const votes=[];
    for(const n of [2,3,4]){
      const t=times.top[n],b=times.bottom[n];if(t==null||b==null)continue;
      if(Math.abs(t-b)<.45)continue;
      votes.push({turn:n,first:t<b?'top':'bottom',top:t,bottom:b,margin:+Math.abs(t-b).toFixed(2)});
    }
    const topVotes=votes.filter(x=>x.first==='top').length,bottomVotes=votes.filter(x=>x.first==='bottom').length;
    let firstSide=null,confidence='low';
    if(topVotes>=2||bottomVotes>=2){firstSide=topVotes>bottomVotes?'top':'bottom';confidence='high'}
    else if(votes.length===1&&votes[0].margin>=1.2){firstSide=votes[0].first;confidence='medium'}
    const evidence={top:Object.values(times.top).filter(x=>x!=null).length,bottom:Object.values(times.bottom).filter(x=>x!=null).length};
    return {times,votes,firstSide,confidence,evidence};
  }
  async function quickScan42(token){
    const samples=[],end=Math.min(video.duration-.2,42),start=Math.min(14,Math.max(.1,end-12));
    for(let t=start;t<=end+.001;t+=1.5){
      if(token!==prepToken)throw new Error('cancelled');
      await seek(t,'auto-prep-v42');
      for(const side of ['top','bottom']){
        const p=currentPoint(side);if(!p)continue;
        const r=await read42(side,p);samples.push({side,time:+t.toFixed(2),...r});
      }
      const s=summarize42(samples);
      if(s.firstSide&&s.evidence.top>=2&&s.evidence.bottom>=2)break;
    }
    return samples;
  }
  async function refineSide42(side,token,referenceTime){
    const base=currentPoint(side);if(!base)return null;
    await seek(referenceTime,'auto-calibrate-v42');
    let best={p:base,score:-1,result:null};
    for(const dy of [-.0035,0,.0035])for(const dx of [-.0035,0,.0035]){
      if(token!==prepToken)throw new Error('cancelled');
      const p={x:Math.max(.02,Math.min(.98,base.x+dx)),y:Math.max(.02,Math.min(.98,base.y+dy))};
      const r=await read42(side,p),score=r.quality+(r.confidence||0)/65+(r.n>=1&&r.n<=6?1:0);
      if(score>best.score)best={p,score,result:r};
    }
    if(best.score>=3.0){syncPoint(side,best.p);return best}
    return null;
  }
  function applyFirstSide42(first){
    if(!play||!first)return;
    play.value=first==='bottom'?'先攻':'後攻';
    play.dispatchEvent(new Event('change',{bubbles:true}));
  }
  function resultText42(sum){
    const first=sum.firstSide==='top'?'上側':sum.firstSide==='bottom'?'下側':'未確定';
    const v=sum.votes.map(x=>`${x.turn}PP: ${x.first==='top'?'上':'下'}が${x.margin.toFixed(1)}秒先`).join(' / ');
    return `PP証拠 上${sum.evidence.top}段階・下${sum.evidence.bottom}段階\n先攻側: ${first}（${sum.confidence}）${v?'\n'+v:''}`;
  }
  async function autoPrep42(){
    if(preparing||!video?.src||!isFinite(video.duration)||video.duration<=0)return;
    const token=++prepToken,original=video.currentTime;preparing=true;if(scanBtn)scanBtn.disabled=true;
    setStatus('PP表示位置と先攻側を自動確認しています…');if(detail)detail.textContent='前半だけを走査します。';
    try{
      let samples=await quickScan42(token),sum=summarize42(samples),refined=[];
      if(sum.evidence.top<2||sum.evidence.bottom<2){
        const ref=Math.min(video.duration-.2,Math.max(22,Math.min(34,video.duration*.45)));
        for(const side of ['top','bottom'])if(sum.evidence[side]<2){const r=await refineSide42(side,token,ref);if(r)refined.push({side,point:r.p,raw:r.result?.raw||'',score:+r.score.toFixed(2)})}
        if(refined.length){samples=await quickScan42(token);sum=summarize42(samples)}
      }
      if(sum.firstSide)applyFirstSide42(sum.firstSide);
      const ppOK=sum.evidence.top>=2&&sum.evidence.bottom>=2;
      const sideOK=!!sum.firstSide;
      window.autoPrep42={patch:PATCH,ppOK,sideOK,points:{top:currentPoint('top'),bottom:currentPoint('bottom')},summary:sum,refined,sampleCount:samples.length};
      try{log('auto-prep-v42-result',window.autoPrep42)}catch{}
      if(ppOK){
        if(manualPanel)manualPanel.style.display='none';
        setStatus(sideOK?`自動準備完了：${sum.firstSide==='top'?'上側':'下側'}が先攻です。`:'PP位置は自動確認できました。先攻側だけ判定保留です。',sideOK);
      }else{
        if(manualPanel)manualPanel.style.display='block';
        setStatus('PP位置の自動確認が十分ではありません。下の手動調整を確認してください。');
      }
      if(detail)detail.textContent=resultText42(sum)+(refined.length?`\n位置自動補正: ${refined.map(x=>x.side==='top'?'上':'下').join('・')}`:'');
    }catch(err){
      if(err?.message!=='cancelled'){if(manualPanel)manualPanel.style.display='block';setStatus('自動準備に失敗しました。手動調整は引き続き使用できます。');if(detail)detail.textContent=err?.message||String(err);try{log('auto-prep-v42-error',{message:err?.message||String(err)})}catch{}}
    }finally{
      try{if(token===prepToken)await seek(original,'auto-prep-return-v42')}catch{}
      if(token===prepToken&&scanBtn)scanBtn.disabled=false;
      preparing=false;
    }
  }

  $q('#rerunAutoPrep42')?.addEventListener('click',()=>{prepToken++;preparing=false;autoPrep42()});
  $q('#showManual42')?.addEventListener('click',()=>{if(manualPanel)manualPanel.style.display=manualPanel.style.display==='none'?'block':'none'});
  $q('#videoFile')?.addEventListener('change',()=>{prepToken++;window.autoPrep42=null;if(manualPanel)manualPanel.style.display='none';setStatus('動画読込後に自動準備します…');if(detail)detail.textContent='';});
  video?.addEventListener('loadedmetadata',()=>setTimeout(()=>{if(scanBtn)scanBtn.disabled=true;autoPrep42()},120));

  if(scanPanel){const warn=scanPanel.querySelector('.warn');if(warn)warn.textContent='v4.2ではPP位置と先攻側を動画前半から自動準備します。自動判定に十分な根拠がない場合だけ手動調整を使ってください。ターン本解析は従来どおり最大PPと時系列整合性で判定します。';}
  try{log('patch-v42-active',{patch:PATCH})}catch{}
})();
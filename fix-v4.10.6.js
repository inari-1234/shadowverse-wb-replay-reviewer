(()=>{
  const PATCH='4.10.6-20260916-18a';
  const $q=s=>document.querySelector(s);
  const safeLog=(type,data={})=>{try{log(type,{patch:PATCH,...data})}catch{}};
  const CFG={dx:.01125,dy:.0325,green:18,active:72,strongActive:85,strongInactive:75,strongGreen:22,strongNonGreen:17,scanStep:.25,scanWindow:1.8};
  let fillHandler=null;

  function videoEl(){return typeof video!=='undefined'?video:$q('#video')}
  function targetSide(){const s=$q('#targetSide')?.value;return s==='top'||s==='bottom'?s:'bottom'}
  function timeline(){return Array.isArray(window.turnTimeline39)?window.turnTimeline39:[]}
  function timelineContext(){
    const v=videoEl(),t=Number(v?.currentTime),rows=timeline();let row=null;
    if(Number.isFinite(t))for(const r of rows){if(Number(r.time)<=t&&(!row||Number(r.time)>Number(row.time)))row=r}
    const reviewed=targetSide(),side=row?.side==='top'||row?.side==='bottom'?row.side:null;
    return{time:Number.isFinite(t)?+t.toFixed(3):null,row,reviewedSide:reviewed,absoluteSide:side,relativeSide:side?(side===reviewed?'自分':'相手'):null};
  }
  function expectedMaxAt(t,reviewed){
    let last=null;
    for(const r of timeline())if(r?.side===reviewed&&Number(r.time)<=t&&(!last||Number(r.time)>Number(last.time)))last=r;
    return last?Math.max(1,Math.min(10,Number(last.turn)||0)):null;
  }
  function drawFrame(){
    const v=videoEl();if(!v?.videoWidth||!v?.videoHeight)return null;
    const c=document.createElement('canvas');c.width=1200;c.height=Math.max(1,Math.round(1200*v.videoHeight/v.videoWidth));
    const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(v,0,0,c.width,c.height);return{x,c};
  }
  function diskStats(data,w,h,cx,cy,r){
    let n=0,rs=0,gs=0,bs=0,gray=0;
    const r2=r*r,x0=Math.max(0,cx-r),x1=Math.min(w-1,cx+r),y0=Math.max(0,cy-r),y1=Math.min(h-1,cy+r);
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const dx=x-cx,dy=y-cy;if(dx*dx+dy*dy>r2)continue;const i=(y*w+x)*4,R=data[i],G=data[i+1],B=data[i+2];n++;rs+=R;gs+=G;bs+=B;gray+=.299*R+.587*G+.114*B}
    if(!n)return null;const R=rs/n,G=gs/n,B=bs/n;return{meanGray:gray/n,greenDom:G-(R+B)/2};
  }
  function prefixCount(a){let n=0;while(n<a.length&&a[n])n++;return{count:n,invalid:a.slice(n).some(Boolean)}}
  function readBottomPips(expectedMax){
    const f=drawFrame();if(!f||!expectedMax)return{accepted:false,reason:'frame-or-expected-missing'};
    const p=window.v39Points?.bottom||{x:.8822,y:.6065},im=f.x.getImageData(0,0,f.c.width,f.c.height),r=Math.max(4,Math.round(f.c.height*.0098));
    const stats=[];
    for(let j=0;j<10;j++){const cx=Math.round((p.x+(j-7)*CFG.dx)*f.c.width),cy=Math.round((p.y+CFG.dy)*f.c.height);stats.push(diskStats(im.data,f.c.width,f.c.height,cx,cy,r))}
    if(stats.some(x=>!x))return{accepted:false,reason:'pip-sample-failed'};
    const dom=stats.map(x=>x.greenDom),mean=stats.map(x=>x.meanGray),g=prefixCount(dom.map(x=>x>CFG.green)),a=prefixCount(mean.map(x=>x>CFG.active));
    const minActive=Math.min(...mean.slice(0,expectedMax)),maxInactive=expectedMax<10?Math.max(...mean.slice(expectedMax)):-Infinity,minGreen=g.count?Math.min(...dom.slice(0,g.count)):Infinity,maxNonGreen=g.count<10?Math.max(...dom.slice(g.count)):-Infinity;
    const accepted=a.count===expectedMax&&!a.invalid&&!g.invalid&&minActive>=CFG.strongActive&&(expectedMax===10||maxInactive<=CFG.strongInactive)&&(g.count===0||minGreen>=CFG.strongGreen)&&(g.count===10||maxNonGreen<=CFG.strongNonGreen);
    return{accepted,reason:accepted?'ok':'quality-gate',current:g.count,max:a.count,expectedMax,minActive:+minActive.toFixed(1),maxInactive:Number.isFinite(maxInactive)?+maxInactive.toFixed(1):null,minGreen:Number.isFinite(minGreen)?+minGreen.toFixed(1):null,maxNonGreen:Number.isFinite(maxNonGreen)?+maxNonGreen.toFixed(1):null,mean:mean.map(x=>+x.toFixed(1)),greenDom:dom.map(x=>+x.toFixed(1))};
  }
  async function seekFrame(t){
    const v=videoEl();if(!v||!Number.isFinite(v.duration))return false;t=Math.max(0,Math.min(v.duration-.05,t));
    if(Math.abs(v.currentTime-t)>.025){
      try{if(typeof seek==='function')await seek(t,'pp-state-pips-v4106');else await new Promise((resolve,reject)=>{let done=false;const fin=ok=>{if(done)return;done=true;v.removeEventListener('seeked',on);clearTimeout(to);ok?resolve():reject(new Error('seek timeout'))},on=()=>fin(true),to=setTimeout(()=>fin(false),2500);v.addEventListener('seeked',on,{once:true});v.currentTime=t})}catch{return false}
    }
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return true;
  }
  async function recognizePP(ctx){
    if(ctx.reviewedSide!=='bottom')return{accepted:false,reason:'top-side-not-supported'};
    const expected=expectedMaxAt(ctx.time,'bottom');if(!expected)return{accepted:false,reason:'before-first-reviewed-turn'};
    let sample=readBottomPips(expected);sample.sampleTime=ctx.time;sample.mode='direct';
    const ownStart=ctx.row?.side==='bottom'?Number(ctx.row.time):NaN,delta=Number.isFinite(ownStart)?ctx.time-ownStart:Infinity,nearStart=delta>=-.05&&delta<CFG.scanWindow,refillPending=nearStart&&delta<1.55&&sample.accepted&&sample.current!==expected;
    if(sample.accepted&&!refillPending)return sample;
    if(!nearStart)return sample;
    const original=ctx.time,end=ownStart+CFG.scanWindow;
    try{
      for(let t=Math.max(original+CFG.scanStep,ownStart+CFG.scanStep);t<=end+.001;t+=CFG.scanStep){
        if(!await seekFrame(t))continue;const s=readBottomPips(expected);s.sampleTime=+t.toFixed(3);s.mode='turn-start-forward-confirmed';
        if(s.accepted&&s.current===expected){sample=s;break}
      }
    }finally{await seekFrame(original)}
    return sample;
  }
  function setStatus(msg,color='#9aa8bf'){const st=$q('#leStatus480');if(st){st.textContent=msg;st.style.color=color}}
  function installFill(){
    const b=$q('#leFill480'),pp=$q('#lePp480');if(!b||!pp)return false;
    if(!fillHandler)fillHandler=async()=>{
      if(b.disabled)return;const ctx=timelineContext(),turnEl=$q('#leTurn480'),source=pp.dataset.wbPpSource||'unknown',manual=source==='manual'||source==='preexisting-manual';
      if(ctx.row?.turn&&turnEl)turnEl.value=Number(ctx.row.turn);
      b.disabled=true;setStatus('動画から現在PPを確認中…','#cbd5e1');
      let result;try{result=await recognizePP(ctx)}catch(err){result={accepted:false,reason:'exception',message:err?.message||String(err)}}finally{b.disabled=false}
      let applied=false,conflict=false;
      if(result?.accepted){
        const current=Number(result.current);
        if(manual){const old=String(pp.value||'').trim(),n=old===''?null:Number(old);conflict=Number.isFinite(n)&&n!==current;setStatus(`画像認識PP ${current}/${result.max}。手入力PP ${Number.isFinite(n)?n:'?'} を保持します${conflict?'（画像認識値と不一致）':''}。`,conflict?'#facc15':'#86efac')}
        else{pp.value=String(current);pp.dataset.wbPpSource='image-pips-v4106';applied=true;setStatus(`${ctx.row?.turn??'?'}T / PP ${current}/${result.max} をPPゲージ画像から取得しました${result.mode==='turn-start-forward-confirmed'?'（ターン開始演出後の最初の安定フレーム）':''}。`,'#86efac')}
      }else{
        setStatus(`${ctx.row?.turn??'?'}Tは取得しました。PP画像は確信度不足のため自動入力していません（${result?.reason||'unknown'}）。`,'#facc15')
      }
      $q('#leCalc480')?.click();
      window.__wbPpState4106={patch:PATCH,at:new Date().toISOString(),context:{time:ctx.time,turn:Number(ctx.row?.turn)||null,absoluteSide:ctx.absoluteSide,targetSide:ctx.reviewedSide},result,applied,manualPreserved:manual,conflict};
      safeLog('pp-state-read-v4106',window.__wbPpState4106);
    };
    if(b.onclick!==fillHandler)b.onclick=fillHandler;b.textContent='動画位置からターン・PP取得';b.dataset.wbState4106='1';
    return true;
  }
  function note(){
    const panel=$q('#lethalPanel480');if(!panel||$q('#lePpImageNote4106'))return false;const n=document.createElement('p');n.id='lePpImageNote4106';n.className='help';n.textContent='PPは下側プレイヤーのPPゲージ（緑/灰/黒）を画像判定します。最大PPとターンが一致しない演出中フレームは採用せず、不確実な場合は空欄のままにします。Extra PPは別資源のため自動加算しません。';panel.appendChild(n);return true;
  }
  function latestUi(){
    window.__wbUiFinalVersion='4.10.6';document.documentElement.dataset.wbLatestUi='4106';let s=$q('#wbUiFinal4106');if(!s){s=document.createElement('style');s.id='wbUiFinal4106';document.head.appendChild(s)}
    s.textContent="header h1::after{content:'シャドバWB リプレイ診断 v4.10.6' !important}header>p:first-of-type::after{content:'Build 2026.09.16-18 / PPゲージ画像認識' !important}";
    const st=$q('#wbUpdateStatus4104');if(st)st.textContent='v4.10.6 / PPゲージ画像認識';const old=$q('#wbForceLatest4104');
    if(old&&old.dataset.wb4106!=='1'){const b=old.cloneNode(true);b.dataset.wb4106='1';old.replaceWith(b);b.addEventListener('click',async()=>{const x=$q('#wbUpdateStatus4104');if(b.disabled)return;b.disabled=true;if(x)x.textContent='最新版を確認中…';try{if('serviceWorker'in navigator){const reg=await navigator.serviceWorker.register('./sw.js?v=4.10.6-20260916-18a',{updateViaCache:'none'});await reg.update()}if('caches'in window){const ks=await caches.keys();await Promise.all(ks.filter(k=>k.startsWith('wb-review-')&&k!=='wb-review-v4-10-6-20260916-30').map(k=>caches.delete(k)))}if(x)x.textContent='更新完了。v4.10.6で再起動します…';setTimeout(()=>{const u=new URL(location.href);u.searchParams.set('latest','4106-'+Date.now());u.hash='';location.replace(u.href)},180)}catch(err){if(x)x.textContent='更新確認に失敗しました。';b.disabled=false;safeLog('force-latest-error-v4106',{message:err?.message||String(err)})}})}
  }
  function verify(){const b=$q('#leFill480');const state={mounted:!!b,handlerOk:!b||b.onclick===fillHandler,targetSide:targetSide(),patch:PATCH,checkedAt:new Date().toISOString()};state.ok=state.handlerOk;window.__wbPpSafety4106=state;safeLog('pp-state-invariant-v4106',state);return state.ok}
  $q('#videoFile')?.addEventListener('change',()=>{const pp=$q('#lePp480');if(pp?.dataset?.wbPpSource==='image-pips-v4106'){pp.value='';pp.dataset.wbPpSource='unknown'}window.__wbPpState4106=null});
  let tries=0,ready=0;const tm=setInterval(()=>{tries++;latestUi();const ok=installFill();note();ready=ok?ready+1:0;if(tries%10===0)verify();if(ready>=8&&tries>45||tries>55)clearInterval(tm)},120);
  [80,350,1100,2500,5200,6100].forEach(ms=>setTimeout(()=>{latestUi();installFill();note();verify()},ms));
  window.__wbPpRecognizer4106={readBottomPips,expectedMaxAt,verify,config:{...CFG}};
  safeLog('patch-v4106-active',{feature:'bottom-pp-pip-image-state-recognition-no-ocr'});
})();

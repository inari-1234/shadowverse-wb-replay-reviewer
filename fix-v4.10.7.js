(()=>{
  const PATCH='4.10.7-20260916-19a';
  const $q=s=>document.querySelector(s);
  const safeLog=(type,data={})=>{try{log(type,{patch:PATCH,...data})}catch{}};
  const POS={top:{x:.573,y:.087},bottom:{x:.585,y:.790}};
  const CFG={outerHalfX:.025,outerHalfY:.052,innerHalfX:.018,innerHalfY:.034,scale:5,minRed:.25,minGold:.15,maxHp:30};
  let baseFill=null,hpHandler=null;

  function videoEl(){return typeof video!=='undefined'?video:$q('#video')}
  function targetSide(){const s=$q('#targetSide')?.value;return s==='top'||s==='bottom'?s:'bottom'}
  function opponentSide(){return targetSide()==='bottom'?'top':'bottom'}
  function currentContext(){
    const v=videoEl(),t=Number(v?.currentTime),rows=Array.isArray(window.turnTimeline39)?window.turnTimeline39:[];let row=null;
    if(Number.isFinite(t))for(const r of rows){if(Number(r.time)<=t&&(!row||Number(r.time)>Number(row.time)))row=r}
    return{time:Number.isFinite(t)?+t.toFixed(3):null,turn:Number(row?.turn)||null,absoluteSide:row?.side||null,targetSide:targetSide(),opponentSide:opponentSide()};
  }
  function drawFrame(){
    const v=videoEl();if(!v?.videoWidth||!v?.videoHeight)return null;
    const c=document.createElement('canvas');c.width=1200;c.height=Math.max(1,Math.round(c.width*v.videoHeight/v.videoWidth));
    const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(v,0,0,c.width,c.height);return{c,x};
  }
  function cropRect(frame,side,hx,hy){
    const p=POS[side];if(!p)return null;const w=frame.c.width,h=frame.c.height;
    const sx=Math.max(0,Math.round((p.x-hx)*w)),sy=Math.max(0,Math.round((p.y-hy)*h));
    const sw=Math.max(1,Math.min(w-sx,Math.round(hx*2*w))),sh=Math.max(1,Math.min(h-sy,Math.round(hy*2*h)));
    return{sx,sy,sw,sh};
  }
  function shieldQuality(frame,side){
    const r=cropRect(frame,side,CFG.outerHalfX,CFG.outerHalfY);if(!r)return{ok:false,reason:'side'};
    const d=frame.x.getImageData(r.sx,r.sy,r.sw,r.sh).data;let n=0,red=0,gold=0;
    for(let i=0;i<d.length;i+=4){const R=d[i],G=d[i+1],B=d[i+2];n++;if(R>90&&R>G*1.25&&R>B*1.15)red++;if(R>130&&G>80&&G<190&&B<130&&R>G*1.15)gold++}
    const redFrac=n?red/n:0,goldFrac=n?gold/n:0;return{ok:redFrac>=CFG.minRed&&goldFrac>=CFG.minGold,redFrac:+redFrac.toFixed(3),goldFrac:+goldFrac.toFixed(3)};
  }
  function makeVariants(frame,side){
    const r=cropRect(frame,side,CFG.innerHalfX,CFG.innerHalfY);if(!r)return[];
    const base=document.createElement('canvas');base.width=Math.max(20,r.sw*CFG.scale);base.height=Math.max(20,r.sh*CFG.scale);
    const b=base.getContext('2d',{willReadFrequently:true});b.imageSmoothingEnabled=true;b.drawImage(frame.c,r.sx,r.sy,r.sw,r.sh,0,0,base.width,base.height);
    const im=b.getImageData(0,0,base.width,base.height),src=im.data;let sum=0,n=0;
    for(let i=0;i<src.length;i+=4){sum+=.299*src[i]+.587*src[i+1]+.114*src[i+2];n++}const mean=n?sum/n:128;
    function variant(mode){const c=document.createElement('canvas');c.width=base.width;c.height=base.height;const x=c.getContext('2d',{willReadFrequently:true}),o=x.createImageData(c.width,c.height),d=o.data;for(let i=0;i<src.length;i+=4){const g=.299*src[i]+.587*src[i+1]+.114*src[i+2];let v;if(mode==='gray')v=g;else if(mode==='contrast')v=Math.max(0,Math.min(255,(g-mean)*1.8+128));else v=g>mean?0:255;d[i]=d[i+1]=d[i+2]=v;d[i+3]=255}x.putImageData(o,0,0);return{name:mode,canvas:c}}
    return[variant('gray'),variant('contrast'),variant('binary-invert')];
  }
  function parseHp(text){const ds=String(text||'').replace(/\D/g,'');if(!ds)return null;const n=Number(ds);return Number.isInteger(n)&&n>=0&&n<=CFG.maxHp?n:null}
  async function recognizeOpponentHp(){
    const frame=drawFrame(),side=opponentSide();if(!frame)return{accepted:false,reason:'frame-missing',side};
    const q=shieldQuality(frame,side);if(!q.ok)return{accepted:false,reason:'shield-not-clear',side,quality:q};
    if(typeof initOCR!=='function')return{accepted:false,reason:'ocr-unavailable',side,quality:q};
    const worker=await initOCR();try{await worker.setParameters({tessedit_char_whitelist:'0123456789',tessedit_pageseg_mode:'7'})}catch{}
    const reads=[];
    for(const v of makeVariants(frame,side)){
      try{const r=await worker.recognize(v.canvas),raw=String(r?.data?.text||'').trim(),value=parseHp(raw),confidence=+(Number(r?.data?.confidence)||0).toFixed(1);reads.push({variant:v.name,value,raw,confidence})}
      catch(err){reads.push({variant:v.name,value:null,raw:'',confidence:0,error:err?.message||String(err)})}
    }
    const counts=new Map();for(const r of reads)if(r.value!=null)counts.set(r.value,(counts.get(r.value)||0)+1);
    let best=null,bestCount=0;for(const [v,c] of counts)if(c>bestCount){best=v;bestCount=c}
    const conflicts=[...counts.keys()].filter(v=>v!==best),accepted=best!=null&&bestCount>=2&&conflicts.length===0;
    return{accepted,reason:accepted?'ok':conflicts.length?'ocr-conflict':'ocr-insufficient-consensus',side,quality:q,value:accepted?best:null,bestCandidate:best,bestCount,reads};
  }
  function trackHpInput(){
    const hp=$q('#leOppHp480');if(!hp)return false;if(hp.dataset.wbHpTracking4107==='1')return true;
    hp.dataset.wbHpTracking4107='1';hp.dataset.wbHpSource=String(hp.value||'').trim()?'preexisting-manual':'unknown';
    hp.addEventListener('input',()=>{hp.dataset.wbHpSource=String(hp.value||'').trim()?'manual':'unknown'});return true;
  }
  function setStatus(msg,color='#9aa8bf'){const st=$q('#leStatus480');if(st){st.textContent=msg;st.style.color=color}}
  function installFill(){
    const b=$q('#leFill480'),hp=$q('#leOppHp480');if(!b||!hp)return false;trackHpInput();
    if(b.onclick!==hpHandler&&typeof b.onclick==='function')baseFill=b.onclick;
    if(!hpHandler)hpHandler=async e=>{
      if(b.disabled)return;
      if(typeof baseFill==='function')await baseFill.call(b,e);
      const ctx=currentContext(),source=hp.dataset.wbHpSource||'unknown',manual=source==='manual'||source==='preexisting-manual';
      b.disabled=true;setStatus('PP取得後、相手HPを確認中…','#cbd5e1');let result;
      try{result=await recognizeOpponentHp()}catch(err){result={accepted:false,reason:'exception',message:err?.message||String(err),side:opponentSide()}}finally{b.disabled=false}
      let applied=false,conflict=false;
      if(result.accepted){const n=Number(result.value);if(manual){const old=String(hp.value||'').trim(),m=old===''?null:Number(old);conflict=Number.isFinite(m)&&m!==n;setStatus(`PP取得完了。相手HP画像認識 ${n}。手入力HP ${Number.isFinite(m)?m:'?'} を保持します${conflict?'（画像認識値と不一致）':''}。`,conflict?'#facc15':'#86efac')}else{hp.value=String(n);hp.dataset.wbHpSource='image-hp-v4107';applied=true;setStatus(`PP取得完了。相手HP ${n} をリーダー盾画像から取得しました。`,'#86efac')}}
      else setStatus(`PP取得完了。相手HPは確信度不足のため自動入力していません（${result.reason||'unknown'}）。`,'#facc15');
      $q('#leCalc480')?.click();window.__wbHpState4107={patch:PATCH,at:new Date().toISOString(),context:ctx,result,applied,manualPreserved:manual,conflict};safeLog('hp-state-read-v4107',window.__wbHpState4107);
    };
    if(b.onclick!==hpHandler)b.onclick=hpHandler;b.textContent='動画位置からターン・PP・相手HP取得';b.dataset.wbState4107='1';return true;
  }
  function note(){const panel=$q('#lethalPanel480');if(!panel||$q('#leHpImageNote4107'))return false;const n=document.createElement('p');n.id='leHpImageNote4107';n.className='help';n.textContent='相手HPはリーダーの赤い盾が明瞭なフレームだけOCRします。3系統の前処理のうち2系統以上が同じ値で、別値との競合がない場合だけ自動入力します。';panel.appendChild(n);return true}
  function latestUi(){
    window.__wbUiFinalVersion='4.10.7';document.documentElement.dataset.wbLatestUi='4107';let s=$q('#wbUiFinal4107');if(!s){s=document.createElement('style');s.id='wbUiFinal4107';document.head.appendChild(s)}
    s.textContent="header h1::after{content:'シャドバWB リプレイ診断 v4.10.7' !important}header>p:first-of-type::after{content:'Build 2026.09.16-19 / PP + 相手HP状態取得' !important}";
    const st=$q('#wbUpdateStatus4104');if(st)st.textContent='v4.10.7 / PP + 相手HP状態取得';const old=$q('#wbForceLatest4104');
    if(old&&old.dataset.wb4107!=='1'){const b=old.cloneNode(true);b.dataset.wb4107='1';old.replaceWith(b);b.addEventListener('click',async()=>{const x=$q('#wbUpdateStatus4104');if(b.disabled)return;b.disabled=true;if(x)x.textContent='最新版を確認中…';try{if('serviceWorker'in navigator){const reg=await navigator.serviceWorker.register('./sw.js?v=4.10.7-20260916-19a',{updateViaCache:'none'});await reg.update()}if('caches'in window){const ks=await caches.keys();await Promise.all(ks.filter(k=>k.startsWith('wb-review-')&&k!=='wb-review-v4-10-7-20260916-31').map(k=>caches.delete(k)))}if(x)x.textContent='更新完了。v4.10.7で再起動します…';setTimeout(()=>{const u=new URL(location.href);u.searchParams.set('latest','4107-'+Date.now());u.hash='';location.replace(u.href)},180)}catch(err){if(x)x.textContent='更新確認に失敗しました。';b.disabled=false;safeLog('force-latest-error-v4107',{message:err?.message||String(err)})}})}
  }
  function verify(){const b=$q('#leFill480'),hp=$q('#leOppHp480');const state={mounted:!!b,handlerOk:!b||b.onclick===hpHandler,hpTracking:!hp||hp.dataset.wbHpTracking4107==='1',targetSide:targetSide(),patch:PATCH,checkedAt:new Date().toISOString()};state.ok=state.handlerOk&&state.hpTracking;window.__wbHpSafety4107=state;safeLog('hp-state-invariant-v4107',state);return state.ok}
  $q('#videoFile')?.addEventListener('change',()=>{const hp=$q('#leOppHp480');if(hp?.dataset?.wbHpSource==='image-hp-v4107'){hp.value='';hp.dataset.wbHpSource='unknown'}window.__wbHpState4107=null});
  let tries=0,ready=0;const tm=setInterval(()=>{tries++;latestUi();const ok=installFill();note();ready=ok?ready+1:0;if(tries%10===0)verify();if(ready>=12&&tries>60||tries>70)clearInterval(tm)},120);
  [100,500,1400,3000,5200,6500,7600,9000].forEach(ms=>setTimeout(()=>{latestUi();installFill();note();verify()},ms));
  window.__wbHpRecognizer4107={recognizeOpponentHp,verify,config:{...CFG},positions:JSON.parse(JSON.stringify(POS))};safeLog('patch-v4107-active',{feature:'opponent-hp-shield-consensus-ocr-on-demand'});
})();

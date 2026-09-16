(()=>{
  const PATCH='4.6.8-20260916-05';
  const $q=s=>document.querySelector(s);
  const safeLog=(type,data={})=>{try{log(type,{patch:PATCH,...data})}catch{}};
  const rgbToHsv=(r,g,b)=>{r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;let h=0;if(d){if(max===r)h=((g-b)/d)%6;else if(max===g)h=(b-r)/d+2;else h=(r-g)/d+4;h*=60;if(h<0)h+=360}return{h,s:max?d/max:0,v:max}};

  function disableLegacyExport(){
    const btn=$q('#exportJson');
    if(!btn)return false;
    const panel=btn.closest('.panel');
    btn.onclick=e=>{e?.preventDefault?.();const modern=$q('#fullMatchPanel465')||$q('#rangeReviewPanel462');modern?.scrollIntoView?.({behavior:'smooth',block:'start'});const st=$q('#status');if(st)st.textContent='旧 review-package-v4.3.1 出力は停止しました。下の「試合全体を短評」または範囲レビューを使用してください。';};
    if(panel){panel.style.display='none';panel.dataset.wbLegacyDisabled='1'}
    const full=$q('#fullMatchPanel465');
    if(full&&!$q('#modernExportNote468')){const n=document.createElement('p');n.id='modernExportNote468';n.className='help';n.textContent='公開情報トラッカーは、この試合全体ZIPの range-review.json に含まれます。旧 v4.3.1 ZIP出力は停止済みです。';full.querySelector('h2')?.insertAdjacentElement('afterend',n)}
    return true;
  }

  function fixedClassIcon(src){
    const cx=.848,cy=.108,ww=.036,hh=.078;
    const sx=Math.max(0,Math.round(src.width*(cx-ww/2))),sy=Math.max(0,Math.round(src.height*(cy-hh/2))),sw=Math.max(18,Math.round(src.width*ww)),sh=Math.max(18,Math.round(src.height*hh));
    const c=document.createElement('canvas');c.width=128;c.height=128;
    const x=c.getContext('2d',{willReadFrequently:true});
    x.drawImage(src,sx,sy,Math.min(sw,src.width-sx),Math.min(sh,src.height-sy),0,0,c.width,c.height);
    const d=x.getImageData(0,0,c.width,c.height).data;
    let n=0,satN=0,magenta=0,cyan=0,blue=0,edge=0,prev=null;
    for(let yy=26;yy<102;yy+=2){
      for(let xx=26;xx<102;xx+=2){
        const i=(yy*c.width+xx)*4,r=d[i],g=d[i+1],b=d[i+2],lum=.299*r+.587*g+.114*b,h=rgbToHsv(r,g,b);
        if(h.v<.18)continue;
        n++;
        if(h.s>.25&&h.v>.25){
          satN++;
          if(h.h>=315||h.h<=12)magenta++;
          if(h.h>=150&&h.h<=210)cyan++;
          if(h.h>210&&h.h<=290)blue++;
        }
        if(prev!==null&&Math.abs(lum-prev)>38)edge++;
        prev=lum;
      }
    }
    const q=v=>v/Math.max(1,satN),satRatio=satN/Math.max(1,n),magentaRatio=q(magenta),cyanRatio=q(cyan),blueRatio=q(blue),edgeRatio=edge/Math.max(1,n-1);
    let candidate='',confidence=0;
    if(cyanRatio>=.38&&cyanRatio>=blueRatio*1.18){candidate='ネメシス';confidence=Math.min(.98,.68+cyanRatio*.27+Math.min(.05,edgeRatio*.08));}
    else if(magentaRatio>=.42&&cyanRatio<.18){candidate='ナイトメア';confidence=Math.min(.98,.68+magentaRatio*.25+Math.min(.05,edgeRatio*.08));}
    else if(blueRatio>=.34&&blueRatio>=cyanRatio*1.15){candidate='ウィッチ';confidence=Math.min(.97,.66+blueRatio*.27+Math.min(.05,edgeRatio*.08));}
    return{candidate,confidence,canvas:c,cx,cy,satRatio,magentaRatio,cyanRatio,blueRatio,edgeRatio};
  }

  function iconLike(r){return !!r?.candidate&&r.confidence>=.60&&r.satRatio>=.18&&r.edgeRatio>=.018}
  function drawMark(c){const cv=$q('#classMark442');if(!cv||!c)return;const x=cv.getContext('2d');x.clearRect(0,0,cv.width,cv.height);x.imageSmoothingEnabled=false;x.drawImage(c,0,0,cv.width,cv.height)}
  async function seekSafe(t){const v=typeof video!=='undefined'?video:$q('#video');if(!v||!Number.isFinite(v.duration))throw new Error('動画未読込');t=Math.max(0,Math.min(v.duration-.05,t));if(Math.abs(v.currentTime-t)>.025){if(typeof seek==='function')await seek(t,'class-anchor-v468');else await new Promise((res,rej)=>{const done=()=>res();v.addEventListener('seeked',done,{once:true});v.currentTime=t;setTimeout(()=>rej(new Error('シーク失敗')),5000)})}await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))}
  const videoKey=()=>{const v=typeof video!=='undefined'?video:$q('#video');return v?.src?`${v.currentSrc||v.src}|${Number(v.duration||0).toFixed(3)}|${v.videoWidth||0}x${v.videoHeight||0}`:''};
  let rechecking=false,lastPreviewKey='',lastAnchorKey='';

  function applyDetection(r,time,source){
    const sel=$q('#classSelect442'),status=$q('#classStatus442'),old=window.classDetection442;const accepted=!!(r?.candidate&&r.confidence>=.60);
    drawMark(r?.canvas);
    if(accepted){
      if(sel)sel.value=r.candidate;
      const m=$q('#matchup');if(m&&(!m.value.trim()||m.value===old?.candidate))m.value=r.candidate;
    }else if(old?.accepted&&sel&&sel.value===old.candidate)sel.value='';
    window.classDetection442={patch:PATCH,accepted,candidate:accepted?r.candidate:'',confidence:+(r?.confidence||0).toFixed(3),cx:r?.cx??.848,cy:r?.cy??.108,magenta:+(r?.magentaRatio||0).toFixed(3),cyan:+(r?.cyanRatio||0).toFixed(3),blue:+(r?.blueRatio||0).toFixed(3),sat:+(r?.satRatio||0).toFixed(3),edge:+(r?.edgeRatio||0).toFixed(3),anchorTime:Number.isFinite(Number(time))?+Number(time).toFixed(3):null,anchorSource:source,method:'fixed-mulligan-notification-class-icon-v3'};
    if(accepted)window.classAnchor468={patch:PATCH,time:+Number(time).toFixed(3),candidate:r.candidate,confidence:+r.confidence.toFixed(3),source};
    else window.classAnchor468=null;
    if(status)status.textContent=accepted?`自動判定：${r.candidate}（通知アイコン ${Number(time).toFixed(1)}秒）。`:'自動判定は保留しました。未校正クラスは手動選択してください。';
    safeLog('class-detect-v468',window.classDetection442);
    return accepted;
  }

  async function scanEarlyClassAnchor(){
    const v=typeof video!=='undefined'?video:$q('#video');if(!v?.src||!Number.isFinite(v.duration))return null;
    const end=Math.min(15,Math.max(1,v.duration-.1)),samples=[];
    for(let t=1;t<=end+.001;t+=1){
      await seekSafe(t);
      const r=fixedClassIcon(frameCanvas(1500));
      samples.push({time:+t.toFixed(1),candidate:r.candidate,confidence:+r.confidence.toFixed(3),sat:+r.satRatio.toFixed(3),edge:+r.edgeRatio.toFixed(3)});
      if(iconLike(r))return{time:+t.toFixed(1),r,samples};
    }
    return{time:null,r:null,samples};
  }

  async function anchoredRecheck(force=false,turnAnchorTime=null){
    if(rechecking)return;
    const prev=window.mulliganPreview442,v=typeof video!=='undefined'?video:$q('#video'),status=$q('#classStatus442'),key=videoKey();
    if(!v?.src)return;
    if(!force&&key&&key===lastAnchorKey&&window.classDetection442?.accepted)return;
    rechecking=true;const original=v.currentTime;v.pause();if(status)status.textContent='通知内の固定クラスアイコンを時系列から確認中…';
    try{
      let found=null;
      if(Number.isFinite(Number(turnAnchorTime))){
        const t=Math.max(.5,Number(turnAnchorTime)-3.5);await seekSafe(t);const r=fixedClassIcon(frameCanvas(1500));if(iconLike(r))found={time:t,r,samples:[{time:+t.toFixed(2),source:'turn-minus-3.5'}]};
      }
      if(!found){const s=await scanEarlyClassAnchor();if(s?.r)found=s;else safeLog('class-anchor-scan-v468',{accepted:false,samples:s?.samples||[]});}
      if(!found&&prev&&Number.isFinite(Number(prev.time))){await seekSafe(Number(prev.time));const r=fixedClassIcon(frameCanvas(1500));if(iconLike(r))found={time:Number(prev.time),r,samples:[{time:Number(prev.time),source:'preview-fallback'}]};}
      if(found){applyDetection(found.r,found.time,found.samples?.[0]?.source==='turn-minus-3.5'?'turn-minus-3.5':'early-fixed-icon-scan-v1');safeLog('class-anchor-scan-v468',{accepted:window.classDetection442?.accepted,anchorTime:found.time,anchorSource:window.classDetection442?.anchorSource,samples:found.samples||[]});}
      else applyDetection(null,null,'none');
      lastAnchorKey=key;
    }catch(e){if(status)status.textContent='クラス再判定失敗：'+(e?.message||String(e));safeLog('class-anchor-error-v468',{message:e?.message||String(e)})}
    finally{try{await seekSafe(original)}catch{}rechecking=false}
  }

  function replaceRecheckButton(){const old=$q('#classRecheck464');if(!old||old.dataset.wb468==='1')return false;const b=old.cloneNode(true);b.dataset.wb468='1';b.textContent='クラスアイコンを再判定';old.replaceWith(b);b.addEventListener('click',()=>anchoredRecheck(true));return true}

  function installLatestUpdater(){
    const old=$q('#wbForceLatest463');if(!old||old.dataset.wb468==='1')return false;const b=old.cloneNode(true);b.dataset.wb468='1';old.replaceWith(b);const st=$q('#wbUpdateStatus463');if(st)st.textContent='v4.6.8 / クラス判定・旧ZIP出力修正';
    b.addEventListener('click',async()=>{if(b.disabled)return;b.disabled=true;if(st)st.textContent='最新版を確認中…';try{if('serviceWorker'in navigator){const reg=await navigator.serviceWorker.register('./sw.js?v=4.6.8-20260916-05',{updateViaCache:'none'});await reg.update()}if(st)st.textContent='更新完了。クラスアイコン固定版で再起動します…';setTimeout(()=>{const u=new URL(location.href);u.searchParams.set('latest','46805-'+Date.now());u.hash='';location.replace(u.href)},180)}catch(e){if(st)st.textContent='更新確認に失敗しました。通信を確認してください。';b.disabled=false;safeLog('force-latest-error-v468',{message:e?.message||String(e)})}});return true;
  }

  let tries=0;const tm=setInterval(()=>{tries++;disableLegacyExport();replaceRecheckButton();installLatestUpdater();if(tries>100)clearInterval(tm)},150);
  const watch=setInterval(()=>{const p=window.mulliganPreview442,still=$q('#mulliganStill442');if(!p||!still?.src)return;const key=`${p.time}|${still.src.length}`;if(key!==lastPreviewKey){lastPreviewKey=key;setTimeout(()=>anchoredRecheck(false),350)}},450);
  setTimeout(()=>clearInterval(watch),120000);
  document.addEventListener('click',e=>{if(e.target?.closest?.('#previewMulligan442'))setTimeout(()=>anchoredRecheck(true),2200)},true);
  window.addEventListener('wb-turn-timeline-ready',e=>{const t=Number(e?.detail?.firstTurnTime);if(Number.isFinite(t)&&!window.classDetection442?.accepted)setTimeout(()=>anchoredRecheck(true,t),120)});
  $q('#videoFile')?.addEventListener('change',()=>{lastAnchorKey='';window.classAnchor468=null});

  const header=$q('header h1'),sub=$q('header p');if(header)header.textContent='シャドバWB リプレイ診断 v4.6.8';if(sub)sub.textContent='Build 2026.09.16-05 / 固定クラスアイコン時系列アンカー';
  safeLog('patch-v468-active',{feature:'fixed-class-icon-early-scan-anchor-v3'});
})();
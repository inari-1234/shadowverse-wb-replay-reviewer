(()=>{
  const PATCH='4.6.8-20260915-03';
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

  function cropStats(src,cx,cy,ww=.050,hh=.095){
    const sx=Math.max(0,Math.round(src.width*(cx-ww/2))),sy=Math.max(0,Math.round(src.height*(cy-hh/2))),sw=Math.max(18,Math.round(src.width*ww)),sh=Math.max(18,Math.round(src.height*hh));
    const c=document.createElement('canvas');c.width=128;c.height=128;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(src,sx,sy,Math.min(sw,src.width-sx),Math.min(sh,src.height-sy),0,0,c.width,c.height);
    const d=x.getImageData(0,0,c.width,c.height).data;let allN=0,allNight=0,allBlue=0,centerN=0,centerNight=0,centerBlue=0,outerN=0,outerNight=0,outerBlue=0,edge=0,prev=null;
    for(let yy=0;yy<c.height;yy+=2){for(let xx=0;xx<c.width;xx+=2){const i=(yy*c.width+xx)*4,r=d[i],g=d[i+1],b=d[i+2],lum=.299*r+.587*g+.114*b,h=rgbToHsv(r,g,b);if(h.v<.14)continue;const isCenter=xx>=32&&xx<96&&yy>=32&&yy<96;const isNight=h.s>.28&&h.v>.27&&(h.h>=315||h.h<=20);const isBlue=h.s>.24&&h.v>.28&&h.h>=185&&h.h<=285;allN++;if(isNight)allNight++;if(isBlue)allBlue++;if(isCenter){centerN++;if(isNight)centerNight++;if(isBlue)centerBlue++}else{outerN++;if(isNight)outerNight++;if(isBlue)outerBlue++}if(prev!==null&&Math.abs(lum-prev)>42)edge++;prev=lum}}
    const q=(a,b)=>a/Math.max(1,b),centerNightRatio=q(centerNight,centerN),outerNightRatio=q(outerNight,outerN),centerBlueRatio=q(centerBlue,centerN),outerBlueRatio=q(outerBlue,outerN),nightRatio=q(allNight,allN),blueRatio=q(allBlue,allN),edgeRatio=q(edge,Math.max(1,allN-1));
    const nightmareScore=centerNightRatio*1.9+(centerNightRatio-outerNightRatio)*1.25+nightRatio*.35+Math.min(1,edgeRatio/.22)*.12;
    const witchScore=centerBlueRatio*1.9+(centerBlueRatio-outerBlueRatio)*1.25+blueRatio*.35+Math.min(1,edgeRatio/.22)*.12;
    return{canvas:c,centerNightRatio,outerNightRatio,centerBlueRatio,outerBlueRatio,nightRatio,blueRatio,edgeRatio,nightmareScore,witchScore};
  }

  function anchoredSearch(src){
    // マリガン時の「相手が引き直しました」通知内クラスアイコンをアンカーにする。
    // 実フレームで Nightmare アイコン中心はおよそ x=.848, y=.109。
    let bestN=null,bestW=null;
    for(let cy=.082;cy<=.136;cy+=.006){for(let cx=.820;cx<=.884;cx+=.006){const s=cropStats(src,cx,cy),row={...s,cx:+cx.toFixed(3),cy:+cy.toFixed(3)};if(!bestN||row.nightmareScore>bestN.nightmareScore)bestN=row;if(!bestW||row.witchScore>bestW.witchScore)bestW=row}}
    const nOK=bestN&&bestN.centerNightRatio>=.18&&(bestN.centerNightRatio-bestN.outerNightRatio)>=.07&&bestN.nightmareScore>=.42;
    const wOK=bestW&&bestW.centerBlueRatio>=.16&&(bestW.centerBlueRatio-bestW.outerBlueRatio)>=.06&&bestW.witchScore>=.40;
    if(nOK&&(!wOK||bestN.nightmareScore>bestW.witchScore*1.04))return{candidate:'ナイトメア',best:bestN,confidence:Math.min(.97,.60+bestN.centerNightRatio*.65+(bestN.centerNightRatio-bestN.outerNightRatio)*.35)};
    if(wOK)return{candidate:'ウィッチ',best:bestW,confidence:Math.min(.97,.60+bestW.centerBlueRatio*.65+(bestW.centerBlueRatio-bestW.outerBlueRatio)*.35)};
    const best=(bestN?.nightmareScore||0)>=(bestW?.witchScore||0)?bestN:bestW;return{candidate:'',best,confidence:0};
  }

  function drawMark(c){const cv=$q('#classMark442');if(!cv||!c)return;const x=cv.getContext('2d');x.clearRect(0,0,cv.width,cv.height);x.imageSmoothingEnabled=false;x.drawImage(c,0,0,cv.width,cv.height)}
  async function seekSafe(t){const v=typeof video!=='undefined'?video:$q('#video');if(!v||!Number.isFinite(v.duration))throw new Error('動画未読込');t=Math.max(0,Math.min(v.duration-.05,t));if(Math.abs(v.currentTime-t)>.025){if(typeof seek==='function')await seek(t,'class-anchor-v468');else await new Promise((res,rej)=>{const done=()=>res();v.addEventListener('seeked',done,{once:true});v.currentTime=t;setTimeout(()=>rej(new Error('シーク失敗')),5000)})}await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))}
  let rechecking=false,lastPreviewKey='';
  async function anchoredRecheck(){
    if(rechecking)return;const prev=window.mulliganPreview442,v=typeof video!=='undefined'?video:$q('#video'),sel=$q('#classSelect442'),status=$q('#classStatus442');if(!prev||!Number.isFinite(Number(prev.time))||!v?.src)return;
    rechecking=true;const original=v.currentTime;v.pause();if(status)status.textContent='通知内のクラスアイコン位置を基準に再判定中…';
    try{await seekSafe(Number(prev.time));const src=frameCanvas(1500),r=anchoredSearch(src),b=r.best;if(b?.canvas)drawMark(b.canvas);const old=window.classDetection442;let accepted=false;if(r.candidate&&r.confidence>=.60){accepted=true;if(sel)sel.value=r.candidate;const m=$q('#matchup');if(m&&(!m.value.trim()||m.value===old?.candidate))m.value=r.candidate}
      window.classDetection442={patch:PATCH,accepted,candidate:accepted?r.candidate:'',confidence:+(r.confidence||0).toFixed(3),cx:b?.cx??null,cy:b?.cy??null,nightmareCenter:+(b?.centerNightRatio||0).toFixed(3),nightmareOuter:+(b?.outerNightRatio||0).toFixed(3),witchCenter:+(b?.centerBlueRatio||0).toFixed(3),witchOuter:+(b?.outerBlueRatio||0).toFixed(3),method:'anchored-mulligan-notification-class-icon'};
      if(status)status.textContent=accepted?`自動判定：${r.candidate}（クラスアイコン中心 x=${b.cx}, y=${b.cy}）。表示された切り出しがアイコン本体です。`:'自動判定は保留しました。切り出しがクラスアイコン本体か確認し、必要なら手動選択してください。';safeLog('class-detect-v468',window.classDetection442);
    }catch(e){if(status)status.textContent='クラス再判定失敗：'+(e?.message||String(e));safeLog('class-anchor-error-v468',{message:e?.message||String(e)})}finally{try{await seekSafe(original)}catch{}rechecking=false}
  }

  function replaceRecheckButton(){const old=$q('#classRecheck464');if(!old||old.dataset.wb468==='1')return false;const b=old.cloneNode(true);b.dataset.wb468='1';b.textContent='クラスアイコンを再判定';old.replaceWith(b);b.addEventListener('click',anchoredRecheck);return true}

  function installLatestUpdater(){
    const old=$q('#wbForceLatest463');if(!old||old.dataset.wb468==='1')return false;const b=old.cloneNode(true);b.dataset.wb468='1';old.replaceWith(b);const st=$q('#wbUpdateStatus463');if(st)st.textContent='v4.6.8 / クラス判定・旧ZIP出力修正';
    b.addEventListener('click',async()=>{if(b.disabled)return;b.disabled=true;if(st)st.textContent='最新版を確認中…';try{if('serviceWorker'in navigator){const reg=await navigator.serviceWorker.register('./sw.js?v=4.6.8-20260915-03',{updateViaCache:'none'});await reg.update()}if('caches'in window){const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('wb-review-')&&k!=='wb-review-v4-6-8-20260915-03').map(k=>caches.delete(k)))}if(st)st.textContent='更新完了。v4.6.8で再起動します…';setTimeout(()=>{const u=new URL(location.href);u.searchParams.set('latest','468-'+Date.now());u.hash='';location.replace(u.href)},180)}catch(e){if(st)st.textContent='更新確認に失敗しました。通信を確認してください。';b.disabled=false;safeLog('force-latest-error-v468',{message:e?.message||String(e)})}});return true;
  }

  let tries=0;const tm=setInterval(()=>{tries++;disableLegacyExport();replaceRecheckButton();installLatestUpdater();if(tries>100)clearInterval(tm)},150);
  const watch=setInterval(()=>{const p=window.mulliganPreview442,still=$q('#mulliganStill442');if(!p||!still?.src)return;const key=`${p.time}|${still.src.length}`;if(key!==lastPreviewKey){lastPreviewKey=key;setTimeout(anchoredRecheck,450)}},450);
  setTimeout(()=>clearInterval(watch),120000);
  document.addEventListener('click',e=>{if(e.target?.closest?.('#previewMulligan442'))setTimeout(anchoredRecheck,2200)},true);

  const header=$q('header h1'),sub=$q('header p');if(header)header.textContent='シャドバWB リプレイ診断 v4.6.8';if(sub)sub.textContent='Build 2026.09.15-03 / クラスアイコン固定アンカー + 旧ZIP出力停止';
  safeLog('patch-v468-active',{feature:'anchored-class-detection-and-disable-legacy-export'});
})();
(()=>{
  const PATCH='4.6.8-20260915-04';
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
    // The class icon inside the mulligan notification is fixed by the game UI.
    // Previous local-search code drifted toward colorful card art/background and
    // repeatedly selected a point left/up from the real mark. Use the actual icon
    // center measured on both benchmark recordings instead of maximizing color score.
    const cx=.848,cy=.108,ww=.036,hh=.078;
    const sx=Math.max(0,Math.round(src.width*(cx-ww/2))),sy=Math.max(0,Math.round(src.height*(cy-hh/2))),sw=Math.max(18,Math.round(src.width*ww)),sh=Math.max(18,Math.round(src.height*hh));
    const c=document.createElement('canvas');c.width=128;c.height=128;
    const x=c.getContext('2d',{willReadFrequently:true});
    x.drawImage(src,sx,sy,Math.min(sw,src.width-sx),Math.min(sh,src.height-sy),0,0,c.width,c.height);
    const d=x.getImageData(0,0,c.width,c.height).data;
    let n=0,satN=0,magenta=0,cyan=0,blue=0,edge=0,prev=null;
    // Analyze only the central symbol/ring. The notification panel around it is brown/red.
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
    // Calibrated classes only. Unknown colors are deliberately left unconfirmed.
    if(cyanRatio>=.38&&cyanRatio>=blueRatio*1.18){candidate='ネメシス';confidence=Math.min(.98,.68+cyanRatio*.27+Math.min(.05,edgeRatio*.08));}
    else if(magentaRatio>=.42&&cyanRatio<.18){candidate='ナイトメア';confidence=Math.min(.98,.68+magentaRatio*.25+Math.min(.05,edgeRatio*.08));}
    else if(blueRatio>=.34&&blueRatio>=cyanRatio*1.15){candidate='ウィッチ';confidence=Math.min(.97,.66+blueRatio*.27+Math.min(.05,edgeRatio*.08));}
    return{candidate,confidence,canvas:c,cx,cy,satRatio,magentaRatio,cyanRatio,blueRatio,edgeRatio};
  }

  function drawMark(c){const cv=$q('#classMark442');if(!cv||!c)return;const x=cv.getContext('2d');x.clearRect(0,0,cv.width,cv.height);x.imageSmoothingEnabled=false;x.drawImage(c,0,0,cv.width,cv.height)}
  async function seekSafe(t){const v=typeof video!=='undefined'?video:$q('#video');if(!v||!Number.isFinite(v.duration))throw new Error('動画未読込');t=Math.max(0,Math.min(v.duration-.05,t));if(Math.abs(v.currentTime-t)>.025){if(typeof seek==='function')await seek(t,'class-anchor-v468');else await new Promise((res,rej)=>{const done=()=>res();v.addEventListener('seeked',done,{once:true});v.currentTime=t;setTimeout(()=>rej(new Error('シーク失敗')),5000)})}await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))}
  let rechecking=false,lastPreviewKey='';
  async function anchoredRecheck(){
    if(rechecking)return;
    const prev=window.mulliganPreview442,v=typeof video!=='undefined'?video:$q('#video'),sel=$q('#classSelect442'),status=$q('#classStatus442');
    if(!prev||!Number.isFinite(Number(prev.time))||!v?.src)return;
    rechecking=true;const original=v.currentTime;v.pause();if(status)status.textContent='通知内の固定クラスアイコン位置を確認中…';
    try{
      await seekSafe(Number(prev.time));
      const src=frameCanvas(1500),r=fixedClassIcon(src);
      drawMark(r.canvas);
      const old=window.classDetection442;let accepted=false;
      if(r.candidate&&r.confidence>=.60){
        accepted=true;
        if(sel)sel.value=r.candidate;
        const m=$q('#matchup');if(m&&(!m.value.trim()||m.value===old?.candidate))m.value=r.candidate;
      }else if(old?.accepted&&sel&&sel.value===old.candidate){
        // Do not keep a wrong automatic class from the legacy broad-area search.
        sel.value='';
      }
      window.classDetection442={patch:PATCH,accepted,candidate:accepted?r.candidate:'',confidence:+(r.confidence||0).toFixed(3),cx:r.cx,cy:r.cy,magenta:+r.magentaRatio.toFixed(3),cyan:+r.cyanRatio.toFixed(3),blue:+r.blueRatio.toFixed(3),sat:+r.satRatio.toFixed(3),method:'fixed-mulligan-notification-class-icon-v2'};
      if(status)status.textContent=accepted?`自動判定：${r.candidate}（クラスアイコン固定中心 x=${r.cx}, y=${r.cy}）。表示された切り出しがアイコン本体です。`:'自動判定は保留しました。表示された切り出しはクラスアイコン本体です。未校正クラスは手動選択してください。';
      safeLog('class-detect-v468',window.classDetection442);
    }catch(e){if(status)status.textContent='クラス再判定失敗：'+(e?.message||String(e));safeLog('class-anchor-error-v468',{message:e?.message||String(e)})}
    finally{try{await seekSafe(original)}catch{}rechecking=false}
  }

  function replaceRecheckButton(){const old=$q('#classRecheck464');if(!old||old.dataset.wb468==='1')return false;const b=old.cloneNode(true);b.dataset.wb468='1';b.textContent='クラスアイコンを再判定';old.replaceWith(b);b.addEventListener('click',anchoredRecheck);return true}

  function installLatestUpdater(){
    const old=$q('#wbForceLatest463');if(!old||old.dataset.wb468==='1')return false;const b=old.cloneNode(true);b.dataset.wb468='1';old.replaceWith(b);const st=$q('#wbUpdateStatus463');if(st)st.textContent='v4.6.8 / クラス判定・旧ZIP出力修正';
    b.addEventListener('click',async()=>{if(b.disabled)return;b.disabled=true;if(st)st.textContent='最新版を確認中…';try{if('serviceWorker'in navigator){const reg=await navigator.serviceWorker.register('./sw.js?v=4.6.8-20260915-04',{updateViaCache:'none'});await reg.update()}if('caches'in window){const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('wb-review-')&&k!=='wb-review-v4-6-8-20260915-04').map(k=>caches.delete(k)))}if(st)st.textContent='更新完了。クラスアイコン固定版で再起動します…';setTimeout(()=>{const u=new URL(location.href);u.searchParams.set('latest','46804-'+Date.now());u.hash='';location.replace(u.href)},180)}catch(e){if(st)st.textContent='更新確認に失敗しました。通信を確認してください。';b.disabled=false;safeLog('force-latest-error-v468',{message:e?.message||String(e)})}});return true;
  }

  let tries=0;const tm=setInterval(()=>{tries++;disableLegacyExport();replaceRecheckButton();installLatestUpdater();if(tries>100)clearInterval(tm)},150);
  const watch=setInterval(()=>{const p=window.mulliganPreview442,still=$q('#mulliganStill442');if(!p||!still?.src)return;const key=`${p.time}|${still.src.length}`;if(key!==lastPreviewKey){lastPreviewKey=key;setTimeout(anchoredRecheck,450)}},450);
  setTimeout(()=>clearInterval(watch),120000);
  document.addEventListener('click',e=>{if(e.target?.closest?.('#previewMulligan442'))setTimeout(anchoredRecheck,2200)},true);

  const header=$q('header h1'),sub=$q('header p');if(header)header.textContent='シャドバWB リプレイ診断 v4.6.8';if(sub)sub.textContent='Build 2026.09.15-04 / クラスアイコン固定位置 + ネメシス判定';
  safeLog('patch-v468-active',{feature:'fixed-class-icon-anchor-v2-nightmare-witch-nemesis'});
})();
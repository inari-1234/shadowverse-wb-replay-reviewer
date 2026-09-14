(()=>{
  const PATCH='4.6.4-20260914-31';
  const $q=s=>document.querySelector(s);
  const safeLog=(type,data={})=>{try{log(type,{patch:PATCH,...data})}catch{}};
  const rgbToHsv=(r,g,b)=>{r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;let h=0;if(d){if(max===r)h=((g-b)/d)%6;else if(max===g)h=(b-r)/d+2;else h=(r-g)/d+4;h*=60;if(h<0)h+=360}return{h,s:max?d/max:0,v:max}};

  function cropStats(src,cx,cy,ww=.040,hh=.075){
    const sx=Math.max(0,Math.round(src.width*(cx-ww/2))),sy=Math.max(0,Math.round(src.height*(cy-hh/2))),sw=Math.max(18,Math.round(src.width*ww)),sh=Math.max(18,Math.round(src.height*hh));
    const c=document.createElement('canvas');c.width=112;c.height=112;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(src,sx,sy,Math.min(sw,src.width-sx),Math.min(sh,src.height-sy),0,0,c.width,c.height);
    const d=x.getImageData(0,0,c.width,c.height).data;let n=0,sat=0,blue=0,night=0,sum=0,sum2=0,edge=0,prev=null,centerNight=0,centerN=0;
    for(let yy=0;yy<c.height;yy+=2){for(let xx=0;xx<c.width;xx+=2){const i=(yy*c.width+xx)*4,r=d[i],g=d[i+1],b=d[i+2],lum=.299*r+.587*g+.114*b,h=rgbToHsv(r,g,b);if(h.v<.14)continue;n++;sum+=lum;sum2+=lum*lum;if(h.s>.22&&h.v>.24)sat++;if(h.s>.24&&h.v>.28&&h.h>=185&&h.h<=285)blue++;const isNight=h.s>.28&&h.v>.27&&(h.h>=325||h.h<=28);if(isNight)night++;if(xx>28&&xx<84&&yy>28&&yy<84){centerN++;if(isNight)centerNight++}if(prev!==null&&Math.abs(lum-prev)>38)edge++;prev=lum}}
    const den=Math.max(1,n),std=Math.sqrt(Math.max(0,sum2/den-(sum/den)**2)),satRatio=sat/den,blueRatio=blue/den,nightRatio=night/den,centerNightRatio=centerNight/Math.max(1,centerN),edgeRatio=edge/Math.max(1,n-1);
    const witchScore=blueRatio*2.55+satRatio*.16+Math.min(1,std/64)*.16+Math.min(1,edgeRatio/.25)*.12;
    const nightmareScore=nightRatio*2.65+centerNightRatio*.45+satRatio*.15+Math.min(1,std/64)*.15+Math.min(1,edgeRatio/.25)*.10;
    return{canvas:c,blueRatio,satRatio,nightRatio,centerNightRatio,std,edgeRatio,witchScore,nightmareScore};
  }
  function broadSearch(src){
    let bestW=null,bestN=null;
    for(let cy=.055;cy<=.205;cy+=.010){for(let cx=.775;cx<=.965;cx+=.008){const s=cropStats(src,cx,cy);const row={...s,cx:+cx.toFixed(3),cy:+cy.toFixed(3)};if(!bestW||row.witchScore>bestW.witchScore)bestW=row;if(!bestN||row.nightmareScore>bestN.nightmareScore)bestN=row}}
    const wOK=bestW&&bestW.blueRatio>=.072&&bestW.satRatio>=.15&&bestW.witchScore>=.38;
    const nOK=bestN&&bestN.nightRatio>=.060&&bestN.centerNightRatio>=.050&&bestN.satRatio>=.15&&bestN.nightmareScore>=.34;
    let candidate='',best=null,confidence=0;
    if(wOK||nOK){if(nOK&&(!wOK||bestN.nightmareScore>bestW.witchScore*1.06)){candidate='ナイトメア';best=bestN;confidence=Math.min(.97,.52+bestN.nightRatio*2.2+bestN.centerNightRatio*.9)}else{candidate='ウィッチ';best=bestW;confidence=Math.min(.97,.52+bestW.blueRatio*2.4+bestW.satRatio*.16)}}
    return{candidate,confidence:+confidence.toFixed(3),best,bestW,bestN};
  }
  function drawMark(c){const cv=$q('#classMark442');if(!cv||!c)return;const x=cv.getContext('2d');x.clearRect(0,0,cv.width,cv.height);x.imageSmoothingEnabled=false;x.drawImage(c,0,0,cv.width,cv.height)}
  async function seekSafe(t){const v=typeof video!=='undefined'?video:$q('#video');if(!v||!Number.isFinite(v.duration))throw new Error('動画未読込');t=Math.max(0,Math.min(v.duration-.05,t));if(Math.abs(v.currentTime-t)>.025){if(typeof seek==='function')await seek(t,'class-recheck-v464');else await new Promise((res,rej)=>{const done=()=>res();v.addEventListener('seeked',done,{once:true});v.currentTime=t;setTimeout(()=>rej(new Error('シーク失敗')),5000)})}await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))}
  async function recheck(){
    const prev=window.mulliganPreview442,sel=$q('#classSelect442'),status=$q('#classStatus442'),v=typeof video!=='undefined'?video:$q('#video');if(!prev||!Number.isFinite(Number(prev.time))||!v?.src)return;
    const existing=window.classDetection442;if(existing?.accepted&&existing?.candidate==='ウィッチ'){safeLog('class-recheck-skip-v464',{reason:'existing-witch-accepted'});return}
    const original=v.currentTime;v.pause();if(status)status.textContent='クラスマークを右側まで広く再探索中…';
    try{await seekSafe(Number(prev.time));const src=frameCanvas(1500),r=broadSearch(src),b=r.best;if(b?.canvas)drawMark(b.canvas);let accepted=false;if(r.candidate&&r.confidence>=.60){accepted=true;if(sel)sel.value=r.candidate;const m=$q('#matchup');if(m&&!m.value.trim())m.value=r.candidate}
      window.classDetection442={patch:PATCH,accepted,candidate:accepted?r.candidate:'',confidence:r.confidence,cx:b?.cx??null,cy:b?.cy??null,blueRatio:+(b?.blueRatio||0).toFixed(3),nightmareRatio:+(b?.nightRatio||0).toFixed(3),satRatio:+(b?.satRatio||0).toFixed(3),method:'expanded-right-search; witch+nightmare-calibrated'};
      if(status)status.textContent=accepted?`自動判定：${r.candidate}（マーク中心 x=${b.cx}, y=${b.cy}）。`:'自動判定は保留しました。表示された切り出しを確認してください。';safeLog('class-detect-v464',window.classDetection442);
    }catch(e){if(status)status.textContent='クラス再探索失敗：'+(e?.message||String(e));safeLog('class-recheck-error-v464',{message:e?.message||String(e)})}finally{try{await seekSafe(original)}catch{}}
  }
  function mount(){const panel=$q('#mulliganClassPanel44');if(!panel)return false;let btn=$q('#classRecheck464');if(!btn){const row=panel.querySelector('.buttons')||panel;btn=document.createElement('button');btn.id='classRecheck464';btn.type='button';btn.textContent='クラスマークを広範囲再探索';btn.addEventListener('click',recheck);row.appendChild(btn)}return true}
  let tries=0;const timer=setInterval(()=>{tries++;if(mount()||tries>80)clearInterval(timer)},150);document.addEventListener('click',e=>{if(e.target?.closest?.('#previewMulligan442'))setTimeout(recheck,1300)},true);
  const header=$q('header h1'),sub=$q('header p');if(header)header.textContent='シャドバWB リプレイ診断 v4.6.4';if(sub)sub.textContent='Build 2026.09.14-31 / ナイトメアのクラスマーク位置・色判定を追加';
  setTimeout(recheck,1800);safeLog('patch-v464-active',{feature:'nightmare-class-detection'});
})();
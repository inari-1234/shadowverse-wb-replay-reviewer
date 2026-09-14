(()=>{
  const PATCH='4.4.3-20260914-21';
  const $q=s=>document.querySelector(s);
  const header=$q('header h1'),sub=$q('header p');
  if(header) header.textContent='シャドバWB リプレイ診断 v4.4.3';
  if(sub) sub.textContent='Build 2026.09.14-21 / マリガン確定 + クラスマーク表示補正';

  function rgbToHsv(r,g,b){
    r/=255;g/=255;b/=255;
    const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;
    let h=0;
    if(d){
      if(max===r)h=((g-b)/d)%6;
      else if(max===g)h=(b-r)/d+2;
      else h=(r-g)/d+4;
      h*=60;if(h<0)h+=360;
    }
    return {h,s:max?d/max:0,v:max};
  }

  function recenterDisplayedMark(){
    const c=$q('#classMark442');
    const det=window.classDetection442;
    const mull=window.mulliganPreview442;
    if(!c||!det||!det.accepted)return false;
    const key=[videoName||'',mull?.time??'',det.cx??'',det.cy??'',det.confidence??''].join('|');
    if(c.dataset.recenter443===key)return true;

    const src=document.createElement('canvas');src.width=c.width;src.height=c.height;
    const sx=src.getContext('2d',{willReadFrequently:true});sx.drawImage(c,0,0);
    const im=sx.getImageData(0,0,src.width,src.height),d=im.data;
    let minX=src.width,minY=src.height,maxX=-1,maxY=-1,n=0;
    for(let y=0;y<src.height;y++)for(let x=0;x<src.width;x++){
      const i=(y*src.width+x)*4,h=rgbToHsv(d[i],d[i+1],d[i+2]);
      if(h.s>.22&&h.v>.28&&h.h>=180&&h.h<=300){
        minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);n++;
      }
    }
    if(n<40||maxX<minX||maxY<minY){c.dataset.recenter443=key;return false;}

    const bw=maxX-minX+1,bh=maxY-minY+1,cx=(minX+maxX)/2,cy=(minY+maxY)/2;
    let side=Math.max(bw,bh)*1.45;
    side=Math.max(52,Math.min(side,Math.min(src.width,src.height)));
    let x0=cx-side/2,y0=cy-side/2;
    x0=Math.max(0,Math.min(src.width-side,x0));
    y0=Math.max(0,Math.min(src.height-side,y0));

    const ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.imageSmoothingEnabled=true;
    ctx.drawImage(src,x0,y0,side,side,0,0,c.width,c.height);
    c.dataset.recenter443=key;

    const st=$q('#classStatus442');
    if(st&&det.candidate==='ウィッチ')st.textContent=`自動判定：ウィッチ。表示画像だけマーク中央へ補正しました（認識ロジックはv4.4.2のまま）。`;
    try{log('class-mark-display-recenter-v443',{patch:PATCH,pixels:n,bounds:{minX,minY,maxX,maxY},crop:{x:+x0.toFixed(1),y:+y0.toFixed(1),side:+side.toFixed(1)}})}catch{}
    return true;
  }

  let tries=0,last='';
  const timer=setInterval(()=>{
    tries++;
    const det=window.classDetection442,mull=window.mulliganPreview442;
    const key=det?[mull?.time??'',det.cx??'',det.cy??'',det.confidence??''].join('|'):'';
    if(key&&key!==last){last=key;setTimeout(recenterDisplayedMark,80)}
    if(tries>180)clearInterval(timer);
  },250);

  $q('#previewMulligan442')?.addEventListener('click',()=>{const c=$q('#classMark442');if(c)delete c.dataset.recenter443;last='';});
  $q('#videoFile')?.addEventListener('change',()=>{const c=$q('#classMark442');if(c)delete c.dataset.recenter443;last='';});

  try{log('patch-v443-active',{patch:PATCH,scope:'display-only'})}catch{}
})();
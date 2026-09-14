(()=>{
  const PATCH='3.7.1-20260914-08';
  const $q=s=>document.querySelector(s);
  const defaults=()=>({top:{x:.8886,y:.2920},bottom:{x:.8837,y:.6005}});

  const header=$q('header h1'),sub=$q('header p');
  if(header) header.textContent='シャドバWB リプレイ診断 v3.7.1';
  if(sub) sub.textContent='Build 2026.09.14-08 / 解析ボタン有効化修正';

  function ensurePoints(){
    if(!points||!points.top||!points.bottom) points=defaults();
  }
  function refreshScanButton(reason){
    ensurePoints();
    const btn=$q('#scanTurns');
    if(!btn) return;
    const ready=!!(video && video.src && isFinite(video.duration) && video.duration>0 && points.top && points.bottom);
    btn.disabled=!ready;
    if(ready){
      const s=$q('#calStatus37');
      if(s && reason) s.textContent='位置調整済みです。「ターン自動解析を開始」を押せます。';
    }
    try{log('scan-button-state-v371',{reason,ready,hasVideo:!!video?.src,duration:isFinite(video?.duration)?video.duration:null,points})}catch{}
  }

  // Base v3.4 resets points and disables the scan button when a video is selected.
  // Run after that handler and restore v3.7 defaults/current points.
  $q('#videoFile')?.addEventListener('change',()=>{
    setTimeout(()=>{
      ensurePoints();
      refreshScanButton('video-file-change');
    },0);
  });

  video?.addEventListener('loadedmetadata',()=>{
    ensurePoints();
    refreshScanButton('loadedmetadata');
  });

  $q('#drawCal37')?.addEventListener('click',()=>refreshScanButton('draw-calibration'));
  $q('#resetCal37')?.addEventListener('click',()=>setTimeout(()=>refreshScanButton('reset-calibration'),0));
  document.querySelectorAll('[data-nudge]').forEach(b=>b.addEventListener('click',()=>setTimeout(()=>refreshScanButton('nudge'),0)));

  // If the page is already loaded with a video, fix state immediately.
  setTimeout(()=>refreshScanButton('patch-load'),0);
  try{log('patch-v371-active',{patch:PATCH})}catch{}
})();
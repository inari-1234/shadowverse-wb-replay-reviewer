(()=>{
  const run=()=>{
    const video=document.querySelector('#video');
    const scan=document.querySelector('#scan');
    const turnAnchor=document.querySelector('#turnAnchor');
    const markTurn=document.querySelector('#markTurn');
    const status=document.querySelector('#status');
    const header=document.querySelector('header h1');
    if(header) header.textContent='シャドバWB リプレイ診断 v3.2';

    const panel=turnAnchor?.closest('.panel');
    if(panel && !document.querySelector('#turnNotice')){
      const p=document.createElement('p');
      p.id='turnNotice';
      p.className='warn';
      p.textContent='重要：「4」と入力しただけでは4ターン目を自動検索しません。動画を4Tの画面まで移動してから「現在位置をこのターンとして登録」を押してください。';
      panel.insertBefore(p, panel.querySelector('.grid'));
    }

    if(scan && typeof scan.onclick==='function' && !scan.dataset.v32Patched){
      const originalScan=scan.onclick;
      scan.dataset.v32Patched='1';
      scan.onclick=async function(ev){
        const restoreTime=Number.isFinite(video?.currentTime)?video.currentTime:0;
        try{
          await originalScan.call(this,ev);
        } finally {
          if(video && Number.isFinite(restoreTime)){
            video.currentTime=Math.max(0,Math.min(video.duration||restoreTime,restoreTime));
          }
        }
      };
    }

    if(markTurn && !markTurn.dataset.v32Patched){
      const originalMark=markTurn.onclick;
      markTurn.dataset.v32Patched='1';
      markTurn.onclick=async function(ev){
        if(status) status.textContent=`${turnAnchor?.value||''}Tとして、現在表示中の ${format(video?.currentTime||0)} を登録します。`;
        return originalMark?.call(this,ev);
      };
    }
  };

  function format(sec){
    const m=Math.floor(sec/60),s=(sec-m*60).toFixed(1).padStart(4,'0');
    return String(m).padStart(2,'0')+':'+s;
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run,{once:true});
  else run();
})();

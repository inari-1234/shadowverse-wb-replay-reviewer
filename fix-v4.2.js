(()=>{
  const PATCH='4.2-20260916-22';
  const $q=s=>document.querySelector(s);
  const header=$q('header h1'),sub=$q('header p');
  if(header)header.textContent='シャドバWB リプレイ診断 v4.2';
  if(sub)sub.textContent='Build 2026.09.16-22 / PP事前OCR停止・ターン表示から先攻判定';

  const play=$q('#playOrder');
  if(play?.options?.length>=2){play.options[0].textContent='下側が先攻';play.options[1].textContent='上側が先攻'}
  const manualPanel=$q('#drawCal39')?.closest('.panel')||$q('#drawCal37')?.closest('.panel')||$q('#drawCal')?.closest('.panel');
  const scanPanel=$q('#scanTurns')?.closest('.panel');
  let prepPanel=$q('#autoPrepPanel42');
  if(!prepPanel&&manualPanel){prepPanel=document.createElement('section');prepPanel.id='autoPrepPanel42';prepPanel.className='panel';manualPanel.parentNode.insertBefore(prepPanel,manualPanel)}
  if(prepPanel)prepPanel.innerHTML=`<h2>2. PP・先攻側</h2><p id="autoPrepStatus42" class="ok">事前PP OCRは省略します。ターン解析時にターン表示から先攻側を同時判定します。</p><div class="buttons"><button id="showManual42">PP位置・先攻側を手動確認</button></div><div id="autoPrepDetail42" class="ocrRead">高速ターン判定に失敗した場合のみ、従来PP OCRへフォールバックします。</div>`;
  if(manualPanel)manualPanel.style.display='none';
  window.autoPrep42={patch:PATCH,mode:'deferred',ppOK:null,sideOK:null,points:{top:window.v39Points?.top||null,bottom:window.v39Points?.bottom||null},summary:null,refined:[],sampleCount:0};

  function setDeferred(reason){window.autoPrep42={patch:PATCH,mode:'deferred',reason,ppOK:null,sideOK:null,points:{top:window.v39Points?.top||null,bottom:window.v39Points?.bottom||null},summary:null,refined:[],sampleCount:0};const st=$q('#autoPrepStatus42');if(st){st.textContent='事前PP OCRは省略します。ターン解析時にターン表示から先攻側を同時判定します。';st.className='ok'}const d=$q('#autoPrepDetail42');if(d)d.textContent='動画読込直後のOCR・シークは実行しません。高速ターン判定に失敗した場合のみ従来PP OCRを使用します。';try{log('auto-prep-v42-deferred',{patch:PATCH,reason})}catch{}}
  $q('#showManual42')?.addEventListener('click',()=>{if(manualPanel)manualPanel.style.display=manualPanel.style.display==='none'?'block':'none'});
  $q('#videoFile')?.addEventListener('change',()=>setDeferred('video-file-change'));
  video?.addEventListener('loadedmetadata',()=>setDeferred('loadedmetadata'));
  if(scanPanel){const warn=scanPanel.querySelector('.warn');if(warn)warn.textContent='ターン表示からターン列と先攻側を同時判定します。PP OCRは高速判定を確定できない場合だけフォールバックとして使用します。'}
  try{log('patch-v42-active',{patch:PATCH,feature:'defer-pp-ocr-first-side-from-turn-indicator'})}catch{}
})();
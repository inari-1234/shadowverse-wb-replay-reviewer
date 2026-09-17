(()=>{
  const PATCH='4.10.8.4-20260917-20i';
  const $q=s=>document.querySelector(s);
  const safeLog=(type,data={})=>{try{log(type,{patch:PATCH,...data})}catch{}};
  const RESOURCE_IDS={extra:'#leExtra480',ep:'#leEp480',sep:'#leSep480'};
  let lastCanonicalAt='',classBusy=false,classManualVideoKey='';

  function videoEl(){return typeof video!=='undefined'?video:$q('#video')}
  function videoKey(){const f=$q('#videoFile')?.files?.[0];if(f)return`${f.name}|${f.size}|${f.lastModified}`;const v=videoEl();return String(v?.currentSrc||v?.src||'no-video')}
  function targetSide(){const s=$q('#targetSide')?.value;return s==='top'||s==='bottom'?s:'bottom'}
  function currentContext(){const s=window.__wbCanonicalState41083;return s?.context||{turn:null,targetSide:targetSide(),videoKey:videoKey()}}
  function rgbToHsv(R,G,B){const r=R/255,g=G/255,b=B/255,max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;let h=0;if(d){if(max===r)h=((g-b)/d)%6;else if(max===g)h=(b-r)/d+2;else h=(r-g)/d+4;h*=60;if(h<0)h+=360}return{h,s:max?d/max:0,v:max}}
  function drawFrame(){const v=videoEl();if(!v?.videoWidth||!v?.videoHeight)return null;const c=document.createElement('canvas');c.width=1200;c.height=Math.max(1,Math.round(c.width*v.videoHeight/v.videoWidth));const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(v,0,0,c.width,c.height);return{c,x}}
  function gemStats(f,cx,cy,h0,h1,sMin,vMin){
    const rx=.010,ry=.020,x0=Math.max(0,Math.floor((cx-rx)*f.c.width)),x1=Math.min(f.c.width,Math.ceil((cx+rx)*f.c.width)),y0=Math.max(0,Math.floor((cy-ry)*f.c.height)),y1=Math.min(f.c.height,Math.ceil((cy+ry)*f.c.height));
    const d=f.x.getImageData(x0,y0,Math.max(1,x1-x0),Math.max(1,y1-y0)).data;let n=0,col=0,sumV=0;
    for(let i=0;i<d.length;i+=4){const z=rgbToHsv(d[i],d[i+1],d[i+2]);n++;sumV+=z.v;if(z.h>=h0&&z.h<=h1&&z.s>=sMin&&z.v>=vMin)col++}
    return{colorFrac:n?col/n:0,meanV:n?sumV/n:0};
  }
  function eligibility(turn){const api=window.__wbResourceRecognizer4108;return api?.eligibility?.(turn)||{ep:false,sep:false}}
  function detectEvolutionResources(ctx=currentContext()){
    const e=eligibility(ctx.turn),out={ep:null,sep:null};
    if(!ctx.turn){out.ep={known:false,available:null,reason:'turn-unknown'};out.sep={known:false,available:null,reason:'turn-unknown'};return out}
    if(!e.ep)out.ep={known:true,available:false,reason:'not-yet-eligible-rule',method:'rule'};
    if(!e.sep)out.sep={known:true,available:false,reason:'not-yet-eligible-rule',method:'rule'};
    if((out.ep&&out.sep)||ctx.targetSide!=='bottom'){
      if(!out.ep)out.ep={known:false,available:null,reason:'top-side-image-unvalidated'};
      if(!out.sep)out.sep={known:false,available:null,reason:'top-side-image-unvalidated'};
      return out;
    }
    const f=drawFrame();if(!f){if(!out.ep)out.ep={known:false,available:null,reason:'frame-missing'};if(!out.sep)out.sep={known:false,available:null,reason:'frame-missing'};return out}
    if(!out.ep){const a=gemStats(f,.440,.740,15,65,.45,.45),b=gemStats(f,.459,.740,15,65,.45,.45),score=Math.max(a.colorFrac,b.colorFrac),ok=score>=.22;out.ep={known:ok,available:ok?true:null,reason:ok?'colored-ep-gem':'eligible-but-gem-not-confident',method:'image-v41084-gem',stats:{gem1:+a.colorFrac.toFixed(3),gem2:+b.colorFrac.toFixed(3),meanV1:+a.meanV.toFixed(3),meanV2:+b.meanV.toFixed(3)}}}
    if(!out.sep){const a=gemStats(f,.542,.740,250,330,.35,.35),b=gemStats(f,.560,.740,250,330,.35,.35),score=Math.max(a.colorFrac,b.colorFrac),ok=score>=.22;out.sep={known:ok,available:ok?true:null,reason:ok?'colored-sep-gem':'eligible-but-gem-not-confident',method:'image-v41084-gem',stats:{gem1:+a.colorFrac.toFixed(3),gem2:+b.colorFrac.toFixed(3),meanV1:+a.meanV.toFixed(3),meanV2:+b.meanV.toFixed(3)}}}
    return out;
  }
  function isManualCurrent(el){return (el?.dataset?.wbResourceSource4108==='manual')&&el?.dataset?.wbResourceManualVideo41083===videoKey()}
  function setKnown(el,v,src){if(!el)return;el.checked=!!v;el.indeterminate=false;el.dataset.wbResourceSource4108=src;delete el.dataset.wbResourceManualVideo41083}
  function setUnknown(el,src){if(!el)return;el.checked=false;el.indeterminate=true;el.dataset.wbResourceSource4108=src;delete el.dataset.wbResourceManualVideo41083}
  function ensureStateLabels(){
    for(const [key,sel] of Object.entries(RESOURCE_IDS)){const el=$q(sel);if(!el)continue;let s=$q(sel+'State41084');if(!s){s=document.createElement('span');s.id=sel.slice(1)+'State41084';s.style.cssText='margin-left:5px;font-size:11px;color:#9aa8bf;white-space:nowrap';el.insertAdjacentElement('afterend',s)}const state=el.indeterminate?'未確認':el.checked?'使用可':'使用不可';s.textContent=` ${state}`;s.dataset.state=state;s.title=`${key.toUpperCase()}: ${state}`}
  }
  function applyEvolutionResources(reason='canonical-fill'){
    const state=window.__wbCanonicalState41083;if(!state?.context)return null;const ctx=state.context,evo=detectEvolutionResources(ctx),ep=$q(RESOURCE_IDS.ep),sep=$q(RESOURCE_IDS.sep);
    if(ep&&!isManualCurrent(ep)){if(evo.ep?.known)setKnown(ep,!!evo.ep.available,'canonical-'+evo.ep.reason+'-v41084');else setUnknown(ep,'canonical-'+(evo.ep?.reason||'unknown')+'-v41084')}
    if(sep&&!isManualCurrent(sep)){if(evo.sep?.known)setKnown(sep,!!evo.sep.available,'canonical-'+evo.sep.reason+'-v41084');else setUnknown(sep,'canonical-'+(evo.sep?.reason||'unknown')+'-v41084')}
    state.resources=state.resources||{};state.resources.evolution=evo;state.resources.epSepPatch=PATCH;ensureStateLabels();refreshCanonicalStatus(state);safeLog('ep-sep-state-read-v41084',{reason,context:ctx,evolution:evo,ui:{ep:ep?.indeterminate?null:!!ep?.checked,sep:sep?.indeterminate?null:!!sep?.checked}});return evo;
  }
  function refreshCanonicalStatus(state=window.__wbCanonicalState41083){
    const st=$q('#leStatus480');if(!st||!state)return;const api=window.__wbResourceRecognizer4108,u=api?.unknownResources?.()||[],parts=[];
    if(!state.pp?.result?.accepted)parts.push('PP未確定');if(!state.hp?.result?.accepted)parts.push('相手HP未確定');if(u.length)parts.push(u.join('/')+'未確認');if(window.__wbCanonicalStateFill41083?.wardUnknown?.())parts.push('相手守護未確認');
    st.textContent=parts.length?`取得完了：${parts.join(' / ')}。未確認項目は推定しません。`:'取得完了：ターン・PP・相手HP・資源を確認しました。';st.style.color=parts.length?'#facc15':'#86efac';
  }
  function watchCanonical(){const s=window.__wbCanonicalState41083,at=s?.at||'';if(!at||at===lastCanonicalAt)return;lastCanonicalAt=at;setTimeout(()=>applyEvolutionResources('canonical-state-updated'),0)}

  async function settle(){await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))}
  async function seekClass(t){const v=videoEl();if(!v||!Number.isFinite(v.duration))return false;t=Math.max(0,Math.min(v.duration-.05,Number(t)||0));try{if(Math.abs(v.currentTime-t)>.025){if(typeof seek==='function')await seek(t,'class-display-v41084');else await new Promise((res,rej)=>{let done=false;const on=()=>finish(true),to=setTimeout(()=>finish(false),2500);function finish(ok){if(done)return;done=true;v.removeEventListener('seeked',on);clearTimeout(to);ok?res():rej(Error('seek timeout'))}v.addEventListener('seeked',on,{once:true});v.currentTime=t})}await settle();return true}catch{return false}}
  function classFrameStats(){
    const f=drawFrame();if(!f)return null;
    const stat=(r,vs)=>{const x0=Math.floor(r.x0*f.c.width),x1=Math.ceil(r.x1*f.c.width),y0=Math.floor(r.y0*f.c.height),y1=Math.ceil(r.y1*f.c.height),w=Math.max(1,x1-x0),h=Math.max(1,y1-y0),d=f.x.getImageData(x0,y0,w,h).data;let n=0,sat=0,mag=0,cyan=0,blue=0,vsCyan=0;for(let i=0;i<d.length;i+=4){const z=rgbToHsv(d[i],d[i+1],d[i+2]);n++;if(vs){if(z.h>=175&&z.h<=240&&z.s>=.25&&z.v>=.55)vsCyan++;continue}if(z.v<.18)continue;if(z.s>.25&&z.v>.25){sat++;if(z.h>=315||z.h<=12)mag++;if(z.h>=150&&z.h<=210)cyan++;if(z.h>210&&z.h<=290)blue++}}if(vs)return{frac:n?vsCyan/n:0};const c=document.createElement('canvas');c.width=128;c.height=128;c.getContext('2d').drawImage(f.c,x0,y0,w,h,0,0,128,128);return{mag:mag/Math.max(1,sat),cyan:cyan/Math.max(1,sat),blue:blue/Math.max(1,sat),canvas:c}};
    const vs=stat({x0:.43,x1:.57,y0:.28,y1:.72},true),ic=stat({x0:.82,x1:.90,y0:.58,y1:.80},false);let candidate='',confidence=0;if(vs.frac>=.15){if(ic.mag>=.60){candidate='ナイトメア';confidence=Math.min(.99,.72+ic.mag*.25)}else if(ic.blue>=.52){candidate='ウィッチ';confidence=Math.min(.98,.70+ic.blue*.25)}else if(ic.cyan>=.55){candidate='ネメシス';confidence=Math.min(.98,.70+ic.cyan*.25)}}return{candidate,confidence,vsCyan:+vs.frac.toFixed(3),magenta:+ic.mag.toFixed(3),cyan:+ic.cyan.toFixed(3),blue:+ic.blue.toFixed(3),canvas:ic.canvas};
  }
  function drawClass(c){const cv=$q('#classMark442');if(!cv)return;const x=cv.getContext('2d');x.clearRect(0,0,cv.width,cv.height);if(c){x.imageSmoothingEnabled=false;x.drawImage(c,0,0,cv.width,cv.height)}}
  async function validateDisplayedClass(reason='auto'){
    if(classBusy)return null;const key=videoKey();if(classManualVideoKey===key)return{skipped:'manual'};const v=videoEl();if(!v?.videoWidth||!Number.isFinite(v.duration))return null;classBusy=true;const original=v.currentTime,wasPaused=v.paused,legacy=window.classDetection442;v.pause();
    try{const samples=[];let prior='',found=null;for(const t of [1,1.5,2,2.5,3]){if(key!==videoKey())return null;if(!await seekClass(t))continue;const r=classFrameStats();samples.push({time:t,candidate:r?.candidate||'',confidence:+(r?.confidence||0).toFixed(3),vsCyan:r?.vsCyan||0,magenta:r?.magenta||0,cyan:r?.cyan||0,blue:r?.blue||0});if(r?.candidate&&prior===r.candidate){found={time:t,r};break}prior=r?.candidate||''}if(key!==videoKey())return null;const sel=$q('#classSelect442'),status=$q('#classStatus442'),match=$q('#matchup');if(found){if(sel)sel.value=found.r.candidate;if(match&&(!match.value.trim()||match.value===legacy?.candidate))match.value=found.r.candidate;drawClass(found.r.canvas);window.classDetection442={patch:PATCH,accepted:true,candidate:found.r.candidate,confidence:+found.r.confidence.toFixed(3),anchorTime:found.time,anchorSource:'validated-vs-screen',visualAnchor:true,method:'vs-screen-class-icon-v41084',vsCyan:found.r.vsCyan,magenta:found.r.magenta,cyan:found.r.cyan,blue:found.r.blue,legacyCandidate:legacy?.candidate||''};if(status)status.textContent=`自動判定：${found.r.candidate}（VS画面 ${found.time.toFixed(1)}秒）。`}else{if(sel&&legacy?.accepted&&sel.value===legacy.candidate)sel.value='';if(match&&legacy?.candidate&&match.value===legacy.candidate)match.value='';drawClass(null);window.classDetection442={patch:PATCH,accepted:false,candidate:'',confidence:0,anchorTime:null,anchorSource:'validated-vs-screen-none',visualAnchor:false,method:'vs-screen-class-icon-v41084',legacyCandidate:legacy?.candidate||''};if(status)status.textContent='自動判定保留：VS画面のクラスアイコンを確認できません。手動選択してください。'}safeLog('class-display-validated-v41084',{reason,key,result:window.classDetection442,samples});return window.classDetection442}
    catch(err){safeLog('class-display-validation-error-v41084',{reason,message:err?.message||String(err)});return null}
    finally{await seekClass(original);if(!wasPaused)try{await v.play()}catch{}classBusy=false}
  }
  async function scheduleClassValidation(reason){const key=videoKey();try{const ready=window.classAnchorReady468;if(ready&&typeof ready.then==='function')await ready}catch{}for(let i=0;i<40&&window.turnAnalysisBusy392;i++)await new Promise(r=>setTimeout(r,150));if(key===videoKey())return validateDisplayedClass(reason);return null}

  function installNote(){const p=$q('#lethalPanel480');if(!p||$q('#leResourceMeaning41084'))return;const n=document.createElement('p');n.id='leResourceMeaning41084';n.className='help';n.textContent='資源表示：☑＝使用可、空欄＝使用不可、−＝未確認。EP/SEPは使用可能ターン以降、残存ポイント色を確認できた場合だけ自動で使用可にします。';p.appendChild(n)}
  function buildStyle(){let s=$q('#wbUiFeature41084');if(!s){s=document.createElement('style');s.id='wbUiFeature41084';document.head.appendChild(s)}const css="header h1{font-size:0!important}header h1::after{content:'シャドバWB リプレイ診断 v4.10.8';font-size:18px!important;font-weight:700}header>p:first-of-type{font-size:0!important}header>p:first-of-type::after{content:'Build 2026.09.17-20i / EP・SEP実画像認識 + クラスROI修正';font-size:12px!important;color:#9ba8bf}";if(s.textContent!==css)s.textContent=css}
  function verify(){const st={patch:PATCH,epSepDetector:true,classValidator:true,stableTurnScannerUntouched:!!window.turnTimeline39||true,canonicalStateApi:!!window.__wbCanonicalStateFill41083,checkedAt:new Date().toISOString()};st.ok=st.canonicalStateApi;window.__wbResourceClassSafety41084=st;safeLog('resource-class-invariant-v41084',st);return st.ok}

  buildStyle();installNote();ensureStateLabels();
  const uiTm=setInterval(()=>{buildStyle();installNote();ensureStateLabels()},250);setTimeout(()=>clearInterval(uiTm),15000);
  setInterval(watchCanonical,180);
  document.addEventListener('change',e=>{const t=e.target;if(t?.matches?.('#leExtra480,#leEp480,#leSep480'))setTimeout(ensureStateLabels,0);if(t?.matches?.('#classSelect442')&&e.isTrusted){classManualVideoKey=videoKey();safeLog('class-manual-current-video-v41084',{videoKey:videoKey(),value:t.value})}},true);
  $q('#videoFile')?.addEventListener('change',()=>{lastCanonicalAt='';classManualVideoKey='';setTimeout(()=>{ensureStateLabels();scheduleClassValidation('video-change')},220)});
  videoEl()?.addEventListener('loadedmetadata',()=>setTimeout(()=>scheduleClassValidation('loadedmetadata'),180));
  window.addEventListener('wb-turn-timeline-ready',()=>setTimeout(()=>scheduleClassValidation('turn-ready'),120));
  setTimeout(()=>{if(videoEl()?.videoWidth)scheduleClassValidation('initial-ready');verify()},2500);
  window.__wbResourceClass41084={detectEvolutionResources,applyEvolutionResources,validateDisplayedClass,verify};
  safeLog('patch-v41084-active',{feature:'ep-sep-positive-image-detection-explicit-state-labels-vs-class-validator'});
})();

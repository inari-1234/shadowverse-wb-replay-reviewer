(()=>{
  const PATCH='4.10.8.3-20260917-20g';
  const $q=s=>document.querySelector(s);
  const safeLog=(type,data={})=>{try{log(type,{patch:PATCH,...data})}catch{}};
  let busy=false;

  function videoEl(){return typeof video!=='undefined'?video:$q('#video')}
  function targetSide(){const s=$q('#targetSide')?.value;return s==='top'||s==='bottom'?s:'bottom'}
  function playOrder(){return $q('#playOrder')?.value==='先攻'?'先攻':'後攻'}
  function videoKey(){
    const f=$q('#videoFile')?.files?.[0];
    if(f)return`${f.name}|${f.size}|${f.lastModified}`;
    const v=videoEl();return String(v?.currentSrc||v?.src||'no-video');
  }
  function timelineContext(){
    const v=videoEl(),t=Number(v?.currentTime),rows=Array.isArray(window.turnTimeline39)?window.turnTimeline39:[];
    let row=null;
    if(Number.isFinite(t))for(const r of rows){if(Number(r.time)<=t&&(!row||Number(r.time)>Number(row.time)))row=r}
    return{time:Number.isFinite(t)?+t.toFixed(3):null,row,turn:Number(row?.turn)||null,absoluteSide:row?.side||null,targetSide:targetSide(),playOrder:playOrder(),videoKey:videoKey()};
  }
  async function settleFrame(){await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))}
  async function seekFrame(t){
    const v=videoEl();if(!v||!Number.isFinite(v.duration))return false;
    t=Math.max(0,Math.min(Math.max(0,v.duration-.05),Number(t)||0));
    try{
      if(Math.abs(Number(v.currentTime)-t)>.025){
        if(typeof seek==='function')await seek(t,'canonical-state-fill-v41083');
        else await new Promise((resolve,reject)=>{let done=false;const on=()=>finish(true),to=setTimeout(()=>finish(false),2500);function finish(ok){if(done)return;done=true;v.removeEventListener('seeked',on);clearTimeout(to);ok?resolve():reject(new Error('seek timeout'))}v.addEventListener('seeked',on,{once:true});v.currentTime=t});
      }
      await settleFrame();return true;
    }catch{return false}
  }

  function ppManual(pp){const s=pp?.dataset?.wbPpSource||'unknown';return s==='manual'||s==='preexisting-manual'}
  async function recognizePp(ctx){
    const api=window.__wbPpRecognizer4106;
    if(ctx.targetSide!=='bottom')return{accepted:false,reason:'top-side-not-supported'};
    if(!api?.readBottomPips||!api?.expectedMaxAt)return{accepted:false,reason:'pp-recognizer-unavailable'};
    const expected=api.expectedMaxAt(ctx.time,'bottom');
    if(!expected)return{accepted:false,reason:'before-first-reviewed-turn'};
    let sample=api.readBottomPips(expected);sample={...sample,sampleTime:ctx.time,mode:'direct-canonical'};
    const ownStart=ctx.row?.side==='bottom'?Number(ctx.row.time):NaN;
    const delta=Number.isFinite(ownStart)?ctx.time-ownStart:Infinity;
    const nearStart=delta>=-.05&&delta<1.8;
    const refillPending=nearStart&&delta<1.55&&sample.accepted&&sample.current!==expected;
    if(sample.accepted&&!refillPending)return sample;
    if(!nearStart)return sample;
    const original=ctx.time,end=ownStart+1.8;
    try{
      for(let t=Math.max(original+.25,ownStart+.25);t<=end+.001;t+=.25){
        if(!await seekFrame(t))continue;
        const s=api.readBottomPips(expected),x={...s,sampleTime:+t.toFixed(3),mode:'turn-start-forward-canonical'};
        if(x.accepted&&x.current===expected){sample=x;break}
      }
    }finally{await seekFrame(original)}
    return sample;
  }
  function applyPp(result){
    const pp=$q('#lePp480');if(!pp)return{applied:false,manualPreserved:false,conflict:false,clearedStale:false};
    const manual=ppManual(pp),source=pp.dataset.wbPpSource||'unknown';let applied=false,conflict=false,clearedStale=false;
    if(result?.accepted){
      const n=Number(result.current);
      if(manual){const old=String(pp.value||'').trim(),m=old===''?null:Number(old);conflict=Number.isFinite(m)&&m!==n}
      else{pp.value=String(n);pp.dataset.wbPpSource='image-pips-v41083';applied=true}
    }else if(!manual&&source.startsWith('image-pips-')){pp.value='';pp.dataset.wbPpSource='unknown';clearedStale=true}
    return{applied,manualPreserved:manual,conflict,clearedStale};
  }

  function hpManual(hp){const s=hp?.dataset?.wbHpSource||'unknown';return s==='manual'||s==='preexisting-manual'}
  async function restoreOcrDefaults(){
    try{
      if(typeof ocrWorker!=='undefined'&&ocrWorker?.setParameters){await ocrWorker.setParameters({tessedit_char_whitelist:'0123456789',tessedit_pageseg_mode:'10'});return true}
    }catch(err){safeLog('ocr-default-restore-error-v41083',{message:err?.message||String(err)})}
    return false;
  }
  async function recognizeHp(){
    const api=window.__wbHpRecognizer4107;
    if(!api?.recognizeOpponentHp)return{accepted:false,reason:'hp-recognizer-unavailable'};
    try{return await api.recognizeOpponentHp()}catch(err){return{accepted:false,reason:'exception',message:err?.message||String(err)}}
    finally{await restoreOcrDefaults()}
  }
  function applyHp(result){
    const hp=$q('#leOppHp480');if(!hp)return{applied:false,manualPreserved:false,conflict:false,clearedStale:false};
    const manual=hpManual(hp),source=hp.dataset.wbHpSource||'unknown';let applied=false,conflict=false,clearedStale=false;
    if(result?.accepted){
      const n=Number(result.value);
      if(manual){const old=String(hp.value||'').trim(),m=old===''?null:Number(old);conflict=Number.isFinite(m)&&m!==n}
      else{hp.value=String(n);hp.dataset.wbHpSource='image-hp-v41083';applied=true}
    }else if(!manual&&source.startsWith('image-hp-')){hp.value='';hp.dataset.wbHpSource='unknown';clearedStale=true}
    return{applied,manualPreserved:manual,conflict,clearedStale};
  }

  function rgbToHsv255(R,G,B){const r=R/255,g=G/255,b=B/255,max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;let h=0;if(d){if(max===r)h=((g-b)/d)%6;else if(max===g)h=(b-r)/d+2;else h=(r-g)/d+4;h*=60;if(h<0)h+=360}return{h,s:max?d/max:0,v:max}}
  function drawFrame(){const v=videoEl();if(!v?.videoWidth||!v?.videoHeight)return null;const c=document.createElement('canvas');c.width=1200;c.height=Math.max(1,Math.round(c.width*v.videoHeight/v.videoWidth));const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(v,0,0,c.width,c.height);return{c,x}}
  function detectExtraButton(ctx=timelineContext()){
    if(ctx.playOrder==='先攻')return{known:true,available:false,reason:'first-player-rule',method:'rule'};
    if(ctx.targetSide!=='bottom')return{known:false,available:null,reason:'top-side-image-unvalidated',method:'image-v41083'};
    const f=drawFrame();if(!f)return{known:false,available:null,reason:'frame-missing',method:'image-v41083'};
    const button={x0:.79,x1:.93,y0:.67,y1:.75},outer={x0:.75,x1:.96,y0:.61,y1:.81};
    const sx=Math.floor(outer.x0*f.c.width),sy=Math.floor(outer.y0*f.c.height),sw=Math.max(1,Math.floor((outer.x1-outer.x0)*f.c.width)),sh=Math.max(1,Math.floor((outer.y1-outer.y0)*f.c.height));
    const d=f.x.getImageData(sx,sy,sw,sh).data;
    const bx0=button.x0*f.c.width-sx,bx1=button.x1*f.c.width-sx,by0=button.y0*f.c.height-sy,by1=button.y1*f.c.height-sy;
    let bn=0,bo=0,bb=0,bv=0,bs=0,on=0,oo=0;
    for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){
      const i=(y*sw+x)*4,z=rgbToHsv255(d[i],d[i+1],d[i+2]),isOrange=z.h>=10&&z.h<=70&&z.s>=.39&&z.v>=.47;
      const inButton=x>=bx0&&x<bx1&&y>=by0&&y<by1;
      if(inButton){bn++;bv+=z.v;bs+=z.s;if(isOrange)bo++;if(z.v>=.51&&z.s>=.31)bb++}
      else{on++;if(isOrange)oo++}
    }
    const stats={orangeFrac:bn?bo/bn:0,brightFrac:bn?bb/bn:0,meanV:bn?bv/bn:0,meanS:bn?bs/bn:0,outerOrangeFrac:on?oo/on:0};
    stats.orangeContrast=stats.orangeFrac-stats.outerOrangeFrac;
    const available=stats.orangeFrac>=.35&&stats.brightFrac>=.35&&stats.meanV>=.38&&stats.orangeContrast>=.28;
    return{known:available,available:available?true:null,reason:available?'illuminated-extra-pp-button':'not-confidently-available',method:'image-v41083-contrast',side:ctx.targetSide,stats:Object.fromEntries(Object.entries(stats).map(([k,v])=>[k,+v.toFixed(3)]))};
  }

  function resourceManual(el){const s=el?.dataset?.wbResourceSource4108||'unknown';return s==='manual'&&el?.dataset?.wbResourceManualVideo41083===videoKey()}
  function setResource(el,value,source){if(!el)return;el.checked=!!value;el.indeterminate=false;el.dataset.wbResourceSource4108=source;delete el.dataset.wbResourceManualVideo41083}
  function unknownResource(el,source){if(!el)return;el.checked=false;el.indeterminate=true;el.dataset.wbResourceSource4108=source;delete el.dataset.wbResourceManualVideo41083}
  function applyResources(ctx){
    const api=window.__wbResourceRecognizer4108,extra=$q('#leExtra480'),ep=$q('#leEp480'),sep=$q('#leSep480'),turn=ctx.turn;
    const result={turn,extra:null,eligibility:null,manual:{extra:resourceManual(extra),ep:resourceManual(ep),sep:resourceManual(sep)}};
    if(api?.eligibility){
      const e=api.eligibility(turn);result.eligibility=e;
      if(!turn){
        if(ep&&!result.manual.ep)unknownResource(ep,'turn-unknown-v41083');
        if(sep&&!result.manual.sep)unknownResource(sep,'turn-unknown-v41083');
      }else{
        if(ep&&!result.manual.ep){e.ep?unknownResource(ep,'eligible-unrecognized-v41083'):setResource(ep,false,'not-yet-eligible-rule-v41083')}
        if(sep&&!result.manual.sep){e.sep?unknownResource(sep,'eligible-unrecognized-v41083'):setResource(sep,false,'not-yet-eligible-rule-v41083')}
      }
    }
    if(extra){
      if(result.manual.extra){result.extra={known:true,available:!!extra.checked,reason:'manual-current-video',method:'manual',manualPreserved:true}}
      else{
        const x=detectExtraButton(ctx);result.extra=x;
        if(x.known)setResource(extra,!!x.available,'canonical-'+(x.reason||'known'));
        else unknownResource(extra,'canonical-'+(x.reason||'unknown'));
      }
    }else result.extra={known:false,available:null,reason:'missing-control',method:'ui'};
    return result;
  }

  function ensureWardUi(){
    const ward=$q('#leWard480');if(!ward)return false;
    if(ward.dataset.wbWardTracking41083!=='1'){ward.dataset.wbWardTracking41083='1';ward.dataset.wbWardSource41083=ward.checked?'preexisting-present':'unknown';if(!ward.checked)ward.indeterminate=true}
    if(!$q('#leWardState41083')){
      const wrap=document.createElement('label');wrap.id='leWardStateWrap41083';wrap.textContent='相手守護状態';
      const sel=document.createElement('select');sel.id='leWardState41083';sel.innerHTML='<option value="unknown">未確認</option><option value="none">守護なし確認</option><option value="present">守護あり確認</option>';wrap.appendChild(sel);
      const oldLabel=ward.closest('label');if(oldLabel){oldLabel.style.display='none';oldLabel.insertAdjacentElement('afterend',wrap)}else $q('#lethalPanel480')?.appendChild(wrap);
      sel.value=ward.indeterminate?'unknown':ward.checked?'present':'none';
      sel.addEventListener('change',()=>{
        if(sel.value==='present'){ward.checked=true;ward.indeterminate=false;ward.dataset.wbWardSource41083='manual-present'}
        else if(sel.value==='none'){ward.checked=false;ward.indeterminate=false;ward.dataset.wbWardSource41083='manual-none'}
        else{ward.checked=false;ward.indeterminate=true;ward.dataset.wbWardSource41083='manual-unknown'}
        ward.dispatchEvent(new Event('change',{bubbles:true}));setTimeout(()=>{applyWardWarning();updateWardStatus()},0);safeLog('ward-state-manual-v41083',{state:sel.value});
      });
    }
    return true;
  }
  function wardUnknown(){const w=$q('#leWard480');return !!w?.indeterminate}
  function updateWardStatus(){const sel=$q('#leWardState41083'),w=$q('#leWard480');if(!sel||!w)return;const value=w.indeterminate?'unknown':w.checked?'present':'none';if(sel.value!==value)sel.value=value}
  function applyWardWarning(){const out=$q('#leResult480');if(!out)return;const marker='\n⚠ 相手守護未確認：';const base=String(out.textContent||'').split(marker)[0];out.textContent=base+(wardUnknown()?marker+'守護の有無を確認するまでリーサル確定・保存を禁止':'')}

  function setStatus(msg,color='#9aa8bf'){const st=$q('#leStatus480');if(st){st.textContent=msg;st.style.color=color}}
  function resourceUnknownNames(){const api=window.__wbResourceRecognizer4108;try{return api?.unknownResources?.()||[]}catch{return[]}}
  async function canonicalFill(button){
    if(busy||button?.disabled)return;busy=true;if(button)button.disabled=true;
    const ctx=timelineContext(),turnEl=$q('#leTurn480');if(ctx.turn&&turnEl)turnEl.value=ctx.turn;
    setStatus('動画からターン・PP・相手HP・資源を安全取得中…','#cbd5e1');const started=performance.now();
    let ppResult={accepted:false,reason:'not-run'},hpResult={accepted:false,reason:'not-run'},resourceResult={};
    try{
      ppResult=await recognizePp(ctx);const ppApply=applyPp(ppResult);
      hpResult=await recognizeHp();const hpApply=applyHp(hpResult);
      resourceResult=applyResources(ctx);
      ensureWardUi();updateWardStatus();try{$q('#leCalc480')?.click()}catch{}setTimeout(applyWardWarning,0);
      const u=resourceUnknownNames(),wardU=wardUnknown(),parts=[];
      if(!ppResult.accepted)parts.push('PP未確定');if(!hpResult.accepted)parts.push('相手HP未確定');if(u.length)parts.push(u.join('/')+'未確認');if(wardU)parts.push('相手守護未確認');
      const warn=parts.length>0||ppApply.conflict||hpApply.conflict;if(ppApply.conflict)parts.push('手入力PPと画像認識が不一致');if(hpApply.conflict)parts.push('手入力HPと画像認識が不一致');
      setStatus(parts.length?`取得完了：${parts.join(' / ')}。未確認項目は推定しません。`:'取得完了：ターン・PP・相手HP・資源を確認しました。','#'+(warn?'facc15':'86efac'));
      window.__wbCanonicalState41083={patch:PATCH,at:new Date().toISOString(),context:ctx,pp:{result:ppResult,...ppApply},hp:{result:hpResult,...hpApply},resources:resourceResult,ward:{unknown:wardU,state:$q('#leWardState41083')?.value||null},elapsedMs:Math.round(performance.now()-started)};
      safeLog('canonical-state-fill-v41083',window.__wbCanonicalState41083);
    }catch(err){setStatus('状態取得エラー：'+(err?.message||String(err)),'#fca5a5');safeLog('canonical-state-fill-error-v41083',{message:err?.message||String(err)})}
    finally{busy=false;if(button)button.disabled=false}
  }

  function installCaptureGuards(){
    if(document.documentElement.dataset.wbCanonicalStateGuard41083==='1')return true;
    document.documentElement.dataset.wbCanonicalStateGuard41083='1';
    document.addEventListener('click',e=>{
      const fill=e.target?.closest?.('#leFill480');if(fill){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();canonicalFill(fill);return}
      const save=e.target?.closest?.('#leSave480');if(save&&wardUnknown()){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();setStatus('保存しません：相手守護が未確認です。','#facc15');applyWardWarning();safeLog('lethal-save-blocked-ward-unknown-v41083');return}
      if(e.target?.closest?.('#leCalc480'))setTimeout(applyWardWarning,0);
    },true);
    document.addEventListener('change',e=>{
      const t=e.target;
      if(t?.matches?.('#leExtra480,#leEp480,#leSep480')&&e.isTrusted){t.dataset.wbResourceSource4108='manual';t.dataset.wbResourceManualVideo41083=videoKey();safeLog('resource-manual-current-video-v41083',{id:t.id,value:!!t.checked,videoKey:videoKey()})}
      if(t?.closest?.('#lethalPanel480'))setTimeout(applyWardWarning,0);
    },true);
    return true;
  }
  function neutralizeLegacyFill(){const b=$q('#leFill480');if(!b)return false;b.onclick=null;b.dataset.wbCanonicalFill41083='1';b.textContent='動画位置から状態を安全取得';return true}
  function note(){const p=$q('#lethalPanel480');if(!p||$q('#leCanonicalNote41083'))return false;const n=document.createElement('p');n.id='leCanonicalNote41083';n.className='help';n.textContent='状態取得20g：ExPPは「オレンジの使用可能表示」を局所コントラストで高確信度判定し、動画切替時に前の動画の資源状態を引き継ぎません。旧onclick連鎖を通さない安全取得と守護三値化も維持します。';p.appendChild(n);return true}
  function buildStyle(){let s=$q('#wbUiFeature41083');if(!s){s=document.createElement('style');s.id='wbUiFeature41083';document.head.appendChild(s)}const css="header h1{font-size:0!important}header h1::after{content:'シャドバWB リプレイ診断 v4.10.8';font-size:18px!important;font-weight:700}header>p:first-of-type{font-size:0!important}header>p:first-of-type::after{content:'Build 2026.09.17-20g / ExPP使用可能表示の実動画検証';font-size:12px!important;color:#9ba8bf}";if(s.textContent!==css)s.textContent=css}
  function verify(){const b=$q('#leFill480'),w=$q('#leWard480'),sel=$q('#leWardState41083');const state={patch:PATCH,captureGuard:document.documentElement.dataset.wbCanonicalStateGuard41083==='1',button:!!b,legacyOnclickNeutralized:!b||b.onclick==null,wardControl:!!w,wardSelect:!!sel,wardUnknown:wardUnknown(),ppApi:!!window.__wbPpRecognizer4106?.readBottomPips,hpApi:!!window.__wbHpRecognizer4107?.recognizeOpponentHp,resourceEligibilityApi:!!window.__wbResourceRecognizer4108?.eligibility,exppDetector:true,checkedAt:new Date().toISOString()};state.ok=state.captureGuard&&state.wardSelect&&state.ppApi&&state.hpApi&&state.resourceEligibilityApi;window.__wbCanonicalStateSafety41083=state;safeLog('canonical-state-invariant-v41083',state);return state.ok}

  installCaptureGuards();buildStyle();
  let ticks=0;const tm=setInterval(()=>{ticks++;buildStyle();ensureWardUi();note();updateWardStatus();if(ticks%10===0)verify();if(ticks>90)clearInterval(tm)},120);
  [150,500,1200,3000,6000,9000,10200,11000,12500].forEach(ms=>setTimeout(()=>{buildStyle();ensureWardUi();note();updateWardStatus();if(ms>=10200)neutralizeLegacyFill();verify()},ms));
  $q('#videoFile')?.addEventListener('change',()=>{setTimeout(()=>{
    const pp=$q('#lePp480'),hp=$q('#leOppHp480'),w=$q('#leWard480'),sel=$q('#leWardState41083');
    if(pp?.dataset?.wbPpSource==='image-pips-v41083'){pp.value='';pp.dataset.wbPpSource='unknown'}
    if(hp?.dataset?.wbHpSource==='image-hp-v41083'){hp.value='';hp.dataset.wbHpSource='unknown'}
    for(const id of ['#leExtra480','#leEp480','#leSep480']){const el=$q(id);if(el)unknownResource(el,'video-change-v41083')}
    if(w){w.checked=false;w.indeterminate=true;w.dataset.wbWardSource41083='video-change'}if(sel)sel.value='unknown';
    window.__wbCanonicalState41083=null;window.__wbResourceState4108=null;applyWardWarning();safeLog('canonical-state-video-reset-v41083',{videoKey:videoKey()});
  },0)});
  window.__wbCanonicalStateFill41083={run:canonicalFill,verify,neutralizeLegacyFill,wardUnknown,detectExtraButton};
  safeLog('patch-v41083-active',{feature:'canonical-state-fill-expp-contrast-video-scope-ward-tristate'});
})();

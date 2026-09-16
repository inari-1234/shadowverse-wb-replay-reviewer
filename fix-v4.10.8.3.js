(()=>{
  const PATCH='4.10.8.3-20260917-20f';
  const $q=s=>document.querySelector(s);
  const safeLog=(type,data={})=>{try{log(type,{patch:PATCH,...data})}catch{}};
  let busy=false;

  function videoEl(){return typeof video!=='undefined'?video:$q('#video')}
  function targetSide(){const s=$q('#targetSide')?.value;return s==='top'||s==='bottom'?s:'bottom'}
  function timelineContext(){
    const v=videoEl(),t=Number(v?.currentTime),rows=Array.isArray(window.turnTimeline39)?window.turnTimeline39:[];
    let row=null;
    if(Number.isFinite(t))for(const r of rows){if(Number(r.time)<=t&&(!row||Number(r.time)>Number(row.time)))row=r}
    return{time:Number.isFinite(t)?+t.toFixed(3):null,row,turn:Number(row?.turn)||null,absoluteSide:row?.side||null,targetSide:targetSide()};
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
      if(typeof ocrWorker!=='undefined'&&ocrWorker?.setParameters){
        await ocrWorker.setParameters({tessedit_char_whitelist:'0123456789',tessedit_pageseg_mode:'10'});
        return true;
      }
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

  function resourceManual(el){const s=el?.dataset?.wbResourceSource4108||'unknown';return s==='manual'||s==='preexisting-manual'}
  function setResource(el,value,source){if(!el)return;el.checked=!!value;el.indeterminate=false;el.dataset.wbResourceSource4108=source}
  function unknownResource(el,source){if(!el)return;el.checked=false;el.indeterminate=true;el.dataset.wbResourceSource4108=source}
  function applyResources(turn){
    const api=window.__wbResourceRecognizer4108,extra=$q('#leExtra480'),ep=$q('#leEp480'),sep=$q('#leSep480');
    const result={turn,extra:null,eligibility:null};
    if(api?.eligibility){
      const e=api.eligibility(turn);result.eligibility=e;
      if(!turn){
        if(ep&&!resourceManual(ep))unknownResource(ep,'turn-unknown-v41083');
        if(sep&&!resourceManual(sep))unknownResource(sep,'turn-unknown-v41083');
      }else{
        if(ep&&!resourceManual(ep)){e.ep?unknownResource(ep,'eligible-unrecognized-v41083'):setResource(ep,false,'not-yet-eligible-rule-v41083')}
        if(sep&&!resourceManual(sep)){e.sep?unknownResource(sep,'eligible-unrecognized-v41083'):setResource(sep,false,'not-yet-eligible-rule-v41083')}
      }
    }
    if(api?.detectExtraButton&&extra&&!resourceManual(extra)){
      const x=api.detectExtraButton();result.extra=x;
      if(x?.known)setResource(extra,!!x.available,'canonical-'+(x.reason||'known'));
      else unknownResource(extra,'canonical-'+(x?.reason||'unknown'));
    }
    return result;
  }

  function ensureWardUi(){
    const ward=$q('#leWard480');if(!ward)return false;
    if(ward.dataset.wbWardTracking41083!=='1'){
      ward.dataset.wbWardTracking41083='1';
      ward.dataset.wbWardSource41083=ward.checked?'preexisting-present':'unknown';
      if(!ward.checked)ward.indeterminate=true;
    }
    if(!$q('#leWardState41083')){
      const wrap=document.createElement('label');wrap.id='leWardStateWrap41083';wrap.textContent='相手守護状態';
      const sel=document.createElement('select');sel.id='leWardState41083';
      sel.innerHTML='<option value="unknown">未確認</option><option value="none">守護なし確認</option><option value="present">守護あり確認</option>';
      wrap.appendChild(sel);
      const oldLabel=ward.closest('label');if(oldLabel){oldLabel.style.display='none';oldLabel.insertAdjacentElement('afterend',wrap)}
      else $q('#lethalPanel480')?.appendChild(wrap);
      sel.value=ward.indeterminate?'unknown':ward.checked?'present':'none';
      sel.addEventListener('change',()=>{
        if(sel.value==='present'){ward.checked=true;ward.indeterminate=false;ward.dataset.wbWardSource41083='manual-present'}
        else if(sel.value==='none'){ward.checked=false;ward.indeterminate=false;ward.dataset.wbWardSource41083='manual-none'}
        else{ward.checked=false;ward.indeterminate=true;ward.dataset.wbWardSource41083='manual-unknown'}
        ward.dispatchEvent(new Event('change',{bubbles:true}));
        setTimeout(()=>{applyWardWarning();updateWardStatus()},0);
        safeLog('ward-state-manual-v41083',{state:sel.value});
      });
    }
    return true;
  }
  function wardUnknown(){const w=$q('#leWard480');return !!w?.indeterminate}
  function updateWardStatus(){
    const sel=$q('#leWardState41083'),w=$q('#leWard480');if(!sel||!w)return;
    const value=w.indeterminate?'unknown':w.checked?'present':'none';if(sel.value!==value)sel.value=value;
  }
  function applyWardWarning(){
    const out=$q('#leResult480');if(!out)return;
    const marker='\n⚠ 相手守護未確認：';
    const base=String(out.textContent||'').split(marker)[0];
    out.textContent=base+(wardUnknown()?marker+'守護の有無を確認するまでリーサル確定・保存を禁止':'' );
  }

  function setStatus(msg,color='#9aa8bf'){const st=$q('#leStatus480');if(st){st.textContent=msg;st.style.color=color}}
  function resourceUnknownNames(){
    const api=window.__wbResourceRecognizer4108;
    try{return api?.unknownResources?.()||[]}catch{return[]}
  }
  async function canonicalFill(button){
    if(busy||button?.disabled)return;busy=true;if(button)button.disabled=true;
    const ctx=timelineContext(),turnEl=$q('#leTurn480');if(ctx.turn&&turnEl)turnEl.value=ctx.turn;
    setStatus('動画からターン・PP・相手HP・資源を安全取得中…','#cbd5e1');
    const started=performance.now();
    let ppResult={accepted:false,reason:'not-run'},hpResult={accepted:false,reason:'not-run'},resourceResult={};
    try{
      ppResult=await recognizePp(ctx);const ppApply=applyPp(ppResult);
      hpResult=await recognizeHp();const hpApply=applyHp(hpResult);
      resourceResult=applyResources(ctx.turn);
      ensureWardUi();updateWardStatus();
      try{$q('#leCalc480')?.click()}catch{}
      setTimeout(applyWardWarning,0);
      const u=resourceUnknownNames(),wardU=wardUnknown(),parts=[];
      if(!ppResult.accepted)parts.push('PP未確定');if(!hpResult.accepted)parts.push('相手HP未確定');if(u.length)parts.push(u.join('/')+'未確認');if(wardU)parts.push('相手守護未確認');
      const warn=parts.length>0||ppApply.conflict||hpApply.conflict;
      if(ppApply.conflict)parts.push('手入力PPと画像認識が不一致');if(hpApply.conflict)parts.push('手入力HPと画像認識が不一致');
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
      const fill=e.target?.closest?.('#leFill480');
      if(fill){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();canonicalFill(fill);return}
      const save=e.target?.closest?.('#leSave480');
      if(save&&wardUnknown()){
        e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();
        setStatus('保存しません：相手守護が未確認です。','#facc15');applyWardWarning();safeLog('lethal-save-blocked-ward-unknown-v41083');return
      }
      if(e.target?.closest?.('#leCalc480'))setTimeout(applyWardWarning,0);
    },true);
    document.addEventListener('change',e=>{if(e.target?.closest?.('#lethalPanel480'))setTimeout(applyWardWarning,0)},true);
    return true;
  }
  function neutralizeLegacyFill(){const b=$q('#leFill480');if(!b)return false;b.onclick=null;b.dataset.wbCanonicalFill41083='1';b.textContent='動画位置から状態を安全取得';return true}
  function note(){
    const p=$q('#lethalPanel480');if(!p||$q('#leCanonicalNote41083'))return false;
    const n=document.createElement('p');n.id='leCanonicalNote41083';n.className='help';
    n.textContent='状態取得20f：旧パッチの多重onclick連鎖を通さず、ターン→PP→相手HP→資源を1本の取得経路で処理します。相手守護は未確認／なし／ありを区別し、未確認のままではリーサル状態を保存しません。';
    p.appendChild(n);return true
  }
  function buildStyle(){
    let s=$q('#wbUiFeature41083');if(!s){s=document.createElement('style');s.id='wbUiFeature41083';document.head.appendChild(s)}
    const css="header h1{font-size:0!important}header h1::after{content:'シャドバWB リプレイ診断 v4.10.8';font-size:18px!important;font-weight:700}header>p:first-of-type{font-size:0!important}header>p:first-of-type::after{content:'Build 2026.09.17-20f / 状態取得経路固定 + 守護三値化';font-size:12px!important;color:#9ba8bf}";
    if(s.textContent!==css)s.textContent=css;
  }
  function verify(){
    const b=$q('#leFill480'),w=$q('#leWard480'),sel=$q('#leWardState41083');
    const state={patch:PATCH,captureGuard:document.documentElement.dataset.wbCanonicalStateGuard41083==='1',button:!!b,legacyOnclickNeutralized:!b||b.onclick==null,wardControl:!!w,wardSelect:!!sel,wardUnknown:wardUnknown(),ppApi:!!window.__wbPpRecognizer4106?.readBottomPips,hpApi:!!window.__wbHpRecognizer4107?.recognizeOpponentHp,resourceApi:!!window.__wbResourceRecognizer4108?.detectExtraButton,checkedAt:new Date().toISOString()};
    state.ok=state.captureGuard&&state.wardSelect&&state.ppApi&&state.hpApi&&state.resourceApi;
    window.__wbCanonicalStateSafety41083=state;safeLog('canonical-state-invariant-v41083',state);return state.ok;
  }

  installCaptureGuards();buildStyle();
  let ticks=0;const tm=setInterval(()=>{ticks++;buildStyle();ensureWardUi();note();updateWardStatus();if(ticks%10===0)verify();if(ticks>90)clearInterval(tm)},120);
  [150,500,1200,3000,6000,9000,10200,11000,12500].forEach(ms=>setTimeout(()=>{buildStyle();ensureWardUi();note();updateWardStatus();if(ms>=10200)neutralizeLegacyFill();verify()},ms));
  $q('#videoFile')?.addEventListener('change',()=>{setTimeout(()=>{
    const pp=$q('#lePp480'),hp=$q('#leOppHp480'),w=$q('#leWard480'),sel=$q('#leWardState41083');
    if(pp?.dataset?.wbPpSource==='image-pips-v41083'){pp.value='';pp.dataset.wbPpSource='unknown'}
    if(hp?.dataset?.wbHpSource==='image-hp-v41083'){hp.value='';hp.dataset.wbHpSource='unknown'}
    if(w){w.checked=false;w.indeterminate=true;w.dataset.wbWardSource41083='video-change'}if(sel)sel.value='unknown';
    window.__wbCanonicalState41083=null;applyWardWarning();
  },0)});
  window.__wbCanonicalStateFill41083={run:canonicalFill,verify,neutralizeLegacyFill,wardUnknown};
  safeLog('patch-v41083-active',{feature:'canonical-state-fill-capture-guard-ward-tristate'});
})();

(()=>{
  const PATCH='4.9.4-20260915-14';
  const STORE='wb-counterfactual-v1';
  const $q=s=>document.querySelector(s);
  const safeLog=(type,data={})=>{try{log(type,{patch:PATCH,...data})}catch{}};
  document.documentElement.dataset.wbLatestUi='494';

  function sourceKey(){
    return window.__wbCounterfactualV1?.sourceKey||window.__wbLethalV2?.sourceKey||window.__wbPublicInfoV2?.sourceKey||null;
  }
  function readDb(){try{return JSON.parse(localStorage.getItem(STORE)||'null')}catch{return null}}
  function session(){const k=sourceKey(),db=readDb();return k?db?.sessions?.[k]||null:null}
  function clone(x){try{return structuredClone(x)}catch{return JSON.parse(JSON.stringify(x))}}

  function normalizeSideHelp(text,side){
    const base=String(text||'').split(/\s*\/\s*手番\s*:/)[0].trim();
    return `${base} / 手番: ${side||'未設定'}`;
  }
  function fixBranchCards(){
    const s=session(),list=$q('#cfList490');
    if(!s||!list)return false;
    for(const b of s.branches||[]){
      const btn=list.querySelector(`[data-edit-cf="${b.id}"]`),card=btn?.closest('div[style*="border"]');
      if(!card)continue;
      const help=Array.from(card.children).find(x=>x.classList?.contains('help'));
      if(help)help.textContent=normalizeSideHelp(help.textContent,b.state?.sideToAct);
    }
    return true;
  }

  function syncCounterfactualWindow(){
    const s=session();if(!s)return false;
    const current=window.__wbCounterfactualV1||{};
    window.__wbCounterfactualV1={
      ...current,
      version:'counterfactual-tree-v1.0',
      sourceKey:s.sourceKey,
      branches:clone(s.branches||[]),
      protocol:{
        ...(current.protocol||{}),
        independentState:true,
        rule:'各分岐は親から複製後も独立状態として保存し、実戦最終値からの単純差し引きで作らない。各枝でHP・盤面・手札・PP・Extra PP・EP・SEP・旗カウントを再計算する。',
        knowledgeRule:'分岐の評価にはknowledgeCutoffSeconds以前に利用可能な公開情報だけを使う。',
        resourceSemantics:'pp/extraPPAvailable/epAvailable/sepAvailable are resources of state.sideToAct; hand fields describe the reviewed player own known hand.'
      }
    };
    return true;
  }

  function repairLegacyCutoffs(){
    const db=readDb(),k=sourceKey(),s=k?db?.sessions?.[k]:null;if(!s)return false;
    let changed=false;
    const positiveById=new Map();
    try{
      const ev=typeof events!=='undefined'&&Array.isArray(events)?events:[];
      for(const e of ev){
        if(e?.type==='counterfactual-side-cutoff-patched-v492'&&e.id&&Number(e.cutoff)>0)positiveById.set(e.id,Number(e.cutoff));
      }
    }catch{}
    const byId=new Map((s.branches||[]).map(b=>[b.id,b]));
    for(const b of s.branches||[]){
      const cur=Number(b.knowledgeCutoffSeconds);
      if(cur>0)continue;
      const logged=positiveById.get(b.id);
      const parent=byId.get(b.parentId);
      const inherited=Number(parent?.knowledgeCutoffSeconds);
      const replacement=logged>0?logged:(inherited>0?inherited:null);
      if(replacement!=null){b.knowledgeCutoffSeconds=replacement;b.updatedAt=new Date().toISOString();changed=true}
    }
    if(changed){try{localStorage.setItem(STORE,JSON.stringify(db));safeLog('counterfactual-cutoff-repaired-v494')}catch{}}
    return changed;
  }

  function hardenDiagnosticJson(){
    const old=$q('#exportDiag');if(!old)return false;
    if(old.dataset.wb494==='1')return true;
    const b=old.cloneNode(true);b.dataset.wb494='1';b.dataset.wb493='1';b.dataset.wb492='1';old.replaceWith(b);
    const copy=$q('#copyDiag');if(copy){copy.disabled=true;copy.style.display='none'}
    const view=$q('#diagView');if(view){view.textContent='';view.style.display='none'}
    const oldNote=$q('#diagNote469');if(oldNote)oldNote.textContent='診断レポートはJSONを1ファイルだけ出力します。画面へのテキスト表示やTXTファイルは生成しません。';
    b.addEventListener('click',async e=>{
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();
      try{
        safeLog('diagnostic-export-v494');
        const v=typeof video!=='undefined'?video:$q('#video');
        const data={
          format:'shadowverse-wb-diagnostic-v4.9.4',build:PATCH,createdAt:new Date().toISOString(),userAgent:navigator.userAgent,
          video:typeof videoFileMeta!=='undefined'&&videoFileMeta?{...videoFileMeta,duration:v?.duration||null,currentTime:v?.currentTime||0,width:v?.videoWidth||0,height:v?.videoHeight||0}:null,
          ppPoints:window.v39Points||(typeof points!=='undefined'?points:null),targetSide:$q('#targetSide')?.value,playOrder:$q('#playOrder')?.value,
          turnTimeline:window.turnTimeline39||[],rejectedTurns:window.rejectedTurns392||[],classDetection:window.classDetection442||null,mulliganPreview:window.mulliganPreview442||null,
          publicInformationTracker:window.__wbPublicInfoV2||null,lethalStateV2:window.__wbLethalV2||null,counterfactualTreeV1:(syncCounterfactualWindow(),window.__wbCounterfactualV1||null),
          events:typeof events!=='undefined'?events:[]
        };
        const file=new File([JSON.stringify(data,null,2)],'shadowverse-wb-diagnostic-v4.9.4.json',{type:'application/json',lastModified:Date.now()});
        if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]})))await navigator.share({files:[file],title:'Shadowverse WB 診断JSON'});
        else{const a=document.createElement('a');a.href=URL.createObjectURL(file);a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000)}
      }catch(err){if(err?.name!=='AbortError')safeLog('diagnostic-export-error-v494',{message:err?.message||String(err)})}
    },true);
    return true;
  }

  function patchZip(Z){
    if(!Z?.prototype?.generateAsync)return false;
    if(Z.prototype.__wb494)return true;
    const original=Z.prototype.generateAsync;
    Z.prototype.generateAsync=async function(...args){
      try{
        repairLegacyCutoffs();syncCounterfactualWindow();
        for(const name of Object.keys(this.files||{}))if(/\.txt$/i.test(name))this.remove(name);
        const f=this.files?.['range-review.json'];
        if(f){
          const raw=await f.async('string'),m=JSON.parse(raw);
          m.counterfactualTreeV1=clone(window.__wbCounterfactualV1||null);
          m.exportSanitization={version:'v4.9.4',txtEntriesRemoved:true,diagnosticJsonOnly:true};
          this.file('range-review.json',JSON.stringify(m,null,2));
        }
      }catch(err){safeLog('zip-stabilize-error-v494',{message:err?.message||String(err)})}
      return original.apply(this,args);
    };
    Object.defineProperty(Z.prototype,'__wb494',{value:true});
    return true;
  }
  function trapZip(){
    if(patchZip(window.JSZip))return true;
    const d=Object.getOwnPropertyDescriptor(window,'JSZip');if(d&&!d.configurable)return false;
    if(window.__wbZipTrap494)return true;
    let stored=d?.value;
    try{Object.defineProperty(window,'JSZip',{configurable:true,enumerable:true,get(){return stored},set(v){stored=v;setTimeout(()=>patchZip(v),0)}});window.__wbZipTrap494=true;if(stored)patchZip(stored);return true}catch{return false}
  }

  function stableHeader(){
    document.documentElement.dataset.wbLatestUi='494';
    const h=$q('header h1'),s=$q('header p');
    if(h&&h.textContent!=='シャドバWB リプレイ診断 v4.9.4')h.textContent='シャドバWB リプレイ診断 v4.9.4';
    if(s&&s.textContent!=='Build 2026.09.15-14 / 手番表示・JSON出力・分岐同期を安定化')s.textContent='Build 2026.09.15-14 / 手番表示・JSON出力・分岐同期を安定化';
    const ub=$q('#wbForceLatest463')||$q('#wbForceLatest462');
    const st=$q('#wbUpdateStatus463')||$q('#wbUpdateStatus462');if(st&&!ub?.disabled&&!/v4\.9\.4/.test(st.textContent))st.textContent='v4.9.4 / 表示・JSON・分岐同期修正版';
  }
  function observeHeader(){
    if(!window.MutationObserver||document.documentElement.dataset.wb494HeaderObserver==='1')return;
    const h=$q('header h1'),s=$q('header p');if(!h&&!s)return;
    const mo=new MutationObserver(()=>{
      document.documentElement.dataset.wbLatestUi='494';
      if(h&&h.textContent!=='シャドバWB リプレイ診断 v4.9.4')h.textContent='シャドバWB リプレイ診断 v4.9.4';
      if(s&&s.textContent!=='Build 2026.09.15-14 / 手番表示・JSON出力・分岐同期を安定化')s.textContent='Build 2026.09.15-14 / 手番表示・JSON出力・分岐同期を安定化';
    });
    if(h)mo.observe(h,{childList:true,subtree:true,characterData:true});if(s)mo.observe(s,{childList:true,subtree:true,characterData:true});
    window.__wbHeaderObserver494=mo;document.documentElement.dataset.wb494HeaderObserver='1';
  }

  function updater(){
    const old=$q('#wbForceLatest463')||$q('#wbForceLatest462');if(!old||old.dataset.wb494==='1')return false;
    const b=old.cloneNode(true);b.dataset.wb494='1';b.dataset.wb493='1';b.dataset.wb492='1';old.replaceWith(b);
    b.addEventListener('click',async()=>{if(b.disabled)return;b.disabled=true;const st=$q('#wbUpdateStatus463')||$q('#wbUpdateStatus462');if(st)st.textContent='最新版を確認中…';try{if('serviceWorker'in navigator){const reg=await navigator.serviceWorker.register('./sw.js?v=4.9.4-20260915-14',{updateViaCache:'none'});await reg.update()}if('caches'in window){const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('wb-review-')&&k!=='wb-review-v4-9-4-20260915-14').map(k=>caches.delete(k)))}if(st)st.textContent='更新完了。v4.9.4で再起動します…';setTimeout(()=>{const u=new URL(location.href);u.searchParams.set('latest','494-'+Date.now());u.hash='';location.replace(u.href)},180)}catch(err){if(st)st.textContent='更新確認に失敗しました。';b.disabled=false;safeLog('force-latest-error-v494',{message:err?.message||String(err)})}},true);
    return true;
  }

  repairLegacyCutoffs();trapZip();observeHeader();
  let n=0;const tm=setInterval(()=>{n++;repairLegacyCutoffs();syncCounterfactualWindow();fixBranchCards();hardenDiagnosticJson();patchZip(window.JSZip);stableHeader();updater();if(n>900)clearInterval(tm)},120);
  safeLog('patch-v494-active',{feature:'stable-branch-label-json-only-export-and-export-sync'});
})();

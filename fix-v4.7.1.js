(()=>{
  const PATCH='4.7.1-20260915-06';
  const $q=s=>document.querySelector(s);
  const safeLog=(type,data={})=>{try{log(type,{patch:PATCH,...data})}catch{}};
  const STORE='wb-public-info-v2.1';
  const MIN_LEAD=.25;

  function tracker(){return window.__wbPublicInfoV2||null}
  function audit(t=tracker()){
    const events=Array.isArray(t?.events)?t.events:[],byId=new Map(events.map(e=>[e.id,e])),issues=[];
    for(const e of events){
      if(e.status!=='retrospective')continue;
      const src=byId.get(e.resolvesEventId);
      if(!src){issues.push({type:'broken-link',eventId:e.id,message:'事後確定の元候補が見つかりません。'});continue}
      const a=Number(src.observedAtSeconds),b=Number(e.observedAtSeconds);
      if(Number.isFinite(a)&&Number.isFinite(b)&&b-a<MIN_LEAD){issues.push({type:'no-temporal-lead',eventId:e.id,sourceEventId:src.id,leadSeconds:+(b-a).toFixed(2),message:`候補と答え合わせの時刻差が${(b-a).toFixed(2)}秒です。候補を認識した場面と、後で確定した場面を別時刻で記録してください。`})}
      if(Number(e.turn)<Number(src.turn)){issues.push({type:'turn-reversal',eventId:e.id,sourceEventId:src.id,message:'事後確定ターンが元候補より前になっています。'})}
    }
    const unresolved=events.filter(e=>e.status==='candidate'&&!events.some(r=>r.status==='retrospective'&&r.resolvesEventId===e.id));
    return {ok:issues.length===0,eventCount:events.length,unresolvedCandidateCount:unresolved.length,issues};
  }

  function saveRetime(id,time){
    if(!Number.isFinite(time))return false;
    let db;try{db=JSON.parse(localStorage.getItem(STORE)||'null')}catch{return false}
    const t=tracker(),key=t?.sourceKey,s=db?.sessions?.[key];if(!s)return false;
    const e=s.events?.find(x=>x.id===id);if(!e)return false;
    e.observedAtSeconds=+time.toFixed(2);e.knowledgeAvailableFromSeconds=+time.toFixed(2);
    if(e.status==='retrospective'){e.resolvedAtSeconds=+time.toFixed(2)}
    s.updatedAt=new Date().toISOString();
    try{localStorage.setItem(STORE,JSON.stringify(db))}catch{return false}
    const live=t.events?.find(x=>x.id===id);if(live){live.observedAtSeconds=e.observedAtSeconds;live.knowledgeAvailableFromSeconds=e.knowledgeAvailableFromSeconds;if(live.status==='retrospective')live.resolvedAtSeconds=e.resolvedAtSeconds}
    return true;
  }

  function enhanceCards(){
    const t=tracker(),events=t?.events||[],list=$q('#piList466');if(!list)return false;
    for(const e of events){
      const del=list.querySelector(`[data-del="${e.id}"]`);const card=del?.closest('div[style*="border"]');if(!card||card.querySelector(`[data-retime471="${e.id}"]`))continue;
      const b=document.createElement('button');b.type='button';b.dataset.retime471=e.id;b.textContent='現在位置をこの記録時刻に設定';b.style.padding='5px 8px';
      const row=del.closest('.buttons');row?.insertBefore(b,del);
      b.onclick=()=>{const v=typeof video!=='undefined'?video:$q('#video'),time=Number(v?.currentTime);if(!Number.isFinite(time))return;if(saveRetime(e.id,time)){const st=$q('#piActionStatus467')||$q('#piActionStatus466');if(st){st.textContent=`記録時刻を ${time.toFixed(2)}秒 に修正しました。`;st.style.color='#86efac'}renderAudit();safeLog('tracker-retime-v471',{id:e.id,time:+time.toFixed(2)})}}
    }
    return true;
  }

  function renderAudit(){
    const box=$q('#piCheckResult466');if(!box)return false;const a=audit();
    const base=`記録 ${a.eventCount}件 / 未確定候補 ${a.unresolvedCandidateCount}件`;
    if(a.ok){box.textContent='整合性OK：'+base;box.style.color='#86efac'}else{box.textContent='要修正：'+base+' / '+a.issues.map(x=>x.message).join(' ');box.style.color='#fca5a5'}
    return true;
  }

  function hookCheck(){const b=$q('#piCheck466');if(!b||b.dataset.wb471==='1')return false;b.dataset.wb471='1';const old=b.onclick;b.onclick=e=>{try{old?.call(b,e)}catch{};setTimeout(()=>{enhanceCards();renderAudit()},0)};return true}

  function hookZip(){const Z=window.JSZip;if(!Z?.prototype?.generateAsync)return false;if(Z.prototype.__wbTrackerAudit471)return true;const original=Z.prototype.generateAsync;Z.prototype.generateAsync=async function(...args){try{const f=this.files?.['range-review.json'];if(f){const raw=await f.async('string'),m=JSON.parse(raw),a=audit(m.publicInformationTracker||tracker());if(m.publicInformationTracker){m.publicInformationTracker.integrity={...(m.publicInformationTracker.integrity||{}),temporalLeadOk:a.ok,temporalIssues:a.issues};m.publicInformationTracker.auditVersion=PATCH;this.file('range-review.json',JSON.stringify(m,null,2))}}}catch(e){safeLog('tracker-audit-zip-error-v471',{message:e?.message||String(e)})}return original.apply(this,args)};Object.defineProperty(Z.prototype,'__wbTrackerAudit471',{value:true});return true}

  function updateHeader(){const h=$q('header h1'),s=$q('header p');if(h)h.textContent='シャドバWB リプレイ診断 v4.7.1';if(s)s.textContent='Build 2026.09.15-06 / トラッカー時系列チェック強化'}
  let n=0;const tm=setInterval(()=>{n++;enhanceCards();hookCheck();hookZip();renderAudit();updateHeader();if(n>300)clearInterval(tm)},120);
  safeLog('patch-v471-active',{feature:'tracker-temporal-audit-and-retime'});
})();
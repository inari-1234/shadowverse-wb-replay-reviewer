from pathlib import Path
import re

# --- ReplaySession becomes the sole Review Card presentation authority. ---
p=Path('replay-session.js'); s=p.read_text()
s=s.replace("const VERSION='replay-session-clean-1.15';","const VERSION='replay-session-clean-1.16';")
s=s.replace("reviewProfile:W.ReviewEngine?.activeProfile?.()||'none',states:[],actions:[],observedEpisodes:[],decisionWindows:[],observationReviewPoints:[],reviewSignals:[],supplementalReviewPoints:[],reviewPoints:[],scenes:[],tacticalReview:null",
"reviewProfile:W.ReviewEngine?.activeProfile?.()||'none',states:[],actions:[],observedEpisodes:[],decisionWindows:[],observationReviewPoints:[],reviewSignals:[],supplementalReviewPoints:[],reviewPoints:[],scenes:[],tacticalReview:null,authorityPresentations:{},comparisonCoachPresentations:{}")
s=s.replace("s.states=[];s.actions=[];s.observedEpisodes=[];s.decisionWindows=[];s.observationReviewPoints=[];s.reviewSignals=keepSignals;s.supplementalReviewPoints=deriveSupplementalReviewPoints(keepSignals);s.reviewPoints=clone(s.supplementalReviewPoints);s.scenes=keepScenes;s.tacticalReview=null;s.updatedAt=nowIso();",
"s.states=[];s.actions=[];s.observedEpisodes=[];s.decisionWindows=[];s.observationReviewPoints=[];s.reviewSignals=keepSignals;s.supplementalReviewPoints=deriveSupplementalReviewPoints(keepSignals);s.reviewPoints=clone(s.supplementalReviewPoints);s.scenes=keepScenes;s.tacticalReview=null;s.authorityPresentations={};s.comparisonCoachPresentations={};s.updatedAt=nowIso();")

insert_after="function snapshot(){return current?sessionForStorage(current):null}\n"
block="""function presentationRunMatches(row,s=current){const runId=s?.analysisRun?.runId||null;return !!row&&!!runId&&String(row.runId||'')===String(runId)}
function setAuthorityPresentation(windowId,presentation,{commit=true}={}){const s=ensureCurrent(),id=String(windowId||''),p=clone(presentation);if(!s||!id||!p||p.authority!=='fresh-exact'||String(p.windowId||id)!==id||!presentationRunMatches(p,s))return false;s.authorityPresentations??={};s.authorityPresentations[id]=p;s.updatedAt=nowIso();expose();if(commit)schedulePersist();return true}
function setComparisonCoachPresentation(windowId,presentation,{commit=true}={}){const s=ensureCurrent(),id=String(windowId||''),p=clone(presentation);if(!s||!id||!p||String(p.windowId||id)!==id||!presentationRunMatches(p,s))return false;s.comparisonCoachPresentations??={};s.comparisonCoachPresentations[id]=p;s.updatedAt=nowIso();expose();if(commit)schedulePersist();return true}
function clearAuthorityPresentations({commit=true}={}){const s=ensureCurrent();if(!s)return false;s.authorityPresentations={};s.comparisonCoachPresentations={};s.updatedAt=nowIso();expose();if(commit)schedulePersist();return true}
function commitAuthorityPresentations(){return schedulePersist()}
"""
if insert_after not in s: raise SystemExit('snapshot marker missing')
s=s.replace(insert_after,insert_after+block)

old_model="""function reviewWindowModels(session=current){
  const s=session||{},pointById=new Map((s.observationReviewPoints||[]).map(x=>[x.id,x]));
  return(s.decisionWindows||[]).map(window=>{
    const points=(window.reviewPointIds||[]).map(id=>pointById.get(id)).filter(Boolean),first=points[0]||null,
      observedChanges=clone(window.observedChanges||[]),changedKeys=[...reviewChangedKeys(observedChanges)],
      model={
        id:window.id,turn:window.turn??first?.turn??null,reviewStart:finite(window.reviewStart),reviewEnd:finite(window.reviewEnd),
        title:first?.title||'重要な状態変化',priority:first?.priority||'review',
        beforeState:clone(window.beforeState),afterState:clone(window.afterState),
        beforeRows:reviewStateRows(window.beforeState,changedKeys),afterRows:reviewStateRows(window.afterState,changedKeys),
        observedChanges,changedKeys,importanceReasons:clone(window.importanceReasons||[]),
        confidence:window.confidence||'observed',unknownFields:clone(window.unknownFields||[]),
        unresolved:clone(window.unresolved||[]),causalAttribution:false,reviewPointIds:clone(window.reviewPointIds||[])
      };
    model.coach=typeof W.ReviewEngine?.deriveWindowCoach==='function'?W.ReviewEngine.deriveWindowCoach(model):null;
    model.cardUseCandidates=typeof W.ReviewEngine?.deriveCardUseCandidates==='function'?W.ReviewEngine.deriveCardUseCandidates(model):[];
    return model
  })
}
"""
new_model="""function reviewWindowModels(session=current){
  const s=session||{},pointById=new Map((s.observationReviewPoints||[]).map(x=>[x.id,x])),runId=s?.analysisRun?.runId||null;
  return(s.decisionWindows||[]).map(window=>{
    const id=String(window?.id||''),authority=s?.authorityPresentations?.[id],coachPresentation=s?.comparisonCoachPresentations?.[id],useAuthority=!!runId&&presentationRunMatches(authority,s)&&authority?.authority==='fresh-exact',useCoach=!!runId&&presentationRunMatches(coachPresentation,s),
      beforeState=useAuthority?clone(authority.beforeState):clone(window.beforeState),afterState=useAuthority?clone(authority.afterState):clone(window.afterState),
      points=(window.reviewPointIds||[]).map(pid=>pointById.get(pid)).filter(Boolean),first=points[0]||null,observedChanges=clone(window.observedChanges||[]),changedKeys=[...reviewChangedKeys(observedChanges)],
      model={id:window.id,turn:useAuthority?(finite(authority.turn)??finite(beforeState?.turn)??finite(afterState?.turn)):(window.turn??first?.turn??null),reviewStart:useAuthority?finite(authority.reviewStart):finite(window.reviewStart),reviewEnd:useAuthority?finite(authority.reviewEnd):finite(window.reviewEnd),title:first?.title||'重要な状態変化',priority:first?.priority||'review',beforeState,afterState,beforeRows:reviewStateRows(beforeState,changedKeys),afterRows:reviewStateRows(afterState,changedKeys),observedChanges,changedKeys,importanceReasons:clone(window.importanceReasons||[]),confidence:useAuthority?'fresh-exact':(window.confidence||'observed'),unknownFields:clone(window.unknownFields||[]),unresolved:clone(window.unresolved||[]),causalAttribution:false,reviewPointIds:clone(window.reviewPointIds||[]),authorityPresentation:useAuthority?clone(authority):null,comparisonCoach:useCoach?clone(coachPresentation):null};
    model.coach=useCoach?null:(typeof W.ReviewEngine?.deriveWindowCoach==='function'?W.ReviewEngine.deriveWindowCoach(model):null);
    model.cardUseCandidates=typeof W.ReviewEngine?.deriveCardUseCandidates==='function'?W.ReviewEngine.deriveCardUseCandidates(model):[];
    return model
  })
}
"""
if old_model not in s: raise SystemExit('reviewWindowModels block missing')
s=s.replace(old_model,new_model)

marker="function renderCardUseCandidates(candidates=[]){"
comparison_renderer="""function renderComparisonCoach(coach){if(!coach)return'';const list=(title,rows,cls='')=>Array.isArray(rows)&&rows.length?`<div${cls?` class=\"${cls}\"`:''}><b>${W.escape(title)}</b><ul>${rows.map(x=>`<li>${W.escape(x)}</li>`).join('')}</ul></div>`:'',claim=coach.claim==='CONFIRMED'?'確認済み':coach.claim==='CONDITIONAL'?'見えている範囲':'保留';return`<section class=\"comparisonCoach comparisonCoach-${W.escape(String(coach.claim||'HOLD').toLowerCase())}\" data-comparison-coach=\"1\" data-comparison-window=\"${W.escape(coach.windowId||'')}\"><div class=\"comparisonCoachHeader\"><b>比較コーチ</b><span class=\"comparisonCoachClaim\">${W.escape(claim)}</span></div><p class=\"comparisonCoachHeadline\">${W.escape(coach.headline||'')}</p>${list('推奨理由',coach.whyBest,'comparisonCoachReasons')}${coach.alternativeDescription?`<div class=\"comparisonCoachAlternative\"><b>別候補</b><p>${W.escape(coach.alternativeDescription)}</p>${list('別候補の長所',coach.alternativeReasons)}${list('別候補が有力になる条件',coach.reversalConditions)}</div>`:''}${coach.playedMoveComparison?.visible?`<div class=\"comparisonCoachPlayedMove\"><b>実際の手との比較</b><p>${W.escape(coach.playedMoveComparison.text||'')}</p>${list('差が出た点',coach.playedMoveComparison.reasons)}</div>`:''}${list('注意・未確定条件',coach.cautions,'comparisonCoachCautions')}${list('比較根拠',coach.evidenceSummary,'comparisonCoachEvidence')}</section>`}
"""
if marker not in s: raise SystemExit('card candidate marker missing')
s=s.replace(marker,comparison_renderer+marker)

# Replace only the final coach fragment inside renderDecisionWindowCard.
s=s.replace("${renderCardUseCandidates(model.cardUseCandidates)}${renderWindowCoach(model.coach)}<div class=\"reviewWindowMeta\">","${renderCardUseCandidates(model.cardUseCandidates)}${model.comparisonCoach?renderComparisonCoach(model.comparisonCoach):renderWindowCoach(model.coach)}<div class=\"reviewWindowMeta\">")

old_auth_play="""function reviewAuthorityPlaybackStart(windowId){
  const root=W.$('#reviewPoints'),buttons=root?.querySelectorAll?.('[data-review-video-window]')||[];
  for(const button of buttons)if(String(button?.dataset?.reviewVideoWindow||'')===String(windowId||'')){const t=finite(button?.dataset?.reviewAuthorityStart);if(t!=null)return t}
  return null
}
"""
new_auth_play="""function reviewAuthorityPlaybackStart(windowId){const model=reviewPlaybackModels().find(x=>String(x?.id||'')===String(windowId||''))||null;return finite(model?.authorityPresentation?.reviewStart)}
"""
if old_auth_play not in s: raise SystemExit('reviewAuthorityPlaybackStart block missing')
s=s.replace(old_auth_play,new_auth_play)
s=s.replace("const model=models[index],boundStart=finite(authorityStart)??reviewAuthorityPlaybackStart(windowId),start=reviewPlaybackStart(model,boundStart);","const model=models[index],boundStart=reviewAuthorityPlaybackStart(windowId),start=reviewPlaybackStart(model,boundStart);")
s=s.replace("playReviewWindow(videoButton.dataset.reviewVideoWindow,videoButton.dataset.reviewAuthorityStart);return","playReviewWindow(videoButton.dataset.reviewVideoWindow);return")

s=s.replace("W.ReplaySession={version:VERSION,schema:SESSION_SCHEMA,dbName:DB_NAME,persistenceMode,emptySession,migrateLoadedSession,beginAnalysisRun,normalizeCapture,deriveActions","W.ReplaySession={version:VERSION,schema:SESSION_SCHEMA,dbName:DB_NAME,persistenceMode,emptySession,migrateLoadedSession,beginAnalysisRun,setAuthorityPresentation,setComparisonCoachPresentation,clearAuthorityPresentations,commitAuthorityPresentations,normalizeCapture,deriveActions")
s=s.replace("renderReviewComparison,renderWindowCoach,renderCardUseCandidates,renderDecisionWindowCard","renderReviewComparison,renderWindowCoach,renderComparisonCoach,renderCardUseCandidates,renderDecisionWindowCard")
s=s.replace("reviewPlaybackAuthority:'fresh-exact-dom-override-v1'","reviewPlaybackAuthority:'fresh-exact-session-model-v2'")
p.write_text(s)

# --- Runtime binding owns exact-capture presentation snapshots; ReplaySession states remain untouched. ---
p=Path('runtime-authority-binding.js'); s=p.read_text()
marker="function bindingForWindow(windowId,runId=null){const row=windowAuthorityBindings.get(String(windowId||''))||null;if(!row)return null;if(runId&&String(row.runId)!==String(runId))return null;return clone(row)}\n"
extra="""function replayStateFromObservation(obs){if(!obs)return null;return{id:obs.sourceStateId||null,time:safeFinite(obs.time),turn:safeFinite(obs.turn),absoluteSide:obs.absoluteSide??null,relativeSide:obs.relativeSide??null,pp:safeFinite(obs.pp),opponentHP:safeFinite(obs.opponentHP),resources:clone(obs.resources||{}),opponentWard:String(obs.opponentWard??'unknown'),boardDamage:safeFinite(obs.boardDamage),boardDamageKnown:obs.boardDamageKnown===true,hand:{recognized:clone(obs.handRecognized||{})},partial:obs.partial===true,authoritySource:'fresh-exact'} }
function presentationForWindow(windowId,runId=null){const id=String(windowId||''),binding=bindingForWindow(id,runId);if(!binding||!runId||String(binding.runId||'')!==String(runId)||binding.complete!==true||binding.anchorExact!==true||binding.afterExact!==true||binding.blocked===true)return null;const beforeObs=captures.get(String(binding.anchorStateId||''))||null,afterObs=captures.get(String(binding.afterStateId||''))||null,before=replayStateFromObservation(beforeObs),after=replayStateFromObservation(afterObs),start=safeFinite(binding.anchorTime),end=safeFinite(binding.afterTime);if(!before||!after||start==null||end==null||String(before.id||'')!==String(binding.anchorStateId||'')||String(after.id||'')!==String(binding.afterStateId||'')||Math.abs(safeFinite(before.time)-start)>.035||Math.abs(safeFinite(after.time)-end)>.035||end<start||!sameTurnSide(before,after))return null;return{version:'pf1r2-single-presentation-v1',authority:'fresh-exact',windowId:id,runId:String(binding.runId),nonce:binding.nonce||null,anchored:binding.anchored===true,reviewStart:start,reviewEnd:end,turn:safeFinite(before.turn)??safeFinite(after.turn),beforeState:before,afterState:after,binding:clone(binding)}}
"""
if marker not in s: raise SystemExit('binding marker missing')
s=s.replace(marker,marker+extra)
s=s.replace("decisionWindowTargets,bindingForWindow,enrichDecisionWindows","decisionWindowTargets,bindingForWindow,presentationForWindow,enrichDecisionWindows")
p.write_text(s)

# --- CoachIntegration only writes data into ReplaySession; it no longer patches DOM. ---
p=Path('coach-integration.js'); s=p.read_text()
s=s.replace("const VERSION='pe2-coach-integration-v1.1.0',EVENT='comparison-decision-ready',PRESENTATION_VERSION='pf1r2-live-presentation-v1.0.0';","const VERSION='pe2-coach-integration-v1.2.0',EVENT='comparison-decision-ready',PRESENTATION_VERSION='pf1r2-single-presentation-v1';")
# Delegate exact presentation creation to binding layer, which owns private exact captures.
s=re.sub(r"function sameTurnSide\([\s\S]*?\nfunction stateDisplay", "function authorityPresentationForWindow(windowId,runId=null){const id=text(windowId);if(!id||!runId)return null;return clone(W.RuntimeAuthorityBinding?.presentationForWindow?.(id,runId)||null)}\nfunction stateDisplay", s, count=1)
# Keep compatibility function name but make it a model setter, not a DOM mutator.
s=re.sub(r"function applyAuthorityPresentation\([\s\S]*?\nfunction suppressLegacyCoach", "function applyAuthorityPresentation(_host,presentation,{commit=false}={}){const p=clone(presentation);if(!p?.windowId)return false;return W.ReplaySession?.setAuthorityPresentation?.(p.windowId,p,{commit})===true}\nfunction suppressLegacyCoach", s, count=1)
# Replace data-flow functions from decorateAuthorityBindings through scheduleDecorate.
start=s.index('function decorateAuthorityBindings()')
end=s.index('function currentAnalysisRunId()',start)
new="""function decorateAuthorityBindings(){const snap=W.RuntimeAuthorityBinding?.snapshot?.()||null,runId=snap?.currentFreshRun?.runId||W.ReplaySession?.snapshot?.()?.analysisRun?.runId||null,bindings=Array.isArray(snap?.windowAuthorityBindings)?snap.windowAuthorityBindings:[];if(!runId)return 0;let count=0;for(const binding of bindings){const windowId=text(binding?.windowId);if(!windowId||String(binding?.runId||'')!==String(runId))continue;const p=authorityPresentationForWindow(windowId,runId);if(p&&W.ReplaySession?.setAuthorityPresentation?.(windowId,p,{commit:false})===true)count++}return count}
function decorate(){const authorityCount=decorateAuthorityBindings();let coachCount=0;for(const [windowId,row] of items){const p=authorityPresentationForWindow(windowId,row?.runId||null);if(p)W.ReplaySession?.setAuthorityPresentation?.(windowId,p,{commit:false});const model=presentationModel(row);if(model&&row?.runId&&W.ReplaySession?.setComparisonCoachPresentation?.(windowId,{...clone(model),version:PRESENTATION_VERSION,windowId,runId:row.runId},{commit:false})===true)coachCount++}if(authorityCount||coachCount)W.ReplaySession?.commitAuthorityPresentations?.();expose();return coachCount||authorityCount}
function scheduleDecorate(){if(typeof queueMicrotask==='function')queueMicrotask(decorate);else setTimeout(decorate,0)}
"""
s=s[:start]+new+s[end:]
# Clearing coach state also clears the ReplaySession-owned presentation model.
s=re.sub(r"function clear\(\)\{[\s\S]*?return true\}", "function clear(){items.clear();expose();W.ReplaySession?.clearAuthorityPresentations?.({commit:false});return true}", s, count=1)
# Do not inject style/DOM on ready; rendering is ReplaySession-owned.
s=s.replace("W.onReady(()=>{loadAuthority().then(()=>{ensureStyle();decorate();W.log?.('optional-module-ready'","W.onReady(()=>{loadAuthority().then(()=>{decorate();W.log?.('optional-module-ready'")
p.write_text(s)

# Align version expectations in existing PE2 tests only where the version itself is asserted.
for name in ['tests/pe2-coach-integration-regression.mjs','tests/pe1r1-pe2r1-coach-semantic-corrective-regression.mjs','tests/pf1r2-live-presentation-regression.mjs']:
    q=Path(name)
    if q.exists():
        text=q.read_text().replace("pe2-coach-integration-v1.1.0","pe2-coach-integration-v1.2.0").replace("pf1r2-live-presentation-v1.0.0","pf1r2-single-presentation-v1")
        q.write_text(text)

print('P0-2 single presentation authority patch applied')

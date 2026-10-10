from pathlib import Path
import re

# ReplaySession: retain the analysis nonce and accept it from production start event.
p=Path('replay-session.js'); s=p.read_text()
s=s.replace("function makeAnalysisRun(meta={}){const startedAt=meta?.startedAt||nowIso(),runId=String(meta?.runId||`analysis:${Date.parse(startedAt)||Date.now()}:${Math.random().toString(36).slice(2,10)}`);return{runId,startedAt,source:meta?.source||'match-analysis-start',sourceKey:sourceKey()}}",
"function makeAnalysisRun(meta={}){const startedAt=meta?.startedAt||nowIso(),nonce=String(meta?.nonce||globalThis.crypto?.randomUUID?.()||`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`),runId=String(meta?.runId||`analysis:${Date.parse(startedAt)||Date.now()}:${nonce}`);return{runId,nonce,startedAt,source:meta?.source||'match-analysis-start',sourceKey:sourceKey()}}")
s=s.replace("beginAnalysisRun({runId:detail?.runId||null,startedAt:detail?.startedAt||null,source:'match-analysis-start'})","beginAnalysisRun({runId:detail?.runId||null,nonce:detail?.nonce||null,startedAt:detail?.startedAt||null,source:'match-analysis-start'})")
p.write_text(s)

# StateRecognition: create one run identity at analysis start and allow PF0B capture to stay private.
p=Path('state-recognition.js'); s=p.read_text()
old="""async function analyzeMatchTargetTurns(){
  const status=WB.$('#matchAnalysisStatus'),targetSide=WB.targetSide(),plan=matchAnalysisPlan(WB.turnTimeline,targetSide,WB.video?.duration),original=Number(WB.video?.currentTime),uiSnapshot=snapshotBatchInputs(),startedAt=new Date().toISOString(),
    result={version:MATCH_ANALYZE_VERSION,targetSide,totalTurns:plan.length,eligibleTurns:plan.filter(x=>x.eligible).length,completedTurns:0,skippedTurns:0,cancelled:false,startedAt,finishedAt:null,turns:[],skipped:[],session:null};
"""
new="""async function analyzeMatchTargetTurns(){
  const status=WB.$('#matchAnalysisStatus'),targetSide=WB.targetSide(),plan=matchAnalysisPlan(WB.turnTimeline,targetSide,WB.video?.duration),original=Number(WB.video?.currentTime),uiSnapshot=snapshotBatchInputs(),startedAt=new Date().toISOString(),nonce=String(globalThis.crypto?.randomUUID?.()||`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`),runId=`match:${Date.now()}:${nonce}`,
    result={version:MATCH_ANALYZE_VERSION,targetSide,totalTurns:plan.length,eligibleTurns:plan.filter(x=>x.eligible).length,completedTurns:0,skippedTurns:0,cancelled:false,runId,nonce,startedAt,finishedAt:null,turns:[],skipped:[],session:null};
"""
if old not in s: raise SystemExit('analyzeMatchTargetTurns header not found')
s=s.replace(old,new)
s=s.replace("WB.emit('match-analysis-start',{targetSide,totalTurns:plan.length});","WB.emit('match-analysis-start',{targetSide,totalTurns:plan.length,runId,nonce,startedAt});")
old_tail="""WB.stateCapture=capture;const history=Array.isArray(WB.stateCaptureHistory)?WB.stateCaptureHistory:[];history.push(capture);WB.stateCaptureHistory=history.slice(-5);if(status){"""
new_tail="""WB.stateCapture=capture;const recordStateHistory=options?.recordStateHistory!==false,publishStateCaptured=options?.publishStateCaptured!==false;if(recordStateHistory){const history=Array.isArray(WB.stateCaptureHistory)?WB.stateCaptureHistory:[];history.push(capture);WB.stateCaptureHistory=history.slice(-5)}if(status){"""
if old_tail not in s: raise SystemExit('capture history block not found')
s=s.replace(old_tail,new_tail)
s=s.replace("renderStateSummary(WB.stateCapture);WB.log('canonical-state-fill',WB.stateCapture);WB.emit('state-captured',{capture:WB.stateCapture});return WB.stateCapture}","renderStateSummary(WB.stateCapture);WB.log('canonical-state-fill',WB.stateCapture);if(publishStateCaptured)WB.emit('state-captured',{capture:WB.stateCapture});return WB.stateCapture}")
p.write_text(s)

# Runtime pipeline: no pre-authority evaluation. Clear stale results as soon as the new run begins.
p=Path('runtime-decision-pipeline.js'); s=p.read_text()
s=s.replace("function bind(){W.on?.('match-analysis-complete',detail=>{if(detail?.cancelled)return;evaluateSession(detail).catch(err=>W.recordError?.('pf1-runtime-session',err))});W.on?.('video-reset',clear)}","function bind(){W.on?.('match-analysis-start',clear);W.on?.('video-reset',clear)}")
p.write_text(s)

# Runtime binding: share ReplaySession run identity, never fall back to previous run, and keep PF0B captures private.
p=Path('runtime-authority-binding.js'); s=p.read_text()
s=s.replace("let readyPromise=null,boundEvents=false,pendingMatchAnalysis=null,enrichPromise=null,lastEnrichment=null,lastFreshEvidence=null,lastHpGuard=null,currentFreshRun=null,freshRunSequence=0;","let readyPromise=null,boundEvents=false,pendingMatchAnalysis=null,enrichPromise=null,lastEnrichment=null,lastFreshEvidence=null,lastHpGuard=null,currentFreshRun=null;")
s=re.sub(r"function makeFreshRunIdentity\(\)\{[^\n]*\}\n",'',s,count=1)
s=s.replace("const requestedRunId=context?.analysis?.pf0b?.runId||context?.freshRunId||currentFreshRun?.runId||null","const requestedRunId=context?.analysis?.pf0b?.runId||context?.runId||null")
s=s.replace("function bindEvents(){if(boundEvents)return;boundEvents=true;W.on?.('state-captured'","function bindEvents(){if(boundEvents)return;boundEvents=true;W.on?.('match-analysis-start',()=>clearRuntimeAuthority());W.on?.('state-captured'")
old_start="""async function enrichDecisionWindows(detail={}){if(enrichPromise)return enrichPromise;enrichPromise=(async()=>{await ready();const run=makeFreshRunIdentity();currentFreshRun=run;decisionAuthorityIds.clear();windowAuthorityBindings.clear();W.RuntimeDecisionPipeline?.clear?.();W.CoachIntegration?.clear?.();const captureFn=W.StateRecognition?.captureState;"""
new_start="""async function enrichDecisionWindows(detail={}){if(enrichPromise)return enrichPromise;enrichPromise=(async()=>{await ready();const session=W.ReplaySession?.snapshot?.()||window.__wbReplaySessionV1||null,analysisRun=session?.analysisRun||null,runId=detail?.runId||analysisRun?.runId||null,nonce=detail?.nonce||analysisRun?.nonce||null;if(!runId||!nonce||String(analysisRun?.runId||'')!==String(runId)||String(analysisRun?.nonce||'')!==String(nonce)){lastEnrichment={version:CAPTURE_VERSION,gateVersion:FRESH_GATE_VERSION,runId:runId||null,nonce:nonce||null,status:'FAILED',reason:'analysis-run-identity-missing-or-mismatch',targets:0,captureTargets:0,captured:0,capturedWindows:0,reused:0,failed:1,failures:[{reason:'analysis-run-identity-missing-or-mismatch'}],windowBindings:[],analysisFinishedAt:detail?.finishedAt||null,at:new Date().toISOString()};return clone(lastEnrichment)}const run={runId:String(runId),nonce:String(nonce),startedAt:analysisRun?.startedAt||detail?.startedAt||null};currentFreshRun=run;decisionAuthorityIds.clear();windowAuthorityBindings.clear();W.RuntimeDecisionPipeline?.clear?.();W.CoachIntegration?.clear?.();const captureFn=W.StateRecognition?.captureState;"""
if old_start not in s: raise SystemExit('enrich start not found')
s=s.replace(old_start,new_start)
s=s.replace("captureFn({handHistory:false,captureMode:'decision-authority',sharedFrameReuse:true})","captureFn({handHistory:false,captureMode:'decision-authority',sharedFrameReuse:true,publishStateCaptured:false,recordStateHistory:false})")
p.write_text(s)

# Coach: direct event path must also be same-run exact-bound, not only the backfill path.
p=Path('coach-integration.js'); s=p.read_text()
insert="""function currentAnalysisRunId(){return W.ReplaySession?.snapshot?.()?.analysisRun?.runId||window.__wbReplaySessionV1?.analysisRun?.runId||null}\n"""
marker="function scheduleDecorate(){if(typeof queueMicrotask==='function')queueMicrotask(decorate);else setTimeout(decorate,0)}\n"
if marker not in s: raise SystemExit('coach marker not found')
s=s.replace(marker,marker+insert)
old="async function ingestDecision(detail={}){const d=normalizeDetail(detail);if(!d.windowId||!d.decision)return null;const authority=await loadAuthority(),explanation=authority.explainDecision(d.decision,{playedMove:d.playedMove}),row="
new="async function ingestDecision(detail={}){const d=normalizeDetail(detail),activeRunId=currentAnalysisRunId();if(!d.windowId||!d.decision||!d.runId||!activeRunId||String(d.runId)!==String(activeRunId)||!authorityPresentationForWindow(d.windowId,d.runId))return null;const authority=await loadAuthority(),explanation=authority.explainDecision(d.decision,{playedMove:d.playedMove}),row="
if old not in s: raise SystemExit('coach ingestDecision start not found')
s=s.replace(old,new)
s=s.replace("function bind(){W.on(EVENT,detail=>{ingestDecision(detail).catch(err=>W.recordError?.('pe2-coach-integration',err))});","function bind(){W.on?.('match-analysis-start',clear);W.on(EVENT,detail=>{ingestDecision(detail).catch(err=>W.recordError?.('pe2-coach-integration',err))});")
p.write_text(s)

print('P1 single fresh pipeline patch applied')

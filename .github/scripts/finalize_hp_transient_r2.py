from pathlib import Path
import json,re,hashlib,base64

# 1) Correct only the Replay Decision Authority HP transient guard.
p=Path('runtime-authority-binding.js')
s=p.read_text()
s=s.replace("HP_GUARD_VERSION='pf1r2-hp-transient-guard-v1.0.0'","HP_GUARD_VERSION='pf1r2-hp-transient-guard-v1.1.0'",1)
new_fn=r'''function stabilizeReplayHp(analysis={}){
  const session=W.ReplaySession?.snapshot?.()||window.__wbReplaySessionV1||null,
    ingest=W.ReplaySession?.ingestState,
    turns=Array.isArray(analysis?.turns)?analysis.turns:[],
    states=Array.isArray(session?.states)?session.states.slice():[],
    corrections=[],skipped=[];
  if(!session||typeof ingest!=='function'||!turns.length){
    lastHpGuard={version:HP_GUARD_VERSION,status:'UNAVAILABLE',reason:!session?'replay-session-unavailable':typeof ingest!=='function'?'replay-ingest-unavailable':'analysis-turns-unavailable',corrections:[],skipped:[],at:new Date().toISOString()};
    window.__wbPF1R2HpTransientGuardV1=clone(lastHpGuard);return clone(lastHpGuard)
  }
  for(const turnRow of turns){
    const turn=safeFinite(turnRow?.turn),start=safeFinite(turnRow?.fromTime),end=safeFinite(turnRow?.toTime),baseline=safeFinite(turnRow?.hpFrom),summaryTo=safeFinite(turnRow?.hpTo),side=turnRow?.absoluteSide??null;
    if(turn==null||start==null||end==null||baseline==null||summaryTo==null||end<start)continue;
    // Evidence authority is the normalized ReplaySession for this same turn/side.
    // We intentionally allow observations after compact analysis.toTime so a summary
    // that stops on the transient B value can still be bracketed by a later A value.
    const rows=states.filter(s=>safeFinite(s?.turn)===turn&&(!side||!s?.absoluteSide||String(s.absoluteSide)===String(side))&&safeFinite(s?.time)!=null&&safeFinite(s.time)>=start-.001).sort((a,b)=>safeFinite(a.time)-safeFinite(b.time)),
      off=rows.filter(s=>{const hp=safeFinite(s?.opponentHP);return hp!=null&&hp!==baseline});
    if(off.length!==1){if(off.length>1)skipped.push({turn,reason:'multiple-off-baseline-observations',count:off.length});continue}
    const suspect=off[0],suspectTime=safeFinite(suspect.time),rawHp=safeFinite(suspect.opponentHP);
    if(suspectTime==null||suspectTime>end+.001){skipped.push({turn,stateId:suspect.id,reason:'off-baseline-outside-analysis-window'});continue}
    if(summaryTo!==baseline&&rawHp!==summaryTo){skipped.push({turn,stateId:suspect.id,reason:'analysis-endpoint-mismatch'});continue}
    const hasBefore=rows.some(s=>safeFinite(s.time)<suspectTime&&safeFinite(s.opponentHP)===baseline),
      hasAfter=rows.some(s=>safeFinite(s.time)>suspectTime&&safeFinite(s.opponentHP)===baseline);
    if(!hasBefore||!hasAfter){skipped.push({turn,stateId:suspect.id,reason:'baseline-bracketing-missing'});continue}
    ingest(replayCaptureWithUnknownHp(suspect));captures.delete(String(suspect.id||''));decisionAuthorityIds.delete(String(suspect.id||''));
    corrections.push({turn,stateId:String(suspect.id||''),time:suspectTime,rawHp,endpointHp:baseline,reason:'isolated-transient-hp-vs-same-turn-baseline',action:'replay-hp-marked-unknown'})
  }
  lastHpGuard={version:HP_GUARD_VERSION,status:corrections.length?'CORRECTED':'NOOP',correctionCount:corrections.length,corrections,skipped,analysisFinishedAt:analysis?.finishedAt||null,at:new Date().toISOString()};
  window.__wbPF1R2HpTransientGuardV1=clone(lastHpGuard);W.log?.('replay-hp-transient-guard',clone(lastHpGuard));W.emit?.('replay-hp-transient-guard',clone(lastHpGuard));return clone(lastHpGuard)
}'''
s,n=re.subn(r"function stabilizeReplayHp\(analysis=\{\}\)\{.*?\}\nfunction bindEvents",new_fn+'\nfunction bindEvents',s,count=1,flags=re.S)
if n!=1: raise SystemExit('stabilizeReplayHp replacement failed')
p.write_text(s)

# 2) Keep the original guard regression authoritative, updating only version/reason labels.
t=Path('tests/pf1r2-hp-transient-guard-regression.mjs').read_text()
t=t.replace("pf1r2-hp-transient-guard-v1.0.0","pf1r2-hp-transient-guard-v1.1.0")
t=t.replace("isolated-transient-hp-vs-equal-turn-endpoints","isolated-transient-hp-vs-same-turn-baseline")
t=t.replace("multiple-off-endpoint-observations","multiple-off-baseline-observations")
t=t.replace("endpoint-bracketing-missing","baseline-bracketing-missing")
Path('tests/pf1r2-hp-transient-guard-regression.mjs').write_text(t)

# 3) Promote the real-device recurrence into the permanent global gate.
g=Path('tests/run-quality-gate.mjs').read_text()
g=g.replace("const GATE_VERSION='recognition-quality-gate-v109';","const GATE_VERSION='recognition-quality-gate-v110';",1)
needle="  'tests/pf1r2-hp-transient-guard-regression.mjs',\n"
add="  'tests/pf1r2-hp-transient-live-summary-regression.mjs',\n"
if add not in g:
    if needle not in g: raise SystemExit('gate insertion point missing')
    g=g.replace(needle,needle+add,1)
Path('tests/run-quality-gate.mjs').write_text(g)

# 4) Recompute Runtime Code Authority from final executable bytes.
assets=['app-core.js','turn-recognition.js','mulligan-class.js','card-db.js','hand-recognition.js','state-recognition.js','replay-session.js','review-engine.js','counterfactual-review.js','diagnostics.js','coach-integration.js','coach-explanation.js','runtime-decision-pipeline.js','runtime-authority-binding.js','legal-action-sequence.js','outcome-backtracking.js','comparison-decision.js','played-move-authority.js','position-state-runtime.js','common-rule-engine-runtime.js']
integrity={}; hex_digests={}
for name in assets:
    data=Path(name).read_bytes(); d=hashlib.sha256(data).digest(); hex_digests[name]=d.hex(); integrity[name]='sha256-'+base64.b64encode(d).decode()
seed='\n'.join(f'{name}:{hex_digests[name]}' for name in sorted(assets)).encode()
build_id='candidate-assets-'+hashlib.sha256(seed).hexdigest()[:12]
manifest={'version':'runtime-code-authority-v1','buildId':build_id,'assets':assets,'integrity':integrity}
idx=Path('index.html').read_text()
idx,n=re.subn(r'window\.__wbRuntimeAssetManifest=\{.*?\};','window.__wbRuntimeAssetManifest='+json.dumps(manifest,separators=(',',':'))+';',idx,count=1,flags=re.S)
if n!=1: raise SystemExit('runtime manifest replacement failed')
Path('index.html').write_text(idx)
latest=json.loads(Path('latest.json').read_text())
latest['runtimeBuildId']=build_id; latest['runtimeAssetCount']=len(assets)
Path('latest.json').write_text(json.dumps(latest,ensure_ascii=False,indent=2)+'\n')

# 5) No implementation-only automation may remain in the finalized candidate.
for name in [
  '.github/workflows/hp-transient-r2-check.yml',
  '.github/scripts/finalize_hp_transient_r2.py',
  '.github/workflows/finalize-hp-transient-r2.yml',
]:
    Path(name).unlink(missing_ok=True)
print('FINAL_RUNTIME_BUILD_ID',build_id)

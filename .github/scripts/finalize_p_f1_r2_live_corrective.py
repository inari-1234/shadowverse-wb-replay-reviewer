from pathlib import Path
import json,re,hashlib,base64

# Promote live exact-capture parity into the formal global gate.
g=Path('tests/run-quality-gate.mjs').read_text()
g=g.replace("const GATE_VERSION='recognition-quality-gate-v108';","const GATE_VERSION='recognition-quality-gate-v109';")
needle="  'tests/pf1r2-live-position-state-parity-regression.mjs',\n"
add="  'tests/pf1r2-live-capture-pipeline-regression.mjs',\n"
if add not in g:
    if needle not in g: raise SystemExit('gate insertion point missing')
    g=g.replace(needle,needle+add,1)
Path('tests/run-quality-gate.mjs').write_text(g)

# Recompute Runtime Code Authority from the final executable JS bytes.
assets=['app-core.js','turn-recognition.js','mulligan-class.js','card-db.js','hand-recognition.js','state-recognition.js','replay-session.js','review-engine.js','counterfactual-review.js','diagnostics.js','coach-integration.js','coach-explanation.js','runtime-decision-pipeline.js','runtime-authority-binding.js','legal-action-sequence.js','outcome-backtracking.js','comparison-decision.js','played-move-authority.js','position-state-runtime.js','common-rule-engine-runtime.js']
integrity={}; hex_digests={}
for p in assets:
    data=Path(p).read_bytes(); d=hashlib.sha256(data).digest(); hex_digests[p]=d.hex(); integrity[p]='sha256-'+base64.b64encode(d).decode()
seed='\n'.join(f'{p}:{hex_digests[p]}' for p in sorted(assets)).encode()
build_id='candidate-assets-'+hashlib.sha256(seed).hexdigest()[:12]
manifest={'version':'runtime-code-authority-v1','buildId':build_id,'assets':assets,'integrity':integrity}
idx=Path('index.html').read_text()
idx,n=re.subn(r'window\.__wbRuntimeAssetManifest=\{.*?\};','window.__wbRuntimeAssetManifest='+json.dumps(manifest,separators=(',',':'))+';',idx,count=1,flags=re.S)
if n!=1: raise SystemExit('runtime manifest replacement failed')
Path('index.html').write_text(idx)
latest=json.loads(Path('latest.json').read_text())
latest['runtimeBuildId']=build_id; latest['runtimeAssetCount']=len(assets)
Path('latest.json').write_text(json.dumps(latest,ensure_ascii=False,indent=2)+'\n')

# Remove implementation-only automation. Regression tests remain permanent.
for p in [
  '.github/scripts/apply_authority_only_presentation.py',
  '.github/workflows/apply-authority-only-presentation.yml',
  '.github/workflows/live-capture-pipeline-check.yml',
  '.github/scripts/finalize_p_f1_r2_live_corrective.py',
  '.github/workflows/finalize-p-f1-r2-live-corrective.yml',
]:
    Path(p).unlink(missing_ok=True)
print('FINAL_RUNTIME_BUILD_ID',build_id)

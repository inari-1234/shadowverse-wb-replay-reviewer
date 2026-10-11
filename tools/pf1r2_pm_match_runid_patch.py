from pathlib import Path
import hashlib, base64, json, re

root=Path('.')

def replace_once(path, old, new):
    p=root/path
    s=p.read_text(encoding='utf-8')
    n=s.count(old)
    if n != 1:
        raise SystemExit(f'{path}: expected exactly one match, got {n}: {old[:80]}')
    p.write_text(s.replace(old,new,1),encoding='utf-8')

# Production: keep fail-closed same-run authority, but accept the production match:<timestamp>: run id
# in addition to the historical pf1r2g:<timestamp>: test/gate run id.
replace_once(
    Path('played-move-authority.js'),
    "const VERSION='pf1r2-played-move-authority-v1.1.0';",
    "const VERSION='pf1r2-played-move-authority-v1.1.1';"
)
replace_once(
    Path('played-move-authority.js'),
    "function runStartMs(runId){const m=/^pf1r2g:(\\d+):/.exec(String(runId||''));if(!m)return null;const n=Number(m[1]);return Number.isFinite(n)?n:null;}",
    "function runStartMs(runId){const m=/^(?:pf1r2g|match):(\\d+):/.exec(String(runId||''));if(!m)return null;const n=Number(m[1]);return Number.isFinite(n)?n:null;}"
)

# Regression: retain the legacy run form and add the exact production run form observed on iPhone.
reg=Path('tests/pf1r2-played-move-authority-regression.mjs')
s=reg.read_text(encoding='utf-8')
s=s.replace("pf1r2-played-move-authority-v1.1.0","pf1r2-played-move-authority-v1.1.1")
old="""t('PM-22 video reset clears capture authority',()=>{P.indexCapture(anchorCap);for(const f of handlers.get('video-reset')||[])f({});assert.equal(P.snapshot().capturedStateCount,0)});\nassert.equal(n,22);console.log(`P-F1-R2-PM PLAYED MOVE AUTHORITY REGRESSION PASS: ${n}/${n}`);"""
new="""t('PM-22 production match run id resolves same-run exact anchor',()=>{const matchRunId=`match:${start}:device-run`;assert.equal(P.exactObservation(binding.anchorStateId,matchRunId).pp,2);assert.equal(P.exactObservation(binding.afterStateId,matchRunId).boardDamage,3)});\nt('PM-23 production match run id identifies played move',()=>{const matchRunId=`match:${start}:device-run`;const r=P.identify({windowId,runId:matchRunId,binding:{...binding,runId:matchRunId},sequences:[quickSeq,idleSeq],outcomes:[quick,idle]});assert.equal(r.status,'CONFIRMED');assert.equal(r.reason,'UNIQUE_EXACT_STATE_MATCH');assert.equal(r.playedCandidateId,'seq-quick')});\nt('PM-24 unsupported run id format fails closed',()=>{const badRunId=`other:${start}:device-run`;const r=P.identify({windowId,runId:badRunId,binding:{...binding,runId:badRunId},sequences:[quickSeq,idleSeq],outcomes:[quick,idle]});assert.equal(r.status,'UNKNOWN');assert.equal(r.reason,'EXACT_CAPTURE_MISSING')});\nt('PM-25 video reset clears capture authority',()=>{P.indexCapture(anchorCap);for(const f of handlers.get('video-reset')||[])f({});assert.equal(P.snapshot().capturedStateCount,0)});\nassert.equal(n,25);console.log(`P-F1-R2-PM PLAYED MOVE AUTHORITY REGRESSION PASS: ${n}/${n}`);"""
if s.count(old)!=1:
    raise SystemExit('played-move regression tail contract changed')
reg.write_text(s.replace(old,new,1),encoding='utf-8')

# Static contract: pin new version and require both supported timestamp-bearing run-id prefixes.
static=Path('tests/pf1r2pm-static-validation.mjs')
s=static.read_text(encoding='utf-8')
s=s.replace("pf1r2-played-move-authority-v1.1.0","pf1r2-played-move-authority-v1.1.1")
needle="must(pm,'INSUFFICIENT_OBSERVED_DELTA');must(pm,'changed.length<2');"
replacement="must(pm,'INSUFFICIENT_OBSERVED_DELTA');must(pm,'changed.length<2');must(pm,'(?:pf1r2g|match)');"
if s.count(needle)!=1:
    raise SystemExit('PM static insertion contract changed')
static.write_text(s.replace(needle,replacement,1),encoding='utf-8')

# Recompute the immutable 20-asset authority from exact post-fix bytes.
index=Path('index.html')
text=index.read_text(encoding='utf-8')
mm=re.search(r'const manifest=window\.__wbRuntimeAssetManifest=(\{.*?\});',text,re.S)
if not mm:
    raise SystemExit('runtime manifest not found')
manifest=json.loads(mm.group(1))
if len(manifest.get('assets',[]))!=20:
    raise SystemExit(f'unexpected runtime asset count: {len(manifest.get("assets",[]))}')
integrity={}
for name in manifest['assets']:
    raw=(root/name).read_bytes()
    integrity[name]='sha256-'+base64.b64encode(hashlib.sha256(raw).digest()).decode('ascii')
canonical='\n'.join(f'{name}:{integrity[name]}' for name in manifest['assets'])
build_id='candidate-assets-'+hashlib.sha256(canonical.encode('utf-8')).hexdigest()[:12]
manifest['version']='runtime-code-authority-v1'
manifest['buildId']=build_id
manifest['integrity']=integrity
new_json=json.dumps(manifest,separators=(',',':'),ensure_ascii=False)
text=text[:mm.start(1)]+new_json+text[mm.end(1):]
index.write_text(text,encoding='utf-8')

latest_path=Path('latest.json')
latest=json.loads(latest_path.read_text(encoding='utf-8'))
latest['updatedAt']='2026-10-11T10:30:00+09:00'
latest['runtimeBuildId']=build_id
latest['runtimeAssetCount']=len(manifest['assets'])
latest_path.write_text(json.dumps(latest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

print('RUNTIME_BUILD_ID='+build_id)
print('PLAYED_MOVE_SHA256='+hashlib.sha256(Path('played-move-authority.js').read_bytes()).hexdigest())

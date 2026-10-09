import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
const index=read('index.html');
const app=read('app-core.js');
const diagnostics=read('diagnostics.js');
const binding=read('runtime-authority-binding.js');
const sw=read('sw.js');
const dynamic=['counterfactual-review.js','coach-integration.js','runtime-decision-pipeline.js','runtime-authority-binding.js'].map(read);

assert.match(index,/__wbRuntimeAssetManifest/,'candidate page must expose an immutable runtime asset manifest');
assert.ok(/"buildId":"candidate-assets-[0-9a-f]+"/.test(index)||/buildId:\s*['"][^'"]+['"]/.test(index),'runtime asset manifest must expose a content-addressed build id');
assert.ok(index.includes('\"integrity\":{'),'runtime asset manifest must carry exact per-file integrity digests');
assert.match(index,/__wbPrepareAssetScript/,'script creation must go through the integrity-aware loader');
assert.match(index,/integrity=/,'top-level scripts must be emitted with SRI');
assert.match(index,/__wbRuntimeBuildAuthorityPromise/,'candidate must start source verification independently of review output');

assert.match(app,/runtimeBuildAuthority/,'app runtime must expose build authority state');
assert.match(app,/ensureRuntimeBuildAuthority/,'app runtime must expose an authority verifier');
assert.match(app,/RUNTIME_BUILD_AUTHORITY_INVALID/,'candidate analysis must fail closed on build mismatch');
assert.match(app,/candidate.*\/.*一致/s,'candidate UI must report direct asset-authority agreement');
assert.match(diagnostics,/runtimeBuildAuthority/,'diagnostic JSON must include runtime build authority');
assert.match(binding,/assetAuthority/,'fresh evidence must bind runtime asset authority');
assert.match(binding,/RUNTIME_BUILD_AUTHORITY_INVALID/,'fresh chain must not report success with mismatched runtime code');
for(const src of dynamic)assert.match(src,/__wbPrepareAssetScript/,'dynamic script loaders must apply the same integrity/build authority');

assert.match(sw,/candidateAssetRequest/,'service worker must identify candidate nonce asset requests');
assert.match(sw,/candidateAssetRequest[\s\S]*fetch\(req,\{cache:'no-store'\}\)/,'candidate JS requests must use network no-store');
assert.doesNotMatch(sw,/candidateAssetRequest[\s\S]{0,260}caches\.match/,'candidate JS request branch must not fall back to cached JS');

console.log('P-F1-R2 RUNTIME CODE AUTHORITY REGRESSION PASS');

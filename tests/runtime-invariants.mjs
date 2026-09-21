import fs from 'node:fs';
import assert from 'node:assert/strict';

const root=new URL('../',import.meta.url);
const read=name=>fs.readFileSync(new URL(name,root),'utf8');
const index=read('index.html');
const app=read('app-core.js');
const sw=read('sw.js');
const review=read('review-engine.js');
const stateRecognition=read('state-recognition.js');
const diagnostics=read('diagnostics.js');
const cardDb=read('card-db.js');
const latest=JSON.parse(read('latest.json'));

const expectedRuntime=[
  'app-core.js',
  'turn-recognition.js',
  'mulligan-class.js',
  'card-db.js',
  'hand-recognition.js',
  'state-recognition.js',
  'review-engine.js',
  'diagnostics.js'
];
const runtime=[...index.matchAll(/<script[^>]+src="\.\/([^"]+\.js)"/g)].map(m=>m[1]);
assert.deepEqual(runtime,expectedRuntime,'index runtime must remain exactly the approved eight scripts in order');
assert.equal(runtime.some(x=>/fix-v/i.test(x)),false,'historical fix-v scripts must never load at runtime');

const appMeta=app.match(/const APP=\{version:'([^']+)',build:'([^']+)',revision:'([^']+)'/);
assert.ok(appMeta,'app-core APP metadata must be parseable');
const [,appVersion,appBuild,appRevision]=appMeta;
assert.equal(appVersion,latest.version,'app-core version must match latest.json');
assert.equal(appBuild,latest.build,'app-core build must match latest.json');
assert.equal(appRevision,latest.revision,'app-core revision must match latest.json');

const shellTitleVersion=index.match(/<title>シャドバWB リプレイ診断 v([^<]+)<\/title>/)?.[1];
const shellHeader=index.match(/<header><h1>シャドバWB リプレイ診断 v([^<]+)<\/h1><p>([^<]+)<\/p><\/header>/);
assert.equal(shellTitleVersion,latest.version,'static document title must match latest.json version');
assert.ok(shellHeader,'static shell header metadata must be parseable');
assert.equal(shellHeader[1],latest.version,'static shell header version must match latest.json');
assert.ok(shellHeader[2].includes(latest.revision),'static shell subheader must include latest.json revision');

const swBuild=sw.match(/const BUILD='([^']+)'/)?.[1];
const swCache=sw.match(/const CACHE='([^']+)'/)?.[1];
assert.equal(swBuild,latest.build,'service worker build must match latest.json');
assert.equal(swCache,latest.cache,'service worker cache must match latest.json');
const assetsMatch=sw.match(/const ASSETS=\[([^\]]+)\]/);
assert.ok(assetsMatch,'service worker assets must be parseable');
const swScripts=[...assetsMatch[1].matchAll(/'\.\/([^']+\.js)'/g)].map(m=>m[1]);
assert.deepEqual(swScripts,expectedRuntime,'service worker must cache the same approved runtime scripts');
assert.equal(swScripts.some(x=>/fix-v/i.test(x)),false,'service worker must not cache historical fix-v runtime scripts');

assert.equal(review.includes('historyObserved'),false,'review-engine must never consume historyObserved');
assert.equal(/shadowverse-wb-(?:diagnostic|review)-v\d+\.\d+\.\d+-clean/.test(diagnostics),false,'diagnostic and review format IDs must not hard-code an app version');
assert.ok(diagnostics.includes('shadowverse-wb-diagnostic-v${WB.APP.version}-clean'),'diagnostic format ID must derive from WB.APP.version');
assert.ok(diagnostics.includes('shadowverse-wb-review-v${WB.APP.version}-clean'),'review format ID must derive from WB.APP.version');
assert.ok(stateRecognition.includes('WB.stateCaptureHistory=history.slice(-5)'),'state recognition must retain the five most recent captures');
assert.ok(stateRecognition.includes("WB.on('video-reset',()=>{WB.stateCaptureHistory=[]"),'state capture history must reset with the video');
assert.ok(diagnostics.includes('stateCaptureHistory:clone(WB.stateCaptureHistory||[])'),'diagnostic/review exports must include recent state-capture history');
assert.ok(index.includes('id="exportHandFixture"'),'diagnostics UI must expose explicit hand-fixture export');
assert.ok(index.includes('通常の診断JSONには画像を含めません'),'UI must state that ordinary diagnostics remain image-free');
assert.ok(diagnostics.includes("format:'shadowverse-wb-hand-fixture-v1'"),'hand fixture format must be versioned independently');
assert.ok(diagnostics.includes('automatic:false'),'raw fixture capture must remain explicit and diagnostic-only');
assert.ok(diagnostics.includes("WB.seekTo(original,'hand-fixture-restore')"),'fixture export must restore the original video position');

const applyStart=review.indexOf('applyDetectedHand(result)');
assert.ok(applyStart>=0,'applyDetectedHand must exist');
const applyBody=review.slice(applyStart,applyStart+1800);
assert.ok(applyBody.includes('result?.recognized||{}'),'applyDetectedHand must consume only current recognized hand');

for(const id of ['quickBlader','zetaBeatrix','barbaros']){
  const start=cardDb.indexOf(`${id}:Object.freeze`);
  assert.ok(start>=0,`${id} config must exist`);
  const block=cardDb.slice(start,start+1800);
  assert.ok(block.includes('candidateThreshold:.90'),`${id} candidate threshold must remain .90`);
}
const zetaStart=cardDb.indexOf('zetaBeatrix:Object.freeze');
assert.ok(cardDb.slice(zetaStart,zetaStart+2200).includes('acceptedCosts:[4,6]'),'Zeta accepted costs must remain [4,6]');
const quickStart=cardDb.indexOf('quickBlader:Object.freeze');
const quickBlock=cardDb.slice(quickStart,quickStart+3200);
assert.ok(quickBlock.includes('overlapMaskedRescue:{minFrames:4'),'Quick must retain the verified overlap-masked rescue config');
assert.ok(quickBlock.includes('minMaskedAnchor:.94'),'Quick overlap rescue must retain the .94 masked-anchor floor');
assert.ok(quickBlock.includes('minCrossCardLeaderMargin:.20'),'Quick overlap rescue must retain cross-card separation');
assert.equal(cardDb.slice(zetaStart,zetaStart+2400).includes('overlapMaskedRescue:'),false,'Zeta must not inherit unvalidated overlap rescue');
const barbarosStart=cardDb.indexOf('barbaros:Object.freeze');
assert.equal(cardDb.slice(barbarosStart,barbarosStart+1800).includes('overlapMaskedRescue:'),false,'Barbaros must not inherit unvalidated overlap rescue');

console.log(JSON.stringify({
  runtime:runtime.length,
  version:latest.version,
  revision:latest.revision,
  build:latest.build,
  cache:latest.cache,
  historyIsolation:true,
  candidateThresholds:{quickBlader:.90,zetaBeatrix:.90,barbaros:.90},
  zetaAcceptedCosts:[4,6],
  quickOverlapMaskedRescue:true
},null,2));
console.log('RUNTIME INVARIANTS PASS');

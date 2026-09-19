import fs from 'node:fs';
import assert from 'node:assert/strict';

const root=new URL('../',import.meta.url);
const read=name=>fs.readFileSync(new URL(name,root),'utf8');
const index=read('index.html');
const app=read('app-core.js');
const sw=read('sw.js');
const review=read('review-engine.js');
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
assert.equal(/shadowverse-wb-(?:diagnostic|review)-v\\d+\\.\\d+\\.\\d+-clean/.test(diagnostics),false,'diagnostic and review format IDs must not hard-code an app version');
assert.ok(diagnostics.includes('shadowverse-wb-diagnostic-v${WB.APP.version}-clean'),'diagnostic format ID must derive from WB.APP.version');
assert.ok(diagnostics.includes('shadowverse-wb-review-v${WB.APP.version}-clean'),'review format ID must derive from WB.APP.version');
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
assert.ok(cardDb.slice(zetaStart,zetaStart+1800).includes('acceptedCosts:[4,6]'),'Zeta accepted costs must remain [4,6]');

console.log(JSON.stringify({
  runtime:runtime.length,
  version:latest.version,
  revision:latest.revision,
  build:latest.build,
  cache:latest.cache,
  historyIsolation:true,
  candidateThresholds:{quickBlader:.90,zetaBeatrix:.90,barbaros:.90},
  zetaAcceptedCosts:[4,6]
},null,2));
console.log('RUNTIME INVARIANTS PASS');

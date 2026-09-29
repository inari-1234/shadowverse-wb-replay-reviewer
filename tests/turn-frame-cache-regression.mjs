import fs from 'node:fs';
import assert from 'node:assert/strict';

const turn=fs.readFileSync(new URL('../turn-recognition.js',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../app-core.js',import.meta.url),'utf8');

assert.ok(app.includes("'turn-recognition':'turn-clean-1.12'"));
assert.ok(turn.includes("function validatedSignal(frame=null,primaryOverride=null)"));
assert.ok(turn.includes("primarySeedCache.set(k,{time:+k,...raw,seedSource:'mulligan-preflight'})"));
assert.ok(turn.includes("stableScan(scanStart,primarySeedCache,stableValidatedSeedCacheRun)"));
assert.ok(turn.includes("seedSource:'stable13'"));
assert.ok(turn.includes("const stableSeed=rows.find(x=>x?.seedSource==='stable13'"));
assert.ok(turn.includes("primarySeedReused:primarySeedHits"));
assert.ok(turn.includes("stableValidatedSeedCaptured"));
assert.ok(turn.includes("crossStageExactFrameReuse:true"));
assert.equal(turn.includes('fastSeek'),false);
assert.equal(turn.includes('requestVideoFrameCallback'),false);
console.log('TURN FRAME CACHE REGRESSION PASS');

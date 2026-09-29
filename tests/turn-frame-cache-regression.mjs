import fs from 'node:fs';
import assert from 'node:assert/strict';

const turn=fs.readFileSync(new URL('../turn-recognition.js',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../app-core.js',import.meta.url),'utf8');

assert.ok(app.includes("'turn-recognition':'turn-clean-1.12'"));
assert.ok(turn.includes("const earlySeedCache=new Map(),primarySeedCache=new Map()"));
assert.ok(turn.includes("primarySeedCache.set(k,{time:+k,...raw,seedSource:'mulligan-preflight'})"));
assert.ok(turn.includes("stableScan(scanStart,primarySeedCache)"));
assert.ok(turn.includes("crossStagePrimaryReuse:{captured:primarySeedCache.size,reused:primarySeedHits}"));
assert.ok(turn.includes("crossStageExactPrimaryReuse:true"));
assert.ok(turn.includes("let val=await validateEarlyOnly(stable,earlySeedCache)"));
assert.equal(turn.includes('stableValidatedSeedCache'),false);
assert.equal(turn.includes('fastSeek'),false);
assert.equal(turn.includes('requestVideoFrameCallback'),false);
console.log('TURN FRAME CACHE REGRESSION PASS');

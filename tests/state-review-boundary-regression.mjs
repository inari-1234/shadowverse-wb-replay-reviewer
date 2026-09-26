import fs from 'node:fs';
import assert from 'node:assert/strict';

const root=new URL('../',import.meta.url);
const state=fs.readFileSync(new URL('../state-recognition.js',import.meta.url),'utf8');
const review=fs.readFileSync(new URL('../review-engine.js',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../app-core.js',import.meta.url),'utf8');

assert.equal(state.includes('ReviewEngine'),false,'state-recognition must not depend directly on ReviewEngine');
assert.equal(state.includes('handApply'),false,'generic state capture must not retain tactical apply state');
assert.ok(state.includes("WB.emit('state-hand-recognized',{result:hand})"),'state-recognition must emit recognized hand as a generic observation event');
assert.ok(state.includes("WB.emit('state-captured',{capture:WB.stateCapture})"),'state-recognition must emit completed state capture');
assert.ok(state.includes("WB.emit('state-input-changed',{id,value:e.value})"),'state-recognition must publish resource edits without calling tactical code');
assert.ok(review.includes("W.on('state-hand-recognized',detail=>applyDetectedHand(detail?.result||null))"),'review engine must consume generic hand observation event');
assert.ok(review.includes("W.on('state-captured',()=>renderLethal())"),'review engine must refresh after generic state capture');
assert.ok(review.includes("W.on('state-input-changed',()=>renderLethal())"),'review engine must refresh after generic state input changes');
assert.ok(app.includes("'state-recognition':'state-clean-1.8.14'"),'app manifest must require decoupled state module');
assert.ok(app.includes("'review-engine':'review-clean-1.5.5'"),'app manifest must require event-based review module');

for(const token of ['barbaros','zetaBeatrix','quickBlader','pirateFlagCountdowns']){
  assert.equal(state.includes(token),false,`state-recognition must not contain tactical-specific token ${token}`);
}

console.log('STATE REVIEW BOUNDARY REGRESSION PASS');

assert.ok(state.includes("version:'confirmed-state-v1'"),'state-recognition must expose a generic confirmed-state snapshot for replay sessions');

assert.ok(state.includes("WB.emit('state-pair-complete',result)"),'state comparison must remain a generic state event without tactical coupling');

assert.ok(state.includes("WB.emit('turn-analysis-complete',result)"),'automatic turn analysis must publish a generic observation event');
assert.equal(state.includes('sea-pirate-royal'),false,'automatic stable-frame analysis must remain deck-agnostic');

assert.ok(state.includes("WB.emit('match-analysis-complete',result)"),'whole-match analysis must publish a generic replay observation event');
assert.ok(state.includes("matchAnalysisScope:'target-side-turns'"),'whole-match analysis must stay scoped to the selected analysis side');

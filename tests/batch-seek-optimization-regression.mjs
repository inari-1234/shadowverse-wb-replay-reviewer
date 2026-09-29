import fs from 'node:fs';
import assert from 'node:assert/strict';

const state=fs.readFileSync(new URL('../state-recognition.js',import.meta.url),'utf8');
const hand=fs.readFileSync(new URL('../hand-recognition.js',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../app-core.js',import.meta.url),'utf8');

assert.ok(app.includes("'hand-recognition':'hand-clean-1.53'"));
assert.ok(app.includes("'state-recognition':'state-clean-1.8.27'"));

assert.ok(hand.includes("allowHistory=ctx?.relativeSide==='自分'&&ctx?.historyScan!==false"),
  'history skipping must be an explicit caller opt-out after current-hand decision setup');
assert.ok(hand.includes("reason:'caller-disabled'"),
  'skipped history must remain visible in diagnostics rather than disappearing silently');

assert.ok(state.includes("async function captureState(options={})"));
assert.ok(state.includes("WB.HandRecognition.recognizeHand(handCtx)"),
  'full endpoint capture must still run current-hand recognition');
assert.ok(state.includes("handHistoryMode:handHistory?'full':'skipped-batch'"));
assert.ok(state.includes("await captureState({handHistory:!batchMode,captureMode:batchMode?'batch-endpoint':'full',sharedFrameReuse:batchMode})"));
assert.ok(state.includes("const turnResult=await analyzeCurrentTurn({batchMode:true,contextOverride});"));
assert.equal(state.includes("'match-analysis-turn-anchor'"),false,'whole-match analysis must not seek only to reconstruct an already-confirmed turn context');
assert.ok(state.includes("WB.runTask('状態取得',captureState"),
  'manual single-state capture must keep the full default path');
assert.ok(state.includes("WB.runTask('このターンを解析',analyzeCurrentTurn"),
  'manual one-turn analysis must not silently opt into batch history skipping');

assert.ok(state.includes("async function captureTimelineState(ctx,time,evidence=null)"));
assert.ok(state.includes("reason:'reused-stable-probe'"));
assert.ok(state.includes("ppSeed||await safeStateStage('timeline-pp'"),
  'timeline PP reuse must fall back to the full recognizer when no accepted probe exists');
assert.ok(state.includes("hp=await safeStateStage('timeline-hp',()=>recognizeOpponentHp(c)"),
  'timeline capture HP must continue using guarded temporal confirmation');
assert.ok(state.includes("'turn-analysis-hp-cache-verify'"),'prepared HP probe reuse must retain an exact canary seek');
assert.ok(state.includes("restorePosition:!batchMode"),'batch analysis must not restore between discovery and capture');
assert.ok(state.includes("captureSeekReuseCount"),'batch analysis must expose exact-anchor capture reuse');
assert.ok(state.includes("hpProbeCache.fallback=true"),'HP probe cache must fall back to the legacy exact path on canary mismatch');
assert.ok(state.includes("probeReuse:{pp:!!ppSeed,hp:false}"));

console.log('BATCH SEEK OPTIMIZATION REGRESSION PASS');

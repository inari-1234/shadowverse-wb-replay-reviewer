import fs from 'node:fs';
import assert from 'node:assert/strict';

const hand=fs.readFileSync(new URL('../hand-recognition.js',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../app-core.js',import.meta.url),'utf8');

assert.ok(app.includes("'hand-recognition':'hand-clean-1.53'"));

assert.ok(hand.includes("currentScan.push({sampleTime:+t.toFixed(3),offset:+(t-original).toFixed(3),candidateCount:centers.length,centers,frameCanvas:canvas})"),
  'current layout scan must retain the exact canvas used to compute centers');
assert.ok(hand.includes("forwardScan.push({sampleTime:+t.toFixed(3),offset:+(t-original).toFixed(3),candidateCount:centers.length,centers,frameCanvas:canvas})"),
  'forward settle scan must retain the exact canvas used to compute centers');
assert.ok(hand.includes("let canvas=row?.frameCanvas?.width&&row?.frameCanvas?.height?row.frameCanvas:null,source='layout-cache'"),
  'confirmation must prefer the sampled layout canvas');
assert.ok(hand.includes("if(!canvas){source='video-seek';"),
  'cache miss must fall back to the existing video-seek path');
assert.ok(hand.includes("await observeHandFrame(canvas,+t.toFixed(3),+(t-original).toFixed(3),worker)"),
  'cached and fallback frames must use the identical card-recognition function');
assert.ok(hand.includes("frameSource:source"),
  'diagnostics must expose cached-vs-seek frame source');
assert.ok(hand.includes("frameCache:{...frameCache,mode:'layout-frame-reuse-v1'}"),
  'recognition result must report frame-cache reuse counts');
assert.ok(hand.includes("historyScan.push({sampleTime:+t.toFixed(3),offset:+(t-original).toFixed(3),candidateCount:centers.length,centers})"),
  'history scan must remain outside the new current-hand frame cache scope');
assert.ok(hand.includes("stableConsensus:3"),
  'existing recognition consensus threshold must remain unchanged');

console.log('HAND FRAME CACHE REGRESSION PASS');

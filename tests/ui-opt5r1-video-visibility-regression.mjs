import fs from 'node:fs';
import assert from 'node:assert/strict';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const replay=fs.readFileSync(new URL('../replay-session.js',import.meta.url),'utf8');

assert.ok(html.includes('動画は選択後すぐ再生できます。'),'UI must explain immediate playback availability');
assert.ok(replay.includes("W.on('metadata',()=>{reviewPlaybackReady=true;activeReviewPlaybackIndex=0;updateReviewPlaybackUi()"),'metadata load must reveal the existing video');
assert.equal(replay.includes("W.on('match-analysis-start',()=>{reviewPlaybackReady=false"),false,'whole-match analysis must not hide a selected video');
assert.ok(replay.includes("W.on('match-analysis-start',()=>{activeReviewPlaybackIndex=0;updateReviewPlaybackUi()"),'analysis start may reset point navigation without changing visibility');
assert.ok(replay.includes("W.on('video-reset',()=>{current=null;renderDeferred=false;reviewPlaybackReady=false"),'new file reset must hide video until metadata is ready');
assert.ok(replay.includes("reviewPlayback:'selected-video-visible+post-analysis-3s-lead+preview-seek-only-v2'"));
assert.equal((html.match(/<video id="video"/g)||[]).length,1,'R1 must still use exactly one video element');
console.log('UI OPT5R1 VIDEO VISIBILITY REGRESSION PASS');

import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const replay=fs.readFileSync(new URL('../replay-session.js',import.meta.url),'utf8');
const WB={videoMeta:null,turnTimeline:[],mulligan:null,classDetection:null,scenes:[],registerModule(){},videoKey(){return 'authority-playback-fixture'},log(){},recordError(){},on(){},onReady(){},$(){return null},fmt:v=>String(v),escape:s=>String(s??'')};
const sandbox={window:{WB},console,structuredClone,setTimeout,clearTimeout,setInterval,clearInterval,requestAnimationFrame:fn=>setTimeout(fn,0),URL,Date,Promise};
vm.createContext(sandbox);new vm.Script(replay,{filename:'replay-session.js'}).runInContext(sandbox);
const R=WB.ReplaySession;

assert.equal(typeof R.reviewPlaybackStart,'function','ReplaySession must expose authority-aware playback start selection');
const model={reviewStart:115.888,reviewEnd:116.338};
assert.equal(R.reviewPlaybackStart(model,113.638),113.638,'exact fresh authority start must override the legacy replay window start');
assert.equal(R.reviewPlaybackStart(model,null),115.888,'without authority override the legacy review start remains the fallback');
assert.equal(R.reviewPlaybackStart(model,'stale'),115.888,'invalid override must not alter playback');
assert.match(replay,/playReviewWindow\(videoButton\.dataset\.reviewVideoWindow\)/,'delegated video action must identify only the window; authority comes from ReplaySession model');
assert.match(replay,/async function playReviewWindow\(windowId\)/,'playback API must not accept a DOM authority override');
assert.match(replay,/reviewAuthorityPlaybackStart\(windowId\)/,'playback must resolve authority from stored presentation');
assert.doesNotMatch(replay,/dataset\.reviewAuthorityStart/,'DOM dataset must not be the playback Source of Truth');

console.log('P-F1-R2 AUTHORITY PLAYBACK REGRESSION PASS');

import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('../replay-session.js',import.meta.url),'utf8');
const fn=(name,next)=>{const re=new RegExp(`function ${name}\\([\\s\\S]*?\\nfunction ${next}`);return (source.match(re)||[])[0]||''};
const authorityFn=fn('reviewAuthorityPlaybackStart','updateReviewPlaybackUi');
assert.doesNotMatch(authorityFn,/querySelector|dataset/,'playback authority must not be read from Review Card DOM');
assert.match(authorityFn,/reviewPlaybackModels/,'playback authority must resolve from the stored ReviewSession presentation model');
const playFn=fn('playReviewWindow','moveReviewPlayback');
assert.doesNotMatch(playFn,/dataset\.reviewAuthorityStart/,'playback must not accept a DOM authority override');

const handlers=new Map(),seekLog=[];
const video={currentTime:0,duration:200,seeking:false,addEventListener(name,cb){if(name==='seeked'){this._seek=cb}},removeEventListener(){},async play(){}};
Object.defineProperty(video,'currentTime',{get(){return this._t||0},set(v){this._t=Number(v);this.seeking=false;queueMicrotask(()=>this._seek?.())},configurable:true});
const status={textContent:''},playback={classList:{toggle(){}},setAttribute(){},scrollIntoView(){}},pos={textContent:''},navButton={disabled:false};
const WB={
  videoMeta:{name:'09-23.mp4',size:1,lastModified:1},video,turnTimeline:[],mulligan:null,classDetection:null,scenes:[],task:null,
  registerModule(){},videoKey(){return '09-23|1|1'},log(name,d){if(name==='review-playback')seekLog.push(d)},recordError(){},
  on(name,fn){if(!handlers.has(name))handlers.set(name,[]);handlers.get(name).push(fn)},onReady(){},fmt:v=>Number(v).toFixed(1),escape:s=>String(s),pauseVideo(){},seekPositionReached(v,t){return Math.abs(Number(v.currentTime)-Number(t))<=.06},
  $:sel=>sel==='#reviewNavigationStatus'?status:sel==='#reviewPlayback'?playback:sel==='#reviewPointPosition'?pos:sel==='#reviewPointPrev'||sel==='#reviewPointNext'?navButton:null,
  ReviewEngine:{activeProfile(){return'none'},deriveWindowCoach(){return null},deriveCardUseCandidates(){return[]}}
};
const sandbox={window:{WB},console,structuredClone,Date,Promise,setTimeout,clearTimeout,setInterval,clearInterval,URL,crypto:globalThis.crypto,requestAnimationFrame:fn=>fn(),queueMicrotask};
vm.createContext(sandbox);new vm.Script(source,{filename:'replay-session.js'}).runInContext(sandbox);
const R=WB.ReplaySession;
R.beginAnalysisRun({runId:'run-playback',nonce:'nonce-playback',startedAt:'2026-10-10T00:00:00.000Z'});
const cap=(time,pp,board)=>({at:'2026-10-10T00:00:00.000Z',captureMode:'timeline-lite',context:{time,turn:8,absoluteSide:'bottom',relativeSide:'自分'},confirmed:{time,turn:8,absoluteSide:'bottom',relativeSide:'自分',pp,opponentHP:16,extraPP:'unknown',ep:'yes',sep:'unknown',opponentWard:'none',boardDamage:board,boardDamageKnown:true,hand:{recognized:{}}}});
R.ingestState(cap(113.638,2,0));R.ingestState(cap(115.888,1,0));R.ingestState(cap(116.338,1,3));
const base=R.snapshot().decisionWindows.at(-1);assert.ok(base);
const id=base.id,authority={version:'pf1r2-single-presentation-v1',authority:'fresh-exact',windowId:id,runId:'run-playback',nonce:'nonce-playback',reviewStart:113.638,reviewEnd:116.338,turn:8,beforeState:{...base.beforeState,id:'st:8:bottom:113.638',time:113.638,pp:2,boardDamage:0,boardDamageKnown:true},afterState:{...base.afterState,id:'st:8:bottom:116.338',time:116.338,pp:1,boardDamage:3,boardDamageKnown:true}};
assert.equal(R.setAuthorityPresentation(id,authority,{commit:false}),true);
assert.equal(R.reviewAuthorityPlaybackStart(id),113.638);
const model=R.reviewPlaybackModels().find(x=>x.id===id);assert.equal(model.reviewStart,113.638);
assert.equal(R.reviewPlaybackStart(model),113.638);
const ok=await R.playReviewWindow(id);
assert.equal(ok,true);
assert.equal(Number(video.currentTime.toFixed(3)),110.638,'playback must seek to three seconds before the stored fresh authority start');
assert.ok(seekLog.some(x=>x.windowId===id&&x.reviewStart===113.638&&x.target===110.638));
assert.match(status.textContent,/113\.6|1:53\.6/);
console.log('P-F1-R2 LIVE PLAYBACK AUTHORITY REGRESSION PASS');

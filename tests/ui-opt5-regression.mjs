import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const state=fs.readFileSync(new URL('../state-recognition.js',import.meta.url),'utf8');
const replay=fs.readFileSync(new URL('../replay-session.js',import.meta.url),'utf8');

assert.equal(state.includes('status.textContent=\`全ターン解析 \${i+1}/\${plan.length}'),false);
assert.ok(state.includes("if(status){status.textContent='';status.className='statusLine'}"));
assert.ok(state.includes("WB.emit('match-analysis-start'"));
assert.ok(html.includes('id="reviewPlayback" class="runtimeMedia reviewPlayback" aria-hidden="true"'));
assert.equal((html.match(/<video id="video"/g)||[]).length,1);
const replayPanel=html.slice(html.indexOf('<section id="replayPanel"'),html.indexOf('<section id="turnPanel"'));
const reviewPanel=html.slice(html.indexOf('<section id="reviewOverviewPanel"'),html.indexOf('<section id="scenePanel"'));
assert.equal(replayPanel.includes('<video id="video"'),false);
assert.ok(reviewPanel.includes('<video id="video"'));
assert.ok(html.includes('.runtimeMedia.reviewPlaybackActive{position:relative!important;width:100%!important'));
assert.ok(html.includes('振り返りポイント 0 / 0'));
assert.ok(html.includes('前のポイント')&&html.includes('次のポイント'));
assert.ok(replay.includes('const REVIEW_PLAYBACK_LEAD=3'));
assert.ok(replay.includes('data-review-video-window='));
assert.ok(replay.includes("await previewSeekTo(target,'review-playback-window')"));
assert.equal(replay.includes("W.seekTo(target,'review-playback-window')"),false);
assert.ok(replay.includes("reviewPlayback:'selected-video-visible+post-analysis-3s-lead+preview-seek-only-v2'"));
assert.ok(replay.includes("W.on('metadata',()=>{reviewPlaybackReady=true;activeReviewPlaybackIndex=0;updateReviewPlaybackUi()"));
assert.ok(replay.includes("W.on('match-analysis-start',()=>{activeReviewPlaybackIndex=0;updateReviewPlaybackUi()"));
assert.ok(replay.includes("W.on('match-analysis-complete',detail=>{reviewPlaybackReady=!detail?.cancelled"));
assert.ok(replay.includes("W.on('video-reset',()=>{current=null;renderDeferred=false;reviewPlaybackReady=false"));
assert.ok(replay.includes("reviewFrameButton('直前フレーム'")&&replay.includes("reviewFrameButton('変化後フレーム'"));

let seekedHandler=null,played=0;
const elements=new Map(),classList={toggle(){},add(){}};
elements.set('#reviewPlayback',{classList,setAttribute(){},scrollIntoView(){}});
elements.set('#reviewPointPosition',{textContent:''});
elements.set('#reviewPointPrev',{disabled:false,dataset:{},addEventListener(){}});
elements.set('#reviewPointNext',{disabled:false,dataset:{},addEventListener(){}});
elements.set('#reviewNavigationStatus',{textContent:''});
const WB={
  videoMeta:{name:'m.mp4',size:1,lastModified:1},turnTimeline:[],mulligan:null,classDetection:null,scenes:[],
  registerModule(){},videoKey(){return'ui-opt5'},log(){},recordError(){},on(){},onReady(){},
  ReviewEngine:{deriveWindowCoach(){return null},deriveCardUseCandidates(){return[]}},
  $:s=>elements.get(s)||null,fmt:v=>Number(v).toFixed(1)+'s',escape:s=>String(s??''),
  pauseVideo(){return true},seekCount:11,seekReasons:{analysis:11},
  seekPositionReached:(v,target)=>Math.abs(Number(v.currentTime)-Number(target))<=.06&&!v.seeking&&v.readyState>=2
};
const sandbox={window:{WB},console,structuredClone,setTimeout,clearTimeout,setInterval,clearInterval,requestAnimationFrame:fn=>setTimeout(fn,0),URL,Date,Promise};
vm.createContext(sandbox);
new vm.Script(replay,{filename:'replay-session.js'}).runInContext(sandbox);
const capture=(time,pp,hp,board)=>({at:'2026-10-01T00:00:00Z',context:{time,turn:2,absoluteSide:'bottom',relativeSide:'自分'},confirmed:{version:'confirmed-state-v1',time,turn:2,absoluteSide:'bottom',relativeSide:'自分',pp,opponentHP:hp,extraPP:'unknown',ep:'unknown',sep:'unknown',opponentWard:'unknown',boardDamage:board,boardDamageKnown:true,hand:{recognized:{}}}});
WB.ReplaySession.ingestState(capture(10,5,20,4));
WB.ReplaySession.ingestState(capture(12,2,17,0));
const models=WB.ReplaySession.reviewPlaybackModels();
assert.equal(models.length,1);
WB.video={duration:90,readyState:4,seeking:false,paused:true,_time:0,get currentTime(){return this._time},set currentTime(v){this._time=Number(v);this.seeking=false;queueMicrotask(()=>seekedHandler?.())},addEventListener(name,fn){if(name==='seeked')seekedHandler=fn},removeEventListener(name,fn){if(name==='seeked'&&seekedHandler===fn)seekedHandler=null},async play(){played++;this.paused=false}};
WB.ReplaySession.setReviewPlaybackReady(true);
await WB.ReplaySession.playReviewWindow(models[0].id);
assert.equal(WB.video.currentTime,7);
assert.equal(played,1);
assert.equal(WB.seekCount,11);
assert.deepEqual(WB.seekReasons,{analysis:11});
assert.equal(WB.previewSeekReasons['review-playback-window'],1);
console.log('UI OPT5 REGRESSION PASS');

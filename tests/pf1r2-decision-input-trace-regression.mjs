import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root=new URL('../',import.meta.url);
const read=n=>fs.readFileSync(new URL(n,root),'utf8');
const listeners=new Map();
const video={currentTime:113.638};
let liveSession={states:[],actions:[],decisionWindows:[]};
const WB={
  optionalModules:[],stateCaptureHistory:[],stateCapture:null,video,
  registerModule(){},log(){},recordError(){},
  emit(name,detail){for(const f of listeners.get(name)||[])f(detail)},
  on(name,fn){if(!listeners.has(name))listeners.set(name,[]);listeners.get(name).push(fn)},
  onReady(fn){fn()},$(){return null},
  seekTo:async t=>{video.currentTime=Number(t);return Number(t)},
  videoKey:()=> '09-23.mp4|trace-regression',
  CardDB:{get(id){if(id==='quickBlader')return{id:'quickBlader',type:'フォロワー',cost:1,atk:1,life:1,tags:['疾走']};return null}},
  ReplaySession:{snapshot:()=>liveSession,ingestState(){}}
};
const sandbox={window:{WB,__wbReplaySessionV1:liveSession},console,structuredClone,Date,Promise,setTimeout,clearTimeout,queueMicrotask,crypto:{randomUUID:()=>`trace-${Date.now()}`}};
vm.createContext(sandbox);
for(const f of ['position-state-runtime.js','common-rule-engine-runtime.js','legal-action-sequence.js','outcome-backtracking.js','comparison-decision.js','runtime-decision-pipeline.js','runtime-authority-binding.js'])new vm.Script(read(f),{filename:f}).runInContext(sandbox);

const B=WB.RuntimeAuthorityBinding;
await B.bindToPipeline(WB.RuntimeDecisionPipeline);
const capture={
  at:'2026-10-10T00:00:01.000Z',captureMode:'timeline-lite',partial:false,
  context:{time:113.638,turn:8,absoluteSide:'bottom',relativeSide:'自分'},
  confirmed:{
    time:113.638,turn:8,absoluteSide:'bottom',relativeSide:'自分',pp:2,opponentHP:16,
    extraPP:'no',ep:'yes',sep:'no',opponentWard:'none',boardDamage:0,boardDamageKnown:true,
    hand:{recognized:{quickBlader:{known:true,label:'刹那のクイックブレイダー',count:1,confidence:.98}}}
  },
  diagnosticOnly:{largePayload:'must not affect run identity'}
};

assert.equal(B.snapshot().traceVersion,'pf1r2-decision-input-trace-v1.0.0');
assert.equal(B.snapshot().inputTrace,null,'trace is empty before a fresh analysis run');

WB.emit('match-analysis-start',{runId:'pf1r2g:1000:trace-a',nonce:'nonce-a',startedAt:'2026-10-10T00:00:00.000Z'});
let trace=B.snapshot().inputTrace;
assert.equal(trace.version,'pf1r2-decision-input-trace-v1.0.0');
assert.equal(trace.runId,'pf1r2g:1000:trace-a');
assert.equal(trace.nonce,'nonce-a');
assert.equal(trace.videoKey,'09-23.mp4|trace-regression');
assert.deepEqual(trace.captures,[]);
assert.equal(trace.matchAnalysis,null);
assert.equal(sandbox.window.__wbPF1R2InputTraceV1.runId,trace.runId,'diagnostic mirror follows the active run');

WB.emit('state-captured',{capture});
trace=B.snapshot().inputTrace;
assert.equal(trace.captures.length,1,'fresh run records the exact state-capture input');
assert.equal(trace.captures[0].source,'timeline');
assert.equal(trace.captures[0].runId,'pf1r2g:1000:trace-a');
assert.equal(trace.captures[0].nonce,'nonce-a');
assert.equal(Number(trace.captures[0].capture?.context?.time),113.638);
assert.equal(trace.captures[0].capture?.context?.turn,8);
assert.equal(trace.captures[0].capture?.confirmed?.pp,2);
assert.equal(trace.captures[0].capture?.confirmed?.opponentHP,16);
assert.equal(trace.captures[0].capture?.confirmed?.boardDamage,0);

WB.emit('match-analysis-complete',{
  version:'match-auto-analysis-v-test',runId:'pf1r2g:1000:trace-a',nonce:'nonce-a',
  startedAt:'2026-10-10T00:00:00.000Z',finishedAt:'2026-10-10T00:00:05.000Z',cancelled:false,
  targetSide:'bottom',totalTurns:8,eligibleTurns:8,completedTurns:8,skippedTurns:0,
  turns:[{turn:8,side:'bottom',status:'complete'}]
});
trace=B.snapshot().inputTrace;
assert.equal(trace.matchAnalysis.runId,'pf1r2g:1000:trace-a');
assert.equal(trace.matchAnalysis.nonce,'nonce-a');
assert.equal(trace.matchAnalysis.cancelled,false);
assert.equal(trace.matchAnalysis.totalTurns,8);
assert.equal(trace.matchAnalysis.turns.length,1);

WB.emit('match-analysis-start',{runId:'pf1r2g:2000:trace-b',nonce:'nonce-b',startedAt:'2026-10-10T00:01:00.000Z'});
trace=B.snapshot().inputTrace;
assert.equal(trace.runId,'pf1r2g:2000:trace-b');
assert.equal(trace.nonce,'nonce-b');
assert.equal(trace.captures.length,0,'a new run cannot inherit prior-run capture inputs');
assert.equal(trace.matchAnalysis,null,'a new run cannot inherit prior-run match summary');
assert.equal(JSON.stringify(trace).includes('pf1r2g:1000:trace-a'),false,'past run identity is absent from the fresh trace');

WB.emit('video-reset',{});
assert.equal(B.snapshot().inputTrace,null,'video reset clears the trace');
assert.ok(sandbox.window.__wbPF1R2InputTraceV1==null,'global trace mirror is cleared too');

const diagnostics=read('diagnostics.js');
assert.match(diagnostics,/pf1r2InputTraceV1/,'diagnostic JSON exports the trace');
assert.match(diagnostics,/RuntimeAuthorityBinding\?\.snapshot\?\.\(\)\?\.inputTrace/,'diagnostic export reads the authoritative trace snapshot');

console.log('P-F1-R2 DECISION INPUT TRACE REGRESSION PASS');

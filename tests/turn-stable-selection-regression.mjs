import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const WB={
  registerModule(){},onReady(){},playOrder:()=> '後攻',targetSide:()=> 'bottom',
  video:{duration:123.338},turnTimeline:[],log(){},on(){},$(){return null},frameCanvas(){return null},
  videoKey:()=> 'test',currentTurnContext:()=>({})
};
const sandbox={window:{WB},document:{createElement(){return {getContext(){return {}}}}},console,performance:{now:()=>0},setTimeout,clearTimeout,Uint8Array,Uint32Array};
vm.createContext(sandbox);
new vm.Script(fs.readFileSync(new URL('../state-recognition.js',import.meta.url),'utf8')).runInContext(sandbox);
const S=WB.StateRecognition;

const timeline=[
  {side:'top',turn:6,time:51.375},
  {side:'bottom',turn:6,time:59.32},
  {side:'top',turn:7,time:66.751},
  {side:'bottom',turn:7,time:77.295}
];
const ctx={row:timeline[1],turn:6,absoluteSide:'bottom',targetSide:'bottom',relativeSide:'自分'};
const bounds=S.turnAnalysisBounds(ctx,timeline,123.338);
assert.equal(bounds.valid,true);
assert.equal(bounds.start,59.77);
assert.equal(bounds.end,66.631);
assert.equal(bounds.nextTurnTime,66.751);

const probeTimes=Array.from(S.turnProbeTimes(bounds));
assert.equal(probeTimes[0],59.77);
assert.equal(probeTimes.at(-1),66.631);
assert.equal(probeTimes.every(t=>t<66.751),true);

const realVideoLike=[
  {time:63.882,stable:true,score:5.2,hpAccepted:true,hpValue:16},
  {time:64.299,stable:false,score:0.8,hpAccepted:false,hpValue:null},
  {time:66.299,stable:true,score:3.4,hpAccepted:false,hpValue:null},
  {time:66.605,stable:true,score:5.6,hpAccepted:true,hpValue:11}
];
let pair=S.selectTurnStablePair(realVideoLike);
assert.equal(pair.valid,true);
assert.equal(pair.reason,'hp-change-stable-pair');
assert.equal(pair.fromTime,63.882);
assert.equal(pair.toTime,66.605);
assert.equal(pair.hpFrom,16);
assert.equal(pair.hpTo,11);
assert.equal(pair.hpDelta,-5);
assert.equal(pair.elapsed,2.723);

pair=S.selectTurnStablePair([
  {time:63.0,stable:true,score:5,hpAccepted:true,hpValue:16},
  {time:66.2,stable:true,score:5,hpAccepted:true,hpValue:11}
]);
assert.equal(pair.valid,false,'automatic analysis must not bridge detailed comparison beyond three seconds');

pair=S.selectTurnStablePair([
  {time:60.0,stable:true,score:3,hpAccepted:true,hpValue:20},
  {time:62.8,stable:true,score:4,hpAccepted:true,hpValue:20}
]);
assert.equal(pair.valid,true);
assert.equal(pair.reason,'stable-pair','unchanged HP may still bracket other generic state changes');

const many=Array.from({length:18},(_,i)=>({time:60+i*.3,stable:true,score:i%3}));
const sampled=Array.from(S.sampleStableProbeSet(many,8));
assert.ok(sampled.length<=8);
assert.equal(sampled[0].time,many[0].time,'temporal sampler must retain the earliest stable frame');
assert.equal(sampled.at(-1).time,many.at(-1).time,'temporal sampler must retain the latest stable frame');
assert.equal(sampled.every((x,i)=>i===0||x.time>sampled[i-1].time),true);

assert.equal(S.config.turnAnalyze.maxGap,3);
assert.equal(S.config.turnAnalyze.maxOcrSamples,8);
assert.equal(S.config.turnAnalyze.timelineMaxGap,2.7);
assert.equal(S.config.turnAnalyze.maxTimelineAnchors,10);

const multiProbes=[
  {time:1,stable:true,score:5,ppAccepted:true,ppValue:5},
  {time:1.45,stable:true,score:5,ppAccepted:true,ppValue:5},
  {time:1.9,stable:true,score:5,ppAccepted:true,ppValue:3},
  {time:2.35,stable:true,score:5,ppAccepted:true,ppValue:3},
  {time:2.8,stable:true,score:5,ppAccepted:true,ppValue:3},
  {time:3.25,stable:true,score:5,ppAccepted:true,ppValue:1},
  {time:3.7,stable:true,score:5,ppAccepted:true,ppValue:1},
  {time:4.15,stable:true,score:5,ppAccepted:true,ppValue:1},
  {time:4.6,stable:true,score:5,ppAccepted:true,ppValue:1},
  {time:5.05,stable:true,score:5,ppAccepted:true,ppValue:1},
  {time:5.5,stable:true,score:5,ppAccepted:true,ppValue:1},
  {time:5.95,stable:true,score:5,ppAccepted:true,ppValue:1}
];
const multiOcr=[
  {...multiProbes[0],hpAccepted:true,hpValue:20},
  {...multiProbes[6],hpAccepted:true,hpValue:20},
  {...multiProbes[8],hpAccepted:true,hpValue:16},
  {...multiProbes.at(-1),hpAccepted:true,hpValue:16}
];
const multiPair=S.selectTurnStablePair(multiOcr);
const timelineSelection=S.selectTurnTimelineAnchors({probes:multiProbes,ocrSamples:multiOcr,pair:multiPair});
assert.equal(timelineSelection.valid,true);
assert.ok(timelineSelection.anchors.length>2,'multiple stable change points must produce more than an endpoint pair');
assert.ok(timelineSelection.anchors.some(x=>x.time===1.9),'PP change must preserve a post-change stable anchor');
assert.ok(timelineSelection.anchors.some(x=>x.time===3.25),'second PP change must preserve its post-change anchor');
assert.ok(timelineSelection.anchors.some(x=>x.time===4.6),'HP change must preserve its post-change anchor');
assert.equal(timelineSelection.coverage.complete,true,'selected anchors must keep detailed observation gaps within the three-second safety limit');
assert.ok(timelineSelection.coverage.maxGap<=2.7+.001);
assert.ok(timelineSelection.anchors.length<=10);
assert.equal(timelineSelection.anchors[0].time,1);
assert.equal(timelineSelection.anchors.at(-1).time,5.95);

console.log('TURN STABLE SELECTION REGRESSION PASS');

const capturedSummary=S.resolveTurnHpSummary(
  {hpFrom:null,hpTo:null},
  {confirmed:{opponentHP:9}},
  {confirmed:{opponentHP:9}}
);
assert.equal(capturedSummary.hpFrom,9,'final turn summary must prefer captured endpoint HP over exploratory OCR');
assert.equal(capturedSummary.hpTo,9);
assert.equal(capturedSummary.hpDelta,null,'unchanged confirmed HP must remain a non-change');
assert.equal(capturedSummary.hpSummarySource,'captured-endpoints');
assert.equal(capturedSummary.selectionHpFrom,null);

const selectionFallback=S.resolveTurnHpSummary(
  {hpFrom:20,hpTo:16},
  {confirmed:{opponentHP:null}},
  {confirmed:{opponentHP:null}}
);
assert.equal(selectionFallback.hpFrom,20);
assert.equal(selectionFallback.hpTo,16);
assert.equal(selectionFallback.hpDelta,-4);
assert.equal(selectionFallback.hpSummarySource,'selection-probes');

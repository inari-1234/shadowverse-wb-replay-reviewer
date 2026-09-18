import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const WB={registerModule(){},log(){},turnTimeline:[]};
const sandbox={
  window:{WB},console,Float32Array,Uint8ClampedArray,Map,
  atob:s=>Buffer.from(s,'base64').toString('binary'),
  document:{createElement(){return {width:0,height:0,getContext(){return {imageSmoothingEnabled:true,drawImage(){},getImageData(){return {data:new Uint8ClampedArray(12*16*4)}}}}}}}
};
vm.createContext(sandbox);
new vm.Script(fs.readFileSync(new URL('../card-db.js',import.meta.url),'utf8')).runInContext(sandbox);
new vm.Script(fs.readFileSync(new URL('../hand-recognition.js',import.meta.url),'utf8')).runInContext(sandbox);

const DB=WB.CardDB,H=WB.HandRecognition,qb=DB.get('quickBlader');
assert.equal(DB.meta.complete,false);
assert.equal(DB.meta.verifiedCards,3);
assert.equal(DB.meta.recognitionEnabledCards,1);
assert.equal(qb.officialId,10021110);
assert.equal(qb.cost,1);
assert.equal(qb.atk,1);
assert.equal(qb.life,1);
assert.equal(qb.route.type,'storm');
assert.equal(qb.recognition.method,'hand-title-cost-gate-v7');
assert.equal(qb.recognition.threshold,.938);
assert.equal(qb.recognition.candidateThreshold,.90);
assert.equal(qb.recognition.stableFrames,3);
assert.equal(qb.recognition.rescueFrames,2);
assert.equal(qb.recognition.rescueThreshold,.939);
assert.equal(qb.recognition.costRequired,true);
assert.ok(.9623>=qb.recognition.threshold,'stable trailing-window Quick Blader frame must pass');
assert.ok(.9613>=qb.recognition.threshold,'stable trailing-window Quick Blader frame must pass');
assert.ok(.9396>=qb.recognition.threshold,'actual iPhone borderline positive must pass normal image gate');
assert.ok(.9316<qb.recognition.threshold,'hard negative must remain below calibrated threshold');

assert.equal(qb.recognition.featureLength,432);

const profiles=DB.recognitionProfiles('quickBlader');
assert.equal(profiles.length,4);
for(const p of profiles)assert.equal(p.length,432);
for(let i=0;i<profiles.length;i++){const loo=Math.max(...profiles.map((p,j)=>j===i?-1:H.shiftedCosine(profiles[i],p)));assert.ok(loo>.945,`positive profile ${i} must match another real frame`)}
const self=H.matchFeature(profiles[0])[0];
assert.equal(self.cardId,'quickBlader');
assert.ok(self.best>.999);

let d=H.decideHandSamples([
  {counts:{quickBlader:1},scores:{quickBlader:[.99]}},
  {counts:{quickBlader:1},scores:{quickBlader:[.97]}},
  {counts:{quickBlader:1},scores:{quickBlader:[.95]}}
]);
assert.equal(d.recognized.quickBlader.count,1);
assert.equal(d.recognized.quickBlader.known,true);
assert.equal(d.recognized.quickBlader.confidence,.95);

d=H.decideHandSamples([{counts:{quickBlader:1},scores:{quickBlader:[.99]}},{counts:{quickBlader:1},scores:{quickBlader:[.96]}}]);
assert.equal(d.recognized.quickBlader,undefined);
assert.equal(d.unresolved.quickBlader.known,false);

d=H.decideHandSamples([{counts:{},scores:{}},{counts:{},scores:{}}]);
assert.equal(d.recognized.quickBlader,undefined);
assert.equal(d.unresolved.quickBlader.reason,'no-image-candidate');

d=H.decideHandSamples([
  {counts:{quickBlader:2},scores:{quickBlader:[.99,.98]}},
  {counts:{quickBlader:1},scores:{quickBlader:[.97]}},
  {counts:{quickBlader:1},scores:{quickBlader:[.95]}}
]);
assert.equal(d.recognized.quickBlader.count,1,'count is conservative when frames disagree');


const decodeFixture=p=>{const raw=Buffer.from(p.data,'base64'),v=new Float32Array(raw.length);let norm=0;for(let i=0;i<raw.length;i++){let q=raw[i];if(q>127)q-=256;const x=q/p.scale;v[i]=x;norm+=x*x}norm=Math.sqrt(norm)||1;for(let i=0;i<v.length;i++)v[i]/=norm;return v};
const negativeFixtures=[{"label":"v2_7","scale":528.2591607272693,"data":"9vTx///7/Pr6//cPCRIN//Dl+wLrB/z7/v8FNjIUCvfp6ujfAgnv6uDtBw8cOCchBu3l597fDAzl3ufpEA8tMBsQB+zd49vlChDi7xz4ExglLRwfCezR2+ftGBDyAh0KHRoNBBYuE+zV3NvdAvjo+QMDE/nxDTgwFevV5dna//H/CSYaJBYdGiovEOvU3+jhBgL9AggEDw4REwbYm4ig2gj8JBsPFBkSJiggFAgEzr/oBxETIh8B/QAHHiMWCQcJ5dMECAUMJh4C+/j+Gh0TChEZ8c8GCQcKIxsE+vP7FhgP+/0O784F/fPtHx0D9vL9FhIV+/YH7c4C/wr+Bv309e35EAn69AAH588B/wgGAv39+On0Afv29QAE6M/+BQwE/gMSAAALAgEA/fP819XhAQwT1d//6eL31tPS6u7kEhMDDAUO2OATICAS1M7c8PLnCiMBBQgO1dsPHikY1sfg7u3iCCMBBw8TztYKIC4a4c/j/P/oBigJEBUazNYNICgN5dvmBxD7ESkOEg8R+AkcICQS9PEIDgDzEy8NCAoKBg0RHywgDAcMDf70DywQBfkA"},{"label":"v3_60","scale":751.6343395521646,"data":"JjY2KCg5MiApFikSAhkP+ufn5uAGMjE5LykrGiEqFArmv9LkwdTpLy4mISAxNiMrGPa4vcroyergFCsgB+MPPwQgC+bWwtDU2PwL9en/MTVCQQ0A5fHe6dzP3uXd7xYIIjM3Hvfp8gP+4tLT1driJyYOBR4S7vkD++7v0fMAx9DuAwjSzOTU3x75DQ7Lvv/k/f3//Pn28O3s7ujBr4mIATohCxUZEAcFA/rz+PTnAP4JJUJSCR4rEf/8+/Ds6d3fKDsaHj1oBf4KBvn07vXs3OTfKDcgJS9kA+33+/Xv3dnX1OjtOEA5FzJNAe338+/s1s3DxuLxHSUkAyUr/Pb13djm5d7Y3+zpHy8aGScl/vz05N3w9+3y6ODnJTUdHfQN+PkACxEXGigqIxUDt42Y9/Ds3+Ha2N7n6/4B/gAb+cnt79bK+/Xk5PL/AQwQFRgi5dv379+7CyANCBIeHBweHxwe5sjr9OPFCT0jExEdJSQkIxYRxKfB+OvWCDAaCg8YIyxBPSMM073MAOviEh0VFyggICozKh0S0LbU7Nq4CQkjOjwbEx0lJiEY3Nnr9hr3"},{"label":"hard27","scale":553.0857642220831,"data":"6efi9fTw8e/s9esN/hIICer28frcAPLw9/X9PTcPICEA4vD4+ATg2szgAAobPigiHC/q4OnpBwTRy9jaDgktNRgLEOny29/dBArQ4RvsEBcnLhge5grp9/X4GQzm+B0DHRoI+xUuAAX19/nm+evX6/n6Ee/jB0E0Bvj49QHT+eL4BCgXJxIgFy40GBPq+PLrBQUB/QIEBwUICgvPloiSygMRGxEJExMPJC4k/AEIyLTW+g0HJBkB9vgCHCUYAgYR69P0/wb+KRz/8u/5Fh8MAxEgExwH+fD0Ihn/7un1FBoLAPYYMxci/Ov3HRH46+j3FhcP+e4CKB8h+PUKBfjy6+b1Cwf37/QBEA8N+PoS+vz89OTp9vTy9PwCEw7l4PP8BwgKBwkMAPv5/QIO5eHoBxsM1+cE6Oz/2NDc9PXsDhQSD/7+0OEWHSAa1M7g9vDoBywUA/wFyt4WJi4i28zm++vd/P0BCAsUxdYLIysc3tDoAADs2PHqBxwqyd0SJicP4NjiBQ/+3eHkDgTzAREeHyUT/AMWGAz77+/0Fxf0HBsSGC8rFxUZEP31CBcdMzAb"}];
for(const f of negativeFixtures){const m=H.matchFeature(decodeFixture(f))[0];assert.equal(m.cardId,'quickBlader');assert.ok(m.best<.938,`negative fixture ${f.label} must stay below threshold: ${m.best}`)}
let transient=H.decideHandSamples([{counts:{quickBlader:1},scores:{quickBlader:[.97]}},{counts:{quickBlader:1},scores:{quickBlader:[.96]}},{counts:{},scores:{}}]);
assert.equal(transient.recognized.quickBlader,undefined,'two-frame transient similarity must not confirm a card');


assert.equal(H.parseCostText('1'),1);
assert.equal(H.parseCostText(' 03 '),3);
assert.equal(H.parseCostText('10'),10);
assert.equal(H.parseCostText('11'),null);
assert.equal(H.parseCostText('x'),null);


let iphoneRuntimePositive=H.decideHandSamples([
  {counts:{quickBlader:1},scores:{quickBlader:[.9623]},candidates:[{best:{cardId:'quickBlader',imageScore:.9623,expectedCost:1,detectedCost:1,costAccepted:true,costMatched:true,matched:true,decision:'matched'}}]},
  {counts:{quickBlader:1},scores:{quickBlader:[.9623]},candidates:[{best:{cardId:'quickBlader',imageScore:.9623,expectedCost:1,detectedCost:1,costAccepted:true,costMatched:true,matched:true,decision:'matched'}}]},
  {counts:{quickBlader:1},scores:{quickBlader:[.9613]},candidates:[{best:{cardId:'quickBlader',imageScore:.9613,expectedCost:1,detectedCost:1,costAccepted:true,costMatched:true,matched:true,decision:'matched'}}]},
  {counts:{quickBlader:1},scores:{quickBlader:[.9409]},candidates:[{best:{cardId:'quickBlader',imageScore:.9409,expectedCost:1,detectedCost:1,costAccepted:true,costMatched:true,matched:true,decision:'matched'}}]}
]);
assert.equal(iphoneRuntimePositive.recognized.quickBlader.count,1,'real-video trailing window before play must confirm Quick Blader');

let runtimePositive=H.decideHandSamples([
  {counts:{quickBlader:1},scores:{quickBlader:[.9966]},candidates:[{best:{cardId:'quickBlader',imageScore:.9966,expectedCost:1,detectedCost:1,costAccepted:true,costMatched:true,matched:true,decision:'matched'}}]},
  {counts:{quickBlader:1},scores:{quickBlader:[.9915]},candidates:[{best:{cardId:'quickBlader',imageScore:.9915,expectedCost:1,detectedCost:1,costAccepted:true,costMatched:true,matched:true,decision:'matched'}}]},
  {counts:{},scores:{},candidates:[{best:{cardId:'quickBlader',imageScore:.9421,expectedCost:1,detectedCost:null,costAccepted:false,costMatched:false,matched:false,decision:'cost-unreadable'}}]},
  {counts:{quickBlader:1},scores:{quickBlader:[.9621]},candidates:[{best:{cardId:'quickBlader',imageScore:.9621,expectedCost:1,detectedCost:1,costAccepted:true,costMatched:true,matched:true,decision:'matched'}}]}
]);
assert.equal(runtimePositive.recognized.quickBlader.count,1,'real runtime turn-start evidence must confirm Quick Blader with 3 cost-matched frames');

let runtimeAfterPlay=H.decideHandSamples([
  {counts:{},scores:{},candidates:[{best:{cardId:'quickBlader',imageScore:.9318,expectedCost:1,detectedCost:3,costAccepted:true,costMatched:false,matched:false,decision:'image-below-confirm'}}]},
  {counts:{},scores:{},candidates:[{best:{cardId:'quickBlader',imageScore:.9739,expectedCost:1,detectedCost:null,costAccepted:false,costMatched:false,matched:false,decision:'cost-unreadable'}}]}
],{samplingLimited:true});
assert.equal(runtimeAfterPlay.recognized.quickBlader,undefined,'played Quick Blader must not be recreated in the current hand');
let costMismatch=H.decideHandSamples([
  {counts:{},scores:{},candidates:[{best:{cardId:'quickBlader',imageScore:.9315,expectedCost:1,detectedCost:3,costAccepted:true,costMatched:false,matched:false,decision:'cost-mismatch'}}]},
  {counts:{},scores:{},candidates:[{best:{cardId:'quickBlader',imageScore:.9312,expectedCost:1,detectedCost:3,costAccepted:true,costMatched:false,matched:false,decision:'cost-mismatch'}}]}
]);
assert.equal(costMismatch.recognized.quickBlader,undefined);
assert.equal(costMismatch.unresolved.quickBlader.reason,'cost-mismatch');
assert.equal(costMismatch.unresolved.quickBlader.costMismatchFrames,2);
assert.equal(costMismatch.unresolved.quickBlader.maxImageScore,.9315);

let rescued=H.decideHandSamples([
  {counts:{quickBlader:1},scores:{quickBlader:[.981]},candidates:[{best:{cardId:'quickBlader',imageScore:.981,expectedCost:1,detectedCost:1,costAccepted:true,costMatched:true,matched:true,decision:'matched'}}]},
  {counts:{quickBlader:1},scores:{quickBlader:[.972]},candidates:[{best:{cardId:'quickBlader',imageScore:.972,expectedCost:1,detectedCost:1,costAccepted:true,costMatched:true,matched:true,decision:'matched'}}]}
],{samplingLimited:true});
assert.equal(rescued.recognized.quickBlader.count,1);
assert.equal(rescued.recognized.quickBlader.decision,'cost-proof-limited-rescue');

let unsafeRescue=H.decideHandSamples([
  {counts:{quickBlader:1},scores:{quickBlader:[.961]}},
  {counts:{quickBlader:1},scores:{quickBlader:[.955]}}
],{samplingLimited:true});
assert.equal(unsafeRescue.recognized.quickBlader,undefined,'low-confidence two-frame sample must not rescue');

let notClipped=H.decideHandSamples([
  {counts:{quickBlader:1},scores:{quickBlader:[.99]}},
  {counts:{quickBlader:1},scores:{quickBlader:[.98]}}
],{samplingLimited:false});
assert.equal(notClipped.recognized.quickBlader,undefined,'two frames must not rescue unless the sampling window was clipped');



const mkLayout=(t,xs)=>({sampleTime:t,centers:xs.map(cx=>({cx,cy:487})),candidateCount:xs.length});
const dup=H.normalizeCenters([{cx:708,score:15},{cx:770,score:15},{cx:828,score:24},{cx:830,score:14},{cx:895,score:19},{cx:959,score:15}],1200);
assert.equal(dup.length,5,'near-identical duplicate cost centers must collapse to one card');
assert.ok(dup.some(x=>x.cx===828),'stronger duplicate center must be retained');


const transitionScan=[
  mkLayout(19.498,[708,770,828,895,959]),
  mkLayout(19.538,[708,770,828,895,959]),
  mkLayout(19.578,[708,770,828,895,959]),
  mkLayout(19.618,[708,770,828,895,959]),
  mkLayout(19.658,[708,770,833,959]),
  mkLayout(19.698,[943]),
  mkLayout(19.738,[736,800,866,931])
];
let chosen=H.chooseStableHandWindow(transitionScan,4,3,1200);
assert.deepEqual(chosen.frames.map(x=>x.sampleTime),[19.498,19.538,19.578,19.618],'transition must fall back to the latest stable pre-action hand');
assert.equal(chosen.candidateCount,5);

const afterPlayScan=[
  mkLayout(19.916,[738,801,867,930]),
  mkLayout(19.956,[738,801,867,930]),
  mkLayout(19.996,[738,801,867,930]),
  mkLayout(20.036,[738,801,867,930])
];
chosen=H.chooseStableHandWindow(afterPlayScan,4,3,1200);
assert.deepEqual(chosen.frames.map(x=>x.sampleTime),[19.916,19.956,19.996,20.036],'stable post-play hand must not resurrect an older hand');
assert.equal(H.layoutsCompatible(mkLayout(1,[700,760,820]),mkLayout(2,[701,761,821]),1200),true);
assert.equal(H.layoutsCompatible(mkLayout(1,[700,760,820]),mkLayout(2,[700,760]),1200),false);
assert.equal(H.layoutsCompatible(mkLayout(1,[708,770,828,896,959]),mkLayout(2,[708,770,828,896]),1200),false,'missing-card layout must stay distinct to avoid swallowing play animation');
assert.equal(H.layoutsCompatible(mkLayout(1,[708,770,828,896,959]),mkLayout(2,[737,801,865,930]),1200),false,'post-play reflow must not be treated as the same hand');

const latestCurrentLayout=[
  mkLayout(19.816,[737,801,865,930]),
  mkLayout(19.856,[737,801,865,930]),
  mkLayout(19.896,[737,801,865,930]),
  mkLayout(19.936,[737,801,865,930])
];
const latestPreviousLayout=[
  mkLayout(19.467,[708,770,828,896]),
  mkLayout(19.507,[708,770,828,896,959]),
  mkLayout(19.547,[708,770,828,896,959]),
  mkLayout(19.587,[708,770,828,830,895,959])
];
let latestCurrent=H.chooseStableHandWindow(latestCurrentLayout,4,2,1200);
let latestPrevious=H.choosePreviousStableHandWindow(latestPreviousLayout,latestCurrent,1200);
assert.deepEqual(latestCurrent.frames.map(x=>x.sampleTime),[19.816,19.856,19.896,19.936],'latest diagnostic current hand must remain the post-play 4-card hand');
assert.deepEqual(latestPrevious.frames.map(x=>x.sampleTime),[19.507,19.547,19.587],'latest diagnostic previous hand must recover the pre-play 5-card hand');
assert.equal(latestPrevious.candidateCount,5);
const historyWithTransition=[
  mkLayout(19.700,[943]),
  mkLayout(19.660,[943]),
  mkLayout(19.620,[943]),
  mkLayout(19.580,[708,770,828,896,959]),
  mkLayout(19.540,[708,770,828,896,959]),
  mkLayout(19.500,[708,770,828,896,959])
];
const previousWindows=H.collectPreviousStableHandWindows(historyWithTransition,latestCurrent,1200,4);
assert.equal(previousWindows.length,2,'history scan must retain both transition and older stable hand windows');
assert.equal(previousWindows[0].candidateCount,1,'newer animation-like stable window is kept as first attempt');
assert.equal(previousWindows[1].candidateCount,5,'older pre-play hand remains available as a later recognition attempt');


const actualDiagLayout=[
  mkLayout(19.467,[708,770,828,896]),
  mkLayout(19.507,[708,770,828,896,959]),
  mkLayout(19.547,[708,770,828,896,959]),
  mkLayout(19.587,[708,770,828,830,895,959])
];
chosen=H.chooseStableHandWindow(actualDiagLayout,4,2,1200);
assert.deepEqual(chosen.frames.map(x=>x.sampleTime),[19.507,19.547,19.587],'actual iPhone duplicate must collapse so the latest three 5-card frames form a stable hand');
assert.equal(chosen.candidateCount,5);
assert.equal(chosen.layoutMode,'robust-overlap');

let previousHandDecision=H.decideHandSamples([
  {counts:{quickBlader:1},scores:{quickBlader:[.9405]},candidates:[{best:{cardId:'quickBlader',imageScore:.9405,expectedCost:1,detectedCost:1,costAccepted:true,costMatched:true,matched:true,decision:'matched'}}]},
  {counts:{quickBlader:1},scores:{quickBlader:[.9396]},candidates:[{best:{cardId:'quickBlader',imageScore:.9396,expectedCost:1,detectedCost:1,costAccepted:true,costMatched:true,matched:true,decision:'matched'}}]},
  {counts:{quickBlader:1},scores:{quickBlader:[.9408]},candidates:[{best:{cardId:'quickBlader',imageScore:.9408,expectedCost:1,detectedCost:1,costAccepted:true,costMatched:true,matched:true,decision:'matched'}}]}
]);
assert.equal(previousHandDecision.recognized.quickBlader.count,1,'previous stable hand must recognize Quick Blader from three cost-matched frames');

let actualIphoneTwoFrame=H.decideHandSamples([
  {counts:{quickBlader:1},scores:{quickBlader:[.9405]},candidates:[{best:{cardId:'quickBlader',imageScore:.9405,expectedCost:1,detectedCost:1,costAccepted:true,costMatched:true,matched:true,decision:'matched'}}]},
  {counts:{quickBlader:1},scores:{quickBlader:[.9396]},candidates:[{best:{cardId:'quickBlader',imageScore:.9396,expectedCost:1,detectedCost:1,costAccepted:true,costMatched:true,matched:true,decision:'matched'}}]}
],{samplingLimited:true});
assert.equal(actualIphoneTwoFrame.recognized.quickBlader.count,1,'actual iPhone two-frame cost-matched evidence must rescue Quick Blader');
assert.equal(actualIphoneTwoFrame.recognized.quickBlader.decision,'cost-proof-limited-rescue');
let oneUnreadable=H.decideHandSamples([
  {counts:{quickBlader:1},scores:{quickBlader:[.9405]},candidates:[{best:{cardId:'quickBlader',imageScore:.9405,expectedCost:1,detectedCost:1,costAccepted:true,costMatched:true,matched:true,decision:'matched'}}]},
  {counts:{quickBlader:1},scores:{quickBlader:[.9396]},candidates:[{best:{cardId:'quickBlader',imageScore:.9396,expectedCost:1,detectedCost:1,costAccepted:true,costMatched:true,matched:true,decision:'matched'}}]},
  {counts:{},scores:{},candidates:[{best:{cardId:'quickBlader',imageScore:.9610,expectedCost:1,detectedCost:null,costAccepted:false,costMatched:false,matched:false,decision:'cost-unreadable'}}]}
],{samplingLimited:false});
assert.equal(oneUnreadable.recognized.quickBlader.count,1,'two explicit cost-matched frames plus one unreadable frame must rescue');

let oneMismatchBlocksRescue=H.decideHandSamples([
  {counts:{quickBlader:1},scores:{quickBlader:[.945]},candidates:[{best:{cardId:'quickBlader',imageScore:.945,expectedCost:1,detectedCost:1,costAccepted:true,costMatched:true,matched:true,decision:'matched'}}]},
  {counts:{quickBlader:1},scores:{quickBlader:[.944]},candidates:[{best:{cardId:'quickBlader',imageScore:.944,expectedCost:1,detectedCost:1,costAccepted:true,costMatched:true,matched:true,decision:'matched'}}]},
  {counts:{},scores:{},candidates:[{best:{cardId:'quickBlader',imageScore:.970,expectedCost:1,detectedCost:3,costAccepted:true,costMatched:false,matched:false,decision:'cost-mismatch'}}]}
],{samplingLimited:false});
assert.equal(oneMismatchBlocksRescue.recognized.quickBlader,undefined,'one explicit cost mismatch must block rescue even with two positive frames');



const sampleCanvas={width:120,height:55,getContext(){return{getImageData(){return{data:new Uint8ClampedArray(120*55*4),width:120,height:55}},drawImage(){},putImageData(){},imageSmoothingEnabled:true}}};
const seekLog=[];
WB.video={duration:40,currentTime:19.603};
WB.turnTimeline=[{side:'bottom',turn:1,time:18.719},{side:'top',turn:2,time:21.242}];
WB.cancelRequested=false;
WB.frameCanvas=()=>sampleCanvas;
WB.initOCR=async()=>({async setParameters(){},async recognize(){return{data:{text:'',confidence:0}}}});
WB.restoreOCRDefaults=async()=>true;
WB.seekTo=async(t)=>{seekLog.push(+Number(t).toFixed(3));WB.video.currentTime=Number(t);return Number(t)};

let windowRun=await H.recognizeHand({targetSide:'bottom',relativeSide:'自分',time:19.603,row:{side:'bottom',turn:1,time:18.719}});
assert.deepEqual(windowRun.samples.map(s=>s.sampleTime),[19.483,19.523,19.563,19.603]);
assert.equal(windowRun.windowMode,'stable-backscan');
assert.equal(windowRun.plannedFrames,4);
assert.equal(windowRun.capturedFrames,4);
assert.ok(windowRun.samples.every(s=>s.sampleTime<=19.603),'stable backscan must never sample future frames');
assert.equal(WB.video.currentTime,19.603,'video position must restore to requested state');

WB.video.currentTime=20.028;seekLog.length=0;
windowRun=await H.recognizeHand({targetSide:'bottom',relativeSide:'自分',time:20.028,row:{side:'bottom',turn:1,time:18.719}});
assert.deepEqual(windowRun.samples.map(s=>s.sampleTime),[19.908,19.948,19.988,20.028]);
assert.ok(windowRun.samples.every(s=>s.sampleTime<=20.028),'after-play capture must also remain past-only');
assert.equal(WB.video.currentTime,20.028,'after-play run must restore current position');

console.log('CARD DB + HAND RECOGNITION REGRESSION PASS');

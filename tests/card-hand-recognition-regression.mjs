import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const WB={registerModule(){},log(){},turnTimeline:[],video:{duration:93.627,currentTime:21.107}};
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
assert.equal(qb.recognition.method,'hand-title-signature-v2');
assert.equal(qb.recognition.threshold,.94);
assert.equal(qb.recognition.stableFrames,3);
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
assert.equal(d.unresolved.quickBlader.reason,'no-positive-match');

d=H.decideHandSamples([
  {counts:{quickBlader:2},scores:{quickBlader:[.99,.98]}},
  {counts:{quickBlader:1},scores:{quickBlader:[.97]}},
  {counts:{quickBlader:1},scores:{quickBlader:[.95]}}
]);
assert.equal(d.recognized.quickBlader.count,1,'count is conservative when frames disagree');


const decodeFixture=p=>{const raw=Buffer.from(p.data,'base64'),v=new Float32Array(raw.length);let norm=0;for(let i=0;i<raw.length;i++){let q=raw[i];if(q>127)q-=256;const x=q/p.scale;v[i]=x;norm+=x*x}norm=Math.sqrt(norm)||1;for(let i=0;i<v.length;i++)v[i]/=norm;return v};
const negativeFixtures=[{"label":"v2_7","scale":528.2591607272693,"data":"9vTx///7/Pr6//cPCRIN//Dl+wLrB/z7/v8FNjIUCvfp6ujfAgnv6uDtBw8cOCchBu3l597fDAzl3ufpEA8tMBsQB+zd49vlChDi7xz4ExglLRwfCezR2+ftGBDyAh0KHRoNBBYuE+zV3NvdAvjo+QMDE/nxDTgwFevV5dna//H/CSYaJBYdGiovEOvU3+jhBgL9AggEDw4REwbYm4ig2gj8JBsPFBkSJiggFAgEzr/oBxETIh8B/QAHHiMWCQcJ5dMECAUMJh4C+/j+Gh0TChEZ8c8GCQcKIxsE+vP7FhgP+/0O784F/fPtHx0D9vL9FhIV+/YH7c4C/wr+Bv309e35EAn69AAH588B/wgGAv39+On0Afv29QAE6M/+BQwE/gMSAAALAgEA/fP819XhAQwT1d//6eL31tPS6u7kEhMDDAUO2OATICAS1M7c8PLnCiMBBQgO1dsPHikY1sfg7u3iCCMBBw8TztYKIC4a4c/j/P/oBigJEBUazNYNICgN5dvmBxD7ESkOEg8R+AkcICQS9PEIDgDzEy8NCAoKBg0RHywgDAcMDf70DywQBfkA"},{"label":"v3_60","scale":751.6343395521646,"data":"JjY2KCg5MiApFikSAhkP+ufn5uAGMjE5LykrGiEqFArmv9LkwdTpLy4mISAxNiMrGPa4vcroyergFCsgB+MPPwQgC+bWwtDU2PwL9en/MTVCQQ0A5fHe6dzP3uXd7xYIIjM3Hvfp8gP+4tLT1driJyYOBR4S7vkD++7v0fMAx9DuAwjSzOTU3x75DQ7Lvv/k/f3//Pn28O3s7ujBr4mIATohCxUZEAcFA/rz+PTnAP4JJUJSCR4rEf/8+/Ds6d3fKDsaHj1oBf4KBvn07vXs3OTfKDcgJS9kA+33+/Xv3dnX1OjtOEA5FzJNAe338+/s1s3DxuLxHSUkAyUr/Pb13djm5d7Y3+zpHy8aGScl/vz05N3w9+3y6ODnJTUdHfQN+PkACxEXGigqIxUDt42Y9/Ds3+Ha2N7n6/4B/gAb+cnt79bK+/Xk5PL/AQwQFRgi5dv379+7CyANCBIeHBweHxwe5sjr9OPFCT0jExEdJSQkIxYRxKfB+OvWCDAaCg8YIyxBPSMM073MAOviEh0VFyggICozKh0S0LbU7Nq4CQkjOjwbEx0lJiEY3Nnr9hr3"},{"label":"hard27","scale":553.0857642220831,"data":"6efi9fTw8e/s9esN/hIICer28frcAPLw9/X9PTcPICEA4vD4+ATg2szgAAobPigiHC/q4OnpBwTRy9jaDgktNRgLEOny29/dBArQ4RvsEBcnLhge5grp9/X4GQzm+B0DHRoI+xUuAAX19/nm+evX6/n6Ee/jB0E0Bvj49QHT+eL4BCgXJxIgFy40GBPq+PLrBQUB/QIEBwUICgvPloiSygMRGxEJExMPJC4k/AEIyLTW+g0HJBkB9vgCHCUYAgYR69P0/wb+KRz/8u/5Fh8MAxEgExwH+fD0Ihn/7un1FBoLAPYYMxci/Ov3HRH46+j3FhcP+e4CKB8h+PUKBfjy6+b1Cwf37/QBEA8N+PoS+vz89OTp9vTy9PwCEw7l4PP8BwgKBwkMAPv5/QIO5eHoBxsM1+cE6Oz/2NDc9PXsDhQSD/7+0OEWHSAa1M7g9vDoBywUA/wFyt4WJi4i28zm++vd/P0BCAsUxdYLIysc3tDoAADs2PHqBxwqyd0SJicP4NjiBQ/+3eHkDgTzAREeHyUT/AMWGAz77+/0Fxf0HBsSGC8rFxUZEP31CBcdMzAb"}];
for(const f of negativeFixtures){const m=H.matchFeature(decodeFixture(f))[0];assert.equal(m.cardId,'quickBlader');assert.ok(m.best<.94,`negative fixture ${f.label} must stay below threshold: ${m.best}`)}
let transient=H.decideHandSamples([{counts:{quickBlader:1},scores:{quickBlader:[.97]}},{counts:{quickBlader:1},scores:{quickBlader:[.96]}},{counts:{},scores:{}}]);
assert.equal(transient.recognized.quickBlader,undefined,'two-frame transient similarity must not confirm a card');


WB.turnTimeline=[
  {side:'bottom',turn:1,time:18.719},
  {side:'top',turn:2,time:21.242},
  {side:'bottom',turn:2,time:25.148}
];
const lateCtx={targetSide:'bottom',relativeSide:'自分',time:21.107,row:{side:'bottom',turn:1,time:18.719}};
const latePlan=H.planSampleTimes(lateCtx,'current');
assert.equal(latePlan.nearStart,false);
assert.ok(latePlan.times.length>=3,'late-turn current hand must still have at least 3 samples');
assert.ok(latePlan.times.every(x=>x.time>=18.759&&x.time<21.192),'current samples must stay inside the own-turn window');
assert.ok(latePlan.times.some(x=>Math.abs(x.time-21.107)<.001),'current frame must be included');

const startPlan=H.planSampleTimes(lateCtx,'turn-start');
assert.deepEqual(startPlan.times.map(x=>x.time),[18.799,18.899,19.439,19.539]);
assert.ok(startPlan.times.every(x=>x.time<21.192),'turn-start evidence must never cross into the opponent turn');

const startEvidence=H.decideHandSamples([
  {counts:{quickBlader:1},scores:{quickBlader:[.9908]}},
  {counts:{quickBlader:1},scores:{quickBlader:[.9871]}},
  {counts:{quickBlader:1},scores:{quickBlader:[.9664]}},
  {counts:{quickBlader:1},scores:{quickBlader:[.9658]}}
]);
assert.equal(startEvidence.recognized.quickBlader.count,1,'real 1T start samples must confirm Quick Blader');

console.log('CARD DB + HAND RECOGNITION REGRESSION PASS');

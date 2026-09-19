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

const DB=WB.CardDB,H=WB.HandRecognition,qb=DB.get('quickBlader'),zeta=DB.get('zetaBeatrix'),barbaros=DB.get('barbaros');
assert.equal(DB.meta.complete,false);
assert.equal(DB.meta.verifiedCards,3);
assert.equal(DB.meta.recognitionEnabledCards,3);
assert.equal(qb.officialId,10021110);
assert.equal(qb.cost,1);
assert.equal(qb.atk,1);
assert.equal(qb.life,1);
assert.equal(qb.route.type,'storm');
assert.equal(qb.recognition.method,'hand-title-anchor-cost-gate-v11');
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
assert.equal(qb.recognition.anchorThreshold,.92);
assert.equal(qb.recognition.anchorCandidateThreshold,.90);
assert.equal(qb.recognition.anchorFeatureLength,420);
assert.equal(zeta.recognition.anchorThreshold,.92);
assert.equal(barbaros.recognition.anchorThreshold,.92);
assert.deepEqual([...H.anchorAngles],[-10,-5,0,5,10]);
assert.deepEqual([...H.anchorCenterShifts],[-4,-2,0,2,4]);

const anchorProfiles={
  quickBlader:DB.anchorRecognitionProfiles('quickBlader'),
  zetaBeatrix:DB.anchorRecognitionProfiles('zetaBeatrix'),
  barbaros:DB.anchorRecognitionProfiles('barbaros')
};
assert.equal(anchorProfiles.quickBlader.length,7);
assert.equal(anchorProfiles.zetaBeatrix.length,5);
assert.equal(anchorProfiles.barbaros.length,4);
for(const [id,rows] of Object.entries(anchorProfiles))for(const p of rows)assert.equal(p.length,420,`${id} anchor profile length`);

const profiles=DB.recognitionProfiles('quickBlader');
assert.equal(profiles.length,4);
for(const p of profiles)assert.equal(p.length,432);
for(let i=0;i<profiles.length;i++){const loo=Math.max(...profiles.map((p,j)=>j===i?-1:H.shiftedCosine(profiles[i],p)));assert.ok(loo>.945,`positive profile ${i} must match another real frame`)}
const self=H.matchFeature(profiles[0]).find(x=>x.cardId==='quickBlader');
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

const anchorFixtures=[{"label":"qb_old_19_483","cardId":"quickBlader","time":19.483,"cx":828,"dx":2,"angle":0,"expectedMin":0.92,"profile":{"scale":673.408186544914,"data":"MRDq8vv06u7q4xYIICcpMCMrQCoGGCEs2OsvMDopFxog1dXnJC0bJOApMuPt3QMfJf0y7vzp7wb5/SAvNxva6+XSABATIgIs283b9xsm//0SF9TnzOj8+s7XJObWBOPYAyr08Szq2t3jxesOAS8SAzbcw9Lv8AcMABgf0M7R5xXY3Orv7tbR3DQh7gDcgdn2+Pv89fb+iZwACv33BAQE98/6FxkoNisUEAbP+AgTIzc1CgQCbO0BEg8REQD5+CZiBhT/9QoC7tEhNA0UCwMC8unSRhIPDg0E6+Ht4tffEw0NCOjr/vXy3w4i/gjj4t/m9OMBHPEJABYM9PDbyfcNBSUqOvjX7uYCBAg1NCca0N/WEAgWHfTt7uKdHDs6P0BGSUi10AP4BQkKBPoNK/fk4eTb2N3o6yf45+3w5+Pv8vC3AfD2CPv4/gIE2r3z9AkN/gMFEdjM9fAABfj+CA7B7PL2/QAJGAoLOwXu9P37GxsLCi1T/eX++QcPDRAtdQj0E/cB9/sMQ08QAff75Nni/E//Cfr+AuDZ3+tACQ73++zp9/r5"},"score":0.9995890259742737},{"label":"zeta_75_833","cardId":"zetaBeatrix","time":75.833,"cx":772,"dx":0,"angle":0,"expectedMin":0.92,"profile":{"scale":551.8693834502883,"data":"J+v17/b38vT37hfN0M7P7tHMGO3e2tf4MBscBBUD3e8CKD4e5QoEFdrj7AJEAfQMAgUD9/f/+wP6+DEWB/Xw/w4K4gUPHOD+CwL2CQ3/7gMDDSTi+98rAxYz9Qw56C87Nw8VO/IjA93oBRIG7OgU8RD97xni1/QM9OYB8PjsEtscMOwdDynu8Rvc89iB0PLx8Pr15uf1jQQYMzssJSMhKCEUC/Tq7vT07fEeE/vX1+nx9vj1MQ723d3s+P7//Dr2//z0+AgHBwoz9v0B+fgKCvrx/AX/9evoARIC9AYJAfXr4voO+Ozd9AUB8eXnAeze2PQJB/ns+CstGfwIDhUQCgQqSfoFEA0VGRD+Hj3uBwb4DRQFBQcRE4r3ERIeLTAyJSCk0tfU0d/+8unjzdLo+PwQDvH4ANzq/wwNCgwFBP/Y9AgPDxMLDAP4twIDAAQoDxf/68AKBfwILg8REQ71CQoHHTEN+AMP6u/4Bx4rDvIIFxb67QISGwz8Dx87G/8DDBIH9/T3JyoOCv0A9eXZ/RodBQn3+e7e1gEDCxT18fPx7OLs"},"score":0.984366238117218},{"label":"barbaros_75_833","cardId":"barbaros","time":75.833,"cx":834,"dx":-2,"angle":0,"expectedMin":0.92,"profile":{"scale":529.6984117858846,"data":"Jw70Bv/+Agbx/SMf+ev15+/x49vx3ebx/Cn7DOzi1dzn+O7pIjgH7gDh7+36/TA4G/ADFfjm8fwWGhjuEPfyDP35GhowHw/bOf8d9CE6MQr93vj9JwIARe/fGgLtFhgEFxj31jH5/g3b7egE5tkE9hXz6gLY9eTh5BTrBhU01ezr5O0t/wLtJfnw7iyUpuPl4ujp19jkgc4OFyofExsbGAMLGygoAhYMDgv8CRJDPhcUCRISCQUVOTUcEwgHERXsHRswHgkFCg4A+QwOEwH5AgMFB/v2B/z09vzw5+f67f4BBgD6+Pje5QD3+vz/AfP22OIG8/f4+P/z8uD+Be/3/fP3+/nxC/z+AgIJChgA+/38AgH8/AYE8LflTEhAMkRTSTy/9P769fH6Bf7x+/jx6+ro8Pr39Pz++OHk6u3w9fzw//Xi5ezt7vP55v7w7Ozx9/r07ez/8fDw+/3//PflBfbv8v8HCRccHQ/69u7l9A0YDxM17f8A9e4FGRMqOe0E9/YIBx8XQwbzAf7/DAkgEyPyCvXp7Pb1+A4VAf/v6OkFDRcl"},"score":0.9551635980606079},{"label":"qb_75_833","cardId":"quickBlader","time":75.833,"cx":893,"dx":0,"angle":0,"expectedMin":0.92,"profile":{"scale":604.3846994718422,"data":"Kw3g/Af47+Xv6xMDGyIlKiImLx7+FCEe4fQwKDIkEhkn1tntKSAgJuchL97w3hQeIvUuA//p9gf48h0rNA7b9eXaAw4SIO8t2dbh9h4jBw8MG9ri0uwB+9ncEeTbCePe/DXr8R3s3eDh0OcMAiEZASXkydb07gcXARQW19PV8Bnf4O/48NjZ5CwV5O3IoOj2+ff19PHygbYCCAT8/wH89cH/ERIlMCkcEgj//Q0SJUIwDgT9PRcOERAeIQr68C46CQwCAw0F6dYoOAgKBP8D/+jZPQoNDAgA8+7u7OTkCBIIAO/m7/Ln5RgfAADu6Ojo5uASHQEB9fPz5eTW4QQDBBYiJe/W3OT+CA80MjEZ3NXiCQkWIu/3/MK1Ijc+PT5AQUKw0P0B/wEHDRARIOzs3t/j3d/g4fb29vPr4unz9fLR8Pfy+P31+wAA4uPy7wQD9wQLDOff8fAEAvsHDhDD6e/2AgQDDQ0JFgbv+AIEBQ8NCBdB7fMEBAYODw04YfnyBQUC+wMJPWcI9AMG9Obt+k0IC/f/Au7i6fA5FAb39/Ht+P34"},"score":0.992716372013092},{"label":"barbaros_77_964","cardId":"barbaros","time":77.964,"cx":802,"dx":-2,"angle":0,"expectedMin":0.92,"profile":{"scale":488.1587286604463,"data":"Iwj0Bf78BgT0+h4Z9/Lx5/P05dr13ej2+x0ACu/l2tzq/e/qGzQJ7QHj7+35+yozHvP8A/fo9P4VFBj5D/X0C/v7Hh8oGwbdJfsf8yA3LxIA4f38Jf4EQu7eG/7zExMIFBv72DQIAQve7egD6NcJ+BL07ALY9uzp6BfpAw4z2u315u0rAQHzIvjw8SensObn4+Hj5ObngeYmDg0MCQsMAesFHCooERYXGQz2BhtBNBkOCQsQ/wQYOjEhEAwEDBLzFR8vHwsLDgoF+wsMEAP8/gMMCAP4CPf18/jz2PsC7wL8/P/48vnm8QP59QAE+/Dy5OwG7PL++/zz9+L9COvy/fz8AfzyDAEC+voAARABCvoBBP/0/QAB88zsPzU3QkVKREPPAvP0Agb++fbzCPfu5+/28enz+f0H8OHp8Ozr7/LzCPPm6vDp6/Ly4gH47evy9fPv8On48ury/w0J9fLo8vrl+AghGxkhDvcE9vXu9goXDCAe/P3+8ugMGAkmMPgWAPEEDRcHORz3Avr1AQcKByADAfXw7v0GARH/Bf3m6eIGCAsj"},"score":0.9995776414871216},{"label":"qb_77_964","cardId":"quickBlader","time":77.964,"cx":867,"dx":0,"angle":0,"expectedMin":0.92,"profile":{"scale":590.993931492258,"data":"D+39APfx7e7s6QcYHCIqIiIuHyYWISvi8isqMyUrFyLg3e0cIB8nMRsp5e7iBCMk/P/yBenxA/v0GSo/C+Pz5dv5DhEhMCHj1+P1GSQEBgIS3ePV7P791N7j6d4E6t8GKvPv7vDg5+nO7BABIRP3Kd/N2fLtChMxFhnY1NbrG+Hi7fX23tjhJxXo892F4AH5+/36+vn5iu/0/v7/AP358+4ZHyYyJxYTCwQDDxojOykKBwL59QsUDxYVAvv891YFEAIBCP3q1O5aBg4EAgL55My7CAwRDATv5uji2uUZCxED7/P8+vfiFRgBCuTp7/bs5AMc+AT8Cgb12OPT8QYEHyYu6tTj3gEIEjQ4LBf72OELCSUg+wAFAKseNzM4PkNIR0fA/fr5Aw8OCxMY/+Hm5djP4ujw+Pfm7u/k2u7v8/b97PP//+33Af79xADvCBPzAAIO/L8B9wAG8/4CCxfr9/r//P0DAwoREvX2+QMWDAAGDFn+8f76BAgICw5/DvsI+gXu8gMNYBIB/QLu3uX5Cx0I+fn34OLi7vgaCPj57ef3Afn3"},"score":0.9995375275611877}];
for(const f of anchorFixtures){
  const feature=decodeFixture(f.profile),matches=H.matchAnchorFeature(feature),own=matches.find(x=>x.cardId===f.cardId);
  assert.ok(own.best>=f.expectedMin,`anchor fixture ${f.label} must confirm ${f.cardId}: ${own.best}`);
  for(const x of matches.filter(x=>x.cardId!==f.cardId))assert.ok(x.best<.90,`anchor fixture ${f.label} must not cross wrong-card candidate gate for ${x.cardId}: ${x.best}`);
}
const zeroTitle=new Float32Array(432);
const qbAnchorFixture=decodeFixture(anchorFixtures.find(x=>x.label==='qb_old_19_483').profile);
const dualQb=H.matchCardFeatures(zeroTitle,[qbAnchorFixture]).find(x=>x.cardId==='quickBlader');
assert.equal(dualQb.imageConfirmed,true,'anchor evidence must recover Quick Blader when fixed title strip fails');
assert.equal(dualQb.imageSource,'anchor');
assert.ok(dualQb.anchorScore>=.92);
assert.equal(H.resolveCostGate(dualQb,{accepted:true,value:7,source:'ocr'}).matched,false,'strong anchor evidence must still be rejected by wrong displayed cost');

const negativeFixtures=[{"label":"v2_7","scale":528.2591607272693,"data":"9vTx///7/Pr6//cPCRIN//Dl+wLrB/z7/v8FNjIUCvfp6ujfAgnv6uDtBw8cOCchBu3l597fDAzl3ufpEA8tMBsQB+zd49vlChDi7xz4ExglLRwfCezR2+ftGBDyAh0KHRoNBBYuE+zV3NvdAvjo+QMDE/nxDTgwFevV5dna//H/CSYaJBYdGiovEOvU3+jhBgL9AggEDw4REwbYm4ig2gj8JBsPFBkSJiggFAgEzr/oBxETIh8B/QAHHiMWCQcJ5dMECAUMJh4C+/j+Gh0TChEZ8c8GCQcKIxsE+vP7FhgP+/0O784F/fPtHx0D9vL9FhIV+/YH7c4C/wr+Bv309e35EAn69AAH588B/wgGAv39+On0Afv29QAE6M/+BQwE/gMSAAALAgEA/fP819XhAQwT1d//6eL31tPS6u7kEhMDDAUO2OATICAS1M7c8PLnCiMBBQgO1dsPHikY1sfg7u3iCCMBBw8TztYKIC4a4c/j/P/oBigJEBUazNYNICgN5dvmBxD7ESkOEg8R+AkcICQS9PEIDgDzEy8NCAoKBg0RHywgDAcMDf70DywQBfkA"},{"label":"v3_60","scale":751.6343395521646,"data":"JjY2KCg5MiApFikSAhkP+ufn5uAGMjE5LykrGiEqFArmv9LkwdTpLy4mISAxNiMrGPa4vcroyergFCsgB+MPPwQgC+bWwtDU2PwL9en/MTVCQQ0A5fHe6dzP3uXd7xYIIjM3Hvfp8gP+4tLT1driJyYOBR4S7vkD++7v0fMAx9DuAwjSzOTU3x75DQ7Lvv/k/f3//Pn28O3s7ujBr4mIATohCxUZEAcFA/rz+PTnAP4JJUJSCR4rEf/8+/Ds6d3fKDsaHj1oBf4KBvn07vXs3OTfKDcgJS9kA+33+/Xv3dnX1OjtOEA5FzJNAe338+/s1s3DxuLxHSUkAyUr/Pb13djm5d7Y3+zpHy8aGScl/vz05N3w9+3y6ODnJTUdHfQN+PkACxEXGigqIxUDt42Y9/Ds3+Ha2N7n6/4B/gAb+cnt79bK+/Xk5PL/AQwQFRgi5dv379+7CyANCBIeHBweHxwe5sjr9OPFCT0jExEdJSQkIxYRxKfB+OvWCDAaCg8YIyxBPSMM073MAOviEh0VFyggICozKh0S0LbU7Nq4CQkjOjwbEx0lJiEY3Nnr9hr3"},{"label":"hard27","scale":553.0857642220831,"data":"6efi9fTw8e/s9esN/hIICer28frcAPLw9/X9PTcPICEA4vD4+ATg2szgAAobPigiHC/q4OnpBwTRy9jaDgktNRgLEOny29/dBArQ4RvsEBcnLhge5grp9/X4GQzm+B0DHRoI+xUuAAX19/nm+evX6/n6Ee/jB0E0Bvj49QHT+eL4BCgXJxIgFy40GBPq+PLrBQUB/QIEBwUICgvPloiSygMRGxEJExMPJC4k/AEIyLTW+g0HJBkB9vgCHCUYAgYR69P0/wb+KRz/8u/5Fh8MAxEgExwH+fD0Ihn/7un1FBoLAPYYMxci/Ov3HRH46+j3FhcP+e4CKB8h+PUKBfjy6+b1Cwf37/QBEA8N+PoS+vz89OTp9vTy9PwCEw7l4PP8BwgKBwkMAPv5/QIO5eHoBxsM1+cE6Oz/2NDc9PXsDhQSD/7+0OEWHSAa1M7g9vDoBywUA/wFyt4WJi4i28zm++vd/P0BCAsUxdYLIysc3tDoAADs2PHqBxwqyd0SJicP4NjiBQ/+3eHkDgTzAREeHyUT/AMWGAz77+/0Fxf0HBsSGC8rFxUZEP31CBcdMzAb"}];
for(const f of negativeFixtures){const matches=H.matchFeature(decodeFixture(f)),m=matches.find(x=>x.cardId==='quickBlader');assert.equal(m.cardId,'quickBlader');assert.ok(m.best<.938,`negative fixture ${f.label} must stay below QB threshold: ${m.best}`);for(const id of ['zetaBeatrix','barbaros']){const x=matches.find(v=>v.cardId===id);assert.ok(x.best<.90,`negative fixture ${f.label} must stay below ${id} candidate gate: ${x.best}`)}}
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
assert.equal(previousWindows.length,1,'single-card animation must not qualify as a stable hand window');
assert.equal(previousWindows[0].candidateCount,5,'history scan must skip the animation and retain the older pre-play hand');


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

assert.equal(zeta.recognition.enabled,true);
assert.equal(barbaros.recognition.enabled,true);
assert.equal(zeta.recognition.threshold,.93);
assert.equal(barbaros.recognition.threshold,.93);
assert.equal(zeta.recognition.rescueThreshold,.945);
assert.equal(barbaros.recognition.rescueThreshold,.945);
assert.deepEqual(zeta.recognition.acceptedCosts,[4,6]);
assert.deepEqual(barbaros.recognition.acceptedCosts,[7]);
const zetaProfiles=DB.recognitionProfiles('zetaBeatrix'),barbarosProfiles=DB.recognitionProfiles('barbaros');
assert.equal(zetaProfiles.length,7);
assert.equal(barbarosProfiles.length,11);
for(const [id,rows] of [['zetaBeatrix',zetaProfiles],['barbaros',barbarosProfiles]])for(const p of rows){assert.equal(p.length,432);const m=H.matchFeature(p).find(x=>x.cardId===id);assert.ok(m.best>.999,`${id} profile must self-match`)}
const costScopeFixture=[{cardId:'quickBlader',expectedCost:1,acceptedCosts:[1],best:.97,imageCandidate:true,costRequired:true},{cardId:'zetaBeatrix',expectedCost:4,acceptedCosts:[4,6],best:.95,imageCandidate:true,costRequired:true},{cardId:'barbaros',expectedCost:7,acceptedCosts:[7],best:.94,imageCandidate:true,costRequired:true}];
assert.equal(H.selectCostScopedMatch(costScopeFixture,{accepted:true,value:4}).cardId,'zetaBeatrix');
assert.equal(H.selectCostScopedMatch(costScopeFixture,{accepted:true,value:6}).cardId,'zetaBeatrix','Enhance 6 display must still select Zeta');
assert.equal(H.selectCostScopedMatch(costScopeFixture,{accepted:true,value:7}).cardId,'barbaros');
assert.equal(H.selectCostScopedMatch(costScopeFixture,{accepted:false,value:null}).cardId,'quickBlader');
assert.equal(DB.costRecognitionProfiles,undefined,'card DB must not own displayed-cost digit templates');
assert.equal(WB.DisplayedCostRecognition.meta.cardIndependent,true);
assert.deepEqual(WB.DisplayedCostRecognition.meta.templateValues,[1,7]);
assert.deepEqual(WB.DisplayedCostRecognition.meta.centerDx,[-2,-1,0,1,2]);
const cost1Profiles=H.displayedCostProfiles(1);
assert.equal(cost1Profiles.length,5);
for(const p of cost1Profiles){
  assert.equal(p.length,160);
  const m=H.matchDisplayedCostFeature(p).find(x=>x.value===1);
  assert.ok(m.score>.999,'generic displayed-cost 1 template must self-match');
  assert.equal(m.accepted,true);
}
const cost7Profiles=H.displayedCostProfiles(7);
assert.equal(cost7Profiles.length,5);
assert.equal(WB.DisplayedCostRecognition.meta.templates[0].threshold,.98);
for(const p of cost7Profiles){assert.equal(p.length,160);const m=H.matchDisplayedCostFeature(p).find(x=>x.value===7);assert.ok(m.score>.999,'generic displayed-cost 7 template must self-match');assert.equal(m.accepted,true)}
const decodeCostFixture=p=>decodeFixture(p);
const cost6Negative=decodeCostFixture({"scale":643.3189086914062,"data":"X1VDRUAzLg/n3EsjFgr17P0VGSgRHhAJD/Te4QImEyX7JR/5DvTR6yEULD0PBQsM9eQSDE08IUEPBOToDAxUJQdMNf326AwISysFRjAY/ur/AxIfGCgbGusX8fkBBBEZE/MM7fz47PH+9vAYDZoK/TY1R0ET04+B6e04RRG1mZC8nPvzOh7MkJOJlM4NDy4X9puOkpCNIQk1IO3RopiTlA=="});
const cost6Vs1=H.matchDisplayedCostFeature(cost6Negative).find(x=>x.value===1);
assert.ok(cost6Vs1.score<.98,'visible cost 6 must not pass generic displayed-cost 1 template');
const cost6Match=H.matchDisplayedCostFeature(cost6Negative).find(x=>x.value===7);
assert.ok(cost6Match.score<.98,`visible cost 6 must not pass generic displayed-cost 7 template: ${cost6Match.score}`);

const qbCost1Exact=decodeCostFixture({"scale":658.1745301713127,"data":"KQ/c1/gqLAndtB4jL1xjThMELw4PWX9D8AT90MLKMngh/Rbv0urM01tQ4Awk/BF2+vRjHOEYKRrxdwQRYBXmDiEa8ngCD2IR3ggiF+52BhNDMc3zFg/5exkdAzrW3vr3JUo9FvUD+t/X4/wQEPHp6eTg+Ork4e/x0tXm1Im1wO3Ow6/V++ykpqDSDx+zyvbyp6KQ0vUOtcjm9c6PnwgSGg=="});
const zetaCost6Exact=decodeCostFixture({"scale":594.1963149593497,"data":"FycuMDAi/dnX1lxCKywiGSYY8eggExYE8eba7yBGFSIOCh/53+TwChkdBywU/w764ugYDDw9HxcAC+njDQlMMRBEGP3l6AgJTiMERjEC9ucIBDMqCTkiIPj39/8BFBsdFhLiIfXz+gIQEQLyGNb9/gcHDxEWIbqFDvc0LUUy4KWigfHqNTXzrZqPr7r/AzMO1ZCVkJCrFgYnHgWxlJSTjQ=="});
for(const [label,feature] of [['QB cost 1',qbCost1Exact],['Zeta visible cost 6',zetaCost6Exact]]){
  const m=H.matchDisplayedCostFeature(feature).find(x=>x.value===7);
  assert.ok(m.score<.98,`${label} must stay below strict generic cost-7 template threshold: ${m.score}`);
}

const zeta6=costScopeFixture.find(x=>x.cardId==='zetaBeatrix');
const zetaDisplayed=H.resolveDisplayedCost({accepted:true,value:6,reads:[]},{accepted:false,value:7,score:.5,threshold:.935});
const zeta6Gate=H.resolveCostGate(zeta6,zetaDisplayed);
assert.equal(zeta6Gate.matched,true);
assert.equal(zeta6Gate.source,'ocr');
assert.equal(zeta6Gate.validatedCost,6);
const genericSeven=H.resolveDisplayedCost({accepted:true,value:2,reads:[]},{accepted:true,value:7,score:.98,threshold:.935});
assert.equal(genericSeven.accepted,true);
assert.equal(genericSeven.value,7);
assert.equal(genericSeven.source,'template');
const bar7=costScopeFixture.find(x=>x.cardId==='barbaros');
const barTemplateGate=H.resolveCostGate(bar7,genericSeven);
assert.equal(barTemplateGate.matched,true,'Barbaros must accept the generic displayed-cost 7 result');
assert.equal(barTemplateGate.validatedCost,7);
const futureSeven={cardId:'futureSeven',label:'将来の7コスト',expectedCost:7,acceptedCosts:[7],best:.97,imageCandidate:true,costRequired:true};
const futureSix={cardId:'futureSix',label:'将来の6コスト',expectedCost:6,acceptedCosts:[6],best:.96,imageCandidate:true,costRequired:true};
assert.equal(H.selectCostScopedMatch([futureSeven,futureSix],genericSeven).cardId,'futureSeven','generic cost 7 must be reusable by any future 7-cost card');
const futureSevenGate=H.resolveCostGate(futureSeven,genericSeven);
assert.equal(futureSevenGate.matched,true,'generic cost 7 must validate a non-Barbaros 7-cost card');
assert.equal(futureSevenGate.validatedCost,7);
assert.equal(H.resolveCostGate(futureSix,genericSeven).matched,false,'generic cost 7 must not leak into a 6-cost card');
const qbGate=H.resolveCostGate(costScopeFixture.find(x=>x.cardId==='quickBlader'),{accepted:true,value:3,source:'ocr'});
assert.equal(qbGate.matched,false,'QB wrong OCR cost must remain blocked');

let enhanceDisplayDecision=H.decideHandSamples([
 {counts:{zetaBeatrix:1},scores:{zetaBeatrix:[.9447]},candidates:[{best:{cardId:'zetaBeatrix',imageScore:.9447,expectedCost:4,acceptedCosts:[4,6],detectedCost:6,validatedCost:6,ocrCostAccepted:true,costAccepted:true,costMatched:true,costSource:'ocr',matched:true,decision:'matched'}}]},
 {counts:{zetaBeatrix:1},scores:{zetaBeatrix:[.9426]},candidates:[{best:{cardId:'zetaBeatrix',imageScore:.9426,expectedCost:4,acceptedCosts:[4,6],detectedCost:6,validatedCost:6,ocrCostAccepted:true,costAccepted:true,costMatched:true,costSource:'ocr',matched:true,decision:'matched'}}]},
 {counts:{zetaBeatrix:1},scores:{zetaBeatrix:[.9437]},candidates:[{best:{cardId:'zetaBeatrix',imageScore:.9437,expectedCost:4,acceptedCosts:[4,6],detectedCost:6,validatedCost:6,ocrCostAccepted:true,costAccepted:true,costMatched:true,costSource:'ocr',matched:true,decision:'matched'}}]}
]);
assert.equal(enhanceDisplayDecision.recognized.zetaBeatrix.count,1,'actual iPhone Enhance-6 Zeta evidence must confirm');

let barbarosTemplateDecision=H.decideHandSamples([
 {counts:{barbaros:1},scores:{barbaros:[.958]},candidates:[{best:{cardId:'barbaros',imageScore:.958,expectedCost:7,acceptedCosts:[7],detectedCost:2,validatedCost:7,ocrCostAccepted:true,costAccepted:true,costMatched:true,costSource:'template',costTemplateScore:.98,matched:true,decision:'matched'}}]},
 {counts:{barbaros:1},scores:{barbaros:[.949]},candidates:[{best:{cardId:'barbaros',imageScore:.949,expectedCost:7,acceptedCosts:[7],detectedCost:null,validatedCost:7,ocrCostAccepted:false,costAccepted:true,costMatched:true,costSource:'template',costTemplateScore:.97,matched:true,decision:'matched'}}]},
 {counts:{barbaros:1},scores:{barbaros:[.946]},candidates:[{best:{cardId:'barbaros',imageScore:.946,expectedCost:7,acceptedCosts:[7],detectedCost:2,validatedCost:7,ocrCostAccepted:true,costAccepted:true,costMatched:true,costSource:'template',costTemplateScore:.96,matched:true,decision:'matched'}}]}
]);
assert.equal(barbarosTemplateDecision.recognized.barbaros.count,1,'actual iPhone generic displayed-cost 7 rescue must confirm Barbaros');

let multiCardDecision=H.decideHandSamples([{counts:{zetaBeatrix:1,barbaros:1},scores:{zetaBeatrix:[.97],barbaros:[.96]}},{counts:{zetaBeatrix:1,barbaros:1},scores:{zetaBeatrix:[.96],barbaros:[.95]}},{counts:{zetaBeatrix:1,barbaros:1},scores:{zetaBeatrix:[.95],barbaros:[.94]}}]);
assert.equal(multiCardDecision.recognized.zetaBeatrix.count,1);
assert.equal(multiCardDecision.recognized.barbaros.count,1);
let historyDelta=H.traceRecognitionDelta({zetaBeatrix:{count:1,label:'ゼタ＆ベアトリクス'},barbaros:{count:1,label:'バルバロス'}},{barbaros:{count:1,label:'バルバロス'}});
assert.equal(historyDelta.zetaBeatrix.count,1);
assert.equal(historyDelta.barbaros,undefined);
historyDelta=H.traceRecognitionDelta({quickBlader:{count:2,label:'刹那のクイックブレイダー'}},{quickBlader:{count:1,label:'刹那のクイックブレイダー'}});
assert.equal(historyDelta.quickBlader.count,1);

const realVideoFixtureDecode=p=>decodeFixture(p);
const zetaFanFixture=H.matchFeature(realVideoFixtureDecode({"scale":531.8471923036026,"data":"4uTo//X0CSUE8e8GEx80Jvv36fcaFA0CAhL88/DY3zIb7s/4CS02HOkfCvgI5NvW3DjPzNPy+CY3DOwFCgEG8OHw9iz3y9Xk6AssCQPsBR/58PH4CfEE8uvqAwLn8uD1BR4uKRsWE/8h+unt+QsXCvEAAAD9EistIP0O/N0W+/Hs7v8p7v4d9PoGBzT8z94NEiEpIhb37PX2DyH/vKeBpfkcAPbx9PL09e/r+/788eLV8iVI8Ofi5/Dy8e/t/gUIAgEIESFI7+fl7PX18vL1BQwOCQQYDBw6+PLx+QH8+Pj9Cw4MBC8yJR0z/Pv8/AEDAPn4AwwKASYdGQ0m+fr6+v8DAv34/wYGABoeBw0d9PT19Pf7/Pn29/z/AvkGAg0J9vHr5/cCDRgaB/zw0Lamv+/6+f8GCwQBBAgKBwMKCO3k6+jZExMVFRQTFRYO/v73+QoA9uXTExIREBISEQ8PEQ0A/vfp5eLYCwwPEREQDwsMDgQA89jM0+LgDw0VJR4UHR4M//0A5sjN0+bhGhcaJRkFDiAgHxYQ+dna2+PgFhkeIxUBCyUpLiQYC/vz8Obm"})).find(x=>x.cardId==='zetaBeatrix');
assert.ok(zetaFanFixture.best>=.93,`real-video Zeta fan-position fixture must stay >= .93: ${zetaFanFixture.best}`);
const barbarosFanFixture=H.matchFeature(realVideoFixtureDecode({"scale":672.3294849446944,"data":"3unx/gkE/PPs2OMKFSQfHA0N1eUM9f36283Iys/m+QYXJTY+3uHkBige9dnQ6vkR9vcdIjTw2uXqJFRWJuPTAS4Q3PUXMkLm1uf7EzI0CePXHi7u7PIBKSro1PgXEzgoIgLo6+TV6/EGHNz+Hgnh/A8bNxTu6OTwAfoIJ+bVBCj/Azgp8tLV9Ab44fcRR9rNNiYaD/37+fX0+wbRkoiGn9PfLTgbEx0dFw4HCBIT5qiw1+73Qz8nFwgKCgsMDwoK9sjM3fH1RTwpF/73+AkSDwgOAOfn2enyLzMiGBQRERIVCQoW/hkO6OLrHBsTCAD/ERgWFQkGByQbA+jsDgoC+/Xz9/n+EBoXBgsF9OrrCP/59/T06uXx+f4M/uPg3eXs8AglN0I8ORYYEAzkqIGM6j017fX+BQH//fb1+evuDSYZDd3v1+Dp7+z+CP/v7OLjEnQfAu/v2OHo8fT7/wDz7OLkCiMBEvr77vX9CRP16fcA+unvCNbc6Pr98fYPMTsU9/0C9O75BczN5ggL8PQRNE03IR0ZCgD59dvX7gYL8uXuBzE5MBwTGxcF/C8RDg0L"})).find(x=>x.cardId==='barbaros');
assert.ok(barbarosFanFixture.best>=.93,`real-video Barbaros fan-position fixture must stay >= .93: ${barbarosFanFixture.best}`);
const barbarosHardNegative=H.matchFeature(realVideoFixtureDecode({"scale":800.8372672539656,"data":"+f/+Bwj99vTy+QIVLS76wcDF6QceBxL65NvX4Of/BCcAzMfC7/sCFSYX9+XoAhcr6RQQ2tTI7PgFRmRaHOvqLUEY5AIKzczE7PoILkA/AvDuWzD85QMHwsDA6hUUNEUyLgr0Dvnu5w0Hwb++IA7qFh9HRyT///YF8wsOwL++GTwDJlktCN30Dh4LABQSv76++QIHBgADDAoB6fLg3+LTy8fBNUb7EhcQCgsDCgsB9PPdu77FVFYXIhYREBYMCg4QCQHetbm/a1AzKP/6AhUTERcTBwXovr3DQ0cwIBYMDRQL+gwQChT4y8rKJS0JAv0GGRshFg8IAjcSysnL8fbl59nk4eENOiggFlAYysrR+vPq8NXmx8f2/ggeN2Mn19HPMikgFQ8LCwsRLzx5f2IwERgS3evy6Nvj8vXy+/UAQV04JBsbyNje2NPd7vLq7d7F4ic6JhwdwdLY0crW5+ri3d7U7ik6Ix4c0Nrh28vR5Ofc3+rj8iQyJRoa59TzFATbyuDV2ePo7/IRFwcJ+PwaQ08zCggF7Obh3N8CEgkK3+z0DjJISigRFwbs2dHyBQcN"})).find(x=>x.cardId==='barbaros');
assert.ok(barbarosHardNegative.best<.90,`real-video cost-7 hard negative must stay below .90 candidate gate: ${barbarosHardNegative.best}`);

assert.equal(H.version,'hand-clean-1.15');
const qbRecognition=DB.recognitionCards().find(x=>x.id==='quickBlader');
assert.equal(H.temporalProbeFloor(qbRecognition),.89);
const temporalCandidate=(cardId,score,index,{detected=null,validated=null,ocrAccepted=false,matched=false,templateValue=null,templateScore=null,templateThreshold=null}={})=>({index,best:{cardId,imageScore:score,imageCandidate:false,imageConfirmed:false,imageSource:'anchor',titleScore:score-.05,anchorScore:score,temporalProbe:true,temporalProbeFloor:.88,expectedCost:cardId==='quickBlader'?1:7,acceptedCosts:cardId==='quickBlader'?[1]:[7],detectedCost:detected,validatedCost:validated,ocrCostAccepted:ocrAccepted,costAccepted:ocrAccepted,costMatched:matched,costSource:matched?'ocr':null,costTemplateValue:templateValue,costTemplateScore:templateScore,costTemplateThreshold:templateThreshold,matched:false,decision:'temporal-probe-only'}});
const diag811Qb=[.8948,.8919,.8908,.8921].map((score,i)=>({sampleTime:81.67+i*.04,counts:{},scores:{},candidates:[temporalCandidate('quickBlader',score,2,{detected:1,validated:1,ocrAccepted:true,matched:true})]}));
assert.equal(H.decideHandSamples(diag811Qb).recognized.quickBlader?.decision,'temporal-slot-consensus');
const diag811Barbaros=[.9145,.9135,.9139,.9138].map((score,i)=>({sampleTime:81.67+i*.04,counts:{},scores:{},candidates:[temporalCandidate('barbaros',score,1,i===0?{detected:7,validated:7,ocrAccepted:true,matched:true,templateValue:7,templateScore:.9595,templateThreshold:.98}:{detected:2,ocrAccepted:true,matched:false,templateValue:7,templateScore:.964,templateThreshold:.98})]}));
assert.equal(H.decideHandSamples(diag811Barbaros).recognized.barbaros?.decision,'temporal-slot-consensus');
const temporalNoCost=[.8948,.8919,.8908,.8921].map((score,i)=>({sampleTime:i,counts:{},scores:{},candidates:[temporalCandidate('quickBlader',score,2)]}));
assert.equal(H.decideHandSamples(temporalNoCost).recognized.quickBlader,undefined);
const temporalDrift=[.89,.91,.93,.95].map((score,i)=>({sampleTime:i,counts:{},scores:{},candidates:[temporalCandidate('quickBlader',score,2,{detected:1,validated:1,ocrAccepted:true,matched:true})]}));
assert.equal(H.decideHandSamples(temporalDrift).recognized.quickBlader,undefined);
const temporalTwoFrames=[.893,.892].map((score,i)=>({sampleTime:i,counts:{},scores:{},candidates:[temporalCandidate('quickBlader',score,2,{detected:1,validated:1,ocrAccepted:true,matched:true})]}));
assert.equal(H.decideHandSamples(temporalTwoFrames).recognized.quickBlader,undefined);


assert.equal(H.version,'hand-clean-1.15');
WB.turnTimeline=[
 {side:'bottom',turn:6,time:74.41},
 {side:'top',turn:7,time:81.863},
 {side:'bottom',turn:7,time:86.2}
];
assert.equal(H.latestTargetTurnStart({time:81.933,targetSide:'bottom',relativeSide:'相手'}),74.41,'opponent turn must retain latest bottom-side turn start for safe backscan bounds');
assert.equal(H.latestTargetTurnStart({time:86.25,targetSide:'bottom',relativeSide:'自分'}),86.2);
assert.equal(typeof H.latestTargetTurnStart,'function');


for(const p of cost7Profiles){
  const cross=H.matchDisplayedCostFeature(p).find(x=>x.value===1);
  assert.ok(cross.score<.98,'cost-7 template must not cross-match generic cost 1');
}


const opponentTurn81933QbAnchor=decodeFixture({"scale":654.8481984275945,"data":"Gfz7AfXy8ffu6gQSJCEwKiQyKSwTHy/W4yMvOSkuHBj4z+MNLRkkMyYtANnn+S0lDPLdIObhAQrxFjc/+erp49nhHAQcMRYM1OLpDSYF+Rn86tTQ3/r/0tjh4eT4+t0bKQDl8evj3+rO8w0DMBvwN/7F0uDoKgkvECDQ0M3eHd3g4ekH3tHZFRz6+daB1/kIAfT6AQD1jOwSCwsK//r6++sTJy03NxsSCQT+CSEnPT8IBQP93gQUCBYm/v719n7zFQb5DALy3+ht+RYI+QDu7s7GFAcTEwbz1ezv4tsCGA0E8ePo9O7hCR3x/OHp5eTi4AEO7Qj9EwXt09rP6P4CEzYjA8zk6f8ICC87Jy33398XBwcmBPgGBZD6NzlGSEhHTE6tAPP6+vgACQgJBu7a6dbO3Ofu9QDm5vLq4O76+vQf7u/8AvIACAYDr/b1/x76Ag0RD6/59PQN/QUDEhfl9fb3AgQUCQ8REfPq+gkaHgoKD2Lp6AEAFvsAAgl7+vUJ+wTk8vsEchkABQYA1+n0//wL+QAA7t3k7/wWCfMA+Obs9v4E"});
const opponentTurn81933BarAnchor=decodeFixture({"scale":522.3894216645324,"data":"Jwz1BPz+BQX2+SAY8+/x6fHx5tnp2+j0/SL8DO7i1d3p/u3qHjcM7QXj7+78/S04JPD8CvTm8fsUFxb0Cv7yDvv5GhosIA3ZLfge8x87LxgE3/78JAADRezeIv/wGRQIFB372TkNBwzZ6uMH6NgH8xLx6v/X9Ofj5xbnBg0x2ubz4O4u/gLwJPzt7yqdruPc4Ojl5N3ggeguKRz/BBEUDgUPHTU1AhUVFAv/Bhg9MR8YDwYEBQAXMy4iGBEGCAzwFxwsGQ4KERH2+w4KEwMA+wADBQHxCPr1+fbp1vT/8QUEAAH79uzg6gr4+gAGA/Dq3egT6/T8+/r07dkDDOLx/f3/BfPnDgD/+vr+BBcDCQACB/zz9/8A9cHoOTs4QDZFS0S49/b0EhcB+vv89fTs4O307/D2+P0H8+fp6+rv9vfvBffs7e7u8vj33QT47ezv9Pf08OIB9uXu/ggJAvvw+/rb9gUZGx0iE/0O8eTk8g4cDyUp8wbz3eEEGg4lNu0M/PALBA8MQCHtEAHyCAQFBzAH/vLy5gAGBBESAfrf690BCQwe"});
const opponentTurn81933QbAnchorMatch=H.matchAnchorFeature(opponentTurn81933QbAnchor).find(x=>x.cardId==='quickBlader');
const opponentTurn81933BarAnchorMatch=H.matchAnchorFeature(opponentTurn81933BarAnchor).find(x=>x.cardId==='barbaros');
assert.ok(opponentTurn81933QbAnchorMatch.best>=.92,'actual 81.933s opponent-turn QB anchor must pass');
assert.ok(opponentTurn81933BarAnchorMatch.best>=.92,'actual 81.933s opponent-turn Barbaros anchor must pass');

const opponentTurn81933QbCost=decodeCostFixture({"scale":645.0395067719559,"data":"3gksOSIL1qyPmSx3aWAtNTcQq6F/LBQI+tjQ2g4Q8gQX9OHvw9C6A+ogFPg6Y+v71Mz/KSYQOGr2FvHH/ycpHTVn+Bv8zfwfJhwyZvohDc7gDhkQRHUWKynZyPkFADVRKxca7v7l5O8MHA724g2V3O/k7/Li+e78jbvPxfgL7csWHb7stJux6gkhMiQQ+ZKWoe3+JyonNuuSnMEbFC0oHQ=="});
const opponentTurn81933BarCost=decodeCostFixture({"scale":736.1693747623575,"data":"lt0ZLyn2sISCgSpZUDQhGiXrqKlJGQcIAfXq8iA7Ew4UMCwnFN7oExQcLVFESysA//YgHRQeFh8MHgr3GSMpJRQXGx0H9xEkKhQkGyokEvb+GRkgHjlCQiEA8AQXKSNJSDsFGP7v/xMmMyMIGxS63xUQ/gQZMhSwqq0nTS1NJMqGjI6mHVku04WLkpClqyBRG6eGjY6RvK4cSy3fhoaNkw=="});
const opponentTurn81933QbCostMatch=H.matchDisplayedCostFeature(opponentTurn81933QbCost).find(x=>x.value===1);
const opponentTurn81933BarCostMatch=H.matchDisplayedCostFeature(opponentTurn81933BarCost).find(x=>x.value===7);
assert.ok(opponentTurn81933QbCostMatch.score>=.98,'actual 81.933s QB cost 1 must pass generic template');
assert.ok(opponentTurn81933BarCostMatch.score>=.98,'actual 81.933s Barbaros cost 7 must pass generic template');


const barbaros81619=[.927,.9248,.9155,.9158].map((score,i)=>({sampleTime:[81.499,81.539,81.579,81.619][i],counts:{},scores:{},candidates:[temporalCandidate('barbaros',score,1,
 i===3?{detected:7,validated:7,ocrAccepted:true,matched:true,templateValue:7,templateScore:.9592,templateThreshold:.98}:
 i===0?{detected:2,ocrAccepted:true,matched:false,templateValue:7,templateScore:.9123,templateThreshold:.98}:
 i===1?{detected:null,ocrAccepted:false,matched:false,templateValue:7,templateScore:.9469,templateThreshold:.98}:
 {detected:2,ocrAccepted:true,matched:false,templateValue:7,templateScore:.9605,templateThreshold:.98}
)]}));
const barbaros81619Decision=H.decideHandSamples(barbaros81619);
assert.equal(barbaros81619Decision.recognized.barbaros?.decision,'temporal-slot-consensus','actual 81.499-81.619 Barbaros evidence must be rescued');
assert.equal(barbaros81619Decision.recognized.barbaros?.temporal?.groups?.[0]?.templateBacked,true);
const weakTemplateEvidence=[.927,.9248,.9155,.9158].map((score,i)=>({sampleTime:i,counts:{},scores:{},candidates:[temporalCandidate('barbaros',score,1,
 i===3?{detected:7,validated:7,ocrAccepted:true,matched:true,templateValue:7,templateScore:.949,templateThreshold:.98}:
 {detected:2,ocrAccepted:true,matched:false,templateValue:7,templateScore:.92,templateThreshold:.98}
)]}));
assert.equal(H.decideHandSamples(weakTemplateEvidence).recognized.barbaros,undefined,'one direct OCR proof plus weak template evidence must not rescue');
const wrongTemplateVotes=[.927,.9248,.9155,.9158].map((score,i)=>({sampleTime:i,counts:{},scores:{},candidates:[temporalCandidate('barbaros',score,1,
 i===3?{detected:7,validated:7,ocrAccepted:true,matched:true,templateValue:7,templateScore:.96,templateThreshold:.98}:
 {detected:2,ocrAccepted:true,matched:false,templateValue:1,templateScore:.99,templateThreshold:.98}
)]}));
assert.equal(H.decideHandSamples(wrongTemplateVotes).recognized.barbaros,undefined,'wrong-cost template votes must not rescue Barbaros');


const centerSearchRecovered=H.matchDisplayedCostFeatures([
  {dx:0,feature:cost6Negative},
  {dx:2,feature:cost1Profiles[0]}
]).find(x=>x.value===1);
assert.ok(centerSearchRecovered.score>.999,'bounded center search must select a strong shifted cost-1 feature');
assert.equal(centerSearchRecovered.centerDx,2);
const centerSearchWrongCost=H.matchDisplayedCostFeatures([
  {dx:-2,feature:cost6Negative},
  {dx:0,feature:cost6Negative},
  {dx:2,feature:cost6Negative}
]).find(x=>x.value===1);
assert.ok(centerSearchWrongCost.score<.98,'bounded center search must not turn visible cost 6 into cost 1');


const quickBlader81926=[.8915,.8907,.8911,.8910].map((score,i)=>({sampleTime:[81.806,81.846,81.886,81.926][i],counts:{},scores:{},candidates:[temporalCandidate('quickBlader',score,2,
 i===0?{detected:null,validated:1,ocrAccepted:false,matched:true,templateValue:1,templateScore:.991,templateThreshold:.98}:
 {detected:0,validated:1,ocrAccepted:true,matched:true,templateValue:1,templateScore:.991,templateThreshold:.98}
)]}));
const quickBlader81926Decision=H.decideHandSamples(quickBlader81926);
assert.equal(quickBlader81926Decision.recognized.quickBlader?.decision,'temporal-slot-consensus','actual 81.806-81.926 QB must survive three OCR-0 conflicts when shifted cost-1 template resolves all four frames');
assert.equal(quickBlader81926Decision.recognized.quickBlader?.temporal?.groups?.[0]?.directProof,true);


const imageConsensusCandidate=(cardId,score,index,{templateValue=null,templateScore=null,templateThreshold=.98,templateAccepted=false,ocrValue=null,ocrAccepted=false}={})=>({index,imageBest:{cardId,label:cardId,imageScore:score,imageSource:'anchor',titleScore:score-.08,anchorScore:score,temporalProbe:score>=.89,temporalProbeFloor:.89},displayedCost:{accepted:false,value:null,source:null,ocrValue,ocrAccepted,templateValue,templateScore,templateThreshold,templateCenterDx:0,templateAccepted},best:{cardId,label:cardId,imageScore:score,imageCandidate:score>=.9,imageConfirmed:false,imageSource:'anchor',titleScore:score-.08,anchorScore:score,temporalProbe:score>=.89,temporalProbeFloor:.89,expectedCost:cardId==='quickBlader'?1:7,acceptedCosts:cardId==='quickBlader'?[1]:[7],detectedCost:ocrValue,validatedCost:null,ocrCostAccepted:ocrAccepted,costAccepted:ocrAccepted,costMatched:false,costSource:null,costTemplateValue:templateValue,costTemplateScore:templateScore,costTemplateThreshold:templateThreshold,costTemplateCenterDx:0,matched:false,decision:'temporal-probe-only'}});
const qb816=[.8169,.8962,.9118,.8957].map((score,i)=>({sampleTime:[81.455,81.495,81.535,81.575][i],counts:{},scores:{},candidates:[imageConsensusCandidate('quickBlader',score,2,i===0?{}:{templateValue:1,templateScore:[0,.7974,.7683,.8055][i],ocrValue:i<3?0:null,ocrAccepted:i<3})]}));
const qb816Decision=H.decideHandSamples(qb816);
assert.equal(qb816Decision.recognized.quickBlader?.decision,'temporal-image-cost-hypothesis-consensus','actual v4.13.16 QB sequence must recover from OCR instability');
const bb816=[.9288,.9362,.9248,.9155].map((score,i)=>({sampleTime:[81.455,81.495,81.535,81.575][i],counts:{},scores:{},candidates:[imageConsensusCandidate('barbaros',score,1,{templateValue:7,templateScore:[.751,.8785,.9572,.9656][i],ocrValue:i===3?2:null,ocrAccepted:i===3})]}));
const bb816Decision=H.decideHandSamples(bb816);
assert.equal(bb816Decision.recognized.barbaros?.decision,'temporal-image-cost-hypothesis-consensus','actual v4.13.16 Barbaros sequence must recover from weak displayed-cost crops');
const qbOnlyTwoProbe=[.8169,.82,.9118,.8957].map((score,i)=>({sampleTime:i,counts:{},scores:{},candidates:[imageConsensusCandidate('quickBlader',score,2,{templateValue:i?1:null,templateScore:.8})]}));
assert.equal(H.decideHandSamples(qbOnlyTwoProbe).recognized.quickBlader,undefined,'two probe-range frames must not pass image-primary temporal consensus');
const qbOnlyTwoTemplateVotes=[.8169,.8962,.9118,.8957].map((score,i)=>({sampleTime:i,counts:{},scores:{},candidates:[imageConsensusCandidate('quickBlader',score,2,{templateValue:i===1||i===2?1:null,templateScore:.8})]}));
assert.equal(H.decideHandSamples(qbOnlyTwoTemplateVotes).recognized.quickBlader,undefined,'fewer than three of four matching cost-template hypotheses must not pass image-primary temporal consensus');
const qbUnstableCore=[.8169,.89,.915,.94].map((score,i)=>({sampleTime:i,counts:{},scores:{},candidates:[imageConsensusCandidate('quickBlader',score,2,{templateValue:i?1:null,templateScore:.8})]}));
assert.equal(H.decideHandSamples(qbUnstableCore).recognized.quickBlader,undefined,'unstable top-three image scores must not pass image-primary temporal consensus');
const qbWrongStrongTemplate=[.8169,.8962,.9118,.8957].map((score,i)=>({sampleTime:i,counts:{},scores:{},candidates:[imageConsensusCandidate('quickBlader',score,2,i===0?{}:{templateValue:i===2?7:1,templateScore:i===2?.995:.80,templateAccepted:i===2})]}));
assert.equal(H.decideHandSamples(qbWrongStrongTemplate).recognized.quickBlader,undefined,'accepted conflicting cost template must veto image-primary temporal consensus');
const qbMissingLeader=[.8962,.9118,.8957].map((score,i)=>({sampleTime:i,counts:{},scores:{},candidates:[imageConsensusCandidate('quickBlader',score,2,{templateValue:1,templateScore:.8})]}));
qbMissingLeader.push({sampleTime:4,counts:{},scores:{},candidates:[imageConsensusCandidate('barbaros',.91,2,{templateValue:7,templateScore:.8})]});
assert.equal(H.decideHandSamples(qbMissingLeader).recognized.quickBlader,undefined,'same image leader must persist through the whole stable window');

console.log('CARD DB + HAND RECOGNITION REGRESSION PASS');

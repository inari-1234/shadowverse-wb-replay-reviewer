import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const appCore=fs.readFileSync(new URL('../app-core.js',import.meta.url),'utf8');
const expectedHandVersion=appCore.match(/'hand-recognition'\s*:\s*'([^']+)'/)?.[1];
assert.ok(expectedHandVersion,'app-core expected hand-recognition version must be parseable');

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
assert.equal(qb.recognition.method,'hand-title-anchor-cost-gate-v12');
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
assert.equal(qb.recognition.overlapMaskedRescue.minFrames,4);
assert.equal(qb.recognition.overlapMaskedRescue.minMaskedAnchor,.94);
assert.equal(qb.recognition.overlapMaskedRescue.minGain,.05);
assert.equal(qb.recognition.overlapMaskedRescue.minCrossCardLeaderMargin,.20);
assert.equal(qb.recognition.overlapMaskedRescue.requireCostProbe,true);
assert.equal(zeta.recognition.overlapMaskedRescue,undefined);
assert.equal(barbaros.recognition.overlapMaskedRescue,undefined);
assert.equal(zeta.recognition.anchorThreshold,.92);
assert.equal(barbaros.recognition.anchorThreshold,.92);
assert.deepEqual([...H.anchorAngles],[-10,-5,0,5,10]);
assert.deepEqual([...H.anchorCenterShifts],[-4,-2,0,2,4]);
assert.equal(H.config.minSepX,.018,'cost-center peak separation must preserve dense 8/9-card hand layouts');
const separatedCenters=(xs,width=1200)=>{const kept=[];for(const x of xs)if(H.costCenterSeparated(kept,x,width))kept.push({cx:x});return kept.map(x=>x.cx).sort((a,b)=>a-b)};
assert.deepEqual(separatedCenters([701,882,774,740,738,844,847,815,923,960,757]),[701,740,774,815,844,882,923,960],'real-video-derived Zeta peak order must collapse duplicate/midpoint peaks to eight cost centers');
assert.deepEqual(separatedCenters([701,735,763,796,824,857,899,930,951]),[701,735,763,796,824,857,899,930,951],'verified nine-card layout must survive the calibrated 21px-equivalent separation');
assert.deepEqual(separatedCenters([709,749,791,833,878,917,960]),[709,749,791,833,878,917,960],'crowded seven-card Quick layout must remain intact');
assert.equal(H.costCenterSeparated([{cx:740},{cx:774}],757,1200),false,'false midpoint peak between adjacent real cost circles must be rejected');
assert.equal(H.costCenterSeparated([{cx:930}],951,1200),true,'an exact 21px gap at 1200px must remain valid for a real nine-card hand');


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
assert.deepEqual(Array.from(chosen.frames,x=>x.sampleTime),[19.498,19.538,19.578,19.618],'transition must fall back to the latest stable pre-action hand');
assert.equal(chosen.candidateCount,5);

const afterPlayScan=[
  mkLayout(19.916,[738,801,867,930]),
  mkLayout(19.956,[738,801,867,930]),
  mkLayout(19.996,[738,801,867,930]),
  mkLayout(20.036,[738,801,867,930])
];
chosen=H.chooseStableHandWindow(afterPlayScan,4,3,1200);
assert.deepEqual(Array.from(chosen.frames,x=>x.sampleTime),[19.916,19.956,19.996,20.036],'stable post-play hand must not resurrect an older hand');
assert.equal(H.layoutsCompatible(mkLayout(1,[700,760,820]),mkLayout(2,[701,761,821]),1200),true);
assert.equal(H.layoutsCompatible(mkLayout(1,[700,760,820]),mkLayout(2,[700,760]),1200),false);
assert.equal(H.layoutsCompatible(mkLayout(1,[708,770,828,896,959]),mkLayout(2,[708,770,828,896]),1200),false,'missing-card layout must stay distinct to avoid swallowing play animation');
assert.equal(H.layoutsCompatible(mkLayout(1,[708,770,828,896,959]),mkLayout(2,[737,801,865,930]),1200),false,'post-play reflow must not be treated as the same hand');

const zeroOnlyLayout=[
  mkLayout(81.25,[]),
  mkLayout(81.29,[]),
  mkLayout(81.33,[])
];
assert.equal(H.chooseStableHandWindow(zeroOnlyLayout,4,2,1200),null,'zero detected cost centers must not be promoted to a stable current hand window');

const actual8141Anchor=mkLayout(81.41,[741,806]);
const actualForwardSettle=[
  mkLayout(81.455,[736,800,864,929]),
  mkLayout(81.495,[736,800,864,929]),
  mkLayout(81.535,[737,801,866,931]),
  mkLayout(81.575,[737,801,865,930])
];
assert.equal(H.layoutsSubsetCompatible(actual8141Anchor,actualForwardSettle[0],1200),true,'actual 81.41 partial layout must align with the recovered four-card layout');
chosen=H.chooseForwardSettleHandWindow(actualForwardSettle,actual8141Anchor,4,1200);
assert.ok(chosen,'actual 81.41 transient must recover a forward settle window');
assert.deepEqual(Array.from(chosen.frames,x=>x.sampleTime),[81.455,81.495,81.535,81.575]);
assert.equal(chosen.candidateCount,4);
assert.equal(chosen.layoutMode,'forward-settle-stable');
assert.equal(H.chooseForwardSettleHandWindow(actualForwardSettle,mkLayout(81.41,[650,710]),4,1200),null,'forward settle must be rejected when target-visible centers do not persist');
assert.equal(H.chooseForwardSettleHandWindow(actualForwardSettle,mkLayout(81.41,[806]),4,1200),null,'one target-visible center is insufficient for forward settle rescue');

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
assert.deepEqual(Array.from(latestCurrent.frames,x=>x.sampleTime),[19.816,19.856,19.896,19.936],'latest diagnostic current hand must remain the post-play 4-card hand');
assert.deepEqual(Array.from(latestPrevious.frames,x=>x.sampleTime),[19.507,19.547,19.587],'latest diagnostic previous hand must recover the pre-play 5-card hand');
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
assert.deepEqual(Array.from(chosen.frames,x=>x.sampleTime),[19.507,19.547,19.587],'actual iPhone duplicate must collapse so the latest three 5-card frames form a stable hand');
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
assert.equal(windowRun.reason,'no-stable-hand-window','zero-center frames must remain unresolved instead of becoming a stable hand');
assert.equal(windowRun.samples.length,0);
assert.equal(windowRun.windowMode,'stable-bidirectional-settle');
assert.equal(windowRun.forwardScan.scanFrames,0,'forward settle requires at least two target-visible cost centers');
assert.ok(seekLog.every(t=>t<=19.603),'zero-center target must not trigger future sampling');
assert.equal(WB.video.currentTime,19.603,'video position must restore to requested state');

WB.video.currentTime=20.028;seekLog.length=0;
windowRun=await H.recognizeHand({targetSide:'bottom',relativeSide:'自分',time:20.028,row:{side:'bottom',turn:1,time:18.719}});
assert.equal(windowRun.reason,'no-stable-hand-window');
assert.equal(windowRun.samples.length,0);
assert.equal(windowRun.forwardScan.scanFrames,0);
assert.ok(seekLog.every(t=>t<=20.028),'zero-center after-play target must not trigger future sampling');
assert.equal(WB.video.currentTime,20.028,'after-play run must restore current position');

const syntheticHandCanvas=centers=>{
  const width=1200,height=550,data=new Uint8ClampedArray(width*height*4);
  for(const cx of centers)for(let y=466;y<=501;y++)for(let x=Math.max(0,cx-8);x<=Math.min(width-1,cx+8);x++){
    const i=(y*width+x)*4;data[i]=50;data[i+1]=180;data[i+2]=80;data[i+3]=255;
  }
  const ctx={imageSmoothingEnabled:true,drawImage(){},putImageData(){},getImageData(x=0,y=0,w=width,h=height){
    x=Math.max(0,Math.floor(x));y=Math.max(0,Math.floor(y));w=Math.max(1,Math.min(Math.floor(w),width-x));h=Math.max(1,Math.min(Math.floor(h),height-y));
    const out=new Uint8ClampedArray(w*h*4);
    for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){const si=((y+yy)*width+(x+xx))*4,di=(yy*w+xx)*4;out[di]=data[si];out[di+1]=data[si+1];out[di+2]=data[si+2];out[di+3]=data[si+3]}
    return{data:out,width:w,height:h};
  }};
  return{width,height,getContext(){return ctx}};
};
const actual8141Layout=t=>{
  const q=Math.round(Number(t)*1000);
  if(q===81410)return[741,806];
  if(q===81370)return[795];
  if(q===81330||q===81290||q===81250)return[];
  if(q===81210||q===81170||q===81130)return[801,865,930];
  if(q===81090)return[737,801,865,930];
  if(q===81050)return[736,865,930];
  if(q===81010)return[738,802,867];
  if(q===80970)return[739,803,868,933];
  if(q===80930)return[731];
  if(q===80890)return[874];
  if(q===81455||q===81495)return[736,800,864,929];
  if(q===81535)return[737,801,866,931];
  if(q===81575)return[737,801,865,930];
  return[];
};
WB.video={duration:93.627,currentTime:81.41};
WB.turnTimeline=[{side:'bottom',turn:6,time:74.41},{side:'top',turn:7,time:81.863}];
seekLog.length=0;
WB.frameCanvas=()=>syntheticHandCanvas(actual8141Layout(WB.video.currentTime));
windowRun=await H.recognizeHand({targetSide:'bottom',relativeSide:'自分',time:81.41,row:{side:'bottom',turn:6,time:74.41}});
assert.equal(windowRun.windowMode,'forward-settle','actual 81.41 transient must use the verified forward settle path');
assert.equal(windowRun.plannedFrames,4);
assert.equal(windowRun.capturedFrames,4);
assert.deepEqual(Array.from(windowRun.forwardScan.rows,x=>x.sampleTime),[81.455,81.495,81.535,81.575]);
assert.equal(windowRun.forwardScan.selectedFrames,4);
assert.equal(windowRun.forwardScan.candidateCount,4);
assert.equal(WB.video.currentTime,81.41,'forward settle must restore the requested state time');

assert.equal(zeta.recognition.enabled,true);
assert.equal(barbaros.recognition.enabled,true);
assert.equal(zeta.recognition.threshold,.93);
assert.equal(barbaros.recognition.threshold,.93);
assert.equal(zeta.recognition.rescueThreshold,.945);
assert.equal(barbaros.recognition.rescueThreshold,.945);
assert.deepEqual(Array.from(zeta.recognition.acceptedCosts),[4,6]);
assert.deepEqual(Array.from(barbaros.recognition.acceptedCosts),[7]);
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
assert.deepEqual(Array.from(WB.DisplayedCostRecognition.meta.templateValues),[1,7]);
assert.deepEqual(Array.from(WB.DisplayedCostRecognition.meta.centerDx),[-2,-1,0,1,2]);
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

assert.equal(H.version,expectedHandVersion,'hand-recognition runtime version must match app-core expected module manifest');
const qbRecognition=DB.recognitionCards().find(x=>x.id==='quickBlader');
assert.equal(H.temporalProbeFloor(qbRecognition),.88,'Quick Blader alone may probe down to the guarded .88 floor');
const zetaRecognition=DB.recognitionCards().find(x=>x.id==='zetaBeatrix');
const barbarosRecognition=DB.recognitionCards().find(x=>x.id==='barbaros');
assert.equal(H.temporalProbeFloor(zetaRecognition),.89,'Zeta default temporal probe floor must stay unchanged');
assert.equal(H.temporalProbeFloor(barbarosRecognition),.89,'Barbaros default temporal probe floor must stay unchanged');
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


assert.equal(H.version,expectedHandVersion,'hand-recognition runtime version must match app-core expected module manifest');
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
const qbBoundaryCurrent=[.8908,.8915,.8907,.8914].map((score,i)=>({sampleTime:[81.757,81.797,81.837,81.877][i],counts:{},scores:{},candidates:[imageConsensusCandidate('quickBlader',score,2,{templateValue:1,templateScore:[.9268,.9461,.9449,.943][i],templateThreshold:.98,ocrValue:i>=2?0:null,ocrAccepted:i>=2})]}));
const qbBoundaryDecision=H.decideHandSamples(qbBoundaryCurrent);
assert.equal(qbBoundaryDecision.recognized.quickBlader,undefined,'81.877s boundary window must stay below ordinary recognition threshold before continuity proof');
const qbBoundaryPrior=[.8962,.9118,.8957,.901].map((score,i)=>({sampleTime:[81.557,81.597,81.637,81.677][i],counts:{},scores:{},candidates:[imageConsensusCandidate('quickBlader',score,2,{templateValue:1,templateScore:.95,templateThreshold:.98})]}));
const qbBoundaryPriorDecision=H.decideHandSamples(qbBoundaryPrior);
assert.ok(qbBoundaryPriorDecision.recognized.quickBlader,'nearby same-layout window must pass existing recognition rules');
const qbBoundaryProof=H.continuityProofForCard(qbBoundaryCurrent,qbRecognition);
assert.ok(qbBoundaryProof&&qbBoundaryProof.frames===4&&qbBoundaryProof.scoreRange<=.002,'current boundary window must prove stable same-card continuity');
const qbBoundaryMerged=H.applyTurnBoundaryContinuity(qbBoundaryDecision,qbBoundaryPriorDecision,qbBoundaryCurrent,{turnStart:81.863,delta:.014,windowStart:81.557,windowEnd:81.677,candidateCount:4});
assert.equal(qbBoundaryMerged.decision.recognized.quickBlader?.decision,'turn-boundary-continuity-rescue','turn-boundary continuity must recover Quick Blader without lowering normal thresholds');
assert.equal(qbBoundaryMerged.decision.recognized.quickBlader?.confidence,.8907,'continuity confidence must stay conservative');

const qbBoundaryMissingCost=[.8908,.8915,.8907,.8914].map((score,i)=>({sampleTime:i,counts:{},scores:{},candidates:[imageConsensusCandidate('quickBlader',score,2,{templateValue:i===2?null:1,templateScore:i===2?null:.94,templateThreshold:.98})]}));
assert.equal(H.continuityProofForCard(qbBoundaryMissingCost,qbRecognition),null,'continuity rescue requires same displayed-cost hypothesis in every current frame');
const qbBoundaryWrongCost=[.8908,.8915,.8907,.8914].map((score,i)=>({sampleTime:i,counts:{},scores:{},candidates:[imageConsensusCandidate('quickBlader',score,2,{templateValue:i===2?7:1,templateScore:i===2?.995:.94,templateThreshold:.98,templateAccepted:i===2})]}));
assert.equal(H.continuityProofForCard(qbBoundaryWrongCost,qbRecognition),null,'accepted conflicting displayed cost must veto continuity rescue');
const qbBoundaryDrift=[.8908,.8915,.8942,.8909].map((score,i)=>({sampleTime:i,counts:{},scores:{},candidates:[imageConsensusCandidate('quickBlader',score,2,{templateValue:1,templateScore:.94,templateThreshold:.98})]}));
assert.equal(H.continuityProofForCard(qbBoundaryDrift,qbRecognition),null,'continuity rescue must reject image drift above 0.002');
const qbBoundaryMissingLeader=[.8908,.8915,.8907,.8914].map((score,i)=>({sampleTime:i,counts:{},scores:{},candidates:[i===2?imageConsensusCandidate('barbaros',.91,2,{templateValue:7,templateScore:.95,templateThreshold:.98}):imageConsensusCandidate('quickBlader',score,2,{templateValue:1,templateScore:.94,templateThreshold:.98})]}));
assert.equal(H.continuityProofForCard(qbBoundaryMissingLeader,qbRecognition),null,'continuity rescue requires the same card image leader in every current frame');
const qbBoundaryPriorTwo=structuredClone(qbBoundaryPriorDecision);qbBoundaryPriorTwo.recognized.quickBlader.count=2;
assert.equal(H.applyTurnBoundaryContinuity(qbBoundaryDecision,qbBoundaryPriorTwo,qbBoundaryCurrent,{}).applied.length,0,'continuity rescue must not promote ambiguous multi-copy retry');

const dualPhaseFrames=[];for(let t=81.776;t>=81.396-.0001;t-=.02)dualPhaseFrames.push({sampleTime:+t.toFixed(3),centers:[{cx:737},{cx:801},{cx:865},{cx:930}]});
const dualPhaseCurrent={frames:[{sampleTime:81.796,centers:[{cx:737},{cx:801},{cx:865},{cx:930}]}]};
const dualPhaseWindows=H.collectCompatibleStableHandWindows(dualPhaseFrames,dualPhaseCurrent,1200,12);
assert.ok(dualPhaseWindows.some(w=>Math.abs(w.startTime-81.456)<.002&&Math.abs(w.endTime-81.576)<.002),'dual-phase continuity scan must include the previously successful 81.456-81.576 phase');
assert.ok(dualPhaseWindows.every(w=>w.size===4),'dual-phase continuity windows must keep four 40ms-spaced samples');

const continuityLayoutFrames=[81.717,81.677,81.637,81.597,81.557,81.517,81.477,81.437].map(t=>({sampleTime:t,centers:[{cx:737},{cx:801},{cx:865},{cx:930}]}));
const continuityCurrentSelected={frames:[{sampleTime:81.757,centers:[{cx:737},{cx:801},{cx:865},{cx:930}]}]};
const continuityWindows=H.collectCompatibleStableHandWindows(continuityLayoutFrames,continuityCurrentSelected,1200,3);
assert.ok(continuityWindows.length>=2&&continuityWindows.every(w=>w.size===4&&w.candidateCount===4),'same-layout continuity scan must return stable four-frame windows');

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


const stableLeaderCandidate=(cardId,score,index,{source='anchor',titleScore=null,templateValue=null,templateScore=null,templateAccepted=false,ocrValue=null,ocrAccepted=false,ocrConfidence=null}={})=>({
 index,
 imageBest:{cardId,imageScore:score,imageSource:source,titleScore:titleScore==null?(source==='title'?score:.5):titleScore,anchorScore:source==='anchor'?score:.4},
 displayedCost:{templateValue,templateScore,templateAccepted,ocrValue,ocrAccepted,ocrConfidence},
 best:{cardId,imageScore:score,imageSource:source,temporalProbe:score>=H.temporalProbeFloor(DB.recognitionCards().find(x=>x.id===cardId))}
});
const realZetaStable=[.8594,.8581,.8581,.8581].map((score,i)=>({sampleTime:36.985+i*.04,counts:{},scores:{},candidates:[stableLeaderCandidate('zetaBeatrix',score,4)]}));
const realZetaDecision=H.decideHandSamples(realZetaStable);
assert.equal(realZetaDecision.recognized.zetaBeatrix?.decision,'temporal-stable-leader-rescue','real clean-13.23 Zeta stable anchor sequence must be rescued');
assert.equal(realZetaDecision.recognized.zetaBeatrix?.count,1);
assert.ok(realZetaDecision.recognized.zetaBeatrix?.confidence>=.858);
const zetaSixCardScores=[.8125,.8123,.8120,.8116],zetaSixCardTitles=[.5087,.5085,.5092,.5089];
const zetaSixCardCurrent=zetaSixCardScores.map((score,i)=>({sampleTime:30.268+i*.04,candidateCount:6,counts:{},scores:{},candidates:[stableLeaderCandidate('zetaBeatrix',score,3,{titleScore:zetaSixCardTitles[i]})]}));
const zetaSixCardDecision=H.decideHandSamples(zetaSixCardCurrent);
assert.equal(zetaSixCardDecision.recognized.zetaBeatrix?.decision,'temporal-stable-leader-rescue','real 4.13.28 six-card Zeta sequence must use the guarded stable-leader rescue');
assert.equal(zetaSixCardDecision.recognized.zetaBeatrix?.stableLeader?.tier,'six-card-ultra-stable');
assert.equal(zetaSixCardDecision.recognized.zetaBeatrix?.count,1);
assert.equal(zetaSixCardDecision.recognized.zetaBeatrix?.confidence,.8116);
assert.equal(H.decideHandSamples(zetaSixCardScores.map((score,i)=>({sampleTime:i,candidateCount:5,counts:{},scores:{},candidates:[stableLeaderCandidate('zetaBeatrix',score,3,{titleScore:zetaSixCardTitles[i]})]}))).recognized.zetaBeatrix,undefined,'ultra-stable low-score rescue must not apply outside the verified six-card fan layout');
assert.equal(H.decideHandSamples(zetaSixCardScores.map((score,i)=>({sampleTime:i,candidateCount:6,counts:{},scores:{},candidates:[stableLeaderCandidate('zetaBeatrix',score,3,{titleScore:.49})]}))).recognized.zetaBeatrix,undefined,'ultra-stable low-score rescue requires independent title support');
assert.equal(H.decideHandSamples([.8125,.8123,.8120,.8180].map((score,i)=>({sampleTime:i,candidateCount:6,counts:{},scores:{},candidates:[stableLeaderCandidate('zetaBeatrix',score,3,{titleScore:.509})]}))).recognized.zetaBeatrix,undefined,'ultra-stable low-score rescue must reject a wider score range');
assert.equal(H.decideHandSamples(zetaSixCardScores.map((score,i)=>({sampleTime:i,candidateCount:6,counts:{},scores:{},candidates:[stableLeaderCandidate('zetaBeatrix',score,3,{titleScore:zetaSixCardTitles[i],ocrValue:i===2?2:null,ocrAccepted:i===2})]}))).recognized.zetaBeatrix,undefined,'a conflicting displayed-cost OCR frame must veto the low-score rescue');
const zetaProbeMatch={cardId:'zetaBeatrix',best:.8125,imageSource:'anchor',titleScore:.5087,imageCandidate:false};
const zetaProbe=H.displayedCostProbeDecision(zetaProbeMatch,6);
assert.equal(zetaProbe.read,true,'real 4.13.28 six-card Zeta candidate must execute displayed-cost probing before rescue evaluation');
assert.equal(zetaProbe.temporalProbe,false,'0.8125 remains below the ordinary temporal probe floor');
assert.equal(zetaProbe.stableLeaderCostProbe.enabled,true);
assert.equal(zetaProbe.stableLeaderCostProbe.tier,'six-card-ultra-stable');
assert.equal(H.displayedCostProbeDecision(zetaProbeMatch,5).read,false,'low-score Zeta cost probe must not run outside six-card layout');
assert.equal(H.displayedCostProbeDecision({...zetaProbeMatch,titleScore:.49},6).read,false,'low-score Zeta cost probe requires independent title support');
assert.equal(H.displayedCostProbeDecision({...zetaProbeMatch,best:.7999},6).read,false,'low-score Zeta cost probe must remain above the guarded .80 floor');
assert.equal(H.displayedCostProbeDecision({...zetaProbeMatch,imageSource:'title'},6).read,false,'low-score Zeta cost probe must require anchor leadership');
assert.equal(H.displayedCostProbeDecision({cardId:'barbaros',best:.8125,imageSource:'anchor',titleScore:.60,imageCandidate:false},6).read,false,'Zeta-specific low-score cost probing must not expand to unrelated cards');
assert.equal(H.ocrConfidenceForAccepted({accepted:true,value:0,reads:[{value:0,confidence:43},{value:null,confidence:0}]}),43);
const zetaWeakZeroConf=[43,29,28,32];
const zetaSixCardWeakZero=zetaSixCardScores.map((score,i)=>({sampleTime:30.17+i*.04,candidateCount:6,counts:{},scores:{},candidates:[stableLeaderCandidate('zetaBeatrix',score,3,{titleScore:zetaSixCardTitles[i],ocrValue:0,ocrAccepted:true,ocrConfidence:zetaWeakZeroConf[i],templateValue:7,templateScore:.825,templateAccepted:false})]}));
const zetaWeakZeroDecision=H.decideHandSamples(zetaSixCardWeakZero);
assert.equal(zetaWeakZeroDecision.recognized.zetaBeatrix?.count,1,'real 4.13.30 low-confidence OCR-zero sequence must not veto the ultra-stable Zeta rescue');
assert.equal(zetaWeakZeroDecision.recognized.zetaBeatrix?.stableLeader?.groups?.[0]?.ocrConflictFrames,0);
assert.equal(zetaWeakZeroDecision.recognized.zetaBeatrix?.stableLeader?.groups?.[0]?.weakOcrConflictFrames,4);
assert.equal(zetaWeakZeroDecision.recognized.zetaBeatrix?.stableLeader?.groups?.[0]?.ocrConflictMinConfidence,50);
const zetaStrongZero=zetaSixCardScores.map((score,i)=>({sampleTime:i,candidateCount:6,counts:{},scores:{},candidates:[stableLeaderCandidate('zetaBeatrix',score,3,{titleScore:zetaSixCardTitles[i],ocrValue:0,ocrAccepted:true,ocrConfidence:i===0?70:30})]}));
assert.equal(H.decideHandSamples(zetaStrongZero).recognized.zetaBeatrix,undefined,'a high-confidence wrong OCR value must still veto Zeta rescue');
const zetaStrongWrong=zetaSixCardScores.map((score,i)=>({sampleTime:i,candidateCount:6,counts:{},scores:{},candidates:[stableLeaderCandidate('zetaBeatrix',score,3,{titleScore:zetaSixCardTitles[i],ocrValue:i===1?2:null,ocrAccepted:i===1,ocrConfidence:i===1?80:null})]}));
assert.equal(H.decideHandSamples(zetaStrongWrong).recognized.zetaBeatrix,undefined,'high-confidence non-zero wrong cost must remain a hard conflict');
const savedTimeline=WB.turnTimeline;
WB.turnTimeline=[{side:'bottom',turn:3,time:29.337},{side:'top',turn:3,time:31.43}];
const zetaTurnEndTimes=[31.238,31.278,31.318,31.358],zetaTurnEndScores=[.8164,.8163,.8147,.8149],zetaTurnEndTitles=[.4681,.4659,.4639,.4634];
const zetaTurnEnd=zetaTurnEndScores.map((score,i)=>({sampleTime:zetaTurnEndTimes[i],candidateCount:6,counts:{},scores:{},candidates:[stableLeaderCandidate('zetaBeatrix',score,3,{titleScore:zetaTurnEndTitles[i]})]}));
const zetaTurnEndDecision=H.decideHandSamples(zetaTurnEnd);
assert.equal(zetaTurnEndDecision.recognized.zetaBeatrix?.count,1,'real 4.13.31 turn-end Zeta sequence must be rescued only inside the guarded turn-end tier');
assert.equal(zetaTurnEndDecision.recognized.zetaBeatrix?.stableLeader?.tier,'six-card-turn-end-ultra-stable');
assert.equal(zetaTurnEndDecision.recognized.zetaBeatrix?.stableLeader?.groups?.[0]?.timeOk,true);
assert.equal(zetaTurnEndDecision.recognized.zetaBeatrix?.stableLeader?.groups?.[0]?.minNextTurnDelta,.072);
assert.equal(zetaTurnEndDecision.recognized.zetaBeatrix?.stableLeader?.groups?.[0]?.maxNextTurnDelta,.192);
const turnEndProbe=H.displayedCostProbeDecision({cardId:'zetaBeatrix',best:.8149,imageSource:'anchor',titleScore:.4634,imageCandidate:false},6,31.358);
assert.equal(turnEndProbe.read,true,'turn-end low-title Zeta candidate must still execute displayed-cost probing');
assert.equal(turnEndProbe.stableLeaderCostProbe.tier,'six-card-turn-end-ultra-stable');
assert.equal(turnEndProbe.stableLeaderCostProbe.nextTurnDelta,.072);
assert.equal(turnEndProbe.stableLeaderCostProbe.activeSide,'bottom');
assert.equal(turnEndProbe.stableLeaderCostProbe.nextSide,'top');
assert.equal(turnEndProbe.stableLeaderCostProbe.sideOk,true);

assert.equal(H.displayedCostProbeDecision({cardId:'zetaBeatrix',best:.8149,imageSource:'anchor',titleScore:.4634,imageCandidate:false},6,31.10).read,false,'turn-end low-title rescue must not activate away from the turn boundary');
const zetaTurnEndLowTitle=zetaTurnEndScores.map((score,i)=>({sampleTime:zetaTurnEndTimes[i],candidateCount:6,counts:{},scores:{},candidates:[stableLeaderCandidate('zetaBeatrix',score,3,{titleScore:i===3?.4599:zetaTurnEndTitles[i]})]}));
assert.equal(H.decideHandSamples(zetaTurnEndLowTitle).recognized.zetaBeatrix,undefined,'turn-end rescue must keep the .46 independent-title floor');
const zetaTurnEndLowAnchor=[.8099,.811,.8108,.8107].map((score,i)=>({sampleTime:zetaTurnEndTimes[i],candidateCount:6,counts:{},scores:{},candidates:[stableLeaderCandidate('zetaBeatrix',score,3,{titleScore:.47})]}));
assert.equal(H.decideHandSamples(zetaTurnEndLowAnchor).recognized.zetaBeatrix,undefined,'turn-end rescue must keep the .81 anchor floor');
const zetaTurnEndWide=[.8140,.8164,.8138,.8162].map((score,i)=>({sampleTime:zetaTurnEndTimes[i],candidateCount:6,counts:{},scores:{},candidates:[stableLeaderCandidate('zetaBeatrix',score,3,{titleScore:.47})]}));
assert.equal(H.decideHandSamples(zetaTurnEndWide).recognized.zetaBeatrix,undefined,'turn-end rescue must reject anchor instability wider than .002');
const zetaTurnEndWrongCost=zetaTurnEndScores.map((score,i)=>({sampleTime:zetaTurnEndTimes[i],candidateCount:6,counts:{},scores:{},candidates:[stableLeaderCandidate('zetaBeatrix',score,3,{titleScore:zetaTurnEndTitles[i],ocrValue:i===2?2:null,ocrAccepted:i===2,ocrConfidence:i===2?80:null})]}));
assert.equal(H.decideHandSamples(zetaTurnEndWrongCost).recognized.zetaBeatrix,undefined,'turn-end rescue must still reject a strong wrong displayed cost');
WB.turnTimeline=[{side:'bottom',turn:3,time:29.337},{side:'top',turn:3,time:31.70}];
assert.equal(H.decideHandSamples(zetaTurnEnd).recognized.zetaBeatrix,undefined,'the same low-title sequence must fail when it is not within .20s of the next turn');
const opponentTurnEndTimes=[38.943,38.983,39.023,39.063],opponentTurnEnd=zetaTurnEndScores.map((score,i)=>({sampleTime:opponentTurnEndTimes[i],candidateCount:6,counts:{},scores:{},candidates:[stableLeaderCandidate('zetaBeatrix',score,3,{titleScore:zetaTurnEndTitles[i]})]}));
WB.turnTimeline=[{side:'top',turn:3,time:31.43},{side:'bottom',turn:4,time:39.135}];
assert.equal(H.decideHandSamples(opponentTurnEnd).recognized.zetaBeatrix,undefined,'low-title turn-end rescue must never activate at the end of the opponent turn');
const opponentProbe=H.displayedCostProbeDecision({cardId:'zetaBeatrix',best:.8149,imageSource:'anchor',titleScore:.4634,imageCandidate:false},6,39.063);
assert.equal(opponentProbe.read,false,'opponent-turn boundary must not trigger the special low-title cost probe');
assert.equal(H.stableLeaderTierTimeOk(zeta.recognition.stableLeaderRescue.alternateTiers[1],39.063).sideOk,false);
WB.turnTimeline=savedTimeline;







const maskDemo=new Uint8Array([1,1,1,0,0]);
const maskA=new Float32Array([1,2,3,100,100]),maskB=new Float32Array([11,12,13,-100,-100]);
assert.ok(H.maskedSpatialCorrelation(maskA,maskB,maskDemo)>.9999,'visible-cell correlation must re-center the retained cells and ignore contaminated tail normalization');
assert.ok(H.maskedSpatialCorrelation(maskA,maskB,maskDemo)>H.maskedSpatialCosine(maskA,maskB,maskDemo),'visible-cell re-normalization must improve over post-normalization masking for affine-shifted visible evidence');
const visDemo=H.anchorVisibilityMask({cx:916},{cx:959},0,-2,6);
assert.equal(visDemo.rightGap,43);
assert.ok(visDemo.supportRatio>=.45&&visDemo.supportRatio<1,'crowded hand must expose only part of the fixed anchor patch');
assert.ok(visDemo.visibleCells<visDemo.totalCells);
const qbCard=DB.recognitionCards().find(x=>x.id==='quickBlader');
const qbProfiles=DB.anchorRecognitionProfiles('quickBlader');
const syntheticAnchorFeatures=Array.from({length:H.anchorCenterShifts.length*H.anchorAngles.length},()=>qbProfiles[0]);
const shadowDemo=H.shadowMaskedAnchorMatch('quickBlader',syntheticAnchorFeatures,{cx:916},{cx:959});
assert.ok(shadowDemo&&shadowDemo.score>.99,'shadow masked anchor must compare only visible cells against the same profile');
assert.ok(shadowDemo.supportRatio>=H.config.shadowAnchorMinSupport);
assert.equal(shadowDemo.normalization,'visible-cells-per-channel');
const shadowMatrix=H.shadowMaskedAnchorScores(syntheticAnchorFeatures,{cx:916},{cx:959});
for(const card of DB.recognitionCards())assert.ok(shadowMatrix[card.id],`shadow evidence matrix must include ${card.id} even when it is not imageBest`);
assert.ok(shadowMatrix.quickBlader.score>.99);
const qbAnchorProfile=DB.anchorRecognitionProfiles('quickBlader')[0];
const poseVariants=Array.from({length:H.anchorCenterShifts.length*H.anchorAngles.length},()=>new Float32Array(qbAnchorProfile.length));
const poseDxIndex=H.anchorCenterShifts.indexOf(0),poseAngleIndex=H.anchorAngles.indexOf(5),poseIndex=poseDxIndex*H.anchorAngles.length+poseAngleIndex;
poseVariants[poseIndex]=new Float32Array(qbAnchorProfile);
const poseMatrix=H.anchorVariantDiagnosticScores(poseVariants);
assert.ok(poseMatrix.quickBlader.score>.9999,'anchor pose diagnostics must recover the matching profile');
assert.equal(poseMatrix.quickBlader.dx,0);
assert.equal(poseMatrix.quickBlader.angle,5);
assert.equal(poseMatrix.quickBlader.atDxBoundary,false);
assert.equal(poseMatrix.quickBlader.atAngleBoundary,false);
assert.equal(poseMatrix.quickBlader.variantCount,poseVariants.length);
assert.equal(Object.keys(H.shadowMaskedAnchorScores(poseVariants,{cx:959},null)).length,0,'rightmost card has no right-neighbor shadow evidence');
const poseOnly=Array.from({length:4},(_,i)=>({sampleTime:i,candidateCount:8,counts:{},scores:{},candidates:[{...stableLeaderCandidate('zetaBeatrix',.50,7,{titleScore:.10}),anchorVariantScores:{zetaBeatrix:{score:.99,dx:4,angle:10,atDxBoundary:true,atAngleBoundary:true}}}]}));
assert.equal(H.decideHandSamples(poseOnly).recognized.zetaBeatrix,undefined,'anchor pose diagnostics must remain diagnostic-only and never alter recognition decisions');
const shadowOnly=Array.from({length:4},(_,i)=>({sampleTime:i,candidateCount:7,counts:{},scores:{},candidates:[{...stableLeaderCandidate('quickBlader',.50,5,{titleScore:.10}),matchScores:{quickBlader:{anchorScore:.50,titleScore:.10}},shadowMatchScores:{quickBlader:{score:.99,supportRatio:.6,rightGap:43},zetaBeatrix:{score:.25,supportRatio:.6,rightGap:43},barbaros:{score:.30,supportRatio:.6,rightGap:43}},geometry:{rightGapToCostCenter:43},imageBest:{...stableLeaderCandidate('quickBlader',.50,5,{titleScore:.10}).imageBest,shadowMaskedAnchor:{score:.99,supportRatio:.6,rightGap:43}}}]}));
assert.equal(H.decideHandSamples(shadowOnly).recognized.quickBlader,undefined,'masked evidence must not rescue a weak normal anchor or weak independent title evidence');
const overlapCandidate=(normal,masked,index,{title=.313,support=.70,gap=43,runnerNormal=.48,runnerMasked=.60,crossZeta=.28,crossBarbaros=.47,ocrValue=null,ocrAccepted=false,ocrConfidence=null,templateValue=null,templateAccepted=false,probeEnabled=true,imageBestCard='quickBlader'}={})=>({sampleTime:0,candidateCount:6,counts:{},scores:{},candidates:[{index:2,matchScores:{quickBlader:{anchorScore:runnerNormal,imageScore:runnerNormal,titleScore:.32}},shadowMatchScores:{quickBlader:{score:runnerMasked,supportRatio:support,rightGap:gap},zetaBeatrix:{score:.20,supportRatio:support,rightGap:gap},barbaros:{score:.25,supportRatio:support,rightGap:gap}},geometry:{rightGapToCostCenter:gap},displayedCost:{}},{index,matchScores:{quickBlader:{anchorScore:normal,imageScore:normal,titleScore:title},zetaBeatrix:{anchorScore:.30,imageScore:.30,titleScore:.20},barbaros:{anchorScore:.35,imageScore:.35,titleScore:.20}},shadowMatchScores:{quickBlader:{score:masked,supportRatio:support,rightGap:gap},zetaBeatrix:{score:crossZeta,supportRatio:support,rightGap:gap},barbaros:{score:crossBarbaros,supportRatio:support,rightGap:gap}},geometry:{rightGapToCostCenter:gap},displayedCost:{ocrValue,ocrAccepted,ocrConfidence,templateValue,templateAccepted},overlapMaskedCostProbe:{enabled:probeEnabled,cardId:probeEnabled?'quickBlader':imageBestCard},imageBest:{cardId:imageBestCard,imageScore:normal,imageSource:'anchor',anchorScore:normal,titleScore:title,shadowMaskedAnchor:{score:masked,supportRatio:support,rightGap:gap}},best:{cardId:'quickBlader',imageScore:normal,imageSource:'anchor',anchorScore:normal,titleScore:title}}]});
const qbOverlapScores=[.9621,.9624,.9618,.9623],qbOverlapNormals=[.8492,.8476,.8469,.8476];
const qbOverlap=qbOverlapScores.map((masked,i)=>{const row=overlapCandidate(qbOverlapNormals[i],masked,5);row.sampleTime=21.993+i*.04;return row});
const qbOverlapDecision=H.decideHandSamples(qbOverlap);
assert.equal(qbOverlapDecision.recognized.quickBlader?.decision,'overlap-masked-anchor-consensus','real-video-derived crowded Quick evidence must use geometry rescue without a hand-count exception');
assert.equal(qbOverlapDecision.recognized.quickBlader?.confidence,.9618);
assert.equal(qbOverlapDecision.recognized.quickBlader?.overlapMasked?.groups?.[0]?.minObservedGain,.1129);
assert.equal(qbOverlapDecision.recognized.quickBlader?.overlapMasked?.groups?.[0]?.minObservedSameCardLeaderMargin,.3618);
assert.ok(qbOverlapDecision.recognized.quickBlader?.overlapMasked?.groups?.[0]?.minObservedCrossCardLeaderMargin>=.49);
const overlapProbe=H.overlapMaskedCostProbeDecision({cardId:'quickBlader',anchorScore:.8476,titleScore:.3142},{score:.9623,supportRatio:.70,rightGap:43},43);
assert.equal(overlapProbe.enabled,true,'crowded Quick geometry must trigger displayed-cost probing even outside a seven-card-only rule');
assert.equal(H.overlapMaskedCostProbeDecision({cardId:'quickBlader',anchorScore:.966,titleScore:.50},{score:.973,supportRatio:.80,rightGap:51},51).enabled,false,'ordinary six-card Quick must not trigger overlap rescue when masked gain is small');
assert.equal(H.overlapMaskedCostProbeDecision({cardId:'zetaBeatrix',anchorScore:.86,titleScore:.51},{score:.97,supportRatio:.70,rightGap:43},43).enabled,false,'unvalidated cards must not inherit Quick overlap rescue');
const qbOverlapNoProbe=qbOverlapScores.map((masked,i)=>{const row=overlapCandidate(qbOverlapNormals[i],masked,5,{probeEnabled:false,imageBestCard:'barbaros'});row.sampleTime=i;return row});
assert.equal(H.decideHandSamples(qbOverlapNoProbe).recognized.quickBlader,undefined,'overlap rescue must require the Quick-specific cost-probe path on every frame when ordinary imageBest is another card');
const qbOverlapNoProbeGroup=H.decideHandSamples(qbOverlapNoProbe).unresolved.quickBlader?.overlapMasked?.groups?.[0];
assert.equal(qbOverlapNoProbeGroup?.probeOk,false);
assert.equal(qbOverlapNoProbeGroup?.probeFrames,0);
const qbOverlapLowNormal=qbOverlapScores.map((masked,i)=>{const row=overlapCandidate(i===1?.79:qbOverlapNormals[i],masked,5);row.sampleTime=i;return row});
assert.equal(H.decideHandSamples(qbOverlapLowNormal).recognized.quickBlader,undefined,'masked score alone must not rescue when the normal anchor lacks minimum support');
const qbOverlapLowGain=qbOverlapScores.map((_,i)=>{const row=overlapCandidate(.966,.973,5,{support:.8,gap:51});row.sampleTime=i;return row});
assert.equal(H.decideHandSamples(qbOverlapLowGain).recognized.quickBlader,undefined,'ordinary close hand geometry with only a small masked gain must not rescue');
const qbOverlapLowSupport=qbOverlapScores.map((masked,i)=>{const row=overlapCandidate(qbOverlapNormals[i],masked,5,{support:i===2?.54:.70});row.sampleTime=i;return row});
assert.equal(H.decideHandSamples(qbOverlapLowSupport).recognized.quickBlader,undefined,'insufficient visible anchor support must veto overlap rescue');
const qbOverlapWideGap=qbOverlapScores.map((masked,i)=>{const row=overlapCandidate(qbOverlapNormals[i],masked,5,{gap:57});row.sampleTime=i;return row});
assert.equal(H.decideHandSamples(qbOverlapWideGap).recognized.quickBlader,undefined,'overlap rescue must not activate beyond the verified right-gap geometry');
const qbOverlapLowTitle=qbOverlapScores.map((masked,i)=>{const row=overlapCandidate(qbOverlapNormals[i],masked,5,{title:i===1?.2999:.313});row.sampleTime=i;return row});
assert.equal(H.decideHandSamples(qbOverlapLowTitle).recognized.quickBlader,undefined,'overlap rescue requires independent title evidence');
const qbOverlapNearSameCard=qbOverlapScores.map((masked,i)=>{const row=overlapCandidate(qbOverlapNormals[i],masked,5,{runnerMasked:.70});row.sampleTime=i;return row});
assert.equal(H.decideHandSamples(qbOverlapNearSameCard).recognized.quickBlader,undefined,'another slot too close in masked Quick score must veto rescue');
const qbOverlapCrossTie=qbOverlapScores.map((masked,i)=>{const row=overlapCandidate(qbOverlapNormals[i],masked,5,{crossBarbaros:.80});row.sampleTime=i;return row});
assert.equal(H.decideHandSamples(qbOverlapCrossTie).recognized.quickBlader,undefined,'another card too close in the same slot masked score must veto rescue');
const qbOverlapWrongCost=qbOverlapScores.map((masked,i)=>{const row=overlapCandidate(qbOverlapNormals[i],masked,5,{ocrValue:i===2?7:null,ocrAccepted:i===2,ocrConfidence:i===2?80:null});row.sampleTime=i;return row});
assert.equal(H.decideHandSamples(qbOverlapWrongCost).recognized.quickBlader,undefined,'high-confidence wrong displayed cost must veto overlap rescue');
const qbOverlapWeakWrong=qbOverlapScores.map((masked,i)=>{const row=overlapCandidate(qbOverlapNormals[i],masked,5,{ocrValue:i===2?7:null,ocrAccepted:i===2,ocrConfidence:i===2?30:null});row.sampleTime=i;return row});
assert.equal(H.decideHandSamples(qbOverlapWeakWrong).recognized.quickBlader?.decision,'overlap-masked-anchor-consensus','low-confidence OCR noise must not defeat otherwise strong overlap evidence');

const realQbSevenScores=[.8492,.8476,.8469,.8476],realQbSevenTitles=[.3173,.3127,.3127,.3142],realQbSevenRunner=[.4799,.4797,.4798,.4801];
const realQbSeven=realQbSevenScores.map((score,i)=>({sampleTime:21.993+i*.04,candidateCount:7,counts:{},scores:{},candidates:[stableLeaderCandidate('quickBlader',realQbSevenRunner[i],2,{titleScore:.325}),stableLeaderCandidate('quickBlader',score,5,{titleScore:realQbSevenTitles[i]})]}));
const realQbSevenDecision=H.decideHandSamples(realQbSeven);
assert.equal(realQbSevenDecision.recognized.quickBlader?.decision,'temporal-stable-leader-rescue','real 4.13.35 seven-card Quick Blader sequence must be rescued by its guarded fan tier');
assert.equal(realQbSevenDecision.recognized.quickBlader?.stableLeader?.tier,'seven-card-fan-stable');
assert.equal(realQbSevenDecision.recognized.quickBlader?.confidence,.8469);
assert.equal(realQbSevenDecision.recognized.quickBlader?.stableLeader?.groups?.[0]?.minSameCardLeaderMargin,.3);
assert.equal(realQbSevenDecision.recognized.quickBlader?.stableLeader?.groups?.[0]?.minObservedSameCardLeaderMargin,.3671);
assert.equal(realQbSevenDecision.recognized.quickBlader?.stableLeader?.groups?.[0]?.sameCardLeaderMarginOk,true);
const qbSevenProbe=H.displayedCostProbeDecision({cardId:'quickBlader',best:.8476,imageSource:'anchor',titleScore:.3142,imageCandidate:false},7,22.113);
assert.equal(qbSevenProbe.read,true,'real seven-card Quick Blader candidate must execute displayed-cost probing');
assert.equal(qbSevenProbe.stableLeaderCostProbe.tier,'seven-card-fan-stable');
assert.equal(H.displayedCostProbeDecision({cardId:'quickBlader',best:.8476,imageSource:'anchor',titleScore:.3142,imageCandidate:false},6,22.113).read,false,'seven-card Quick rescue must not probe outside the verified seven-card layout');
assert.equal(H.decideHandSamples(realQbSeven.map(x=>({...x,candidateCount:6}))).recognized.quickBlader,undefined,'seven-card Quick rescue must not apply outside seven-card layout');
const qbSevenLowTitle=realQbSevenScores.map((score,i)=>({sampleTime:i,candidateCount:7,counts:{},scores:{},candidates:[stableLeaderCandidate('quickBlader',score,5,{titleScore:i===1?.2999:realQbSevenTitles[i]})]}));
assert.equal(H.decideHandSamples(qbSevenLowTitle).recognized.quickBlader,undefined,'seven-card Quick rescue must keep independent title support');
const qbSevenLowAnchor=[.8449,.8470,.8472,.8471].map((score,i)=>({sampleTime:i,candidateCount:7,counts:{},scores:{},candidates:[stableLeaderCandidate('quickBlader',score,5,{titleScore:.313})]}));
assert.equal(H.decideHandSamples(qbSevenLowAnchor).recognized.quickBlader,undefined,'seven-card Quick rescue must keep the .845 anchor floor');
const qbSevenWide=[.845,.8481,.847,.8475].map((score,i)=>({sampleTime:i,candidateCount:7,counts:{},scores:{},candidates:[stableLeaderCandidate('quickBlader',score,5,{titleScore:.313})]}));
assert.equal(H.decideHandSamples(qbSevenWide).recognized.quickBlader,undefined,'seven-card Quick rescue must reject anchor instability wider than .003');
const qbSevenNearTie=realQbSevenScores.map((score,i)=>({sampleTime:i,candidateCount:7,counts:{},scores:{},candidates:[stableLeaderCandidate('quickBlader',score-.20,2,{titleScore:.32}),stableLeaderCandidate('quickBlader',score,5,{titleScore:realQbSevenTitles[i]})]}));
const qbSevenNearTieDecision=H.decideHandSamples(qbSevenNearTie);
assert.equal(qbSevenNearTieDecision.recognized.quickBlader,undefined,'seven-card Quick rescue must reject another same-card slot within .30 of the leader');
const qbSevenNearTieGroup=qbSevenNearTieDecision.unresolved.quickBlader?.stableLeader?.groups?.find(x=>x.tier==='seven-card-fan-stable'&&x.slot===5);
assert.equal(qbSevenNearTieGroup?.sameCardLeaderMarginOk,false);
const qbSevenHiddenRunner=realQbSevenScores.map((score,i)=>{
  const hidden=stableLeaderCandidate('zetaBeatrix',score-.10,2,{titleScore:.52});
  hidden.matchScores={quickBlader:{imageScore:score-.20,imageSource:'anchor',titleScore:.31,anchorScore:score-.20,imageCandidate:false,imageConfirmed:false},zetaBeatrix:{imageScore:score-.10,imageSource:'anchor',titleScore:.52,anchorScore:score-.10,imageCandidate:false,imageConfirmed:false}};
  return{sampleTime:i,candidateCount:7,counts:{},scores:{},candidates:[hidden,stableLeaderCandidate('quickBlader',score,5,{titleScore:realQbSevenTitles[i]})]};
});
const qbSevenHiddenRunnerDecision=H.decideHandSamples(qbSevenHiddenRunner);
assert.equal(qbSevenHiddenRunnerDecision.recognized.quickBlader,undefined,'same-card runner margin must include Quick scores even when another card is imageBest in that slot');
const qbSevenHiddenRunnerGroup=qbSevenHiddenRunnerDecision.unresolved.quickBlader?.stableLeader?.groups?.find(x=>x.tier==='seven-card-fan-stable'&&x.slot===5);
assert.equal(qbSevenHiddenRunnerGroup?.sameCardLeaderMarginOk,false);
assert.equal(qbSevenHiddenRunnerGroup?.minObservedSameCardLeaderMargin,.2);


const qbSevenWrong=realQbSevenScores.map((score,i)=>({sampleTime:i,candidateCount:7,counts:{},scores:{},candidates:[stableLeaderCandidate('quickBlader',score,5,{titleScore:realQbSevenTitles[i],ocrValue:i===2?0:null,ocrAccepted:i===2,ocrConfidence:i===2?70:null})]}));
assert.equal(H.decideHandSamples(qbSevenWrong).recognized.quickBlader,undefined,'high-confidence wrong cost must veto seven-card Quick rescue');
const qbSevenWeakWrong=realQbSevenScores.map((score,i)=>({sampleTime:i,candidateCount:7,counts:{},scores:{},candidates:[stableLeaderCandidate('quickBlader',score,5,{titleScore:realQbSevenTitles[i],ocrValue:i===2?0:null,ocrAccepted:i===2,ocrConfidence:i===2?30:null})]}));
assert.equal(H.decideHandSamples(qbSevenWeakWrong).recognized.quickBlader?.stableLeader?.tier,'seven-card-fan-stable','low-confidence OCR-zero artifact must not veto the tightly guarded seven-card Quick rescue');

const realZetaEightScores=[.8647,.8641,.8899,.8905],realZetaEightTitles=[.4849,.5053,.5277,.5306];
const realZetaEight=realZetaEightScores.map((score,i)=>({sampleTime:131.776+i*.04,candidateCount:8,counts:{},scores:{},candidates:[stableLeaderCandidate('zetaBeatrix',score,7,{titleScore:realZetaEightTitles[i],ocrValue:i===3?6:null,ocrAccepted:i===3,ocrConfidence:i===3?80:null})]}));
const realZetaEightDecision=H.decideHandSamples(realZetaEight);
assert.equal(realZetaEightDecision.recognized.zetaBeatrix?.decision,'temporal-stable-leader-rescue','real 4.13.35 eight-card Zeta sequence must be rescued only with positive high-confidence allowed-cost proof');
assert.equal(realZetaEightDecision.recognized.zetaBeatrix?.stableLeader?.tier,'eight-card-fan-cost-confirmed');
assert.equal(realZetaEightDecision.recognized.zetaBeatrix?.count,1);
assert.equal(realZetaEightDecision.recognized.zetaBeatrix?.confidence,.8641);
assert.equal(realZetaEightDecision.recognized.zetaBeatrix?.stableLeader?.groups?.[0]?.requiredAllowedOcrFrames,1);
assert.equal(realZetaEightDecision.recognized.zetaBeatrix?.stableLeader?.groups?.[0]?.allowedOcrMinConfidence,60);
assert.equal(realZetaEightDecision.recognized.zetaBeatrix?.stableLeader?.groups?.[0]?.allowedOcrFrames,1);
assert.equal(realZetaEightDecision.recognized.zetaBeatrix?.stableLeader?.groups?.[0]?.allowedOcrOk,true);
const zetaEightProbe=H.displayedCostProbeDecision({cardId:'zetaBeatrix',best:.8647,imageSource:'anchor',titleScore:.4849,imageCandidate:false},8,131.776);
assert.equal(zetaEightProbe.read,true,'real eight-card Zeta sequence must probe displayed cost on all guarded frames');
assert.equal(zetaEightProbe.stableLeaderCostProbe.tier,'eight-card-fan-cost-confirmed');
assert.equal(zetaEightProbe.stableLeaderCostProbe.requiredAllowedOcrFrames,1);
assert.equal(zetaEightProbe.stableLeaderCostProbe.allowedOcrMinConfidence,60);
const zetaEightNoCost=realZetaEightScores.map((score,i)=>({sampleTime:i,candidateCount:8,counts:{},scores:{},candidates:[stableLeaderCandidate('zetaBeatrix',score,7,{titleScore:realZetaEightTitles[i]})]}));
assert.equal(H.decideHandSamples(zetaEightNoCost).recognized.zetaBeatrix,undefined,'eight-card Zeta rescue must not rely on image evidence alone');
const zetaEightWeakCost=realZetaEightScores.map((score,i)=>({sampleTime:i,candidateCount:8,counts:{},scores:{},candidates:[stableLeaderCandidate('zetaBeatrix',score,7,{titleScore:realZetaEightTitles[i],ocrValue:i===3?6:null,ocrAccepted:i===3,ocrConfidence:i===3?59:null})]}));
assert.equal(H.decideHandSamples(zetaEightWeakCost).recognized.zetaBeatrix,undefined,'eight-card Zeta rescue requires high-confidence allowed-cost OCR');
assert.equal(H.decideHandSamples(realZetaEight.map(x=>({...x,candidateCount:7}))).recognized.zetaBeatrix,undefined,'eight-card Zeta rescue must not apply outside eight-card layout');
const zetaEightLowTitle=realZetaEightScores.map((score,i)=>({sampleTime:i,candidateCount:8,counts:{},scores:{},candidates:[stableLeaderCandidate('zetaBeatrix',score,7,{titleScore:i===0?.4799:realZetaEightTitles[i],ocrValue:i===3?6:null,ocrAccepted:i===3,ocrConfidence:i===3?80:null})]}));
assert.equal(H.decideHandSamples(zetaEightLowTitle).recognized.zetaBeatrix,undefined,'eight-card Zeta rescue must keep the .48 title floor');
const zetaEightLowAnchor=[.8599,.8641,.8899,.8905].map((score,i)=>({sampleTime:i,candidateCount:8,counts:{},scores:{},candidates:[stableLeaderCandidate('zetaBeatrix',score,7,{titleScore:.51,ocrValue:i===3?6:null,ocrAccepted:i===3,ocrConfidence:i===3?80:null})]}));
assert.equal(H.decideHandSamples(zetaEightLowAnchor).recognized.zetaBeatrix,undefined,'eight-card Zeta rescue must keep the .86 anchor floor');
const zetaEightWide=[.86,.891,.889,.890].map((score,i)=>({sampleTime:i,candidateCount:8,counts:{},scores:{},candidates:[stableLeaderCandidate('zetaBeatrix',score,7,{titleScore:.51,ocrValue:i===3?6:null,ocrAccepted:i===3,ocrConfidence:i===3?80:null})]}));
assert.equal(H.decideHandSamples(zetaEightWide).recognized.zetaBeatrix,undefined,'eight-card Zeta rescue must reject score range wider than .03');
const zetaEightWrong=realZetaEightScores.map((score,i)=>({sampleTime:i,candidateCount:8,counts:{},scores:{},candidates:[stableLeaderCandidate('zetaBeatrix',score,7,{titleScore:realZetaEightTitles[i],ocrValue:i===2?7:(i===3?6:null),ocrAccepted:i>=2,ocrConfidence:i===2?80:(i===3?80:null)})]}));
assert.equal(H.decideHandSamples(zetaEightWrong).recognized.zetaBeatrix,undefined,'high-confidence wrong cost must veto eight-card Zeta rescue even when one allowed cost is present');
const zetaEightWeakWrong=realZetaEightScores.map((score,i)=>({sampleTime:i,candidateCount:8,counts:{},scores:{},candidates:[stableLeaderCandidate('zetaBeatrix',score,7,{titleScore:realZetaEightTitles[i],ocrValue:i===2?0:(i===3?6:null),ocrAccepted:i>=2,ocrConfidence:i===2?30:(i===3?80:null)})]}));
assert.equal(H.decideHandSamples(zetaEightWeakWrong).recognized.zetaBeatrix?.stableLeader?.tier,'eight-card-fan-cost-confirmed','low-confidence wrong OCR must not veto eight-card Zeta when strong allowed-cost proof exists');

const realQbLate=[
 {score:.8907,template:.9449},
 {score:.8914,template:.9430},
 {score:.8910,template:.9423},
 {score:.8940,template:.9456}
].map((x,i)=>({sampleTime:81.835+i*.04,counts:{},scores:{},candidates:[stableLeaderCandidate('quickBlader',x.score,2,{templateValue:1,templateScore:x.template,ocrValue:0,ocrAccepted:true})]}));
const realQbLateDecision=H.decideHandSamples(realQbLate);
assert.equal(realQbLateDecision.recognized.quickBlader?.decision,'temporal-stable-leader-rescue','stable Quick Blader with repeated OCR-zero artifact and cost-1 template support must be rescued');
assert.equal(realQbLateDecision.recognized.quickBlader?.count,1);
assert.equal(realQbLateDecision.recognized.quickBlader?.stableLeader?.groups?.[0]?.templateMedian,.9439);

const zetaFalseStable=[.6659,.6661,.6673,.6700].map((score,i)=>({sampleTime:i,counts:{},scores:{},candidates:[stableLeaderCandidate('zetaBeatrix',score,0,{source:'title'})]}));
assert.equal(H.decideHandSamples(zetaFalseStable).recognized.zetaBeatrix,undefined,'stable but weak/non-anchor Zeta lookalike must not pass rescue');

const qbWrongCostStable=[.889,.889,.889,.889].map((score,i)=>({sampleTime:i,counts:{},scores:{},candidates:[stableLeaderCandidate('quickBlader',score,1,{templateValue:7,templateScore:.99,templateAccepted:true,ocrValue:7,ocrAccepted:true})]}));
assert.equal(H.decideHandSamples(qbWrongCostStable).recognized.quickBlader,undefined,'stable Quick Blader lookalike with strong wrong-cost evidence must not pass rescue');

const zetaThreeFrames=[.858,.859,.8585].map((score,i)=>({sampleTime:i,counts:{},scores:{},candidates:[stableLeaderCandidate('zetaBeatrix',score,4)]}));
assert.equal(H.decideHandSamples(zetaThreeFrames).recognized.zetaBeatrix,undefined,'stable-leader rescue must require four frames');

const zetaDrawSettling=[.3945,.765,.8578,.8642].map((score,i)=>({sampleTime:[36.627,36.667,36.707,36.747][i],candidates:[{index:4,best:{cardId:'zetaBeatrix',imageScore:score}}]}));
const zetaTrend=H.settlingRecognitionTrend(zetaDrawSettling);
assert.equal(zetaTrend?.cardId,'zetaBeatrix','rising Zeta draw animation must trigger a guarded forward-settle retry');
assert.equal(zetaTrend?.slot,4,'draw-settle trend must stay bound to the same hand slot');
assert.ok(zetaTrend?.latest>=.864&&zetaTrend?.gain>.4,'Zeta settling trend must preserve observed score rise');
const zetaNearThreshold=realZetaEightScores.map((score,i)=>({sampleTime:131.776+i*.04,candidates:[{index:7,best:{cardId:'zetaBeatrix',imageScore:score,imageSource:'anchor',titleScore:realZetaEightTitles[i],anchorScore:score}}]}));
const zetaNearThresholdTrend=H.nearThresholdSettlingTrend(zetaNearThreshold);
assert.equal(zetaNearThresholdTrend?.cardId,'zetaBeatrix','real eight-card Zeta near-threshold sequence must be visible to diagnostic settling analysis');
assert.equal(zetaNearThresholdTrend?.slot,7);
assert.equal(zetaNearThresholdTrend?.latest,.8905);
assert.equal(zetaNearThresholdTrend?.gap,.0095);
assert.equal(zetaNearThresholdTrend?.gain,.0264);
assert.equal(zetaNearThresholdTrend?.anchorLed,true);
const nearFlat=[.886,.887,.8875,.888].map((score,i)=>({sampleTime:i,candidates:[{index:7,best:{cardId:'zetaBeatrix',imageScore:score,imageSource:'anchor',titleScore:.51,anchorScore:score}}]}));
assert.equal(H.nearThresholdSettlingTrend(nearFlat),null,'flat near-threshold evidence must not trigger diagnostic settling');
const nearTooLow=[.84,.85,.87,.8849].map((score,i)=>({sampleTime:i,candidates:[{index:7,best:{cardId:'zetaBeatrix',imageScore:score,imageSource:'anchor',titleScore:.51,anchorScore:score}}]}));
assert.equal(H.nearThresholdSettlingTrend(nearTooLow),null,'scores below candidateThreshold-.015 must not trigger near-threshold diagnostic');
const nearTitleLed=[.864,.872,.886,.890].map((score,i)=>({sampleTime:i,candidates:[{index:7,best:{cardId:'zetaBeatrix',imageScore:score,imageSource:'title',titleScore:score,anchorScore:.82}}]}));
assert.equal(H.nearThresholdSettlingTrend(nearTitleLed),null,'near-threshold diagnostic must require anchor-led trailing evidence');
const nearAlreadyCandidate=[.87,.88,.895,.905].map((score,i)=>({sampleTime:i,candidates:[{index:7,best:{cardId:'zetaBeatrix',imageScore:score,imageSource:'anchor',titleScore:.52,anchorScore:score}}]}));
assert.equal(H.nearThresholdSettlingTrend(nearAlreadyCandidate),null,'ordinary image candidates at or above candidate threshold do not need near-threshold diagnostic');
const nearDrop=[.86,.892,.887,.890].map((score,i)=>({sampleTime:i,candidates:[{index:7,best:{cardId:'zetaBeatrix',imageScore:score,imageSource:'anchor',titleScore:.52,anchorScore:score}}]}));
assert.equal(H.nearThresholdSettlingTrend(nearDrop),null,'a trailing drop larger than .003 must veto near-threshold diagnostic');
const historicalNearThresholdCases=[
  {label:'qb-unstable-81.575',cardId:'quickBlader',slot:2,scores:[.8169,.8962,.9118,.8957],expected:false},
  {label:'qb-flat-82.395',cardId:'quickBlader',slot:2,scores:[.8907,.8914,.8910,.8940],expected:false},
  {label:'qb-falling-81.619',cardId:'quickBlader',slot:2,scores:[.8960,.9118,.8957,.8937],expected:false},
  {label:'qb-flat-81.877',cardId:'quickBlader',slot:2,scores:[.8908,.8915,.8907,.8914],expected:false},
  {label:'qb-flat-81.906',cardId:'quickBlader',slot:2,scores:[.8909,.8907,.8914,.8911],expected:false},
  {label:'qb-flat-81.926',cardId:'quickBlader',slot:2,scores:[.8915,.8907,.8911,.8910],expected:false},
  {label:'qb-flat-81.916',cardId:'quickBlader',slot:2,scores:[.8909,.8907,.8914,.8910],expected:false},
  {label:'qb-flat-81.790',cardId:'quickBlader',slot:2,scores:[.8948,.8919,.8908,.8909],expected:false},
  {label:'qb-flat-81.816',cardId:'quickBlader',slot:2,scores:[.8919,.8923,.8909,.8907],expected:false},
  {label:'zeta-rising-131.896',cardId:'zetaBeatrix',slot:7,scores:[.8647,.8641,.8899,.8905],expected:true}
];
for(const c of historicalNearThresholdCases){
  const samples=c.scores.map((score,i)=>({sampleTime:i*.04,candidates:[{index:c.slot,best:{cardId:c.cardId,imageScore:score,imageSource:'anchor',titleScore:c.cardId==='zetaBeatrix'?[.4849,.5053,.5277,.5306][i]:.31,anchorScore:score}}]}));
  const trend=H.nearThresholdSettlingTrend(samples);
  assert.equal(!!trend,c.expected,`historical near-threshold case ${c.label}`);
  if(c.expected){assert.equal(trend.cardId,c.cardId);assert.equal(trend.slot,c.slot)}
}
const counterfactualStable=H.counterfactualRecognitionSummary({recognized:{zetaBeatrix:{count:1,confidence:.931,decision:'stable-consensus'}}},'zetaBeatrix');
assert.equal(counterfactualStable.recognized,true);
assert.equal(counterfactualStable.ordinaryPass,true,'stable consensus in the later same-layout window must count as an ordinary counterfactual pass');
assert.equal(counterfactualStable.usedSpecialRescue,false);
const counterfactualTemporal=H.counterfactualRecognitionSummary({recognized:{zetaBeatrix:{count:1,confidence:.925,decision:'temporal-slot-consensus'}}},'zetaBeatrix');
assert.equal(counterfactualTemporal.ordinaryPass,true,'generic temporal consensus remains an ordinary counterfactual path');
const counterfactualEightCardRescue=H.counterfactualRecognitionSummary({recognized:{zetaBeatrix:{count:1,confidence:.8905,decision:'temporal-stable-leader-rescue'}}},'zetaBeatrix');
assert.equal(counterfactualEightCardRescue.recognized,true);
assert.equal(counterfactualEightCardRescue.ordinaryPass,false,'card-specific stable-leader rescue must not be counted as proof that later frames pass ordinary recognition');
assert.equal(counterfactualEightCardRescue.usedSpecialRescue,true);
const counterfactualMiss=H.counterfactualRecognitionSummary({recognized:{quickBlader:{count:1,confidence:.96,decision:'stable-consensus'}}},'zetaBeatrix');
assert.equal(counterfactualMiss.recognized,false,'unrelated cards in the future window must not count for the target counterfactual');
assert.equal(counterfactualMiss.ordinaryPass,false);
const flatSettling=[.85,.848,.852,.849].map((score,i)=>({sampleTime:i,candidates:[{index:4,best:{cardId:'zetaBeatrix',imageScore:score}}]}));
assert.equal(H.settlingRecognitionTrend(flatSettling),null,'flat sub-threshold similarity must not trigger forward-settle retry');
const fallingSettling=[.88,.87,.85,.84].map((score,i)=>({sampleTime:i,candidates:[{index:4,best:{cardId:'zetaBeatrix',imageScore:score}}]}));
assert.equal(H.settlingRecognitionTrend(fallingSettling),null,'falling similarity must not trigger forward-settle retry');
const splitSlotSettling=[
 {sampleTime:0,candidates:[{index:2,best:{cardId:'zetaBeatrix',imageScore:.70}}]},
 {sampleTime:.04,candidates:[{index:3,best:{cardId:'zetaBeatrix',imageScore:.80}}]},
 {sampleTime:.08,candidates:[{index:4,best:{cardId:'zetaBeatrix',imageScore:.865}}]}
];
assert.equal(H.settlingRecognitionTrend(splitSlotSettling),null,'scores from different hand slots must never be combined into a false rising trend');
const settleCurrent={known:true,recognized:{barbaros:{cardId:'barbaros',label:'バルバロス',known:true,count:1,confidence:.92}},unresolved:{zetaBeatrix:{cardId:'zetaBeatrix',known:false,count:null}},samples:[]};
const settleRetry={known:true,recognized:{zetaBeatrix:{cardId:'zetaBeatrix',label:'ゼタ＆ベアトリクス',known:true,count:1,confidence:.94,decision:'stable-consensus'},quickBlader:{cardId:'quickBlader',label:'刹那のクイックブレイダー',known:true,count:1,confidence:.95,decision:'stable-consensus'}},unresolved:{barbaros:{cardId:'barbaros',known:false,count:null}},samples:[]};
const settleMerged=H.mergeForwardSettleRecognition(settleCurrent,settleRetry,'zetaBeatrix',{windowStart:36.792,windowEnd:36.912,candidateCount:5});
assert.equal(settleMerged.applied,true,'ordinary retry recognition should be mergeable into current hand');
assert.equal(settleMerged.decision.recognized.barbaros?.count,1,'existing current-hand positives must survive draw-settle retry');
assert.equal(settleMerged.decision.recognized.zetaBeatrix?.count,1,'newly settled Zeta must be promoted only after ordinary recognition passes');
assert.equal(settleMerged.decision.recognized.quickBlader,undefined,'draw-settle retry must not promote unrelated cards observed only in the retry window');
assert.equal(settleMerged.decision.recognized.zetaBeatrix?.settle?.mode,'own-turn-draw-settle');
assert.equal(settleMerged.decision.unresolved.zetaBeatrix,undefined);
// Real 30.005/30.071s turn-start draw transition: an older stable five-card
// backscan must not outrank the visibly different current hand layout.
const timingOldStable=[29.405,29.445,29.485,29.525].map(t=>mkLayout(t,[708,770,835,895,959]));
const timingOldSelected=H.chooseStableHandWindow(timingOldStable,4,4,1200);
const timingAnchor30005=mkLayout(30.005,[708,757,811,858,908,958]);
const timingAdjacentNoise=mkLayout(29.565,[708,757,811,858,908,958]);
assert.equal(H.currentAnchorNeedsForwardSettle(timingOldSelected,timingAdjacentNoise,1200),false,'one adjacent noisy frame must not displace a fresh stable window');
assert.equal(H.currentAnchorNeedsForwardSettle(timingOldSelected,timingAnchor30005,1200),true,'30.005 current six-card layout must reject the stale five-card backscan');
assert.equal(H.config.forwardSettleScan,.32,'forward settle must cover the observed 30.005 -> 30.289 reflow while remaining layout-guarded');
const timingForward30005=[
  mkLayout(30.05,[708,759,813,862,914]),
  mkLayout(30.09,[708,757,811,858,908]),
  mkLayout(30.13,[708,757,811,858,908,954]),
  mkLayout(30.17,[708,757,811,858,908,959]),
  mkLayout(30.21,[708,757,811,858,908,959]),
  mkLayout(30.25,[708,757,811,858,908,959]),
  mkLayout(30.29,[708,757,811,858,908,959])
];
const timingRecovered30005=H.chooseForwardSettleHandWindow(timingForward30005,timingAnchor30005,4,1200);
assert.ok(timingRecovered30005&&timingRecovered30005.candidateCount===6,'30.005 transient must settle to the current six-card hand');
const timingAnchor30071=mkLayout(30.071,[708,757,811,858,908]);
assert.equal(H.currentAnchorNeedsForwardSettle(timingOldSelected,timingAnchor30071,1200),true,'30.071 reflowed five-card anchor must not reuse the geometrically different old five-card hand');
const timingForward30071=[
  mkLayout(30.116,[708,757,811,858,908]),
  mkLayout(30.156,[708,757,811,858,908,959]),
  mkLayout(30.196,[708,757,811,858,908,959]),
  mkLayout(30.236,[708,757,811,858,908,959]),
  mkLayout(30.276,[708,757,811,858,908,959])
];
assert.ok(H.chooseForwardSettleHandWindow(timingForward30071,timingAnchor30071,4,1200),'30.071 partial current layout must be allowed to settle into the six-card current hand');

const settleAnchor={sampleTime:36.747,centers:[{cx:708},{cx:766},{cx:829},{cx:893},{cx:959}]};
const sameLayoutForward=[36.792,36.832,36.872,36.912].map(t=>({sampleTime:t,centers:[{cx:708},{cx:766},{cx:829},{cx:893},{cx:959}]}));
const sameLayoutWindow=H.chooseSameLayoutForwardSettleHandWindow(sameLayoutForward,settleAnchor,4,1200);
assert.ok(sameLayoutWindow&&sameLayoutWindow.candidateCount===5,'draw-settle retry must accept only a stable same-count hand layout');
const zetaCounterfactualAnchor1112=mkLayout(131.896,[650,683,718,755,781,818,855,889]);
const zetaCounterfactualForward1112=[
  mkLayout(131.941,[650,687,720,756,781,818,889]),
  mkLayout(131.981,[650,683,718,756,781,818,855,889]),
  mkLayout(132.021,[650,683,719,756,782,818,856,889]),
  mkLayout(132.061,[650,687,720,756,782,818,856,889]),
  mkLayout(132.101,[650,686,720,755,786,818,856,888])
];
assert.equal(H.layoutsCompatible(zetaCounterfactualAnchor1112,zetaCounterfactualForward1112[0],1112),false,'first +45ms compressed-video frame is a transient seven-center layout and must not anchor the counterfactual');
const zetaCounterfactualWindow1112=H.chooseSameLayoutForwardSettleHandWindow(zetaCounterfactualForward1112,zetaCounterfactualAnchor1112,4,1112);
assert.ok(zetaCounterfactualWindow1112,'counterfactual scan must recover a later stable window after the transient first frame');
assert.equal(zetaCounterfactualWindow1112.candidateCount,8,'real-video-derived Zeta counterfactual must retain the eight-card hand');
assert.equal(zetaCounterfactualWindow1112.frames.length,4);
assert.ok(zetaCounterfactualWindow1112.frames.every(x=>(x.centers||[]).length===8),'selected counterfactual frames must all be the stable eight-card layout');
assert.ok(zetaCounterfactualWindow1112.frames.every(x=>H.layoutsCompatible(zetaCounterfactualAnchor1112,x,1112)),'selected future frames must remain geometrically compatible with the 131.896 anchor hand');

const extraCardForward=[36.792,36.832,36.872,36.912].map(t=>({sampleTime:t,centers:[{cx:680},{cx:735},{cx:790},{cx:845},{cx:900},{cx:955}]}));
assert.equal(H.chooseSameLayoutForwardSettleHandWindow(extraCardForward,settleAnchor,4,1200),null,'draw-settle retry must reject a forward window where hand count changed');

const settleNoPass=H.mergeForwardSettleRecognition(settleCurrent,{known:false,recognized:{},unresolved:{zetaBeatrix:{known:false,count:null}},samples:[]},'zetaBeatrix',{});
assert.equal(settleNoPass.applied,false,'forward-settle retry must not lower thresholds or promote unresolved cards');

console.log('CARD DB + HAND RECOGNITION REGRESSION PASS');

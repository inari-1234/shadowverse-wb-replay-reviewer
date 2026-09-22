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
new vm.Script(fs.readFileSync(new URL('../hand-recognition.js',import.meta.url),'utf8')).runInContext(sandbox);

const H=WB.HandRecognition;
assert.equal(H.version,expectedHandVersion);
const liveMeta=H.displayedCostMeta();
assert.deepEqual(Array.from(liveMeta.templateValues),[1,7],'live displayed-cost templates must remain limited to verified values 1 and 7');
const diagMeta=H.displayedCostDiagnosticMeta();
assert.equal(diagMeta.diagnosticOnly,true);
assert.equal(diagMeta.applied,false);
assert.deepEqual(Array.from(diagMeta.templateValues),[6]);
assert.equal(diagMeta.templates[0].value,6);
assert.equal(diagMeta.templates[0].threshold,.98);
assert.equal(diagMeta.templates[0].profiles,3);

const profile=H.displayedCostDiagnosticProfiles(6)[0];
const probe=H.matchDisplayedCostDiagnosticFeatures([{dx:0,feature:profile}],6);
assert.equal(probe.diagnosticOnly,true);
assert.equal(probe.applied,false);
assert.equal(probe.value,6);
assert.equal(probe.score,1);
assert.equal(probe.threshold,.98);
assert.equal(probe.reachesThreshold,true);
assert.equal(probe.centerDx,0);
assert.equal(probe.profileIndex,0);
assert.equal(typeof probe.source,'string');

const liveResolution=H.resolveDisplayedCost(
  {accepted:true,value:3,reads:[{value:3,confidence:70}]},
  {accepted:false,value:7,score:.68,threshold:.98}
);
assert.equal(liveResolution.value,3,'diagnostic 6 probe must not affect the live displayed-cost resolver');
assert.equal(liveResolution.source,'ocr');

console.log('DISPLAYED COST 6 DIAGNOSTIC REGRESSION PASS');

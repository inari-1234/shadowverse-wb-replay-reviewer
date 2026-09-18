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

const profiles=DB.recognitionProfiles('quickBlader');
assert.equal(profiles.length,4);
for(const p of profiles)assert.equal(p.length,576);
const self=H.matchFeature(profiles[0])[0];
assert.equal(self.cardId,'quickBlader');
assert.ok(self.best>.999);

let d=H.decideHandSamples([
  {counts:{quickBlader:1},scores:{quickBlader:[.91]}},
  {counts:{quickBlader:1},scores:{quickBlader:[.88]}}
]);
assert.equal(d.recognized.quickBlader.count,1);
assert.equal(d.recognized.quickBlader.known,true);
assert.equal(d.recognized.quickBlader.confidence,.88);

d=H.decideHandSamples([{counts:{quickBlader:1},scores:{quickBlader:[.91]}}]);
assert.equal(d.recognized.quickBlader,undefined);
assert.equal(d.unresolved.quickBlader.known,false);

d=H.decideHandSamples([{counts:{},scores:{}},{counts:{},scores:{}}]);
assert.equal(d.recognized.quickBlader,undefined);
assert.equal(d.unresolved.quickBlader.reason,'no-positive-match');

d=H.decideHandSamples([
  {counts:{quickBlader:2},scores:{quickBlader:[.93,.90]}},
  {counts:{quickBlader:1},scores:{quickBlader:[.89]}}
]);
assert.equal(d.recognized.quickBlader.count,1,'count is conservative when frames disagree');

console.log('CARD DB + HAND RECOGNITION REGRESSION PASS');

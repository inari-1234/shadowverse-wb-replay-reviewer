import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const WB={
  registerModule(){},onReady(){},playOrder:()=> '先攻',targetSide:()=> 'bottom',
  video:null,turnTimeline:[],log(){},on(){},$(){return null},frameCanvas(){return null},
  videoKey:()=> 'test',currentTurnContext:()=>({})
};
const sandbox={window:{WB},document:{createElement(){return {getContext(){return {}}}}},console,performance:{now:()=>0},setTimeout,clearTimeout,Uint8Array,Uint32Array};
vm.createContext(sandbox);
new vm.Script(fs.readFileSync(new URL('../state-recognition.js',import.meta.url),'utf8')).runInContext(sandbox);
const S=WB.StateRecognition;

const zero=[0,.25,.5].map(offset=>({badgeCount:0,readable:true,values:[],candidateTotal:0,offset}));
let d=S.decideBoardSamples(zero,{nearOwnStart:true});
assert.equal(d.accepted,true);
assert.equal(d.known,true);
assert.equal(d.value,0);
assert.equal(d.faceDamageConfirmed,true);

d=S.decideBoardSamples([zero[0]],{nearOwnStart:false});
assert.equal(d.accepted,false);
assert.equal(d.known,false);
assert.equal(d.reason,'direct-zero-not-safe');

const positive=[
 {badgeCount:2,readable:true,values:[1,1],candidateTotal:2,offset:0},
 {badgeCount:0,readable:true,values:[],candidateTotal:0,offset:.25},
 {badgeCount:2,readable:true,values:[1,1],candidateTotal:2,offset:.5}
];
d=S.decideBoardSamples(positive,{nearOwnStart:true});
assert.equal(d.accepted,false);
assert.equal(d.known,false);
assert.equal(d.candidateStable,true);
assert.equal(d.candidateTotal,2);
assert.equal(d.faceDamageConfirmed,false);

const conflict=[
 {badgeCount:1,readable:true,values:[1],candidateTotal:1,offset:0},
 {badgeCount:1,readable:true,values:[1],candidateTotal:1,offset:.25},
 {badgeCount:1,readable:true,values:[2],candidateTotal:2,offset:.5},
 {badgeCount:1,readable:true,values:[2],candidateTotal:2,offset:.75}
];
d=S.decideBoardSamples(conflict,{nearOwnStart:true});
assert.equal(d.accepted,false);
assert.equal(d.known,false);
assert.equal(d.reason,'board-attack-pattern-conflict');

assert.equal(S.parseAttack('1'),1);
assert.equal(S.parseAttack(' 9\n'),9);
assert.equal(S.parseAttack('30'),30);
assert.equal(S.parseAttack('31'),null);
assert.equal(S.parseAttack('x'),null);

console.log('BOARD OBSERVATION REGRESSION PASS');

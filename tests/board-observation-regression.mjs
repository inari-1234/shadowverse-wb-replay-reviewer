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

assert.equal(S.classifyFaceAttackGlowScore(.08).state,'face');
assert.equal(S.classifyFaceAttackGlowScore(.02).state,'no-face');
assert.equal(S.classifyFaceAttackGlowScore(.042).state,'unknown');

const directFace=[
 {badgeCount:2,readable:true,values:[1,1],candidateTotal:2,faceDamageConfirmed:true,value:1,offset:0},
 {badgeCount:2,readable:true,values:[1,1],candidateTotal:2,faceDamageConfirmed:true,value:1,offset:.15}
];
let fd=S.decideBoardSamples(directFace,{nearOwnStart:false});
assert.equal(fd.accepted,true);
assert.equal(fd.value,1);
assert.equal(fd.reason,'direct-face-attack-glow-consensus');

const oneDirectFace=[directFace[0]];
fd=S.decideBoardSamples(oneDirectFace,{nearOwnStart:false});
assert.equal(fd.accepted,false,'one direct glow frame must not be enough');

const directNoFace=[
 {badgeCount:2,readable:true,values:[1,1],candidateTotal:2,faceDamageConfirmed:true,value:0,offset:0},
 {badgeCount:2,readable:true,values:[1,1],candidateTotal:2,faceDamageConfirmed:true,value:0,offset:.15}
];
fd=S.decideBoardSamples(directNoFace,{nearOwnStart:false});
assert.equal(fd.accepted,true);
assert.equal(fd.value,0);

const startFace=[
 {badgeCount:2,readable:true,values:[1,1],candidateTotal:2,faceDamageConfirmed:true,value:2,offset:.25},
 {badgeCount:2,readable:true,values:[1,1],candidateTotal:2,faceDamageConfirmed:true,value:2,offset:.50}
];
fd=S.decideBoardSamples(startFace,{nearOwnStart:true});
assert.equal(fd.accepted,true);
assert.equal(fd.value,2);
assert.equal(fd.reason,'turn-start-face-attack-glow-consensus');


const zero=[0,.25,.5].map(offset=>({badgeCount:0,readable:true,values:[],candidateTotal:0,offset}));
let d=S.decideBoardSamples(zero,{nearOwnStart:true});
assert.equal(d.accepted,true);
assert.equal(d.known,true);
assert.equal(d.value,0);
assert.equal(d.faceDamageConfirmed,true);

d=S.decideBoardSamples([zero[0]],{nearOwnStart:false});
assert.equal(d.accepted,false);
assert.equal(d.known,false);
assert.equal(d.reason,'direct-empty-board-insufficient-consensus');

const oneFrame=[{badgeCount:1,readable:true,values:[1],candidateTotal:1,offset:0}];
d=S.decideBoardSamples(oneFrame,{nearOwnStart:true});
assert.equal(d.candidateStable,false,'one-frame candidate must not be surfaced as stable');
assert.equal(d.accepted,false);

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

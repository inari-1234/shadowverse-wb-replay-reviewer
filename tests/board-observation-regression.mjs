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
assert.deepEqual(Array.from(S.config.board.directOffsets),[0,-.04,-.08,-.12],'direct board capture must look backward from the requested state, never into future actions');

assert.equal(S.classifyAttackableRingStats({frac:.18,sectors:[.25,.22,.10,.08]}).state,'attackable');
assert.equal(S.classifyAttackableRingStats({frac:.11,sectors:[.20,.15,.02,.01]}).state,'unknown');
assert.equal(S.classifyAttackableRingStats({frac:.01,sectors:[0,0,0,0]}).state,'not-attackable');

const follower=(attackValue,state,position=0)=>({
  attackValue,
  attackReadable:true,
  attackable:state==='attackable'?true:state==='not-attackable'?false:null,
  attackableEvidence:{state,ringFraction:state==='attackable'?.18:state==='not-attackable'?.01:.07,ringSectors:state==='attackable'?[.2,.18,.12,.1]:state==='not-attackable'?[0,0,0,0]:[.08,.06,.04,.03]},
  position:{attackBadgeCx:.40+position*.10,attackBadgeCy:.624,followerCx:.4325+position*.10,followerCy:.524}
});
const sample=(values,states,offset,{layoutKey='35:52|43:52',ocrIndependent=true}={})=>({
  badgeCount:values.length,readable:true,values:[...values],candidateTotal:values.reduce((a,b)=>a+b,0),
  layoutKey,ocrIndependent,offset,sampleTime:28.221+offset,
  followers:values.map((v,i)=>follower(v,states[i],i))
});

let d=S.decideBoardSamples([
  sample([1,1],['attackable','not-attackable'],0),
  sample([1,1],['attackable','not-attackable'],.25),
  sample([1,1],['attackable','not-attackable'],.50,{ocrIndependent:false}),
  sample([1,1],['attackable','not-attackable'],.75,{ocrIndependent:false})
],{nearOwnStart:false});
assert.equal(d.accepted,true);
assert.equal(d.known,true);
assert.equal(d.value,1);
assert.equal(d.attackableTotal,1);
assert.equal(d.followers.length,2);
assert.equal(d.followers[0].attackValue,1);
assert.equal(d.followers[0].attackReadable,true);
assert.equal(d.followers[0].attackable,true);
assert.equal(d.followers[1].attackable,false);
assert.ok(d.followers[0].attackableEvidence);
assert.ok(d.followers[0].position);
assert.equal(d.boardAttackTotalConfirmed,true);

// Real 2T-style settle: the attack ring can appear late under the YOUR TURN animation.
// Early absence must not be accepted as 0 before the full settle window completes.
d=S.decideBoardSamples([
  sample([1,1],['not-attackable','not-attackable'],0),
  sample([1,1],['not-attackable','not-attackable'],.25),
  sample([1,1],['not-attackable','not-attackable'],.50,{ocrIndependent:false}),
  sample([1,1],['attackable','not-attackable'],.75,{ocrIndependent:false}),
  sample([1,1],['attackable','not-attackable'],1.00,{ocrIndependent:false})
],{nearOwnStart:false});
assert.equal(d.accepted,true);
assert.equal(d.value,1);
assert.equal(d.followers[0].attackable,true);
assert.equal(d.followers[1].attackable,false);

d=S.decideBoardSamples([
  sample([1,1],['not-attackable','not-attackable'],0),
  sample([1,1],['not-attackable','not-attackable'],.25),
  sample([1,1],['not-attackable','not-attackable'],.50,{ocrIndependent:false}),
  sample([1,1],['attackable','not-attackable'],.75,{ocrIndependent:false}),
  sample([1,1],['not-attackable','not-attackable'],1.00,{ocrIndependent:false})
],{nearOwnStart:false});
assert.equal(d.accepted,false,'a single transient ring frame must stay unresolved');

d=S.decideBoardSamples([
  sample([1,1],['attackable','attackable'],0),
  sample([1,1],['attackable','attackable'],.25)
],{nearOwnStart:false});
assert.equal(d.accepted,true);
assert.equal(d.value,2);

d=S.decideBoardSamples([
  sample([1,1],['not-attackable','attackable'],0),
  sample([1,1],['not-attackable','attackable'],.25),
  sample([1,1],['not-attackable','attackable'],.50,{ocrIndependent:false}),
  sample([1,1],['not-attackable','attackable'],.75,{ocrIndependent:false})
],{nearOwnStart:false});
assert.equal(d.accepted,true);
assert.equal(d.value,1);

d=S.decideBoardSamples([
  sample([1],['not-attackable'],0,{layoutKey:'35:52'}),
  sample([1],['not-attackable'],.25,{layoutKey:'35:52'}),
  sample([1],['not-attackable'],.50,{layoutKey:'35:52',ocrIndependent:false}),
  sample([1],['not-attackable'],.75,{layoutKey:'35:52',ocrIndependent:false})
],{nearOwnStart:false});
assert.equal(d.accepted,true);
assert.equal(d.value,0);
assert.equal(d.reason,'board-no-attackable-followers-confirmed');

d=S.decideBoardSamples([
  sample([1,1],['attackable','unknown'],0),
  sample([1,1],['attackable','unknown'],.25),
  sample([1,1],['attackable','unknown'],.50,{ocrIndependent:false}),
  sample([1,1],['attackable','unknown'],.75,{ocrIndependent:false})
],{nearOwnStart:false});
assert.equal(d.accepted,false);
assert.equal(d.known,false);
assert.equal(d.candidateStable,true);
assert.equal(d.reason,'board-attackability-unresolved');

const zero=[0,.25,.5,.75].map(offset=>({
  badgeCount:0,readable:true,values:[],candidateTotal:0,offset,sampleTime:87.5+offset,
  layoutKey:'',ocrIndependent:false,followers:[]
}));
d=S.decideBoardSamples(zero,{nearOwnStart:false});
assert.equal(d.accepted,true);
assert.equal(d.known,true);
assert.equal(d.value,0);
assert.equal(d.faceDamageConfirmed,true);

const oneFrame=[sample([1],['attackable'],0,{layoutKey:'35:52'})];
d=S.decideBoardSamples(oneFrame,{nearOwnStart:false});
assert.equal(d.candidateStable,false);
assert.equal(d.accepted,false);

const conflict=[
 sample([1],['attackable'],0,{layoutKey:'35:52'}),
 sample([1],['attackable'],.25,{layoutKey:'35:52'}),
 sample([2],['attackable'],.5,{layoutKey:'36:52'}),
 sample([2],['attackable'],.75,{layoutKey:'36:52'})
];
d=S.decideBoardSamples(conflict,{nearOwnStart:false});
assert.equal(d.accepted,false);
assert.equal(d.known,false);
assert.equal(d.reason,'board-attack-pattern-conflict');


// Real 30.227s failure shape: looking forward mixes the requested 2-damage state
// with later action/transition frames and must remain unresolved.
d=S.decideBoardSamples([
  sample([1,1],['attackable','attackable'],0),
  sample([1],['attackable'],.25,{layoutKey:'43:52'}),
  sample([1,1],['not-attackable','not-attackable'],.50),
  sample([1,1],['not-attackable','not-attackable'],.75,{ocrIndependent:false}),
  sample([1,1],['not-attackable','not-attackable'],1.00,{ocrIndependent:false})
],{nearOwnStart:false});
assert.equal(d.accepted,false,'future action frames must not be allowed to redefine the requested current board state');

// clean-13.25+ direct mode uses a tight backward window around the requested instant.
// Two independent reads establish [1,1], while propagated reads only stabilize attackability.
d=S.decideBoardSamples([
  sample([1,1],['attackable','attackable'],0),
  sample([1,1],['attackable','attackable'],-.04),
  sample([1,1],['attackable','attackable'],-.08,{ocrIndependent:false}),
  sample([1,1],['attackable','attackable'],-.12,{ocrIndependent:false})
],{nearOwnStart:false});
assert.equal(d.accepted,true);
assert.equal(d.value,2);
assert.equal(d.reason,'board-attackable-total-confirmed');
assert.equal(d.followers.every(x=>x.attackable===true),true);

// Real 30.005-30.071s timing sensitivity: the turn starts at 29.337s,
// but attack rings settle only around 30.2s. Early-turn sampling may look forward
// only inside the guarded turn-start window and must require two positive ring frames.
assert.equal(S.config.board.turnStartNear,.85,'turn-start board settle guard must cover the observed ~0.73s UI delay without reaching the 30.227s direct-state regression');
assert.deepEqual(Array.from(S.config.board.turnStartOffsets),[0,.04,.08,.12,.16,.20,.24]);
d=S.decideBoardSamples([
  sample([1,1],['not-attackable','not-attackable'],0),
  sample([1,1],['not-attackable','not-attackable'],.04),
  sample([1,1],['not-attackable','not-attackable'],.08,{ocrIndependent:false}),
  sample([1,1],['unknown','unknown'],.12,{ocrIndependent:false}),
  sample([1,1],['attackable','attackable'],.16,{ocrIndependent:false}),
  sample([1,1],['attackable','attackable'],.20,{ocrIndependent:false}),
  sample([1,1],['attackable','attackable'],.24,{ocrIndependent:false})
],{nearOwnStart:true});
assert.equal(d.accepted,true,'turn-start UI settle must recover the attackable board without requiring repeated user captures');
assert.equal(d.value,2);
assert.equal(d.reason,'board-attackable-total-confirmed');
assert.equal(S.boardSettleLayoutConflict(d.samples),false,'same board layout across the settle window must remain eligible');
assert.equal(S.boardSettleLayoutConflict([
  sample([1,1],['not-attackable','not-attackable'],0,{layoutKey:'35:52|43:52'}),
  sample([1],['attackable'],.16,{layoutKey:'43:52'})
]),true,'a board layout change inside the forward settle window must be treated as an action/transition boundary');

assert.equal(S.parseAttack('1'),1);
assert.equal(S.parseAttack(' 9\n'),9);
assert.equal(S.parseAttack('30'),30);
assert.equal(S.parseAttack('31'),null);
assert.equal(S.parseAttack('x'),null);

console.log('BOARD ATTACKABILITY REGRESSION PASS');

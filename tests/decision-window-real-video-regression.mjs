import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

// Compact fixture extracted from:
// shadowverse-wb-diagnostic-v4.13.84-2026-09-27T0030.json
// Source video: ScreenRecording_09-24-2026 05-00-39_1.mov
// Baseline session: 43 states / 27 actions / 17 observedEpisodes / 6 observation ReviewPoints.
const source=fs.readFileSync(new URL('../replay-session.js',import.meta.url),'utf8');
const WB={
  videoMeta:{name:'ScreenRecording_09-24-2026 05-00-39_1.mov',size:232602892,lastModified:1790193639000,type:'video/quicktime'},
  turnTimeline:[],mulligan:null,classDetection:null,scenes:[],
  registerModule(){},videoKey(){return 'real-video-phase15-fixture'},log(){},recordError(){},on(){},onReady(){},$(){return null},fmt:String,escape:String
};
const sandbox={window:{WB},console,structuredClone,setTimeout,clearTimeout,URL,Date,Promise};
vm.createContext(sandbox);
new vm.Script(source,{filename:'replay-session.js'}).runInContext(sandbox);
const R=WB.ReplaySession;

const state=(id,time,turn,over={})=>({
  id,time,turn,absoluteSide:'bottom',relativeSide:'自分',pp:0,opponentHP:20,
  resources:{extraPP:'unknown',ep:'yes',sep:'yes'},opponentWard:'unknown',
  boardDamage:0,boardDamageKnown:true,hand:{recognized:{}},partial:false,...over
});
const states=[
  state('st:5:bottom:44.941',44.941,5,{pp:2}),
  state('st:5:bottom:47.641',47.641,5,{pp:2,boardDamage:4}),
  state('st:5:bottom:48.091',48.091,5,{pp:1}),
  state('st:5:bottom:49.441',49.441,5,{opponentHP:20,resources:{extraPP:'unknown',ep:'unknown',sep:'no'},boardDamage:null,boardDamageKnown:false}),
  state('st:5:bottom:51.241',51.241,5,{opponentHP:16,resources:{extraPP:'unknown',ep:'yes',sep:'no'},boardDamage:null,boardDamageKnown:false}),
  state('st:6:bottom:63.820',63.820,6,{opponentHP:16,resources:{extraPP:'unknown',ep:'yes',sep:'unknown'},boardDamage:null,boardDamageKnown:false}),
  state('st:6:bottom:66.520',66.520,6,{opponentHP:11}),
  state('st:7:bottom:79.095',79.095,7,{pp:2,opponentHP:14}),
  state('st:7:bottom:81.795',81.795,7,{pp:2,opponentHP:12}),
  state('st:7:bottom:85.395',85.395,7,{pp:2,opponentHP:12}),
  state('st:7:bottom:88.095',88.095,7,{pp:2,opponentHP:10}),
  state('st:8:bottom:107.070',107.070,8,{opponentHP:10,boardDamage:null,boardDamageKnown:false}),
  state('st:8:bottom:110.220',110.220,8,{opponentHP:10,resources:{extraPP:'unknown',ep:'unknown',sep:'yes'},boardDamage:null,boardDamageKnown:false})
];
const act=(id,type,from,to,time,turn,data,confidence='observed')=>({id,type,fromStateId:from,toStateId:to,time,turn,confidence,data});
const actions=[
  act('st:5:bottom:44.941->st:5:bottom:47.641:board','board-damage-change','st:5:bottom:44.941','st:5:bottom:47.641',47.641,5,{from:0,to:4,delta:4}),
  act('st:5:bottom:47.641->st:5:bottom:48.091:pp','pp-change','st:5:bottom:47.641','st:5:bottom:48.091',48.091,5,{from:2,to:1,delta:-1}),
  act('st:5:bottom:47.641->st:5:bottom:48.091:board','board-damage-change','st:5:bottom:47.641','st:5:bottom:48.091',48.091,5,{from:4,to:0,delta:-4}),
  act('st:5:bottom:49.441->st:5:bottom:51.241:hp','opponent-hp-change','st:5:bottom:49.441','st:5:bottom:51.241',51.241,5,{from:20,to:16,delta:-4}),
  act('st:6:bottom:63.820->st:6:bottom:66.520:hp','opponent-hp-change','st:6:bottom:63.820','st:6:bottom:66.520',66.520,6,{from:16,to:11,delta:-5}),
  act('st:7:bottom:79.095->st:7:bottom:81.795:hp','opponent-hp-change','st:7:bottom:79.095','st:7:bottom:81.795',81.795,7,{from:14,to:12,delta:-2}),
  act('st:7:bottom:85.395->st:7:bottom:88.095:hp','opponent-hp-change','st:7:bottom:85.395','st:7:bottom:88.095',88.095,7,{from:12,to:10,delta:-2}),
  act('st:8:bottom:107.070->st:8:bottom:110.220:gap','observation-gap','st:8:bottom:107.070','st:8:bottom:110.220',110.220,8,{elapsedSeconds:3.1500000000000057})
];
const unresolved=['同一行動か','使用カード','効果源・ダメージ源','行動順'];
const episode=(from,to,time,turn,ids)=>({id:'oe:'+from+'->'+to,kind:'observed-episode',fromStateId:from,toStateId:to,time,turn,confidence:'observed',actionIds:ids,causalAttribution:false,unresolved});
const episodes=[
  episode('st:5:bottom:44.941','st:5:bottom:47.641',47.641,5,[actions[0].id]),
  episode('st:5:bottom:47.641','st:5:bottom:48.091',48.091,5,[actions[1].id,actions[2].id]),
  episode('st:5:bottom:49.441','st:5:bottom:51.241',51.241,5,[actions[3].id]),
  episode('st:6:bottom:63.820','st:6:bottom:66.520',66.520,6,[actions[4].id]),
  episode('st:7:bottom:79.095','st:7:bottom:81.795',81.795,7,[actions[5].id]),
  episode('st:7:bottom:85.395','st:7:bottom:88.095',88.095,7,[actions[6].id])
];
const reviewPoints=[
  {id:'rp:'+actions[0].id,source:'action',sourceId:actions[0].id,time:47.641,turn:5,priority:'medium',kind:'board-swing',title:'盤面打点の大きな変化',detail:'攻撃可能打点 0 → 4'},
  {id:'rp:'+actions[2].id,source:'action',sourceId:actions[2].id,time:48.091,turn:5,priority:'medium',kind:'board-swing',title:'盤面打点の大きな変化',detail:'攻撃可能打点 4 → 0'},
  {id:'rp:'+actions[3].id,source:'action',sourceId:actions[3].id,time:51.241,turn:5,priority:'high',kind:'large-hp-change',title:'大きなHP変化',detail:'相手HP 20 → 16'},
  {id:'rp:'+actions[4].id,source:'action',sourceId:actions[4].id,time:66.520,turn:6,priority:'high',kind:'large-hp-change',title:'大きなHP変化',detail:'相手HP 16 → 11'},
  {id:'rp:'+actions[5].id,source:'action',sourceId:actions[5].id,time:81.795,turn:7,priority:'high',kind:'large-hp-change',title:'大きなHP変化',detail:'相手HP 14 → 12'},
  {id:'rp:'+actions[6].id,source:'action',sourceId:actions[6].id,time:88.095,turn:7,priority:'high',kind:'large-hp-change',title:'大きなHP変化',detail:'相手HP 12 → 10'}
];

const windows=R.deriveDecisionWindows(reviewPoints,actions,episodes,states);
assert.equal(windows.length,6,'all six real-video ReviewPoints must retain a safe Decision Window');
assert.deepEqual(Array.from(windows.map(x=>[x.turn,+x.reviewStart.toFixed(3),+x.reviewEnd.toFixed(3)])),[
  [5,44.941,47.641],[5,47.641,48.091],[5,49.441,51.241],
  [6,63.820,66.520],[7,79.095,81.795],[7,85.395,88.095]
]);
assert.ok(windows.every(x=>x.reviewEnd-x.reviewStart<=3),'real-video Decision Windows must not cross the 3-second safety boundary');
assert.ok(windows.every(x=>x.causalAttribution===false),'real-video Decision Windows must remain non-causal');
assert.ok(windows.every(x=>x.beforeState&&x.afterState),'every real-video ReviewPoint must retain both observed endpoints');
assert.ok(windows.every(x=>x.relatedObservedEpisodeIds.length===1),'each real-video window must retain its observed episode');
assert.equal(windows[1].relatedActionIds.length,2,'47.641→48.091 must preserve both PP and board changes without claiming causality');

const enriched=R.attachDecisionWindows(reviewPoints,windows);
assert.equal(enriched.length,6,'ReviewPoint count must remain exactly six');
assert.ok(enriched.every(x=>x.decisionWindowId&&x.beforeState&&x.afterState));
assert.ok(enriched.every(x=>x.causalAttribution===false));

const gapPoint={id:'rp:'+actions[7].id,source:'action',sourceId:actions[7].id,time:110.220,turn:8,priority:'high',kind:'unsafe-gap-test'};
assert.equal(R.deriveDecisionWindows([gapPoint],actions,episodes,states).length,0,'107.070→110.220 (3.15s) observation-gap must never become a Decision Window');
assert.equal(actions.some(x=>x.type==='card-play'),false,'real-video fixture must not invent card-play');

console.log('REAL VIDEO DECISION WINDOW REGRESSION PASS');

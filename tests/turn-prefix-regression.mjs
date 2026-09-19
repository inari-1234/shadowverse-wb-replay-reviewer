import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const WB={
  registerModule(){}, onReady(){}, targetSide:()=> 'bottom',
  video:null, log(){}, setScanStatus(){}, setProgress(){},
  $(){return null;}, frameCanvas(){return null;}
};
const sandbox={window:{WB},document:{createElement(){throw new Error('not used')}},console,setTimeout,clearTimeout};
vm.createContext(sandbox);
new vm.Script(fs.readFileSync(new URL('../turn-recognition.js',import.meta.url),'utf8')).runInContext(sandbox);
const T=WB.TurnRecognition;
const stable=[
 {side:'top',turn:1,time:3.5,source:'stable13-turn-indicator'},
 {side:'bottom',turn:1,time:5.828,source:'stable13-turn-indicator'},
 {side:'top',turn:2,time:8.313,source:'stable13-turn-indicator'},
 {side:'bottom',turn:2,time:11.42,source:'stable13-turn-indicator'},
 {side:'top',turn:3,time:14.938,source:'stable13-turn-indicator'},
 {side:'bottom',turn:3,time:17.938,source:'stable13-turn-indicator'},
];
const quick=[
 {side:'bottom',start:6.5,last:7.5,count:2},
 {side:'top',start:8.5,last:10.5,count:3},
 {side:'bottom',start:12.5,last:14.5,count:3},
 {side:'top',start:15.5,last:17.5,count:3},
];
const a=T.stableAlignment(stable,quick);
assert.equal(JSON.stringify(a),JSON.stringify({offset:1,count:4}));
const tr=T.trimStablePrefix(stable,a);
assert.equal(tr.trimmed.length,1);
assert.equal(JSON.stringify(tr.shift),JSON.stringify({top:1,bottom:0}));
assert.equal(JSON.stringify(tr.timeline.slice(0,4).map(r=>[r.side,r.turn,r.time])),JSON.stringify([['bottom',1,5.828],['top',1,8.313],['bottom',2,11.42],['top',2,14.938]]));
assert.equal(tr.timeline[0].side,'bottom');
assert.equal(tr.timeline[0].side==='bottom'?'先攻':'後攻','先攻','trimmed long-video timeline must infer reviewed bottom side as first player');
assert.equal(T.prefixChecksAllowTrim([{hits:0},{hits:0}]),true);
assert.equal(T.prefixChecksAllowTrim([{hits:0},{hits:1}]),false);
assert.equal(T.prefixChecksAllowTrim([]),false);
const normal=[
 {side:'top',turn:1,time:14.5},{side:'bottom',turn:1,time:18.7},
 {side:'top',turn:2,time:21.2},{side:'bottom',turn:2,time:25.1}
];
const nquick=[{side:'top',start:15.5},{side:'bottom',start:19.5}];
const na=T.stableAlignment(normal,nquick);
assert.equal(JSON.stringify(na),JSON.stringify({offset:0,count:2}));
const twoOnly=T.stableAlignment(stable,[{side:'bottom',start:6.5},{side:'top',start:8.5}]);
assert.equal(twoOnly,null,'offset prefix trim must require at least three aligned validated segments');
const nr=T.trimStablePrefix(normal,na);
assert.equal(nr.timeline,normal);
console.log('TURN PREFIX REGRESSION PASS');

const diagnosticEarly=[
 {side:'top',start:1,last:1.5,count:2},
 {side:'bottom',start:15.5,last:18.5,count:6},
 {side:'top',start:19,last:21,count:5},
 {side:'bottom',start:22,last:25,count:7},
 {side:'top',start:25.5,last:28.5,count:7},
 {side:'bottom',start:29.5,last:31,count:4},
 {side:'top',start:31.5,last:38,count:14}
];
const pr=T.trimIsolatedEarlyPrefix(diagnosticEarly);
assert.equal(pr.reason,'isolated-prebattle-prefix');
assert.equal(pr.trimmed.length,1);
assert.equal(pr.trimmed[0].side,'top');
assert.equal(pr.segments[0].side,'bottom');
const diagnosticStarts=[15.032,18.719,21.837,25.337,29.337,31.43];
const earlyTimeline=T.makeEarlyTimeline(pr.segments.slice(0,6),diagnosticStarts);
const diagnosticStable=[
 {side:'top',turn:1,time:.813,source:'stable13-turn-indicator'},
 {side:'bottom',turn:1,time:21.3,source:'stable13-turn-indicator'},
 {side:'top',turn:2,time:25.337,source:'stable13-turn-indicator'},
 {side:'bottom',turn:2,time:29.337,source:'stable13-turn-indicator'},
 {side:'top',turn:3,time:31.438,source:'stable13-turn-indicator'},
 {side:'bottom',turn:3,time:39.135,source:'stable13-turn-indicator'},
 {side:'top',turn:4,time:42.625,source:'stable13-turn-indicator'}
];
const dm=T.mergeEarly(diagnosticStable,earlyTimeline,{allowSideOffsets:true});
assert.equal(JSON.stringify(dm.timeline.slice(0,6).map(r=>[r.side,r.turn,r.time])),JSON.stringify([
 ['bottom',1,15.032],['top',1,18.719],['bottom',2,21.837],
 ['top',2,25.337],['bottom',3,29.337],['top',3,31.43]
]));
assert.equal(dm.timeline.some(r=>r.time===.813),false,'isolated prebattle HUD must not survive as top turn 1');
assert.equal(dm.timeline[0].side==='bottom'?'先攻':'後攻','先攻');

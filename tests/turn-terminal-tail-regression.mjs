import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const WB={
  registerModule(){},onReady(){},targetSide:()=> 'bottom',
  video:null,log(){},setScanStatus(){},setProgress(){},$(){return null},frameCanvas(){return null}
};
const sandbox={window:{WB},document:{createElement(){throw new Error('not used')}},console,setTimeout,clearTimeout};
vm.createContext(sandbox);
new vm.Script(fs.readFileSync(new URL('../turn-recognition.js',import.meta.url),'utf8'),{filename:'turn-recognition.js'}).runInContext(sandbox);
const T=WB.TurnRecognition;

assert.equal(T.version,'turn-clean-1.5');
assert.equal(T.terminalTailGuard.tailSeconds,3);
assert.equal(T.terminalTailGuard.targetMinAbsDiff,65);
assert.equal(T.terminalTailGuard.targetMinPixels,1750);
assert.equal(T.terminalTailGuard.targetMinStrongSamples,1);
assert.equal(T.terminalTailGuard.opponentMinAbsDiff,80);
assert.equal(T.terminalTailGuard.opponentMinPixels,1800);
assert.equal(T.terminalTailGuard.opponentMinStrongSamples,2);

// Real v4.13.86 diagnostic timeline from ScreenRecording_09-24-2026 05-00-39_1.mov.
// The user confirmed that the final top 10T does not exist; the replay goes from bottom 9T into lethal/Game Set.
const timeline=[
  ['top',1,13.5],['bottom',1,15.25],['top',2,17.75],['bottom',2,20.363],
  ['top',3,23.938],['bottom',3,28.04],['top',4,31.313],['bottom',4,34.438],
  ['top',5,37.653],['bottom',5,42.691],['top',6,51.375],['bottom',6,59.32],
  ['top',7,66.751],['bottom',7,77.295],['top',8,92.313],['bottom',8,99.42],
  ['top',9,112.375],['bottom',9,118.875],['top',10,120.875]
].map(([side,turn,time])=>({side,turn,time,source:'stable13-turn-indicator',confidence:88,indicatorOnly:true}));

const duration=123.338;
const candidate=T.terminalTailCandidate(timeline,duration);
assert.ok(candidate,'120.875 top10 must be treated as a terminal-tail candidate');
assert.equal(candidate.row.side,'top');
assert.equal(candidate.row.turn,10);
assert.equal(candidate.remaining,2.463);

// v4.13.87 real-device diagnostic proved that the first guard was too weak:
// all six samples crossed the old 70/1200 rule, while the maximum observed |diff| was only 72.33.
// Preserve that failure mode as the regression fixture.
const falseTailSamples=[
  {time:120.875,side:'top',diff:70.41,pixels:1315},
  {time:120.955,side:'top',diff:70.88,pixels:1398},
  {time:121.055,side:'top',diff:71.12,pixels:1450},
  {time:121.225,side:'top',diff:71.84,pixels:1518},
  {time:121.375,side:'top',diff:72.33,pixels:1602},
  {time:121.525,side:'top',diff:71.96,pixels:1588}
];
const falseEvidence=T.terminalEntryEvidence('top',falseTailSamples);
assert.equal(falseEvidence.requirements.role,'opponent');
assert.equal(falseEvidence.requirements.minAbsDiff,80);
assert.equal(falseEvidence.requirements.minPixels,1800);
assert.equal(falseEvidence.requirements.minStrongSamples,2);
assert.equal(falseEvidence.supported,false,'v4.13.87 end-animation cluster must not confirm a real opponent turn');

const trimmed=T.terminalTailDecision(timeline,duration,falseTailSamples);
assert.equal(trimmed.guarded,true);
assert.equal(trimmed.reason,'terminal-tail-entry-unconfirmed');
assert.equal(trimmed.trimmed.length,1);
assert.equal(trimmed.trimmed[0].turn,10);
assert.equal(trimmed.timeline.length,18,'false top10 must be removed');
assert.deepEqual(Array.from(trimmed.timeline.at(-1)&&[trimmed.timeline.at(-1).side,trimmed.timeline.at(-1).turn,trimmed.timeline.at(-1).time]),['bottom',9,118.875]);
assert.equal(trimmed.timeline.filter(x=>x.side==='top').length,9);
assert.equal(trimmed.timeline.filter(x=>x.side==='bottom').length,9);

// A genuine turn beginning near EOF is not dropped merely because it is near the end.
const genuineTailSamples=[
  {time:120.875,side:'top',diff:90.8,pixels:2150},
  {time:120.955,side:'top',diff:84.2,pixels:2050}
];
const genuineEvidence=T.terminalEntryEvidence('top',genuineTailSamples);
assert.equal(genuineEvidence.supported,true,'two strong opponent-entry samples must preserve a genuine near-EOF turn');
const oneSpike=T.terminalEntryEvidence('top',[{time:120.875,side:'top',diff:91,pixels:2200}]);
assert.equal(oneSpike.supported,false,'one isolated opponent-color spike must not preserve a terminal turn');
const targetEvidence=T.terminalEntryEvidence('bottom',[{time:120.875,side:'bottom',diff:-67.2,pixels:1799}]);
assert.equal(targetEvidence.supported,true,'role-aware guard must not over-tighten a genuine reviewed-side turn');

const kept=T.terminalTailDecision(timeline,duration,genuineTailSamples);
assert.equal(kept.reason,'terminal-entry-confirmed');
assert.equal(kept.trimmed.length,0);
assert.equal(kept.timeline.length,19);

// Wrong-side evidence cannot validate the terminal row.
const wrongSide=T.terminalTailDecision(timeline,duration,[{time:120.875,side:'bottom',diff:-80,pixels:1900}]);
assert.equal(wrongSide.reason,'terminal-tail-entry-unconfirmed');
assert.equal(wrongSide.timeline.length,18);

// A normal final turn outside the last 3 seconds must remain untouched.
const noFalseTail=timeline.slice(0,-1);
assert.equal(T.terminalTailCandidate(noFalseTail,duration),null);
const untouched=T.terminalTailDecision(noFalseTail,duration,[]);
assert.equal(untouched.guarded,false);
assert.equal(untouched.timeline.length,18);
assert.deepEqual(Array.from(untouched.timeline.at(-1)&&[untouched.timeline.at(-1).side,untouched.timeline.at(-1).turn,untouched.timeline.at(-1).time]),['bottom',9,118.875]);

console.log('TURN TERMINAL TAIL REGRESSION PASS');

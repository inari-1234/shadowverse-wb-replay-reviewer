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

assert.equal(T.version,'turn-clean-1.4');
assert.equal(T.terminalTailGuard.tailSeconds,3);
assert.equal(T.terminalTailGuard.minAbsDiff,70);
assert.equal(T.terminalTailGuard.minPixels,1200);

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

// Primary-signal measurements reproduced from the same replay tail.
// They look top-colored, but never reach the stronger entry signature seen at genuine later-game turn starts.
const falseTailSamples=[
  {time:120.875,side:'top',diff:63.73,pixels:900},
  {time:120.955,side:'top',diff:64.31,pixels:936},
  {time:121.055,side:'top',diff:64.53,pixels:929},
  {time:121.225,side:'top',diff:64.59,pixels:929},
  {time:121.375,side:'top',diff:64.12,pixels:1017},
  {time:121.525,side:'top',diff:63.75,pixels:1280}
];
const falseEvidence=T.terminalEntryEvidence('top',falseTailSamples);
assert.equal(falseEvidence.supported,false,'weak end-animation color must not confirm a real top turn');

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

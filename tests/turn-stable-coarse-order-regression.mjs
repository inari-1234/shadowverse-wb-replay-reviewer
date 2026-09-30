import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const WB={registerModule(){},onReady(){},targetSide:()=> 'bottom',video:null,log(){},setScanStatus(){},setProgress(){},$(){return null;},frameCanvas(){return null;}};
const sandbox={window:{WB},document:{createElement(){return {getContext(){return {}}}}},console,setTimeout,clearTimeout};
vm.createContext(sandbox);
const source=fs.readFileSync(new URL('../turn-recognition.js',import.meta.url),'utf8');
new vm.Script(source,{filename:'turn-recognition.js'}).runInContext(sandbox);
const T=WB.TurnRecognition;

assert.equal(T.version,'turn-clean-1.12');
assert.deepEqual(Array.from(T.orderedStableCoarseTimes(14,30,2)),[28,26,24,22,20,18,16,14]);
const descending=Array.from(T.orderedStableCoarseTimes(14,146.275,2));
const chronological=[...descending].sort((a,b)=>a-b);
assert.equal(descending.length,67);
assert.equal(descending[0],146);
assert.equal(descending.at(-1),14);
assert.deepEqual(chronological,Array.from({length:67},(_,i)=>14+i*2));
assert.ok(source.includes("coarse.sort((a,b)=>a.time-b.time)"));
assert.ok(source.includes("coarseSeekMode:'exact-2s-descending'"));
assert.ok(source.includes("coarseOrder:'descending-exact'"));
assert.equal(source.includes('fastSeek'),false);
assert.equal(source.includes('requestVideoFrameCallback'),false);
console.log('TURN STABLE COARSE ORDER REGRESSION PASS');

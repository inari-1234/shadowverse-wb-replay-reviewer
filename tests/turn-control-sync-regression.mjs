import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const elements={
  '#turnPick':{value:'1'},
  '#targetSide':{value:'bottom'},
  '#playOrder':{value:'後攻'},
  '#goTurn':{disabled:true},
  '#captureScene':{disabled:true},
  '#turnTime':{value:''},
  '#turnStatus':{textContent:''},
  '#turnTimeline':{textContent:''},
  '#taskLock':null,
};
const document={
  querySelector:s=>elements[s]??null,
  addEventListener:()=>{},
};
const window={dispatchEvent:()=>{},addEventListener:()=>{}};
const sandbox={window,document,console,URL,Blob,File:globalThis.File??class File{},CustomEvent:class CustomEvent{},setTimeout,clearTimeout,requestAnimationFrame:fn=>fn()};
vm.createContext(sandbox);
const source=fs.readFileSync(new URL('../app-core.js',import.meta.url),'utf8');
new vm.Script(source,{filename:'app-core.js'}).runInContext(sandbox);
const WB=sandbox.window.WB;
WB.videoMeta={name:'regression.mp4'};

let disabledDuringTask=false;
await WB.runTask('ターン解析',async()=>{
  WB.setTimeline([{side:'bottom',turn:1,time:5.828}]);
  disabledDuringTask=elements['#goTurn'].disabled;
});

assert.equal(elements['#turnPick'].value,'1','default turn value must stay 1');
assert.equal(disabledDuringTask,true,'turn button should stay locked while analysis task is active');
assert.equal(elements['#goTurn'].disabled,false,'default 1T button must be re-enabled automatically after task completion');
assert.equal(elements['#turnTime'].value,'00:05.8','recognized 1T time should remain displayed');
console.log('TURN CONTROL SYNC REGRESSION PASS');

import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

function loadMulligan(){
  const WB={registerModule(){},onReady(){},on(){},video:null,videoKey(){return 'real-video'},$(){return null},log(){},seekTo(){},frameCanvas(){return null},fmt:s=>String(s)};
  const sandbox={window:{WB},document:{createElement(){return {width:0,height:0,getContext(){return {drawImage(){}}}}}},console,requestAnimationFrame:fn=>fn(),setTimeout,clearTimeout};
  vm.createContext(sandbox);
  new vm.Script(fs.readFileSync(new URL('../mulligan-class.js',import.meta.url),'utf8'),{filename:'mulligan-class.js'}).runInContext(sandbox);
  return WB.MulliganClass;
}
function loadTurn(){
  const WB={registerModule(){},onReady(){},targetSide:()=> 'bottom',video:null,log(){},setScanStatus(){},setProgress(){},$(){return null},frameCanvas(){return null}};
  const sandbox={window:{WB},document:{createElement(){throw new Error('not used')}},console,setTimeout,clearTimeout};
  vm.createContext(sandbox);
  new vm.Script(fs.readFileSync(new URL('../turn-recognition.js',import.meta.url),'utf8'),{filename:'turn-recognition.js'}).runInContext(sandbox);
  return WB.TurnRecognition;
}

const M=loadMulligan(),T=loadTurn();
assert.equal(M.version,'mulligan-class-clean-1.5.2');
assert.equal(T.version,'turn-clean-1.3');

// Real-video calibration from ScreenRecording_09-24-2026 05-00-39_1:
// 3.5s is VS/prebattle and must not be accepted as a mulligan screen.
assert.equal(M.mulliganChromeFromStats({topBlue:.086,bottomBlue:.260,centerDark:.274}).pass,false,'3.5s VS screen must fail mulligan chrome gate');

// 10.5-11.5s is the actual CHANGE/KEEP mulligan panel in the uploaded replay.
for(const row of [
  {topBlue:.210,bottomBlue:.309,centerDark:.519},
  {topBlue:.230,bottomBlue:.321,centerDark:.692},
  {topBlue:.204,bottomBlue:.199,centerDark:.718}
]) assert.equal(M.mulliganChromeFromStats(row).pass,true,'actual mulligan chrome must pass');

const rows=[
  {time:.5,rawHandCount:4,chromePass:false},
  {time:1.0,rawHandCount:4,chromePass:false},
  {time:1.5,rawHandCount:4,chromePass:false},
  {time:10.0,rawHandCount:0,chromePass:false},
  {time:10.5,rawHandCount:4,chromePass:true},
  {time:11.0,rawHandCount:4,chromePass:true},
  {time:11.5,rawHandCount:4,chromePass:true},
  {time:12.0,rawHandCount:3,chromePass:true},
  {time:12.5,rawHandCount:2,chromePass:true},
  {time:13.0,rawHandCount:1,chromePass:true},
  {time:13.5,rawHandCount:0,chromePass:false}
];
const w=M.mulliganWindowFromRows(rows,.5);
assert.equal(w.confirmed,true,'real mulligan window must be confirmed');
assert.equal(w.start,10.5);
assert.equal(w.end,13);
assert.equal(w.representativeTime,10.5);
assert.deepEqual(Array.from(w.fourCardTimes),[10.5,11,11.5]);
assert.equal(w.fourCardTimes.includes(.5),false,'prebattle false four-card pattern must never become mulligan evidence');

assert.equal(T.turnScanStartFromMulligan(w,123.345),13.5,'turn scan must start after confirmed mulligan UI has ended');
assert.equal(T.turnScanStartFromMulligan({confirmed:false,end:13},123.345),3.5,'unconfirmed mulligan evidence must not move the legacy scan boundary');

// The old false prefix at 3.5s is before the guarded scan start. The first surviving row is the real reviewed-side turn.
const oldStable=[
  {side:'top',turn:1,time:3.5},
  {side:'bottom',turn:1,time:15.25},
  {side:'top',turn:2,time:17.75},
  {side:'bottom',turn:2,time:20.363}
];
const scanStart=T.turnScanStartFromMulligan(w,123.345);
const surviving=oldStable.filter(x=>x.time>=scanStart);
assert.equal(surviving[0].side,'bottom');
assert.equal(surviving[0].time,15.25);
assert.equal(oldStable[0].time<scanStart,true,'3.5s prebattle false prefix must lie outside the guarded scan range');

console.log('START BOUNDARY REAL VIDEO REGRESSION PASS');

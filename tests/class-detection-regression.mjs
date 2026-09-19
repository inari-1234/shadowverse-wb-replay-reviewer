import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const WB={registerModule(){},onReady(){},video:null,videoKey(){return 'test'},$(){return null},log(){},on(){},seekTo(){},frameCanvas(){return null}};
const sandbox={window:{WB},document:{createElement(){return {width:0,height:0,getContext(){return {drawImage(){}}}}}},console,requestAnimationFrame:fn=>fn()};
vm.createContext(sandbox);
new vm.Script(fs.readFileSync(new URL('../mulligan-class.js',import.meta.url),'utf8')).runInContext(sandbox);
const C=WB.MulliganClass;

const chromaBase={
  satFrac:.80,brightFrac:.70,paleFrac:.02,meanV:.60,
  orange:.03,yellow:.03,green:.03,cyan:.03,blue:.03,pinkPurple:.03
};
const check=(key,label)=>{
  const x={...chromaBase,[key]:.72};
  const r=C.classifyClassIconStats(x,.40);
  assert.equal(r.candidate,label,key+' must map to '+label);
  assert.ok(r.confidence>=.8);
};

// Public Worlds Beyond class palette: green / yellow / blue / orange / pink-purple / pale / cyan.
check('green','エルフ');
check('yellow','ロイヤル');
check('blue','ウィッチ');
check('orange','ドラゴン');
check('pinkPurple','ナイトメア');
check('cyan','ネメシス');

let r=C.classifyClassIconStats({
  ...chromaBase,satFrac:.18,brightFrac:.72,paleFrac:.78,meanV:.76,
  orange:.04,yellow:.18,green:.02,cyan:.02,blue:.02,pinkPurple:.02
},.40);
assert.equal(r.candidate,'ビショップ','pale high-value class icon must map to Bishop');

assert.equal(C.classifyClassIconStats({...chromaBase,green:.40,yellow:.34},.40).candidate,'','small class-color margin must remain unclassified');
assert.equal(C.classifyClassIconStats({...chromaBase,green:.72},.10).candidate,'','weak VS anchor must block class classification');

// Real-device Nightmare profile from ScreenRecording_09-14-2026 21-17-26_1.mp4.
// At 1.5s/2.0s the tight icon ROI is ~99.9-100% pink-purple among saturated pixels.
r=C.classifyClassIconStats({
  satFrac:.581,brightFrac:.82,paleFrac:0,meanV:.853,
  orange:0,yellow:0,green:0,cyan:0,blue:0,pinkPurple:.999
},.601);
assert.equal(r.candidate,'ナイトメア','real Nightmare profile must remain recognized');
assert.ok(r.confidence>=.9);

// Guard against the clean-13.25 palette swap.
assert.equal(C.classifyClassIconStats({...chromaBase,yellow:.74,orange:.08},.40).candidate,'ロイヤル','yellow crown must not be called Dragon');
assert.equal(C.classifyClassIconStats({...chromaBase,orange:.74,yellow:.08},.40).candidate,'ドラゴン','orange dragon must not be called Royal');

console.log('CLASS DETECTION REGRESSION PASS');

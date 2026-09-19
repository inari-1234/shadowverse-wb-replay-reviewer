import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const WB={registerModule(){},onReady(){},video:null,videoKey(){return 'test'},$(){return null},log(){},on(){},seekTo(){},frameCanvas(){return null}};
const sandbox={window:{WB},document:{createElement(){return {width:0,height:0,getContext(){return {drawImage(){}}}}}},console,requestAnimationFrame:fn=>fn()};
vm.createContext(sandbox);
new vm.Script(fs.readFileSync(new URL('../mulligan-class.js',import.meta.url),'utf8')).runInContext(sandbox);
const C=WB.MulliganClass;
const base={satFrac:.80,meanV:.60,red:.03,orange:.03,yellow:.03,green:.03,cyan:.03,blue:.03,purple:.03};
const check=(key,label)=>{
  const x={...base,[key]:.72};
  const r=C.classifyClassIconStats(x,.40);
  assert.equal(r.candidate,label,key+' must map to '+label);
  assert.ok(r.confidence>=.8);
};
check('green','エルフ');
check('orange','ロイヤル');
check('blue','ウィッチ');
check('red','ドラゴン');
check('purple','ナイトメア');
check('yellow','ビショップ');
check('cyan','ネメシス');
assert.equal(C.classifyClassIconStats({...base,green:.40,orange:.34},.40).candidate,'','small class-color margin must remain unclassified');
assert.equal(C.classifyClassIconStats({...base,green:.72},.10).candidate,'','weak VS anchor must block class classification');
console.log('CLASS DETECTION REGRESSION PASS');

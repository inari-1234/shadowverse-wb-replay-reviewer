import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const root=new URL('../',import.meta.url);
const hand=fs.readFileSync(new URL('hand-recognition.js',root),'utf8');
const diagnostics=fs.readFileSync(new URL('diagnostics.js',root),'utf8');

const start=hand.indexOf('function handFrameCanvas');
const end=hand.indexOf("const DISPLAYED_COST_VERSION",start);
assert.ok(start>=0&&end>start,'canonical hand-frame helper must be extractable');
const helper=hand.slice(start,end);
assert.equal(hand.includes('W.frameCanvas(CFG.maxW)'),false,'hand recognition must not bypass canonical 1200px canvas');
assert.ok(hand.includes('frameCanvas:handFrameCanvas'),'canonical hand-frame helper must be exposed for fixture capture');
assert.ok(diagnostics.includes("WB.HandRecognition?.frameCanvas?.(1200)||WB.frameCanvas(1200)"),'hand fixture capture must reuse the canonical recognition canvas');
assert.ok(diagnostics.includes('canonicalHandCanvas:true'),'fixture capture policy must record canonical hand-canvas use');

function render(videoWidth,videoHeight){
  let drawArgs=null;
  const sandbox={
    W:{video:{videoWidth,videoHeight}},
    CFG:{maxW:1200},
    document:{createElement(tag){
      assert.equal(tag,'canvas');
      return{width:0,height:0,getContext(){
        return{drawImage(...args){drawArgs=args}};
      }};
    }}
  };
  vm.createContext(sandbox);
  vm.runInContext(helper+';globalThis.result=handFrameCanvas(1200);',sandbox);
  return{canvas:sandbox.result,drawArgs};
}

const resized=render(1112,512);
assert.equal(resized.canvas.width,1200);
assert.equal(resized.canvas.height,553);
assert.equal(resized.drawArgs[3],1200);
assert.equal(resized.drawArgs[4],553);

const nativeHighRes=render(2622,1206);
assert.equal(nativeHighRes.canvas.width,1200);
assert.equal(nativeHighRes.canvas.height,552);
assert.equal(nativeHighRes.drawArgs[3],1200);
assert.equal(nativeHighRes.drawArgs[4],552);

console.log('HAND CANONICAL CANVAS REGRESSION PASS');

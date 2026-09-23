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
assert.equal(hand.includes('W.frameCanvas(CFG.maxW)'),false,'hand recognition must not bypass the canonical wrapper at call sites');
assert.ok(hand.includes('frameCanvas:handFrameCanvas'),'canonical hand-frame helper must be exposed for fixture capture');
assert.ok(diagnostics.includes("WB.HandRecognition?.frameCanvas?.(1200)||WB.frameCanvas(1200)"),'hand fixture capture must reuse the canonical recognition canvas');
assert.ok(diagnostics.includes('canonicalHandCanvas:true'),'fixture capture policy must record canonical hand-canvas use');

function render(baseWidth,baseHeight,targetWidth=1200){
  let drawArgs=null,created=0;
  const base={width:baseWidth,height:baseHeight};
  const sandbox={
    W:{frameCanvas(width){assert.equal(width,targetWidth);return base}},
    CFG:{maxW:1200},
    document:{createElement(tag){
      created++;
      assert.equal(tag,'canvas');
      return{width:0,height:0,getContext(){
        return{drawImage(...args){drawArgs=args}};
      }};
    }}
  };
  vm.createContext(sandbox);
  vm.runInContext(helper+`;globalThis.result=handFrameCanvas(${targetWidth});`,sandbox);
  return{canvas:sandbox.result,drawArgs,created,base};
}

const resized=render(1112,512);
assert.equal(resized.canvas.width,1200);
assert.equal(resized.canvas.height,553);
assert.equal(resized.created,1);
assert.equal(resized.drawArgs[0],resized.base);
assert.equal(resized.drawArgs[3],1200);
assert.equal(resized.drawArgs[4],553);

const alreadyCanonical=render(1200,552);
assert.equal(alreadyCanonical.canvas,alreadyCanonical.base,'existing 1200px recognition canvas must remain byte-path compatible');
assert.equal(alreadyCanonical.created,0,'already-canonical frames must not be redrawn');
assert.equal(alreadyCanonical.drawArgs,null);

console.log('HAND CANONICAL CANVAS REGRESSION PASS');

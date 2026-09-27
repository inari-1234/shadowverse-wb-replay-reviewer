import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('../app-core.js',import.meta.url),'utf8');

function extractFunction(src,name){
  const start=src.indexOf('function '+name);
  assert.ok(start>=0,`missing ${name}`);
  let brace=src.indexOf('{',start),depth=0;
  for(let i=brace;i<src.length;i++){
    if(src[i]==='{')depth++;
    else if(src[i]==='}'){depth--;if(depth===0)return src.slice(start,i+1)}
  }
  throw new Error('unterminated '+name);
}

const fnSrc=extractFunction(source,'seekPositionReached');
const sandbox={};vm.createContext(sandbox);
vm.runInContext(fnSrc+';globalThis.seekPositionReached=seekPositionReached;',sandbox);
const reached=sandbox.seekPositionReached;

assert.equal(reached({currentTime:3.5,seeking:false,readyState:2},3.5),true,'Safari missed seeked event must be recoverable after the media is actually settled');
assert.equal(reached({currentTime:3.54,seeking:false,readyState:4},3.5),true,'small media seek drift must be tolerated');
assert.equal(reached({currentTime:3.5,seeking:true,readyState:4},3.5),false,'actively seeking media must not be accepted');
assert.equal(reached({currentTime:3.5,seeking:false,readyState:1},3.5),false,'metadata-only media must not be accepted as frame-ready');
assert.equal(reached({currentTime:3.8,seeking:false,readyState:4},3.5),false,'wrong position must not be accepted');

assert.ok(source.includes("setInterval(()=>check('currentTime-fallback'),80)"),'seekTo must poll for the iOS/Safari missed-event fallback');
assert.ok(source.includes("if(!check('timeout-currentTime'))finish(false"),'timeout must re-check actual media position before failing');
assert.ok(source.includes("safariFallback:completion!=='seeked'"),'fallback completion must be diagnosable');
assert.ok(source.includes("v.addEventListener('seeked',onSeek,{once:true})"),'normal seeked event path must remain the primary path');

console.log('IOS SEEK FALLBACK REGRESSION PASS');

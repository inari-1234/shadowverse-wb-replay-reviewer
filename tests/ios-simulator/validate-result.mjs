import fs from 'node:fs';
import assert from 'node:assert/strict';

const path=process.argv[2];
assert.ok(path,'usage: node validate-result.mjs result.json');
const r=JSON.parse(fs.readFileSync(path,'utf8'));
assert.equal(r.schema,'wb-ios-simulator-seek-v1');
assert.equal(r.error,undefined,'simulator benchmark page must complete');
assert.match(String(r.userAgent||''),/(iPhone|iPad).*AppleWebKit/i,'benchmark must run in iOS/iPadOS WebKit, not desktop Safari');
assert.ok(Number(r.duration)>2,'fixture must expose seekable duration');
assert.ok(Array.isArray(r.exact)&&r.exact.length>=8,'exact seek sample count');
assert.equal(r.exact.filter(x=>!x.ok||x.error||x.timeout).length,0,'exact seek path must settle all simulator samples');
assert.ok(Math.max(...r.exact.map(x=>Number(x.drift)||0))<=0.08,'exact seek drift must stay within production tolerance');
console.log('IOS SIMULATOR SEEK BENCHMARK PASS');
console.log(JSON.stringify({userAgent:r.userAgent,duration:r.duration,fastSeekSupported:r.fastSeekSupported,summary:r.summary},null,2));

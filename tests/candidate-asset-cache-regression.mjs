import fs from 'node:fs';
import assert from 'node:assert/strict';

const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const counter=fs.readFileSync(new URL('../counterfactual-review.js',import.meta.url),'utf8');
const coach=fs.readFileSync(new URL('../coach-integration.js',import.meta.url),'utf8');
const pipeline=fs.readFileSync(new URL('../runtime-decision-pipeline.js',import.meta.url),'utf8');
const binding=fs.readFileSync(new URL('../runtime-authority-binding.js',import.meta.url),'utf8');

assert.ok(index.includes('__wbAssetUrl'),'candidate index must expose a page-nonce asset URL helper');
assert.ok(index.includes("searchParams.get('_wb')"),'candidate asset helper must bind to the refresh nonce');
assert.ok(index.includes("document.write"),'top-level local scripts must be parser-inserted with the candidate nonce');
assert.equal(index.includes('<script defer src="./replay-session.js"></script>'),false,'replay-session must not retain an unversioned static URL');
for(const [name,src] of [['counterfactual-review',counter],['coach-integration',coach],['runtime-decision-pipeline',pipeline],['runtime-authority-binding',binding]]){
  assert.ok(src.includes('__wbAssetUrl'),`${name} dynamic module loads must inherit the candidate asset nonce`);
}
console.log('CANDIDATE ASSET CACHE REGRESSION PASS');

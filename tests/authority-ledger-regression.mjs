import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {evaluateClaim, evaluateLedger, validateClaim} from '../tools/check-authority-ledger.mjs';

const baseClaim={
  claim_id:'AUTH-T01',
  claim:'played move is confirmed by exact authority',
  status:'CONFIRMED',
  evidence_sha:'abc123',
  evidence_method:'IPHONE_DEVICE',
  verified_by:['DEVICE_OBSERVATION','INDEPENDENT_REVIEW'],
  invalidation_paths:['played-move-authority.js','runtime-authority-binding.js']
};

assert.deepEqual(validateClaim(baseClaim),[],'valid claim must pass schema checks');
assert.equal(evaluateClaim(baseClaim,['coach-explanation.js']).state,'CURRENT','unrelated change must keep claim current');
const invalidated=evaluateClaim(baseClaim,['runtime-authority-binding.js']);
assert.equal(invalidated.state,'REVERIFY_REQUIRED','exact invalidation-path change must require re-verification');
assert.deepEqual(invalidated.invalidated_by,['runtime-authority-binding.js']);

const wildcard={...baseClaim,invalidation_paths:['tests/**']};
assert.equal(evaluateClaim(wildcard,[]).state,'REFERENCE_ONLY','wildcards are rejected in v0.1 so BOOT never depends on ambiguous matching');
const missingEvidence={...baseClaim,evidence_sha:''};
assert.equal(evaluateClaim(missingEvidence,[]).state,'REFERENCE_ONLY','claim without evidence SHA is reference only');
const badStatus={...baseClaim,status:'PASS'};
assert.equal(evaluateClaim(badStatus,[]).state,'REFERENCE_ONLY','undefined claim-strength labels are rejected');

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'authority-ledger-'));
const git=(...args)=>execFileSync('git',args,{cwd:dir,encoding:'utf8'}).trim();
git('init');git('config','user.email','authority@example.invalid');git('config','user.name','Authority Test');
fs.writeFileSync(path.join(dir,'played-move-authority.js'),'v1\n');
fs.writeFileSync(path.join(dir,'coach-explanation.js'),'v1\n');
git('add','.');git('commit','-m','baseline');
const evidenceSha=git('rev-parse','HEAD');
fs.writeFileSync(path.join(dir,'coach-explanation.js'),'v2\n');
git('add','.');git('commit','-m','unrelated');
let ledger={ledger_version:'0.1',project:'test',claims:[{...baseClaim,evidence_sha:evidenceSha}]};
let report=evaluateLedger(ledger,{cwd:dir});
assert.equal(report.summary.CURRENT,1,'git diff from evidence SHA must ignore unrelated paths');
assert.equal(report.summary.REVERIFY_REQUIRED,0);
fs.writeFileSync(path.join(dir,'runtime-authority-binding.js'),'new\n');
git('add','.');git('commit','-m','invalidate');
report=evaluateLedger(ledger,{cwd:dir});
assert.equal(report.summary.REVERIFY_REQUIRED,1,'git diff evidence_sha..HEAD must mechanically invalidate matching claim');
assert.deepEqual(report.results[0].invalidated_by,['runtime-authority-binding.js']);

console.log('AUTHORITY LEDGER REGRESSION PASS');

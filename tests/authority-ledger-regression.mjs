import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {evaluateClaim, evaluateLedger, validateClaim} from '../tools/check-authority-ledger.mjs';

// v0.1 scaffold: invalidation is exact-path based and fail-closed.
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

// Integration-plane regression: a ledger-only branch cannot attest a distinct
// frozen runtime. The default comparison must use the pinned candidate SHA.
const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const liveLedger=JSON.parse(fs.readFileSync(path.join(repoRoot,'authority/AUTHORITY_LEDGER.json'),'utf8'));
const holdout=JSON.parse(fs.readFileSync(path.join(repoRoot,'authority/holdouts/SV-HOLDOUT-20261109-004.json'),'utf8'));
assert.equal(liveLedger.target_candidate_sha,holdout.baseline_sha,'ledger comparison target must match the holdout candidate SHA');
assert.equal(liveLedger.target_runtime_build_id,holdout.runtime_build_id,'ledger runtime build must match the holdout runtime build');
assert.equal(liveLedger.target_branch,'candidate-live','source runtime branch must be explicit');
const targetSha=gitForRepo('rev-parse',liveLedger.target_candidate_sha);
assert.equal(targetSha,liveLedger.target_candidate_sha,'pinned runtime commit must exist locally');
const againstCandidate=evaluateLedger(liveLedger,{cwd:repoRoot});
assert.equal(againstCandidate.head,liveLedger.target_candidate_sha,'default comparison must target pinned candidate, not ledger HEAD');
const expectedReverify=[
  'SV-PF1R2-RUNTIME-001',
  'SV-PF1R2-EP-CARRY-001',
  'SV-PF1R2-HUMAN-COACH-001',
  'SV-KNOWN-COACH-ALT-LABEL-001',
  'SV-KNOWN-COACH-ACTION-PHRASE-001',
  'SV-KNOWN-EP-PRESENTATION-001'
].sort();
const actualReverify=againstCandidate.results.filter(x=>x.state==='REVERIFY_REQUIRED').map(x=>x.claim_id).sort();
assert.deepEqual(actualReverify,expectedReverify,'old iPhone claims must be invalidated at fixed candidate');
assert.equal(againstCandidate.summary.CURRENT,0);
assert.equal(againstCandidate.summary.REFERENCE_ONLY,0);
const againstLedgerHead=evaluateLedger(liveLedger,{cwd:repoRoot,head:'HEAD'});
assert.equal(againstLedgerHead.summary.CURRENT,6,'ledger-only HEAD would misleadingly mark all historical claims current');
console.log('FROZEN CANDIDATE INVALIDATION PASS: 6/6 REVERIFY_REQUIRED at '+liveLedger.target_candidate_sha);

function gitForRepo(...args){return execFileSync('git',args,{cwd:repoRoot,encoding:'utf8'}).trim();}

console.log('AUTHORITY LEDGER REGRESSION PASS');

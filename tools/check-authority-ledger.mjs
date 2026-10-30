import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export const CLAIM_STATUSES = new Set(['CONFIRMED', 'REPRODUCED', 'INFERRED']);
export const VERIFIED_BY = new Set(['IMPLEMENTER', 'INDEPENDENT_REVIEW', 'DEVICE_OBSERVATION']);

function normalizePath(value) {
  return String(value || '').replaceAll('\\', '/').replace(/^\.\//, '');
}

export function validateClaim(claim) {
  const errors = [];
  if (!claim || typeof claim !== 'object') return ['claim must be an object'];
  if (!String(claim.claim_id || '').trim()) errors.push('claim_id is required');
  if (!String(claim.claim || '').trim()) errors.push('claim is required');
  if (!CLAIM_STATUSES.has(claim.status)) errors.push(`invalid status: ${claim.status ?? 'missing'}`);
  if (!String(claim.evidence_sha || '').trim()) errors.push('evidence_sha is required');
  if (!String(claim.evidence_method || '').trim()) errors.push('evidence_method is required');
  const verified = Array.isArray(claim.verified_by) ? claim.verified_by : [claim.verified_by].filter(Boolean);
  if (!verified.length) errors.push('verified_by is required');
  for (const item of verified) if (!VERIFIED_BY.has(item)) errors.push(`invalid verified_by: ${item}`);
  if (!Array.isArray(claim.invalidation_paths) || !claim.invalidation_paths.length) errors.push('invalidation_paths must contain at least one exact repository path');
  else {
    for (const p of claim.invalidation_paths) {
      const n = normalizePath(p);
      if (!n || n.includes('*')) errors.push(`invalidation path must be exact and non-empty: ${p}`);
    }
  }
  return errors;
}

export function evaluateClaim(claim, changedPaths) {
  const errors = validateClaim(claim);
  if (errors.length) return {claim_id: claim?.claim_id || null, state: 'REFERENCE_ONLY', reasons: errors, invalidated_by: []};
  const changed = new Set((changedPaths || []).map(normalizePath));
  const invalidatedBy = claim.invalidation_paths.map(normalizePath).filter(p => changed.has(p));
  return {
    claim_id: claim.claim_id,
    state: invalidatedBy.length ? 'REVERIFY_REQUIRED' : 'CURRENT',
    reasons: invalidatedBy.length ? ['one or more invalidation paths changed since evidence_sha'] : [],
    invalidated_by: invalidatedBy
  };
}

export function changedPathsBetween(evidenceSha, head = 'HEAD', cwd = process.cwd()) {
  const out = execFileSync('git', ['diff', '--name-only', `${evidenceSha}..${head}`], {cwd, encoding: 'utf8'});
  return out.split(/\r?\n/).map(normalizePath).filter(Boolean);
}

export function evaluateLedger(ledger, {head = 'HEAD', cwd = process.cwd(), changedPathsBySha = null} = {}) {
  if (!ledger || typeof ledger !== 'object') throw new Error('ledger must be an object');
  const claims = Array.isArray(ledger.claims) ? ledger.claims : [];
  const diffCache = new Map();
  const results = claims.map(claim => {
    const errors = validateClaim(claim);
    if (errors.length) return {claim_id: claim?.claim_id || null, state: 'REFERENCE_ONLY', reasons: errors, invalidated_by: []};
    const sha = claim.evidence_sha;
    let changed;
    if (changedPathsBySha && Object.hasOwn(changedPathsBySha, sha)) changed = changedPathsBySha[sha];
    else {
      if (!diffCache.has(sha)) diffCache.set(sha, changedPathsBetween(sha, head, cwd));
      changed = diffCache.get(sha);
    }
    return evaluateClaim(claim, changed);
  });
  const summary = {
    CURRENT: results.filter(x => x.state === 'CURRENT').length,
    REVERIFY_REQUIRED: results.filter(x => x.state === 'REVERIFY_REQUIRED').length,
    REFERENCE_ONLY: results.filter(x => x.state === 'REFERENCE_ONLY').length
  };
  return {ledger_version: ledger.ledger_version || null, project: ledger.project || null, head, summary, results};
}

function isMain() {
  const self = fileURLToPath(import.meta.url);
  return process.argv[1] && path.resolve(process.argv[1]) === path.resolve(self);
}

if (isMain()) {
  const ledgerPath = process.argv[2];
  const head = process.argv[3] || 'HEAD';
  if (!ledgerPath) {
    console.error('Usage: node tools/check-authority-ledger.mjs <ledger.json> [HEAD-or-ref]');
    process.exit(2);
  }
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const report = evaluateLedger(ledger, {head, cwd: process.cwd()});
  console.log(JSON.stringify(report, null, 2));
  if (report.summary.REVERIFY_REQUIRED || report.summary.REFERENCE_ONLY) process.exitCode = 1;
}

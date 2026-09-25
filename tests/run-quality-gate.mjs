import {spawnSync} from 'node:child_process';

const GATE_VERSION='recognition-quality-gate-v53';
// v5 shadow 0.10 conservative tracking inheritance + ROI appearance identity
console.log(`QUALITY GATE ${GATE_VERSION}`);

const tests=[
  'tests/board-observation-regression.mjs',
  'tests/card-hand-recognition-regression.mjs',
  'tests/class-detection-regression.mjs',
  'tests/tactical-summary-regression.mjs',
  'tests/review-profile-boundary-regression.mjs',
  'tests/review-layer-regression.mjs',
  'tests/replay-session-regression.mjs',
  'tests/state-review-boundary-regression.mjs',
  'tests/tactical-rules-boundary-regression.mjs',
  'tests/turn-control-sync-regression.mjs',
  'tests/turn-prefix-regression.mjs',
  'tests/start-boundary-real-video-regression.mjs',
  'tests/ios-seek-fallback-regression.mjs',
  'tests/ward-tristate-regression.mjs',
  'tests/runtime-invariants.mjs',
  'tests/near-threshold-phase-probe-regression.mjs',
  'tests/near-threshold-oscillation-regression.mjs',
  'tests/anchor-boundary-probe-regression.mjs',
  'tests/displayed-cost6-diagnostic-regression.mjs',
  'tests/displayed-cost6-all-slot-diagnostic-regression.mjs',
  'tests/common-strip-diagnostic-regression.mjs',
  'tests/hand-canonical-canvas-regression.mjs',
  'tests/recognition-v5-shadow-regression.mjs',
  'tests/v5-dataset-extractor-regression.mjs',
  'tests/v5-cost6-real-device-shadow-regression.mjs',
  'tests/v5-barbaros-cross-video-visibility-regression.mjs',
  'tests/v5-common-strip-uniqueness-regression.mjs',
  'tests/v5-zeta-common-strip-raw-fixture-regression.mjs',
  'tests/v5-real-video-validation-regression.mjs',
  'tests/v5-fused-evidence-regression.mjs',
  'tests/v5-temporal-identity-fusion-regression.mjs',
  'tests/v5-tracking-roi-regression.mjs',
  'tests/counterfactual-evidence-regression.mjs',
  'tests/hand-fixture-export-regression.mjs',
  'tests/diagnostic-scenario-importer-regression.mjs',
  'tests/diagnostic-review-queue-regression.mjs',
  'tests/recognition-benchmark.mjs'
];

let failed=0;
for(const file of tests){
  const r=spawnSync(process.execPath,[file],{stdio:'inherit'});
  if(r.status!==0){
    failed++;
    console.error(`QUALITY GATE FAIL: ${file} (exit ${r.status})`);
  }
}
if(failed){
  console.error(`QUALITY GATE FAIL: ${failed}/${tests.length} tests failed`);
  process.exit(1);
}
console.log(`QUALITY GATE PASS: ${tests.length}/${tests.length}`);

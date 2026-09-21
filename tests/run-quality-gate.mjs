import {spawnSync} from 'node:child_process';

const GATE_VERSION='recognition-quality-gate-v15';
console.log(`QUALITY GATE ${GATE_VERSION}`);

const tests=[
  'tests/board-observation-regression.mjs',
  'tests/card-hand-recognition-regression.mjs',
  'tests/class-detection-regression.mjs',
  'tests/tactical-summary-regression.mjs',
  'tests/turn-control-sync-regression.mjs',
  'tests/turn-prefix-regression.mjs',
  'tests/ward-tristate-regression.mjs',
  'tests/runtime-invariants.mjs',
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

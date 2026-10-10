import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
const state=read('state-recognition.js');
const replay=read('replay-session.js');
const pipeline=read('runtime-decision-pipeline.js');
const binding=read('runtime-authority-binding.js');
const coach=read('coach-integration.js');

const matchAnalyze=(state.match(/async function analyzeMatchTargetTurns\(\)[\s\S]*?\nWB\.StateRecognition=/)||[])[0]||'';
assert.match(matchAnalyze,/\bnonce\b/,'match analysis must create a nonce');
assert.match(matchAnalyze,/\brunId\b/,'match analysis must create a runId');
assert.match(matchAnalyze,/WB\.emit\('match-analysis-start',\{[^}]*runId[^}]*nonce[^}]*\}\)/s,'match-analysis-start must carry the run identity');
const makeRun=(replay.match(/function makeAnalysisRun\(meta=\{\}\)\{[^\n]*\}/)||[])[0]||'';
assert.match(makeRun,/nonce=/,'ReplaySession run constructor must retain a nonce');
assert.match(makeRun,/return\{runId,nonce,/,'ReplaySession analysisRun must store runId and nonce together');

assert.match(state,/publishStateCaptured/,'captureState must expose a non-publishing exact-capture mode');
assert.match(state,/recordStateHistory/,'captureState must expose a non-history exact-capture mode');
assert.match(binding,/captureFn\(\{[^}]*publishStateCaptured:false[^}]*recordStateHistory:false/s,'P-F0B exact capture must not publish into ReplaySession or shared capture history');

const pipelineBind=(pipeline.match(/function bind\(\)\{([\s\S]*?)\}\nW\.RuntimeDecisionPipeline/)||[])[1]||'';
assert.doesNotMatch(pipelineBind,/match-analysis-complete/,'P1 must remove pre-PF0B match-analysis-complete evaluation');
assert.match(pipelineBind,/match-analysis-start[^\n]*clear/,'a new analysis run must clear stale pipeline results immediately');

const getPosition=(binding.match(/async function getPositionState\([\s\S]*?\nfunction shouldEvaluateWindow/)||[])[0]||'';
assert.doesNotMatch(getPosition,/currentFreshRun\?\.runId/,'getPositionState must never fall back to a previous currentFreshRun');
assert.match(getPosition,/requestedRunId[^\n]*context/,'getPositionState must require the runId supplied by the current evaluation context');

const enrich=(binding.match(/async function enrichDecisionWindows\([\s\S]*?\nfunction snapshot/)||[])[0]||'';
assert.match(enrich,/analysisRun/,'PF0B enrichment must bind to ReplaySession current analysisRun');
assert.doesNotMatch(enrich,/makeFreshRunIdentity\(\)/,'PF0B must not invent a second run identity after analysis');

const ingest=(coach.match(/async function ingestDecision\([\s\S]*?\nasync function syncFromRuntime/)||[])[0]||'';
assert.match(ingest,/runId/);
assert.match(ingest,/analysisRun|currentAnalysisRunId|currentRun/,'direct coach ingestion must compare against the current analysis run');
assert.match(ingest,/authorityPresentationForWindow/,'direct coach ingestion must require same-run exact authority before accepting a decision');
assert.match(coach,/match-analysis-start[^\n]*clear/,'new analysis run must clear stale coach items immediately');

console.log('P-F1-R2 SINGLE FRESH PIPELINE REGRESSION PASS');

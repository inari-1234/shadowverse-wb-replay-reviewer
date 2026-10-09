import fs from 'node:fs';

const path=process.argv[2];
if(!path){console.error('usage: node tests/pf1r2-fresh-diagnostic-verifier.mjs <fresh-diagnostic.json>');process.exit(2)}
let diagnostic;
try{diagnostic=JSON.parse(fs.readFileSync(path,'utf8'))}catch(err){console.error('PF1R2 INVALID_DIAGNOSTIC:',err.message);process.exit(2)}
const evidence=(diagnostic?.events||[]).filter(x=>x?.type==='pf1r2-fresh-e2e-evidence').at(-1)||diagnostic?.pf1r2FreshEvidenceV1||null;
const fail=(reason,detail={})=>{console.error(JSON.stringify({verdict:'HOLD',reason,...detail},null,2));process.exit(3)};
if(!evidence)fail('FRESH_EVIDENCE_MISSING');
if(evidence.version!=='pf1r2-fresh-real-video-evidence-v1.1.0'||evidence.gateVersion!=='pf1r2-g-fresh-e2e-gate-v1.0.0')fail('FRESH_EVIDENCE_VERSION_INVALID',{version:evidence.version,gateVersion:evidence.gateVersion});
const assetAuthority=evidence?.assetAuthority||diagnostic?.runtimeBuildAuthority||null;
if(!assetAuthority||assetAuthority.ok!==true||typeof assetAuthority.buildId!=='string'||!assetAuthority.buildId||Number(assetAuthority.total||0)<1||Number(assetAuthority.verified||0)!==Number(assetAuthority.total))fail('RUNTIME_BUILD_AUTHORITY_INVALID',{assetAuthority});
if(evidence.freshRun!==true)fail('FRESH_MARKER_MISSING');
if(typeof evidence.runId!=='string'||!evidence.runId.trim()||typeof evidence.nonce!=='string'||!evidence.nonce.trim())fail('FRESH_RUN_IDENTITY_MISSING');
if(evidence?.authority?.runId!==evidence.runId||evidence?.authority?.nonce!==evidence.nonce)fail('AUTHORITY_RUN_IDENTITY_MISMATCH');
const created=Date.parse(diagnostic?.createdAt||''),baseline=Date.parse('2026-10-09T00:00:00Z');
if(!Number.isFinite(created)||created<baseline)fail('DIAGNOSTIC_PREDATES_PF1R2G',{createdAt:diagnostic?.createdAt||null});
if(Number(evidence?.authority?.targets||0)<1)fail('NO_DECISION_WINDOWS');
if(Number(evidence?.authority?.capturedWindows||0)<1)fail('NO_COMPLETE_WINDOW_AUTHORITY_CAPTURE');
if(Number(evidence?.authority?.captured||0)<2)fail('ANCHOR_AFTER_EXACT_CAPTURE_MISSING');
if(Number(evidence?.pipeline?.sameRunProcessed||0)<1)fail('PIPELINE_NOT_PROCESSED_IN_SAME_RUN');
if(evidence.status!=='CHAIN_OK')fail(evidence.status||'CHAIN_NOT_CONFIRMED',{holdReasons:evidence?.pipeline?.holdReasons||[],authority:evidence?.authority||null,pipeline:evidence?.pipeline||null,coach:evidence?.coach||null});
if(!Array.isArray(evidence.chainSuccessWindowIds)||evidence.chainSuccessWindowIds.length<1)fail('NO_CHAIN_SUCCESS_WINDOW');
if(!Array.isArray(evidence.chainProofs)||evidence.chainProofs.length<1)fail('CHAIN_PROOF_MISSING');
const bindings=Array.isArray(evidence?.authority?.windowBindings)?evidence.authority.windowBindings:[];
for(const windowId of evidence.chainSuccessWindowIds){
  const binding=bindings.find(x=>String(x?.windowId)===String(windowId));
  if(!binding||binding.complete!==true||binding.anchorExact!==true||binding.afterExact!==true)fail('WINDOW_AUTHORITY_INCOMPLETE',{windowId,binding});
  if(binding.runId!==evidence.runId)fail('WINDOW_AUTHORITY_RUN_MISMATCH',{windowId,bindingRunId:binding.runId,runId:evidence.runId});
  if(!evidence?.pipeline?.okWindowIds?.includes(windowId))fail('PIPELINE_WINDOW_BINDING_MISSING',{windowId});
  if(!evidence?.coach?.windowIds?.includes(windowId))fail('COACH_WINDOW_BINDING_MISSING',{windowId});
  const proof=evidence.chainProofs.find(x=>String(x?.windowId)===String(windowId));
  if(!proof||proof.sameRun!==true||proof.sameWindow!==true||proof.authorityRunId!==evidence.runId||proof.pipelineRunId!==evidence.runId||proof.coachRunId!==evidence.runId)fail('CHAIN_PROOF_INVALID',{windowId,proof});
}
if(!evidence?.pipeline?.resultRunIds?.includes(evidence.runId))fail('PIPELINE_RUN_ID_MISSING');
if(!evidence?.coach?.runIds?.includes(evidence.runId))fail('COACH_RUN_ID_MISSING');
console.log(JSON.stringify({verdict:'PASS',phase:'P-F1-R2-G',status:evidence.status,createdAt:diagnostic.createdAt,videoKey:evidence.videoKey,runId:evidence.runId,authority:evidence.authority,pipeline:evidence.pipeline,coach:evidence.coach,chainSuccessWindowIds:evidence.chainSuccessWindowIds,chainProofs:evidence.chainProofs},null,2));
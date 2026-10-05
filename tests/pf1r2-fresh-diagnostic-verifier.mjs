import fs from 'node:fs';

const path=process.argv[2];
if(!path){console.error('usage: node tests/pf1r2-fresh-diagnostic-verifier.mjs <fresh-diagnostic.json>');process.exit(2)}
let diagnostic;
try{diagnostic=JSON.parse(fs.readFileSync(path,'utf8'))}catch(err){console.error('PF1R2 INVALID_DIAGNOSTIC:',err.message);process.exit(2)}
const evidence=(diagnostic?.events||[]).filter(x=>x?.type==='pf1r2-fresh-e2e-evidence').at(-1)||diagnostic?.pf1r2FreshEvidenceV1||null;
const fail=(reason,detail={})=>{console.error(JSON.stringify({verdict:'HOLD',reason,...detail},null,2));process.exit(3)};
if(!evidence)fail('FRESH_EVIDENCE_MISSING');
if(evidence.version!=='pf1r2-fresh-real-video-evidence-v1.0.0'||evidence.freshRun!==true)fail('FRESH_EVIDENCE_VERSION_INVALID',{version:evidence.version});
const created=Date.parse(diagnostic?.createdAt||''),baseline=Date.parse('2026-10-05T10:08:17Z');
if(!Number.isFinite(created)||created<baseline)fail('DIAGNOSTIC_PREDATES_PF1R2',{createdAt:diagnostic?.createdAt||null});
if(Number(evidence?.authority?.targets||0)<1)fail('NO_DECISION_WINDOWS');
if(Number(evidence?.authority?.captured||0)+Number(evidence?.authority?.reused||0)<1)fail('NO_EXACT_AUTHORITY_CAPTURE');
if(Number(evidence?.pipeline?.processed||0)<1)fail('PIPELINE_NOT_PROCESSED');
if(evidence.status!=='CHAIN_OK')fail(evidence.status||'CHAIN_NOT_CONFIRMED',{holdReasons:evidence?.pipeline?.holdReasons||[],authority:evidence?.authority||null,pipeline:evidence?.pipeline||null,coach:evidence?.coach||null});
if(!Array.isArray(evidence.chainSuccessWindowIds)||evidence.chainSuccessWindowIds.length<1)fail('NO_CHAIN_SUCCESS_WINDOW');
if(Number(evidence?.coach?.count||0)<1)fail('COACH_NOT_PRESENT');
console.log(JSON.stringify({verdict:'PASS',phase:'P-F1-R2',status:evidence.status,createdAt:diagnostic.createdAt,videoKey:evidence.videoKey,authority:evidence.authority,pipeline:evidence.pipeline,coach:evidence.coach,chainSuccessWindowIds:evidence.chainSuccessWindowIds},null,2));

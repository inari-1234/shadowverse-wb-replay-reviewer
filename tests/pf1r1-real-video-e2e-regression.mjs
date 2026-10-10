import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root=new URL('../',import.meta.url);
const fixture=JSON.parse(fs.readFileSync(new URL('./pf1r1-real-video-e2e-fixture.json',import.meta.url),'utf8'));
const handlers=new Map(),events=[],errors=[],logs=[];
const storage=new Map();
const localStorage={getItem:k=>storage.has(k)?storage.get(k):null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
let sandbox;
class El{
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.className='';this.textContent='';this.parentNode=null;this.src='';this.defer=false;this.onload=null;this.onerror=null}
  appendChild(x){x.parentNode=this;this.children.push(x);if(x.tagName==='SCRIPT'&&x.src){try{const rel=x.src.replace(/^\.\//,'');new vm.Script(fs.readFileSync(new URL(rel,root),'utf8'),{filename:rel}).runInContext(sandbox);x.onload?.()}catch(err){x.onerror?.(err);throw err}}return x}
  insertBefore(x,b){x.parentNode=this;const i=this.children.indexOf(b);if(i<0)return this.appendChild(x);this.children.splice(i,0,x);return x}
  remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(v=>v!==this)}
  querySelector(){return null}
  addEventListener(){}
}
const head=new El('head');
const document={head,documentElement:head,createElement:t=>new El(t),querySelector:()=>null,querySelectorAll:()=>[]};
const WB={
  optionalModules:[],stateCaptureHistory:fixture.stateCaptureHistory.map(x=>structuredClone(x)),videoMeta:null,
  registerModule(name,version){this.modules??=[];this.modules.push({name,version})},
  log(type,data={}){logs.push({type,...data})},
  recordError(scope,err,data={}){errors.push({scope,message:err?.message||String(err),...data})},
  emit(name,detail={}){events.push({name,detail});for(const fn of handlers.get(name)||[])fn(detail)},
  on(name,fn){if(!handlers.has(name))handlers.set(name,[]);handlers.get(name).push(fn)},
  onReady(fn){fn()},
  $(/* selector */){return null},escape:String,
  CardDB:{get(id){if(id==='quickBlader')return{id,type:'フォロワー',cost:1,atk:1,life:1,tags:['疾走']};if(id==='barbaros')return{id,type:'フォロワー',cost:7,atk:4,life:3,tags:['疾走','海賊旗']};if(id==='zetaBeatrix')return{id,type:'フォロワー',cost:4,atk:3,life:2,tags:['突進','エンハンス6','疾走']};return null}},
  ReviewEngine:{state(){return{}},calculate(){return{status:'incomplete-do-not-declare-no-lethal',lethalRoutes:[],unknown:['fixture']}},publishReviewState(){}},
};
sandbox={window:{WB,__wbReplaySessionV1:null},document,localStorage,console,structuredClone,Date,Promise,Map,Set,Object,Array,Number,String,Boolean,Math,JSON,RegExp,Error,TypeError,queueMicrotask,setTimeout,clearTimeout,CSS:{escape:s=>String(s)}};
vm.createContext(sandbox);
new vm.Script(fs.readFileSync(new URL('counterfactual-review.js',root),'utf8'),{filename:'counterfactual-review.js'}).runInContext(sandbox);

const waitFor=async(pred,label)=>{for(let i=0;i<80;i++){if(pred())return;await new Promise(r=>setTimeout(r,5))}throw new Error('timeout: '+label)};
await waitFor(()=>WB.CoachIntegration&&WB.RuntimeDecisionPipeline&&WB.RuntimeAuthorityBinding&&WB.PositionStateRuntime&&WB.CommonRuleEngineRuntime,'production dynamic bootstrap');
await waitFor(()=>WB.RuntimeDecisionPipeline.authorityStatus().ready===true,'P-F0A provider binding');

const P=WB.RuntimeDecisionPipeline,B=WB.RuntimeAuthorityBinding,PS=WB.PositionStateRuntime;
let passed=0;const t=async(name,fn)=>{try{await fn();passed++}catch(err){err.message=`${name}: ${err.message}`;throw err}};

await t('PF1R1-01 source diagnostic identity',async()=>assert.equal(fixture.source.diagnostic,'shadowverse-wb-diagnostic-v4.13.86-2026-09-27T0347.json'));
await t('PF1R1-02 source diagnostic hash pinned',async()=>assert.equal(fixture.source.sha256,'826095264cb53b81a4746dfb5f44c7dd31d1651ece63f08337269506e00592c8'));
await t('PF1R1-03 real source video identity',async()=>assert.equal(fixture.source.videoName,'ScreenRecording_09-24-2026 05-00-39_1.mov'));
await t('PF1R1-04 exact capture count retained',async()=>assert.equal(fixture.stateCaptureHistory.length,5));
await t('PF1R1-05 exact Decision Window count retained',async()=>assert.equal(fixture.decisionWindows.length,6));
await t('PF1R1-06 production Counterfactual bootstrap loaded P-E2',async()=>assert.ok(WB.CoachIntegration));
await t('PF1R1-07 P-E2 bootstrap loaded P-F1',async()=>assert.ok(WB.RuntimeDecisionPipeline));
await t('PF1R1-08 P-F1 bootstrap loaded P-F0A',async()=>assert.ok(WB.RuntimeAuthorityBinding));
await t('PF1R1-09 P-F0A loaded PositionState and Rule Engine',async()=>{assert.ok(WB.PositionStateRuntime);assert.ok(WB.CommonRuleEngineRuntime)});
await t('PF1R1-10 provider is formally ready',async()=>{const x=P.authorityStatus();assert.equal(x.ready,true);assert.equal(x.providerId,'P-F0A_RUNTIME_AUTHORITY_V1')});
await t('PF1R1-11 startup seed preserved all real captures',async()=>assert.equal(B.snapshot().capturedAuthorityStates,5));
await t('PF1R1-12 real captures are not falsely matched to earlier windows',async()=>assert.ok(fixture.decisionWindows.every(w=>B.closestObservation(w.beforeState)===null)));
await t('PF1R1-13 nearest real capture remains outside 35ms authority binding',async()=>{const ds=[];for(const c of fixture.stateCaptureHistory)for(const w of fixture.decisionWindows)ds.push(Math.abs(c.context.time-w.beforeState.time));assert.ok(Math.abs(Math.min(...ds)-6.798)<1e-9)});
await t('PF1R1-14 known-board capture still preserves unknown Ward',async()=>{const s=PS.createState(PS.observationFromCapture(fixture.stateCaptureHistory[1]));assert.equal(s.observed.boardStructureKnown,true);assert.ok(s.authority.criticalIssues.includes(PS.REASON.OPPONENT_WARD_UNRESOLVED))});
await t('PF1R1-15 present Ward without opponent structure is unresolved',async()=>{const s=PS.createState(PS.observationFromCapture(fixture.stateCaptureHistory[3]));assert.ok(s.authority.criticalIssues.includes(PS.REASON.OPPONENT_WARD_STRUCTURE_UNRESOLVED))});
await t('PF1R1-16 missing PP remains unresolved',async()=>{const s=PS.createState(PS.observationFromCapture(fixture.stateCaptureHistory[4]));assert.ok(s.authority.criticalIssues.includes(PS.REASON.PP_UNRESOLVED))});

const safetyRun={runId:'pf1r1-safety-run',nonce:'pf1r1-safety-nonce',startedAt:'2026-10-10T00:00:00.000Z'};
sandbox.window.__wbReplaySessionV1={version:'replay-session-v3',sourceKey:fixture.source.videoKey,analysisRun:safetyRun,decisionWindows:structuredClone(fixture.decisionWindows)};
const beforeEarly=P.snapshot().count;
WB.emit('match-analysis-complete',{cancelled:false,runId:safetyRun.runId,nonce:safetyRun.nonce,source:'pf1r1-real-video-diagnostic-replay'});
await new Promise(r=>setTimeout(r,20));
await t('PF1R1-17 match-analysis-complete alone does not run P-F1 before PF0B',async()=>assert.equal(P.snapshot().count,beforeEarly));
const explicit=await P.evaluateSession({cancelled:false,source:'pf1r1-real-video-diagnostic-replay',pf0b:{runId:safetyRun.runId,nonce:safetyRun.nonce}});
assert.equal(explicit.processed,6);
const rows=P.snapshot().items;
await t('PF1R1-18 every explicitly evaluated real window safely HOLDs',async()=>assert.equal(rows.length,6));
await t('PF1R1-19 exact Decision Authority capture is now mandatory',async()=>assert.ok(rows.every(x=>x.status==='HOLD'&&x.reason==='DECISION_AUTHORITY_CAPTURE_MISSING')));
await t('PF1R1-20 old State Capture history cannot substitute for fresh window authority',async()=>assert.ok(rows.every(x=>x.detail?.binding==null)));
await t('PF1R1-21 no replay-state fallback can create a PositionState',async()=>assert.ok(rows.every(x=>x.detail?.code==='DECISION_AUTHORITY_CAPTURE_MISSING'||x.reason==='DECISION_AUTHORITY_CAPTURE_MISSING')));
await t('PF1R1-22 no comparison decision is invented from insufficient evidence',async()=>assert.equal(events.filter(x=>x.name==='comparison-decision-ready').length,0));
await t('PF1R1-23 P-E2 renders no fake Coach result',async()=>assert.equal(WB.CoachIntegration.snapshot().count,0));
await t('PF1R1-24 old diagnostic remains safety evidence only, not Fresh PASS evidence',async()=>assert.equal(B.snapshot().freshEvidence,null));

assert.equal(errors.length,0,'real-video E2E replay must not raise runtime errors');
assert.equal(passed,24);
console.log(`P-F1-R1 REAL-VIDEO E2E SAFETY REGRESSION PASS: ${passed}/24`);
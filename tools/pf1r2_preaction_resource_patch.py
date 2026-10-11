from pathlib import Path
import hashlib, base64, json, re

root=Path('.')

def replace_once(path, old, new):
    p=root/path
    s=p.read_text(encoding='utf-8')
    n=s.count(old)
    if n!=1:
        raise SystemExit(f'{path}: expected exactly one match, got {n}: {old[:100]}')
    p.write_text(s.replace(old,new,1),encoding='utf-8')

def splice(path,start_marker,end_marker,new_block):
    p=root/path
    s=p.read_text(encoding='utf-8')
    a=s.find(start_marker)
    if a<0: raise SystemExit(f'{path}: start marker missing')
    b=s.find(end_marker,a)
    if b<0: raise SystemExit(f'{path}: end marker missing')
    p.write_text(s[:a]+new_block+s[b:],encoding='utf-8')

# 1) P-A1: UNKNOWN resources must never collapse to zero.
replace_once(Path('legal-action-sequence.js'),"VERSION='pa1-legal-action-sequence-v1.0.0'","VERSION='pa1-legal-action-sequence-v1.0.1'")
replace_once(Path('legal-action-sequence.js'),
"const clone=v=>v==null?v:JSON.parse(JSON.stringify(v)),uniq=a=>[...new Set((a||[]).filter(Boolean))];",
"const clone=v=>v==null?v:JSON.parse(JSON.stringify(v)),uniq=a=>[...new Set((a||[]).filter(Boolean))],knownNumber=v=>v!==null&&v!==undefined&&!(typeof v==='string'&&v.trim()==='')&&Number.isFinite(Number(v));")
start="  for(const f of followers){const src={zone:'FIELD',instanceId:f.instanceId||f.id||null,cardId:f.cardId||null};if(f.evolved===true||f.superEvolved===true)"
end="  for(const f of me.field)if(Array.isArray(f.activations))"
new_block="""  for(const f of followers){
   const src={zone:'FIELD',instanceId:f.instanceId||f.id||null,cardId:f.cardId||null};
   if(f.evolved===true||f.superEvolved===true){if(includeDiagnostics){rejected.push(diag(ACTION_TYPES.EVOLVE,LEGALITY.ILLEGAL,[REASON.ILLEGAL_ALREADY_EVOLVED],src));rejected.push(diag(ACTION_TYPES.SUPER_EVOLVE,LEGALITY.ILLEGAL,[REASON.ILLEGAL_ALREADY_EVOLVED],src));}continue;}
   const epKnown=knownNumber(me.ep),sepKnown=knownNumber(me.sep);
   if(me.evolveWindowOpen===true&&epKnown&&Number(me.ep)>0&&f.canEvolve===true)actions.push(action(ACTION_TYPES.EVOLVE,s,p,src,null,null,{ep:1},sequenceDepth,'P-A1_EVOLVE_COMMON',['LEGAL_EP_AVAILABLE']));
   else{const rs=[];if(me.evolveWindowOpen===false)rs.push(REASON.ILLEGAL_EVOLVE_WINDOW_CLOSED);if(epKnown&&Number(me.ep)<=0)rs.push(REASON.ILLEGAL_NOT_ENOUGH_EP);if(rs.length&&includeDiagnostics)rejected.push(diag(ACTION_TYPES.EVOLVE,LEGALITY.ILLEGAL,rs,src));else if(!rs.length)unknown.push(diag(ACTION_TYPES.EVOLVE,LEGALITY.UNKNOWN,[REASON.UNKNOWN_EVOLVE_RULE],src,null,null,{resource:'ep',value:me.ep??null}));}
   if(me.superEvolveWindowOpen===true&&sepKnown&&Number(me.sep)>0&&f.canSuperEvolve===true)actions.push(action(ACTION_TYPES.SUPER_EVOLVE,s,p,src,null,null,{sep:1},sequenceDepth,'P-A1_SUPER_EVOLVE_COMMON',['LEGAL_SEP_AVAILABLE']));
   else{const rs=[];if(me.superEvolveWindowOpen===false)rs.push(REASON.ILLEGAL_SUPER_EVOLVE_WINDOW_CLOSED);if(sepKnown&&Number(me.sep)<=0)rs.push(REASON.ILLEGAL_NOT_ENOUGH_SEP);if(rs.length&&includeDiagnostics)rejected.push(diag(ACTION_TYPES.SUPER_EVOLVE,LEGALITY.ILLEGAL,rs,src));else if(!rs.length)unknown.push(diag(ACTION_TYPES.SUPER_EVOLVE,LEGALITY.UNKNOWN,[REASON.UNKNOWN_SUPER_EVOLVE_RULE],src,null,null,{resource:'sep',value:me.sep??null}));}
  }
"""
splice(Path('legal-action-sequence.js'),start,end,new_block)

# PA1 regression: pin version and fail-closed null semantics.
p=Path('tests/pa1-legal-action-sequence-regression.mjs');s=p.read_text(encoding='utf-8')
s=s.replace("assert.equal(P.version,'pa1-legal-action-sequence-v1.0.0');","""// UNKNOWN EP/SEP must remain UNKNOWN; known zero remains ILLEGAL.
s=base();s.players.P1.ep=null;s.players.P1.evolveWindowOpen=null;s.players.P1.field=[follower('evo-unknown')];g=gen(s);assert.equal(ofType(g,ACTION_TYPES.EVOLVE).length,0);assert.ok(g.unknown.some(x=>x.actionType===ACTION_TYPES.EVOLVE&&x.reasonCodes.includes(REASON.UNKNOWN_EVOLVE_RULE)));assert.equal(g.rejected.some(x=>x.actionType===ACTION_TYPES.EVOLVE&&x.reasonCodes.includes(REASON.ILLEGAL_NOT_ENOUGH_EP)),false);
s=base();s.players.P1.sep=null;s.players.P1.superEvolveWindowOpen=null;s.players.P1.field=[follower('sep-unknown')];g=gen(s);assert.equal(ofType(g,ACTION_TYPES.SUPER_EVOLVE).length,0);assert.ok(g.unknown.some(x=>x.actionType===ACTION_TYPES.SUPER_EVOLVE&&x.reasonCodes.includes(REASON.UNKNOWN_SUPER_EVOLVE_RULE)));assert.equal(g.rejected.some(x=>x.actionType===ACTION_TYPES.SUPER_EVOLVE&&x.reasonCodes.includes(REASON.ILLEGAL_NOT_ENOUGH_SEP)),false);
s=base();s.players.P1.ep=0;s.players.P1.evolveWindowOpen=true;s.players.P1.field=[follower('evo-zero')];g=gen(s);assert.ok(g.rejected.some(x=>x.actionType===ACTION_TYPES.EVOLVE&&x.reasonCodes.includes(REASON.ILLEGAL_NOT_ENOUGH_EP)));
assert.equal(P.version,'pa1-legal-action-sequence-v1.0.1');""")
p.write_text(s,encoding='utf-8')

# 2) P-C1: null/blank resource values remain null, never Number(null)==0.
replace_once(Path('outcome-backtracking.js'),"VERSION='pc1-outcome-backtracking-v1.0.0'","VERSION='pc1-outcome-backtracking-v1.0.1'")
replace_once(Path('outcome-backtracking.js'),"const num=v=>Number.isFinite(Number(v))?Number(v):null;","const num=v=>v!==null&&v!==undefined&&!(typeof v==='string'&&v.trim()==='')&&Number.isFinite(Number(v))?Number(v):null;")
replace_once(Path('tests/pc1-static-validation.mjs'),"pc1-outcome-backtracking-v1.0.0","pc1-outcome-backtracking-v1.0.1")

# 3) P-F0A: strictly bounded same-run pre-action positive availability carry.
replace_once(Path('runtime-authority-binding.js'),"const VERSION='pf0a-runtime-authority-binding-v1.1.5'","const VERSION='pf0a-runtime-authority-binding-v1.1.6'")
marker="function sameTurnSide(a,b){if(!a||!b)return false;const sameTurn=safeFinite(a.turn)!=null&&safeFinite(b.turn)!=null&&safeFinite(a.turn)===safeFinite(b.turn),sideA=a.absoluteSide??a.relativeSide??null,sideB=b.absoluteSide??b.relativeSide??null;return sameTurn&&sideA!=null&&sideB!=null&&String(sideA)===String(sideB)}\n"
helper="""function sameTurnSide(a,b){if(!a||!b)return false;const sameTurn=safeFinite(a.turn)!=null&&safeFinite(b.turn)!=null&&safeFinite(a.turn)===safeFinite(b.turn),sideA=a.absoluteSide??a.relativeSide??null,sideB=b.absoluteSide??b.relativeSide??null;return sameTurn&&sideA!=null&&sideB!=null&&String(sideA)===String(sideB)}
const RESOURCE_CARRY_VERSION='pf1r2-preaction-resource-authority-v1.0.0',RESOURCE_CARRY_MAX_GAP=.55;
function handSignature(obs){const rows=Object.entries(obs?.handRecognized||{}).map(([id,row])=>[String(id),Math.max(0,Number(row?.count)||0)]).filter(([,n])=>n>0).sort((a,b)=>a[0].localeCompare(b[0]));return rows.length?JSON.stringify(rows):null}
function boardSignature(obs){if(obs?.boardStructureKnown!==true||!Array.isArray(obs?.boardFollowers))return null;return JSON.stringify(obs.boardFollowers.map(f=>[safeFinite(f?.attackValue),f?.attackable===true?1:0,safeFinite(f?.position?.attackBadgeCx),safeFinite(f?.position?.attackBadgeCy)]))}
function wardContradictionFree(a,b){const x=String(a?.opponentWard??'unknown'),y=String(b?.opponentWard??'unknown');return x==='unknown'||y==='unknown'||x===y}
function stableForResourceCarry(source,anchor){if(!source||!anchor||source.partial===true||anchor.partial===true||!sameTurnSide(source,anchor))return false;const st=safeFinite(source.time),at=safeFinite(anchor.time),gap=at!=null&&st!=null?at-st:null;if(gap==null||gap<=0||gap>RESOURCE_CARRY_MAX_GAP)return false;for(const k of ['pp','opponentHP']){const x=safeFinite(source[k]),y=safeFinite(anchor[k]);if(x==null||y==null||x!==y)return false}if(source.boardDamageKnown!==true||anchor.boardDamageKnown!==true||safeFinite(source.boardDamage)==null||safeFinite(source.boardDamage)!==safeFinite(anchor.boardDamage))return false;const hs=handSignature(source),ha=handSignature(anchor);if(hs==null||ha==null||hs!==ha)return false;const bs=boardSignature(source),ba=boardSignature(anchor);if(bs==null||ba==null||bs!==ba)return false;if(!wardContradictionFree(source,anchor))return false;return true}
function preActionResourceObservation(anchor){const observation=clone(anchor);if(!observation)return{observation:null,authority:null};const at=safeFinite(anchor.time),needs=['ep','sep'].filter(k=>String(anchor?.resources?.[k]??'unknown')==='unknown');if(at==null||!needs.length)return{observation,authority:null};let best=null;for(const source of captures.values()){if(!stableForResourceCarry(source,anchor))continue;const carried={};for(const k of needs)if(String(source?.resources?.[k]??'unknown')==='yes')carried[k]='yes';if(!Object.keys(carried).length)continue;const gap=at-safeFinite(source.time);if(!best||gap<best.gap)best={source,carried,gap}}if(!best)return{observation,authority:null};observation.resources={...(observation.resources||{}),...best.carried};const authority={version:RESOURCE_CARRY_VERSION,policy:'same-run-preaction-positive-availability-only',sourceStateId:best.source.sourceStateId||null,sourceTime:safeFinite(best.source.time),anchorStateId:anchor.sourceStateId||null,anchorTime:at,gapSeconds:Number(best.gap.toFixed(3)),carried:clone(best.carried),criteria:{sameTurnSide:true,maxGapSeconds:RESOURCE_CARRY_MAX_GAP,ppStable:true,opponentHpStable:true,boardDamageStable:true,boardStructureStable:true,recognizedHandStable:true,wardKnownValuesNonContradictory:true,positiveAvailabilityOnly:true,afterStateUsed:false}};return{observation,authority}}
"""
replace_once(Path('runtime-authority-binding.js'),marker,helper)
old="const obs=captures.get(binding.anchorStateId)||null;if(!obs||String(obs.sourceStateId)!==String(binding.anchorStateId))throw authorityError('DECISION_AUTHORITY_CAPTURE_MISSING',{windowId,runId:requestedRunId,role:'anchor',stateId:binding.anchorStateId});return W.PositionStateRuntime.createState(obs,{windowId,window:clone(win),preActionAnchor:clone(resolved),freshAuthority:{gateVersion:FRESH_GATE_VERSION,runId:requestedRunId,nonce:binding.nonce,windowId:String(windowId||''),anchorStateId:binding.anchorStateId,afterStateId:binding.afterStateId,anchorExact:true,afterExact:true}})"
new="const obs=captures.get(binding.anchorStateId)||null;if(!obs||String(obs.sourceStateId)!==String(binding.anchorStateId))throw authorityError('DECISION_AUTHORITY_CAPTURE_MISSING',{windowId,runId:requestedRunId,role:'anchor',stateId:binding.anchorStateId});const enriched=preActionResourceObservation(obs),freshAuthority={gateVersion:FRESH_GATE_VERSION,runId:requestedRunId,nonce:binding.nonce,windowId:String(windowId||''),anchorStateId:binding.anchorStateId,afterStateId:binding.afterStateId,anchorExact:true,afterExact:true},state=W.PositionStateRuntime.createState(enriched.observation,{windowId,window:clone(win),preActionAnchor:clone(resolved),freshAuthority,preActionResourceAuthority:clone(enriched.authority)});if(state){state.freshAuthority=clone(freshAuthority);state.authority={...(state.authority||{}),preActionResourceAuthority:clone(enriched.authority)}}return state"
replace_once(Path('runtime-authority-binding.js'),old,new)
replace_once(Path('runtime-authority-binding.js'),"preActionAnchorVersion:PREACTION_ANCHOR_VERSION,freshGateVersion:FRESH_GATE_VERSION,providerId:PROVIDER_ID","preActionAnchorVersion:PREACTION_ANCHOR_VERSION,resourceCarryVersion:RESOURCE_CARRY_VERSION,freshGateVersion:FRESH_GATE_VERSION,providerId:PROVIDER_ID")
replace_once(Path('runtime-authority-binding.js'),"preActionAnchorVersion:PREACTION_ANCHOR_VERSION,freshGateVersion:FRESH_GATE_VERSION,providerId:PROVIDER_ID,ready,indexCapture","preActionAnchorVersion:PREACTION_ANCHOR_VERSION,resourceCarryVersion:RESOURCE_CARRY_VERSION,freshGateVersion:FRESH_GATE_VERSION,providerId:PROVIDER_ID,ready,indexCapture")
replace_once(Path('runtime-authority-binding.js'),"closestObservation,resolveDecisionAnchor,getPositionState","closestObservation,preActionResourceObservation,resolveDecisionAnchor,getPositionState")
replace_once(Path('tests/pf0a-runtime-authority-binding-regression.mjs'),"pf0a-runtime-authority-binding-v1.1.5","pf0a-runtime-authority-binding-v1.1.6")
# Static contract for bounded, before-only carry.
p=Path('tests/pf0a-static-validation.mjs');s=p.read_text(encoding='utf-8');insert="""\nassert.match(binding,/pf1r2-preaction-resource-authority-v1\\.0\\.0/);\nassert.match(binding,/RESOURCE_CARRY_MAX_GAP=\\.55/);\nassert.match(binding,/positiveAvailabilityOnly:true/);\nassert.match(binding,/afterStateUsed:false/);\nassert.match(binding,/wardKnownValuesNonContradictory:true/);\n""";s=s.replace("assert.match(binding,/P-F0A_UNMODELED_CARD_RULE/);", "assert.match(binding,/P-F0A_UNMODELED_CARD_RULE/);"+insert);p.write_text(s,encoding='utf-8')

# 4) PlayedMove: EP/SEP observations are binary availability, not P-C1 remaining counts.
replace_once(Path('played-move-authority.js'),"pf1r2-played-move-authority-v1.1.1","pf1r2-played-move-authority-v1.2.0")
replace_once(Path('played-move-authority.js'),"ep:Object.freeze({semantic:'EVOLUTION_POINT_AVAILABILITY',observedAuthority:'STATE_RECOGNITION_EP',candidateAuthority:'P-C1_RESOURCE_REMAINING_EP'}),\n sep:Object.freeze({semantic:'SUPER_EVOLUTION_POINT_AVAILABILITY',observedAuthority:'STATE_RECOGNITION_SEP',candidateAuthority:'P-C1_RESOURCE_REMAINING_SEP'})","ep:Object.freeze({semantic:'EVOLUTION_POINT_AVAILABILITY',observedAuthority:'STATE_RECOGNITION_EP_AVAILABILITY',candidateAuthority:'P-C1_RESOURCE_REMAINING_EP',comparable:false}),\n sep:Object.freeze({semantic:'SUPER_EVOLUTION_POINT_AVAILABILITY',observedAuthority:'STATE_RECOGNITION_SEP_AVAILABILITY',candidateAuthority:'P-C1_RESOURCE_REMAINING_SEP',comparable:false})")
replace_once(Path('played-move-authority.js'),"function observedProjection(obs){return{pp:finite(obs?.pp),opponentHP:finite(obs?.opponentHP),attackableBoardDamage:obs?.boardDamageKnown===true?finite(obs?.boardDamage):null,ep:tri(String(obs?.resources?.ep??'unknown')),sep:tri(String(obs?.resources?.sep??'unknown'))};}","function observedProjection(obs){return{pp:finite(obs?.pp),opponentHP:finite(obs?.opponentHP),attackableBoardDamage:obs?.boardDamageKnown===true?finite(obs?.boardDamage):null,ep:null,sep:null};}")
# PM regression updates + real-device resource-mismatch case.
p=Path('tests/pf1r2-played-move-authority-regression.mjs');s=p.read_text(encoding='utf-8');s=s.replace("pf1r2-played-move-authority-v1.1.1","pf1r2-played-move-authority-v1.2.0");s=s.replace("{pp:1,opponentHP:16,attackableBoardDamage:3,ep:1,sep:0}","{pp:1,opponentHP:16,attackableBoardDamage:3,ep:null,sep:null}",1)
oldtail="t('PM-25 video reset clears capture authority',()=>{P.indexCapture(anchorCap);for(const f of handlers.get('video-reset')||[])f({});assert.equal(P.snapshot().capturedStateCount,0)});\nassert.equal(n,25);console.log(`P-F1-R2-PM PLAYED MOVE AUTHORITY REGRESSION PASS: ${n}/${n}`);"
newtail="""t('PM-25 availability-only EP/SEP mismatch cannot veto structural exact-state match',()=>{P.clear();const a=capture({time:400,pp:2,hp:16,board:0,ep:'unknown',sep:'unknown',at:'2026-10-09T00:00:03.000Z'}),z=capture({time:401,pp:1,hp:16,board:3,ep:'yes',sep:'yes',at:'2026-10-09T00:00:04.000Z'});P.indexCapture(a);P.indexCapture(z);const b={...binding,anchorStateId:'st:8:bottom:400.000',afterStateId:'st:8:bottom:401.000'};const evolved={...quick,immediateOutcome:{...quick.immediateOutcome,resourceRemaining:{pp:1,ep:0,sep:null}}};const r=P.identify({windowId,runId,binding:b,sequences:[quickSeq],outcomes:[evolved]});assert.equal(r.status,'CONFIRMED');assert.equal(r.playedCandidateId,'seq-quick');assert.equal(r.evidence.some(x=>x.field==='ep'||x.field==='sep'),false)});\nt('PM-26 video reset clears capture authority',()=>{P.indexCapture(anchorCap);for(const f of handlers.get('video-reset')||[])f({});assert.equal(P.snapshot().capturedStateCount,0)});\nassert.equal(n,26);console.log(`P-F1-R2-PM PLAYED MOVE AUTHORITY REGRESSION PASS: ${n}/${n}`);"""
if s.count(oldtail)!=1: raise SystemExit('PM regression tail changed')
s=s.replace(oldtail,newtail,1);p.write_text(s,encoding='utf-8')
replace_once(Path('tests/pf1r2pm-static-validation.mjs'),"pf1r2-played-move-authority-v1.1.1","pf1r2-played-move-authority-v1.2.0")
p=Path('tests/pf1r2pm-static-validation.mjs');s=p.read_text(encoding='utf-8');s=s.replace("must(pm,'ATTACKABLE_LEADER_DAMAGE_POTENTIAL');","must(pm,'ATTACKABLE_LEADER_DAMAGE_POTENTIAL');must(pm,\"comparable:false\");");p.write_text(s,encoding='utf-8')

# 5) Real-device trace subset regression for 113.188 -> 113.638 -> 116.338.
fixture={
 'version':'pf1r2-preaction-resource-authority-fixture-v1',
 'source':'iPhone-2026-10-11-1530-diagnostic-trace-subset',
 'runId':'match:1791732572913:923573ff-27eb-47f1-b622-a5c1f981a887','nonce':'923573ff-27eb-47f1-b622-a5c1f981a887',
 'pre':{'time':113.188,'pp':2,'hp':16,'ep':'yes','sep':'unknown','ward':'unknown','board':0,'quick':True,'at':'2026-10-11T15:30:01.775Z'},
 'anchor':{'time':113.638,'pp':2,'hp':16,'ep':'unknown','sep':'unknown','ward':'none','board':0,'quick':True,'at':'2026-10-11T15:30:08.327Z'},
 'after':{'time':116.338,'pp':1,'hp':16,'ep':'yes','sep':'yes','ward':'unknown','board':3,'quick':False,'at':'2026-10-11T15:30:09.717Z'},
 'expected':{'carried':{'ep':'yes'},'sepRemainsUnknown':True,'playedMoveStatus':'CONFIRMED','classification':'TRADE_OFF','recommendation':None}
}
Path('tests/pf1r2-preaction-resource-authority-fixture.json').write_text(json.dumps(fixture,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
test=r'''import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url),read=n=>fs.readFileSync(new URL(n,root),'utf8'),fixture=JSON.parse(fs.readFileSync(new URL('./pf1r2-preaction-resource-authority-fixture.json',import.meta.url),'utf8'));
const listeners=new Map(),events=[],video={currentTime:0};let liveSession=null;
const recognized=q=>q?{quickBlader:{id:'quickBlader',label:'刹那のクイックブレイダー',known:true,count:1,confidence:.9221}}:{};
const cap=row=>({at:row.at,version:'state-clean-1.8.29',captureMode:'decision-authority',partial:false,context:{time:row.time,turn:8,absoluteSide:'bottom',relativeSide:'自分',targetSide:'bottom',playOrder:'後攻',videoKey:'0923'},confirmed:{version:'confirmed-state-v1',time:row.time,turn:8,absoluteSide:'bottom',relativeSide:'自分',pp:row.pp,opponentHP:row.hp,extraPP:'unknown',ep:row.ep,sep:row.sep,opponentWard:row.ward,boardDamage:row.board,boardDamageKnown:true,hand:{recognized:recognized(row.quick)}},resources:{ui:{extra:'unknown',ep:row.ep,sep:row.sep,ward:row.ward}},ward:{state:row.ward},hand:{result:{known:true,recognized:recognized(row.quick),unresolved:{}}},board:{result:{accepted:true,known:true,value:row.board,attackableTotal:row.board,faceDamageConfirmed:true,candidateTotal:row.board,followers:[]}}});
const exactByTime=new Map([[fixture.anchor.time,cap(fixture.anchor)],[fixture.after.time,cap(fixture.after)]]);
const WB={optionalModules:[],stateCaptureHistory:[],stateCapture:null,video,registerModule(){},log(){},recordError(){},emit(name,detail){events.push({name,detail});for(const f of listeners.get(name)||[])f(detail)},on(name,fn){if(!listeners.has(name))listeners.set(name,[]);listeners.get(name).push(fn)},onReady(fn){fn()},$(){return null},seekTo:async t=>{video.currentTime=Number(t);return Number(t)},videoKey:()=> '0923',CardDB:{get(id){return id==='quickBlader'?{id,type:'フォロワー',cost:1,atk:1,life:1,tags:['疾走']}:null}},StateRecognition:{captureState:async()=>structuredClone(exactByTime.get(Number(video.currentTime)))},ReplaySession:{snapshot:()=>liveSession,ingestState(){}}};
const sandbox={window:{WB,__wbReplaySessionV1:null},console,structuredClone,Date,Promise,setTimeout,clearTimeout,queueMicrotask,crypto:{randomUUID:()=>`r-${Date.now()}`}};vm.createContext(sandbox);
for(const f of ['position-state-runtime.js','common-rule-engine-runtime.js','legal-action-sequence.js','outcome-backtracking.js','comparison-decision.js','played-move-authority.js','runtime-decision-pipeline.js','runtime-authority-binding.js'])new vm.Script(read(f),{filename:f}).runInContext(sandbox);
const B=WB.RuntimeAuthorityBinding,P=WB.RuntimeDecisionPipeline,PM=WB.PlayedMoveAuthority;
let passed=0;const t=async(name,fn)=>{try{await fn();passed++;console.log('PASS '+name)}catch(e){e.message=name+': '+e.message;throw e}};
const id=x=>`st:8:bottom:${Number(x).toFixed(3)}`,before={id:id(fixture.anchor.time),time:fixture.anchor.time,turn:8,absoluteSide:'bottom',relativeSide:'自分',pp:2,opponentHP:16,resources:{ep:'unknown',sep:'unknown',extraPP:'unknown'},opponentWard:'none',boardDamage:0,boardDamageKnown:true,hand:{recognized:recognized(true)}},after={id:id(fixture.after.time),time:fixture.after.time,turn:8,absoluteSide:'bottom',relativeSide:'自分',pp:1,opponentHP:16,resources:{ep:'yes',sep:'yes',extraPP:'unknown'},opponentWard:'unknown',boardDamage:3,boardDamageKnown:true,hand:{recognized:{}}},win={id:`dw:${before.id}->${after.id}`,beforeState:before,afterState:after,relatedActionIds:[]};
const run={runId:fixture.runId,nonce:fixture.nonce,startedAt:'2026-10-11T15:29:32.913Z'};liveSession={analysisRun:run,states:[before,after],actions:[],decisionWindows:[win]};sandbox.window.__wbReplaySessionV1=liveSession;
WB.emit('match-analysis-start',run);for(const row of [fixture.pre,fixture.anchor,fixture.after])WB.emit('state-captured',{capture:cap(row)});
let summary,state,row;
await t('RA-01 exact runtime build inputs use production match run id',()=>assert.match(run.runId,/^match:\d+:/));
await t('RA-02 pre source is before anchor by 0.45s',()=>assert.ok(Math.abs((fixture.anchor.time-fixture.pre.time)-.45)<1e-9));
await t('RA-03 source has positive EP but unresolved SEP',()=>{assert.equal(fixture.pre.ep,'yes');assert.equal(fixture.pre.sep,'unknown')});
await t('RA-04 anchor itself keeps EP and SEP unknown',()=>{assert.equal(fixture.anchor.ep,'unknown');assert.equal(fixture.anchor.sep,'unknown')});
await t('RA-05 exact authority binding completes',async()=>{summary=await B.enrichDecisionWindows({...run,finishedAt:'2026-10-11T15:30:06.864Z'});assert.equal(summary.status,'OK');assert.equal(summary.capturedWindows,1)});
await t('RA-06 position carries only positive pre-action EP authority',async()=>{state=await B.getPositionState({windowId:win.id,context:{window:win,analysis:{pf0b:summary}},session:liveSession});assert.equal(state.players.self.ep,1);assert.equal(state.players.self.sep,null);assert.deepEqual(state.authority.preActionResourceAuthority.carried,{ep:'yes'});assert.equal(state.authority.preActionResourceAuthority.sourceStateId,id(fixture.pre.time));assert.equal(state.authority.preActionResourceAuthority.criteria.afterStateUsed,false)});
await t('RA-07 unknown SEP remains unknown through P-C1 resource snapshot',async()=>{const prov=B.provider(),E=WB.LegalActionSequence.create({stateAdapter:prov.stateAdapter,ruleEngine:prov.ruleEngine,cardAuthority:prov.cardAuthority},prov.actionOptions),g=E.generateSequences(state,prov.sequenceLimits),pc1=WB.OutcomeBacktracking.create({actionEngine:E,stateAdapter:prov.stateAdapter,ruleEngine:prov.ruleEngine},prov.outcomeOptions),ev=pc1.evaluateSequences(state,g.sequences,prov.outcomeLimits);assert.ok(ev.outcomes.length>0);assert.ok(ev.outcomes.some(o=>o.resourceRemaining?.sep===null))});
await t('RA-08 Quick plus normal evolution candidate is generated',async()=>{const prov=B.provider(),E=WB.LegalActionSequence.create({stateAdapter:prov.stateAdapter,ruleEngine:prov.ruleEngine,cardAuthority:prov.cardAuthority},prov.actionOptions),g=E.generateSequences(state,prov.sequenceLimits);assert.ok(g.sequences.some(s=>s.actions?.some(a=>a.actionType==='PLAY_CARD'&&a.source?.cardId==='quickBlader')&&s.actions?.some(a=>a.actionType==='EVOLVE'&&a.source?.cardId==='quickBlader')))});
await t('RA-09 runtime pipeline reaches structured decision',async()=>{await B.bindToPipeline(P);row=await P.evaluateWindow(win.id,{window:win,analysis:{pf0b:summary}});assert.equal(row.status,'OK');assert.ok(row.outcomeCount>3);assert.ok(row.decision)});
await t('RA-10 played move is uniquely Quick plus evolution',()=>{assert.equal(row.playedMove.status,fixture.expected.playedMoveStatus);assert.ok(row.playedMove.matchedActions.some(a=>a.actionType==='PLAY_CARD'&&a.source?.cardId==='quickBlader'));assert.ok(row.playedMove.matchedActions.some(a=>a.actionType==='EVOLVE'&&a.source?.cardId==='quickBlader'))});
await t('RA-11 P-D1 preserves 09-23 no-forced-best tradeoff',()=>{assert.equal(row.decision.classification,fixture.expected.classification);assert.equal(row.decision.bestCandidateId,fixture.expected.recommendation)});
await t('RA-12 PM does not compare binary EP/SEP availability to resource counts',()=>{assert.equal(row.playedMove.evidence.some(x=>x.field==='ep'||x.field==='sep'),false)});
await t('RA-13 unsupported forward/after inference is not part of resource authority',()=>{const a=state.authority.preActionResourceAuthority;assert.equal(a.policy,'same-run-preaction-positive-availability-only');assert.equal(a.criteria.positiveAvailabilityOnly,true);assert.equal(a.criteria.maxGapSeconds,.55)});
assert.equal(PM.version,'pf1r2-played-move-authority-v1.2.0');assert.equal(B.version,'pf0a-runtime-authority-binding-v1.1.6');assert.equal(WB.LegalActionSequence.version,'pa1-legal-action-sequence-v1.0.1');assert.equal(WB.OutcomeBacktracking.version,'pc1-outcome-backtracking-v1.0.1');
console.log(`P-F1-R2 PREACTION RESOURCE AUTHORITY REGRESSION PASS: ${passed}/13`);
'''
Path('tests/pf1r2-preaction-resource-authority-regression.mjs').write_text(test,encoding='utf-8')

# Gate v115 includes the real-device resource-authority regression.
p=Path('tests/run-quality-gate.mjs');s=p.read_text(encoding='utf-8');s=s.replace("recognition-quality-gate-v114","recognition-quality-gate-v115");needle="  'tests/pf1r2-played-move-authority-regression.mjs',\n";s=s.replace(needle,needle+"  'tests/pf1r2-preaction-resource-authority-regression.mjs',\n",1);p.write_text(s,encoding='utf-8')

# Recompute immutable 20-asset runtime authority.
index=Path('index.html');text=index.read_text(encoding='utf-8');mm=re.search(r'const manifest=window\.__wbRuntimeAssetManifest=(\{.*?\});',text,re.S)
if not mm: raise SystemExit('runtime manifest not found')
manifest=json.loads(mm.group(1))
if len(manifest.get('assets',[]))!=20: raise SystemExit('unexpected runtime asset count')
integrity={}
for name in manifest['assets']:
    raw=(root/name).read_bytes();integrity[name]='sha256-'+base64.b64encode(hashlib.sha256(raw).digest()).decode('ascii')
canonical='\n'.join(f'{name}:{integrity[name]}' for name in manifest['assets']);build_id='candidate-assets-'+hashlib.sha256(canonical.encode()).hexdigest()[:12]
manifest['version']='runtime-code-authority-v1';manifest['buildId']=build_id;manifest['integrity']=integrity
new_json=json.dumps(manifest,separators=(',',':'),ensure_ascii=False);text=text[:mm.start(1)]+new_json+text[mm.end(1):];index.write_text(text,encoding='utf-8')
latest_path=Path('latest.json');latest=json.loads(latest_path.read_text(encoding='utf-8'));latest['updatedAt']='2026-10-12T00:45:00+09:00';latest['runtimeBuildId']=build_id;latest['runtimeAssetCount']=20;latest_path.write_text(json.dumps(latest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('RUNTIME_BUILD_ID='+build_id)
for f in ['legal-action-sequence.js','outcome-backtracking.js','runtime-authority-binding.js','played-move-authority.js']:
 print(f+'='+hashlib.sha256(Path(f).read_bytes()).hexdigest())

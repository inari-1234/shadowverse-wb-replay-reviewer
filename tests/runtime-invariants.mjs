import fs from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const root=new URL('../',import.meta.url);
const read=name=>fs.readFileSync(new URL(name,root),'utf8');
const index=read('index.html');
const app=read('app-core.js');
const sw=read('sw.js');
const turnRecognition=read('turn-recognition.js');
const mulliganClass=read('mulligan-class.js');
const review=read('review-engine.js');
const counterfactualReview=read('counterfactual-review.js');
const handRecognition=read('hand-recognition.js');
const stateRecognition=read('state-recognition.js');
const replaySession=read('replay-session.js');
const diagnostics=read('diagnostics.js');
const cardDb=read('card-db.js');
const latest=JSON.parse(read('latest.json'));

const expectedRuntime=[
  'app-core.js',
  'turn-recognition.js',
  'mulligan-class.js',
  'card-db.js',
  'hand-recognition.js',
  'state-recognition.js',
  'replay-session.js',
  'review-engine.js',
  'counterfactual-review.js',
  'diagnostics.js'
];
const runtime=[...index.matchAll(/<script[^>]+src="\.\/([^"]+\.js)"/g)].map(m=>m[1]);
assert.deepEqual(runtime,expectedRuntime,'index runtime must remain exactly the approved ten scripts in order');
assert.equal(runtime.some(x=>/fix-v/i.test(x)),false,'historical fix-v scripts must never load at runtime');
assert.equal(index.includes('recognition-v5-shadow'),false,'v5 shadow experiments must not load in the production runtime');
assert.equal(index.includes('v5-dataset-extractor'),false,'v5 dataset tooling must not load in the production runtime');

const appMeta=app.match(/const APP=\{version:'([^']+)',build:'([^']+)',revision:'([^']+)'/);
assert.ok(appMeta,'app-core APP metadata must be parseable');
const [,appVersion,appBuild,appRevision]=appMeta;
assert.equal(appVersion,latest.version,'app-core version must match latest.json');
assert.equal(appBuild,latest.build,'app-core build must match latest.json');
assert.equal(appRevision,latest.revision,'app-core revision must match latest.json');

const manifestBlock=app.match(/const EXPECTED_MODULE_VERSIONS=Object\.freeze\(\{([\s\S]*?)\}\);/);
assert.ok(manifestBlock,'app-core expected module manifest must be parseable');
const expectedModuleVersions=Object.fromEntries([...manifestBlock[1].matchAll(/'([^']+)'\s*:\s*'([^']+)'/g)].map(m=>[m[1],m[2]]));
const manifestRuntime=['app-core.js',...Object.keys(expectedModuleVersions).map(name=>`${name}.js`)];
assert.deepEqual(expectedRuntime,manifestRuntime,'runtime script contract must match app-core expected module manifest in order');
assert.ok(diagnostics.includes("expectedScripts=['app-core',...Object.keys(WB.expectedModules||{})]"),'diagnostics script integrity must derive its runtime list from app-core expected modules');
assert.ok(diagnostics.includes('expectedScriptSet=new Set(expectedScripts)'),'diagnostics must filter runtime scripts through the manifest-derived contract');
assert.ok(expectedRuntime.includes('replay-session.js')&&expectedRuntime.includes('counterfactual-review.js'),'runtime contract must include ReplaySession and counterfactual review scripts');
const moduleSources={
  'turn-recognition':turnRecognition,
  'mulligan-class':mulliganClass,
  'card-db':cardDb,
  'hand-recognition':handRecognition,
  'state-recognition':stateRecognition,
  'replay-session':replaySession,
  'review-engine':review,
  'counterfactual-review':counterfactualReview,
  'diagnostics':diagnostics
};
assert.deepEqual(Object.keys(expectedModuleVersions),Object.keys(moduleSources),'expected module manifest must list exactly all registered runtime modules');
for(const [name,source] of Object.entries(moduleSources)){
  const sourceVersion=source.match(/const (?:VERSION|V)='([^']+)'/)?.[1];
  assert.ok(sourceVersion,`${name} module version must be parseable`);
  assert.equal(sourceVersion,expectedModuleVersions[name],`${name} source version must match app-core expected manifest`);
}

const sandbox={
  window:{addEventListener(){},dispatchEvent(){}},
  document:{addEventListener(){},querySelector(){return null}},
  console,
  URL,
  Blob,
  File:class File{},
  CustomEvent:class CustomEvent{},
  Promise,
  setTimeout,
  clearTimeout
};
vm.createContext(sandbox);
vm.runInContext(app,sandbox,{filename:'app-core.js'});
const testWB=sandbox.window.WB;
assert.equal(typeof testWB.evaluateModuleIntegrity,'function','app-core must expose module integrity evaluator');
const exactRegistrations=Object.entries(expectedModuleVersions).map(([name,version])=>({name,version}));
const exactIntegrity=testWB.evaluateModuleIntegrity(expectedModuleVersions,exactRegistrations);
assert.equal(exactIntegrity.ok,true,'exact module versions must pass integrity evaluation');
const staleHand=exactRegistrations.map(x=>x.name==='hand-recognition'?{...x,version:'hand-clean-1.38'}:x);
const staleHandIntegrity=testWB.evaluateModuleIntegrity(expectedModuleVersions,staleHand);
assert.equal(staleHandIntegrity.ok,false,'one-generation-old hand module must fail integrity evaluation');
assert.ok(staleHandIntegrity.moduleVersionMismatches.some(x=>x.type==='version-mismatch'&&x.name==='hand-recognition'),'stale hand mismatch must identify hand-recognition');
const staleDiagnostics=exactRegistrations.map(x=>x.name==='diagnostics'?{...x,version:'diagnostics-clean-1.47'}:x);
const staleDiagnosticsIntegrity=testWB.evaluateModuleIntegrity(expectedModuleVersions,staleDiagnostics);
assert.equal(staleDiagnosticsIntegrity.ok,false,'stale diagnostics module must fail integrity evaluation');
assert.ok(staleDiagnosticsIntegrity.moduleVersionMismatches.some(x=>x.type==='version-mismatch'&&x.name==='diagnostics'),'stale diagnostics mismatch must identify diagnostics');
const missingModule=exactRegistrations.filter(x=>x.name!=='state-recognition');
const missingIntegrity=testWB.evaluateModuleIntegrity(expectedModuleVersions,missingModule);
assert.equal(missingIntegrity.ok,false,'missing module must fail integrity evaluation');
assert.ok(missingIntegrity.moduleVersionMismatches.some(x=>x.type==='missing'&&x.name==='state-recognition'),'missing module mismatch must identify the missing module');
const duplicateModule=[...exactRegistrations,{...exactRegistrations.find(x=>x.name==='hand-recognition')}];
const duplicateIntegrity=testWB.evaluateModuleIntegrity(expectedModuleVersions,duplicateModule);
assert.equal(duplicateIntegrity.ok,false,'duplicate module registration must fail integrity evaluation');
assert.ok(duplicateIntegrity.moduleVersionMismatches.some(x=>x.type==='duplicate'&&x.name==='hand-recognition'),'duplicate module mismatch must identify the duplicate module');
testWB.modules=[];testWB.moduleRegistrations=[];testWB.moduleRegistrationDuplicates=[];
testWB.registerModule('hand-recognition',expectedModuleVersions['hand-recognition']);
testWB.registerModule('hand-recognition',expectedModuleVersions['hand-recognition']);
assert.equal(testWB.moduleRegistrations.length,2,'registerModule must retain all registration attempts for duplicate detection');
assert.equal(testWB.moduleRegistrationDuplicates.length,1,'registerModule must record duplicate registration attempts');

const shellTitleVersion=index.match(/<title>シャドバWB リプレイ診断 v([^<]+)<\/title>/)?.[1];
const shellHeader=index.match(/<header><h1>シャドバWB リプレイ診断 v([^<]+)<\/h1><p>([^<]+)<\/p><\/header>/);
assert.equal(shellTitleVersion,latest.version,'static document title must match latest.json version');
assert.ok(shellHeader,'static shell header metadata must be parseable');
assert.equal(shellHeader[1],latest.version,'static shell header version must match latest.json');
assert.ok(shellHeader[2].includes(latest.revision),'static shell subheader must include latest.json revision');

const swBuild=sw.match(/const BUILD='([^']+)'/)?.[1];
const swCache=sw.match(/const CACHE='([^']+)'/)?.[1];
assert.equal(swBuild,latest.build,'service worker build must match latest.json');
assert.equal(swCache,latest.cache,'service worker cache must match latest.json');
const assetsMatch=sw.match(/const ASSETS=\[([^\]]+)\]/);
assert.ok(assetsMatch,'service worker assets must be parseable');
const swScripts=[...assetsMatch[1].matchAll(/'\.\/([^']+\.js)'/g)].map(m=>m[1]);
assert.deepEqual(swScripts,expectedRuntime,'service worker must cache the same approved runtime scripts');
assert.equal(swScripts.some(x=>/fix-v/i.test(x)),false,'service worker must not cache historical fix-v runtime scripts');

assert.equal(review.includes('historyObserved'),false,'review-engine must never consume historyObserved');
const repoRoot=new URL('../',import.meta.url),rootFiles=fs.readdirSync(repoRoot);
assert.deepEqual(rootFiles.filter(name=>/^fix-v.*\.js$/i.test(name)).sort(),['fix-v3.9.2.js'],'main tree must keep only the stable13 provenance patch');
assert.equal(rootFiles.some(name=>/^sw-v4108-.*\.js$/i.test(name)),false,'obsolete service-worker snapshots must not return to main');
assert.equal(fs.existsSync(new URL('../strategy/',import.meta.url)),false,'unwired legacy strategy JSON must not return to production tree');
const stable13Source=fs.readFileSync(new URL('../fix-v3.9.2.js',import.meta.url));
const stable13BlobSha=createHash('sha1').update(Buffer.from(`blob ${stable13Source.length}\0`)).update(stable13Source).digest('hex');
assert.equal(stable13BlobSha,'8543ddc47c0b6648f4151a61d3a5d060eb39ba3f','retained stable13 provenance source must match the production STABLE_SHA');
assert.equal(/shadowverse-wb-(?:diagnostic|review)-v\d+\.\d+\.\d+-clean/.test(diagnostics),false,'diagnostic and review format IDs must not hard-code an app version');
assert.ok(diagnostics.includes('shadowverse-wb-diagnostic-v${WB.APP.version}-clean'),'diagnostic format ID must derive from WB.APP.version');
assert.ok(diagnostics.includes('shadowverse-wb-review-v${WB.APP.version}-clean'),'review format ID must derive from WB.APP.version');
assert.ok(stateRecognition.includes('WB.stateCaptureHistory=history.slice(-5)'),'state recognition must retain the five most recent captures');
assert.ok(stateRecognition.includes("WB.on('video-reset',()=>{WB.stateCaptureHistory=[]"),'state capture history must reset with the video');
assert.ok(diagnostics.includes('stateCaptureHistory:clone(WB.stateCaptureHistory||[])'),'diagnostic/review exports must include recent state-capture history');
assert.ok(stateRecognition.includes("version:'confirmed-state-v1'"),'state recognition must expose a generic confirmed-state snapshot');
assert.ok(index.includes('id="reviewOverviewPanel"'),'user runtime must expose the automatic review overview');
assert.ok(index.includes('id="replaySessionStatus"')&&index.includes('id="reviewPoints"')&&index.includes('id="actionTimeline"'),'automatic review UI must expose session, review-point and action-timeline targets');
assert.ok(index.includes('id="leAnalyzeTurn"'),'state UI must expose one-action same-turn analysis');
const statePanelHtml=index.slice(index.indexOf('<section id="lethalPanel"'),index.indexOf('<section id="reviewOverviewPanel"'));
const reviewPanelHtml=index.slice(index.indexOf('<section id="reviewOverviewPanel"'),index.indexOf('<section class="panel"><h2>7. 局面保存</h2>'));
assert.ok(statePanelHtml.includes('id="leFill"'),'state panel must keep the current-position capture as its primary action');
assert.ok(statePanelHtml.includes('id="stateManualEditor"')&&statePanelHtml.includes('<summary>認識結果を確認・手動修正</summary>'),'manual state correction must remain available but collapsed by default');
assert.equal(statePanelHtml.includes('id="leAnalyzeTurn"'),false,'same-turn analysis must not remain mixed into the state-capture panel');
assert.ok(reviewPanelHtml.includes('id="leAnalyzeTurn"')&&reviewPanelHtml.includes('id="analyzeMatch"'),'single-turn and whole-match analysis must live together in automatic review');
assert.ok(reviewPanelHtml.includes('<summary>自動振り返りの判定・安全条件</summary>'),'automatic-review implementation detail must remain available without dominating the normal UI');
assert.equal(index.includes('id="leCompare"'),false,'fixed two-second comparison must not remain in normal UI');
assert.ok(app.includes("WB.$('#leAnalyzeTurn')"),'app control state must target the new turn-analysis button');
assert.ok(stateRecognition.includes('async function analyzeCurrentTurn(options={})'),'state recognition must implement automatic same-turn stable-frame analysis');
assert.equal(stateRecognition.includes("'match-analysis-turn-anchor'"),false,'whole-match analysis must not retain the redundant context-only anchor seek');
assert.ok(stateRecognition.includes("contextOverride={row:item.row"),'whole-match analysis must derive context from the already-confirmed turn timeline');
assert.ok(stateRecognition.includes("prepareHpProbeFrame(frame,side,hp)"),'stable probes must retain prepared HP OCR evidence for reuse');
assert.ok(stateRecognition.includes("'turn-analysis-hp-cache-verify'"),'HP probe cache must be protected by an exact seek canary');
assert.ok(stateRecognition.includes("if(!match){usePrepared=false;hpProbeCache.fallback=true}"),'canary mismatch must force the full legacy HP seek path');
assert.ok(stateRecognition.includes("mode='direct',prepared=null"),'HP frame reader must support prepared exact-frame OCR without changing OCR consensus rules');
assert.ok(stateRecognition.includes('function selectTurnStablePair(samples,cfg=TURN_ANALYZE_CFG)'),'stable-pair selection must remain explicit and regression-testable');
assert.ok(turnRecognition.includes("TERMINAL_TAIL_GUARD=Object.freeze({tailSeconds:3,targetMinAbsDiff:65,targetMinPixels:1750,targetMinStrongSamples:1,opponentMinAbsDiff:80,opponentMinPixels:1800,opponentMinStrongSamples:2"),'turn recognition must keep the role-aware terminal-tail guard narrowly bounded');
assert.ok(turnRecognition.includes('function terminalTailDecision(timeline=[],duration=null,samples=[])'),'terminal-tail decision must remain independently regression-testable');
assert.ok(turnRecognition.includes("const terminalGuard=await validateTerminalTail(stableRaw),stable=terminalGuard.timeline"),'terminal guard must run only after the stable13 primary scan');
assert.ok(turnRecognition.includes("step=2;primaryCache=new Map()"),'stable13 coarse scan must be restored to the proven exact two-second implementation');
assert.ok(turnRecognition.includes("coarseSeekMode:'exact-2s-restored'"),'diagnostics must identify the restored exact stable13 scanner');
assert.equal(turnRecognition.includes('fastSeek'),false,'turn recognition must not use approximate fastSeek after the precision regression');
assert.equal(turnRecognition.includes('requestVideoFrameCallback'),false,'turn recognition must not use the failed continuous-playback experiment');
assert.ok(turnRecognition.includes("EARLY_VALIDATION_HARD_ERRORS=new Set(['side-offset-mismatch','turn-sequence-gap','non-alternating-merged-timeline'])"),'structural early/stable contradictions must be hard-gated');
assert.ok(turnRecognition.includes("if(val?.error&&isHardEarlyValidationError(val.message))"),'hard validation errors must stop before timeline and play-order publication');
assert.ok(mulliganClass.includes("onSample=null"),'mulligan preflight must expose a zero-seek sample reuse hook');
assert.ok(mulliganClass.includes("onSample({time:row.time,src,row})"),'mulligan hook must receive the already-decoded 1200px frame');
assert.ok(turnRecognition.includes("validatedSignal(frame=null)"),'turn validation must accept the already-decoded mulligan frame without redrawing the full frame');
assert.ok(turnRecognition.includes("verifyValidatedSeedCache(cache,counter)"),'preflight turn samples must be exact-canary verified before reuse');
assert.ok(turnRecognition.includes("'turn-preflight-seed-verify'"),'seed verification must use exact production seeking');
assert.ok(turnRecognition.includes("let val=await validateEarlyOnly(stable,earlySeedCache)"),'early validation must receive only the current turn-analysis preflight cache');
assert.ok(turnRecognition.includes("preflightValidationCache:{captured:"),'seed capture/verification/reuse counts must remain diagnosable');
assert.ok(turnRecognition.includes("terminalTailGuard:'last-row<=3s-role-aware-entry-evidence-v2'"),'turn module must advertise the terminal-tail safety contract');
assert.ok(index.includes('相手側候補なら通常の相手ターンHUD相当の強い入口シグナルが複数フレームで続く場合だけ採用'),'UI must disclose the role-aware terminal-tail revalidation behavior');
assert.ok(stateRecognition.includes('function selectTurnTimelineAnchors(discovery,cfg=TURN_ANALYZE_CFG)'),'turn analysis must explicitly select bounded multi-point anchors');
assert.ok(stateRecognition.includes('timelineMaxGap:2.7'),'multi-point timeline coverage must stay below ReplaySession three-second detail limit');
assert.ok(stateRecognition.includes('maxTimelineAnchors:10'),'multi-point timeline must cap per-turn state capture growth');
assert.ok(stateRecognition.includes('async function captureTimelineState(ctx,time,evidence=null)'),'intermediate timeline points must use the lightweight capture path');
assert.ok(stateRecognition.includes("reason:'timeline-lite-skips-hand'"),'lightweight intermediate capture must not repeat heavy hand-history analysis');
assert.ok(stateRecognition.includes("turnTimelineMultipoint:true"),'state module must advertise multi-point turn analysis');
assert.ok(handRecognition.includes("ctx?.historyScan!==false"),'hand history scan must be caller-controllable without changing current-hand recognition');
assert.ok(handRecognition.includes("frameCanvas:canvas"),'current/forward hand layout scans must retain the exact sampled canvas for same-frame confirmation');
assert.ok(handRecognition.includes("row?.frameCanvas?.width&&row?.frameCanvas?.height?row.frameCanvas:null"),'hand confirmation must prefer the exact cached layout frame when available');
assert.ok(handRecognition.includes("frameSource:source"),'hand samples must record whether they came from layout cache or video seek');
assert.ok(handRecognition.includes("layoutFrameCache:true"),'hand module must advertise layout-frame reuse');

assert.ok(stateRecognition.includes("handHistory:!batchMode"),'whole-match analysis must skip only auxiliary hand-history scans at full endpoints');
assert.ok(stateRecognition.includes("analyzeCurrentTurn({batchMode:true,contextOverride})"),'whole-match analysis must explicitly enable batch optimization');
assert.ok(stateRecognition.includes("restorePosition:!batchMode"),'whole-match discovery must skip only the redundant restore while manual analysis keeps restoration');
assert.ok(stateRecognition.includes("const canary=ocrTargets[0]"),'HP cache canary must prime the first chronological stable anchor');
assert.ok(stateRecognition.includes("else captureSeekReuseCount++"),'capture path must reuse an already exact anchor without another seek');
assert.ok(stateRecognition.includes("batchDiscoveryRestoreSkip:true")&&stateRecognition.includes("batchFirstAnchorReuse:true"),'state module must advertise safe batch anchor reuse');
assert.ok(handRecognition.includes("sharedCaptureFrameCache:true"),'hand recognition must advertise capture-scoped exact frame sharing');
assert.ok(handRecognition.includes("sharedFrameCache.set(key,{time:+key,canvas,source})"),'hand layout scan must publish exact decoded frames only into the caller-owned capture cache');
assert.ok(stateRecognition.includes("sharedFrameCache=options?.sharedFrameReuse===true?new Map():null"),'frame sharing must be opt-in and capture-scoped');
assert.ok(stateRecognition.includes("state-hand-board-frame-cache-verify"),'board reuse must be guarded by a zero-seek live/cached frame canary');
assert.ok(stateRecognition.includes("baseLiveFingerprint===baseCachedFingerprint"),'board reuse canary must require exact fingerprint equality');
assert.ok(stateRecognition.includes("await WB.seekTo(t,'state-board-confirm')"),'legacy exact board seek path must remain for cache miss or rejection');
assert.ok(stateRecognition.includes("handBoardFrameCacheFallbacks"),'whole-match diagnostics must expose frame-share fallback counts');
assert.ok(stateRecognition.includes("reason:'reused-stable-probe'"),'timeline-lite capture must be able to reuse already accepted PP probe evidence');
assert.ok(stateRecognition.includes("probeReuse:{pp:!!ppSeed,hp:false}"),'probe reuse must remain PP-only; HP must retain guarded temporal confirmation');


assert.equal(stateRecognition.includes('captureStatePair'),false,'superseded fixed-pair capture API must be removed');
assert.equal(stateRecognition.includes('statePairTarget'),false,'superseded fixed-pair target helper must be removed');
assert.equal(stateRecognition.includes('state-pair-complete'),false,'superseded fixed-pair event must be removed');
assert.ok(stateRecognition.includes('legacyStatePairRemoved:true'),'state module must advertise removal of the legacy pair path');
assert.ok(stateRecognition.includes('function turnAnalysisBounds(')&&stateRecognition.includes('function selectTurnTimelineAnchors('),'safe multi-point turn analysis must remain the replacement path');
assert.ok(diagnostics.includes('turnStableAnalysis:clone(WB.turnStableLast||null)'),'diagnostics must export automatic turn-analysis evidence');
assert.ok(index.includes('id="analyzeMatch"')&&index.includes('id="cancelMatch"')&&index.includes('id="matchAnalysisStatus"'),'automatic review UI must expose whole-match analysis controls');
assert.ok(app.includes("WB.$('#analyzeMatch')")&&app.includes("WB.$('#cancelMatch')"),'app control sync must include whole-match analysis controls');
assert.ok(stateRecognition.includes('async function analyzeMatchTargetTurns()'),'state recognition must orchestrate target-side whole-match analysis');
assert.ok(stateRecognition.includes('function matchAnalysisPlan('),'whole-match turn planning must remain explicit and regression-testable');
assert.ok(stateRecognition.includes("matchAnalysisScope:'target-side-turns'"),'whole-match analysis must remain bounded to the selected analysis side');
assert.ok(diagnostics.includes('matchAnalysis:clone(WB.matchAnalysisLast||null)'),'diagnostics must export whole-match analysis evidence');
assert.ok(replaySession.includes("turnIdentity:'number+side'"),'ReplaySession must keep numeric turn and active side together when deriving changes');
assert.ok(replaySession.includes("SESSION_SCHEMA='replay-session-v2'"),'ReplaySession must migrate away from the unsafe v1 numeric-null schema');
assert.ok(replaySession.includes("decisionWindows:[]"),'ReplaySession must expose derived Decision Windows without changing recognition state');
assert.ok(replaySession.includes("v===null||v===undefined"),'ReplaySession numeric normalization must preserve null/undefined');
assert.ok(replaySession.includes("legacy-unsafe-null-number-coercion"),'ReplaySession must explicitly invalidate unsafe v1 derived observations');
assert.ok(replaySession.includes("const VERSION='replay-session-clean-1.12'"),'ReplaySession module must have an explicit version');
assert.ok(replaySession.includes("unknownHpBridge:'same-turn-observed-endpoints<=3s'"),'ReplaySession must expose the bounded unknown-HP bridge contract');
assert.ok(replaySession.includes('bridgedUnknownObservations'),'bridged HP actions must retain evidence that unknown observations were skipped');
assert.ok(index.includes('id="observedEpisodes"'),'automatic review UI must expose observed-episode Action Timeline output');
assert.ok(index.includes('Decision Windowごとに「判断直前」「変化後」「観測した変化」「重要とした理由」「未確認項目」'),'automatic review UI must expose the Phase 16 Decision Window review contract');
assert.ok(replaySession.includes('function reviewWindowModels(session=current)'),'ReplaySession must derive one UI model per Decision Window');
assert.ok(replaySession.includes('function renderDecisionWindowCard(model)'),'ReplaySession must render the safe review window model');
assert.ok(replaySession.includes('function renderWindowCoach(coach)'),'ReplaySession must render the Phase 17 tactical coach separately from observation facts');
assert.ok(replaySession.includes('window.__wbReviewCoachV1'),'Phase 17 coach must be inspectable in diagnostics without mutating ReplaySession observations');
assert.ok(review.includes("const WINDOW_COACH_VERSION='review-window-coach-v1'"),'ReviewEngine must own the Phase 17 coach derivation');
assert.ok(review.includes('function deriveWindowCoach(model={})'),'ReviewEngine must derive coaching from one Decision Window');
assert.ok(review.includes("basis:'observation-only'"),'ReviewEngine coach must advertise observation-only basis');
assert.ok(review.includes("const CARD_USE_CANDIDATE_VERSION='card-use-candidate-v1'"),'ReviewEngine must own Phase 18 card-use candidate derivation');
assert.ok(review.includes('function deriveCardUseCandidates(model={})'),'Phase 18 must derive candidates from one bounded Decision Window');
assert.ok(review.includes("evidenceCount:2"),'Phase 18 card-use candidate must require two independent evidence types');
assert.ok(review.includes("afterAbsenceUsed:false,pastHandTraceUsed:false,effectAttributionUsed:false"),'Phase 18 must not use absence, history hand, or inferred effects as card-use evidence');
assert.ok(review.includes("createsAction:false"),'Phase 18 candidate must never create an observation Action');
assert.ok(replaySession.includes('function renderCardUseCandidates(candidates=[])'),'ReplaySession must render candidate-only card evidence separately');
assert.ok(replaySession.includes('window.__wbCardUseCandidateV1'),'Phase 18 candidate report must be inspectable separately from ReplaySession observations');
assert.ok(diagnostics.includes('cardUseCandidateV1:clone(window.__wbCardUseCandidateV1||null)'),'diagnostics must export Phase 18 card-use candidates separately');
assert.ok(diagnostics.includes('reviewCoachV1:clone(window.__wbReviewCoachV1||null)'),'diagnostics must expose the derived Phase 17 coach separately');
assert.ok(replaySession.includes('function seekReviewWindow(time,phase=\'before\')'),'Phase 16 review UI must support direct safe navigation to observed endpoints');
assert.ok(replaySession.includes('function reviewChangedKeys(changes=[])'),'Phase 16 review UI must highlight only fields backed by observed changes');
assert.ok(index.includes('id="reviewNavigationStatus"'),'review UI must expose navigation feedback');
assert.ok(replaySession.includes("reviewWindowUi:'before-after-observed-importance-unknown-noncausal-navigation+coach-v1'"),'ReplaySession must advertise the non-causal review UI contract');
assert.ok(replaySession.includes("cardUseCandidate:'two-evidence-candidate-only-no-action-v1'"),'ReplaySession must advertise the candidate-only no-action contract');
assert.ok(replaySession.includes('function deriveObservedEpisodes(actions=[])'),'ReplaySession must group detailed changes by the same observed state pair');
assert.ok(replaySession.includes('function deriveObservationReviewPoints(actions=[])'),'ReplaySession must separate observation-derived review points');
assert.ok(replaySession.includes('function deriveSupplementalReviewPoints(signals=[])'),'ReplaySession must separate tactical/manual review points');
assert.ok(replaySession.includes('function mergeReviewPoints(observation=[],supplemental=[])'),'ReplaySession must preserve one merged compatibility view');
assert.ok(replaySession.includes("reviewPointDomains:'observation+supplemental-merged'"),'ReplaySession must advertise the review-point domain boundary');
assert.ok(replaySession.includes("observedEpisodes:'same-state-pair-noncausal-summary'"),'ReplaySession must advertise the non-causal grouping contract');
assert.ok(replaySession.includes('causalAttribution:false'),'observed episodes must explicitly deny causal attribution');
assert.ok(replaySession.includes('使用カード・効果源・ダメージ源・行動順は未確定'),'observed episode interpretation must preserve unresolved causal details');
assert.ok(replaySession.includes('PPが${Math.abs(Number(pp.data.delta))}減少'),'observed episode wording must state net PP decrease rather than inferred exact spend');
assert.equal(replaySession.includes('PPを${Math.abs(Number(pp.data.delta))}消費'),false,'observed episode wording must not claim exact PP consumption');

assert.ok(replaySession.includes("indexedDB.open(DB_NAME,DB_VERSION)"),'ReplaySession persistence must use IndexedDB');
assert.ok(app.includes("WB.emit('task-finished',{name,cancelRequested:cancelled})"),'task runner must publish a finish boundary after clearing the active task');
assert.ok(replaySession.includes('if(W.task)renderDeferred=true;else render()'),'ReplaySession must defer expensive DOM rendering while a task lock is active');
assert.ok(replaySession.includes("W.on('task-finished',()=>flushDeferredRender())"),'ReplaySession must flush one deferred render when the task finishes');
assert.ok(replaySession.includes('taskRenderCoalescing:true'),'ReplaySession must advertise task-time render coalescing');
assert.ok(replaySession.includes("MAX_CONTIGUOUS_GAP=3"),'detailed state-change derivation must remain limited to a short same-turn observation gap');
assert.ok(replaySession.includes("'observation-gap'"),'ReplaySession must preserve observation gaps instead of inventing detailed actions');
assert.equal(replaySession.includes("'card-play'"),false,'ReplaySession must not infer a card play from state differences alone');
assert.ok(diagnostics.includes('replaySessionV1:clone(WB.ReplaySession?.snapshot?.()||window.__wbReplaySessionV1||null)'),'diagnostic and review export must include ReplaySession metadata');
assert.ok(diagnostics.includes('expectedModules:clone(inv.expectedModules)'),'diagnostic export must include expected module versions');
assert.ok(diagnostics.includes('loadedModules:clone(inv.loadedModules)'),'diagnostic export must include loaded module versions');
assert.ok(diagnostics.includes('moduleVersionMismatches:clone(inv.moduleVersionMismatches)'),'diagnostic export must include module version mismatches');
assert.ok(diagnostics.includes('moduleVersionsOk:moduleIntegrity.ok'),'runtime invariant must expose module version integrity status');
assert.ok(index.includes('id="exportHandFixture"'),'diagnostics UI must expose explicit hand-fixture export');
assert.ok(index.includes('id="reviewProfile"'),'review UI must expose an explicit tactical review profile selector');
assert.ok(index.includes('<option value="none" selected>使用しない（状態確認のみ）</option>'),'tactical review must default to none');
assert.ok(index.includes('使用デッキ（記録用）'),'deck field must be labeled as record-only metadata');
assert.ok(index.includes('戦術レビューの切替には使用しません'),'deck metadata must not imply tactical profile selection');
assert.ok(index.includes('id="diagnosticsPanel"'),'diagnostics must be placed in a collapsible details region');
assert.ok(review.includes("const REVIEW_PROFILES=Object.freeze"),'review engine must define explicit review profiles');
assert.ok(review.includes("function activeProfile()"),'review engine must expose active profile resolution');
assert.ok(review.includes("status:'profile-disabled'"),'review engine must have a no-tactics result when profile is disabled');
assert.ok(review.includes("if(!profileEnabled())"),'review engine must gate pirate-specific review work behind the active profile');
assert.ok(index.includes('通常の診断JSONには画像や深い手札診断値を含めません'),'UI must state that ordinary diagnostics remain image-free and exclude deep hand diagnostics');
assert.ok(diagnostics.includes("format:'shadowverse-wb-hand-fixture-v1'"),'hand fixture format must be versioned independently');
assert.ok(diagnostics.includes('automatic:false'),'raw fixture capture must remain explicit and diagnostic-only');
assert.ok(diagnostics.includes("WB.seekTo(original,'hand-fixture-restore')"),'fixture export must restore the original video position');
assert.ok(app.includes("WB.canvasBlob=(c,q=.82,type='image/jpeg')"),'canvas blob helper must preserve JPEG as the default while allowing an explicit lossless fixture type');
assert.ok(diagnostics.includes("fixtureImagePayload(canvas,quality=.9,mime='image/png')"),'hand fixture images must default to lossless PNG');
assert.ok(diagnostics.includes("imageMime:'image/png',lossless:true,replayGeometryCheck:true"),'fixture capture policy must declare lossless PNG and geometry replay verification');
assert.ok(diagnostics.includes("diagnosticReobservation:true,diagnosticProbes:true,commonStripAllLayouts:true,jpegQuality:null"),'fixture capture policy must declare diagnostic re-observation before the null JPEG quality marker');
assert.ok(diagnostics.includes('replayCenters=typeof WB.HandRecognition?.findCostCenters'),'fixture capture must rerun cost-center detection on the exact canvas being exported');
assert.ok(diagnostics.includes('replay:{centers:clone(replayCenters),geometry:replayGeometry}'),'fixture frames must retain replay centers and geometry comparison');
assert.ok(diagnostics.includes('diagnosticReobservation:true,diagnosticProbes:true,commonStripAllLayouts:true'),'hand fixture capture must declare deep diagnostic re-observation');
assert.ok(diagnostics.includes("observeHandFrame(canvas,+t.toFixed(3),offset,worker,{diagnosticProbes:true,commonStripAllLayouts:true})"),'fixture export must re-observe exact selected frames with deep diagnostics enabled');
assert.ok(diagnostics.includes('sourceSample:clone(sourceSample),sample:clone(sample)'),'fixture must retain both the original light sample and diagnostic re-observation');
assert.ok(diagnostics.includes("WB.seekTo(original,'hand-fixture-restore')"),'fixture re-observation must restore the original video position');
assert.ok(diagnostics.includes("if(worker&&typeof WB.restoreOCRDefaults==='function')"),'fixture re-observation must restore OCR defaults');
assert.ok(diagnostics.includes('function fixtureReplayGeometry(sampleCenters,replayCenters,width=1200)'),'fixture export must expose a deterministic geometry replay summary');
assert.ok(handRecognition.includes('nearThresholdSettleDiagnostic=ctx?.relativeSide'), 'near-threshold settling evidence must be exported diagnostically');
assert.ok(handRecognition.includes('function nearThresholdOscillationTrend(samples)'),'near-threshold oscillation diagnostic helper must exist');
assert.ok(handRecognition.includes("nearThresholdSettlingTrend(samples)||nearThresholdOscillationTrend(samples)"),'phase diagnostics must fall back from settling to oscillation evidence');
assert.ok(handRecognition.includes("mode:'oscillation'"),'oscillation diagnostics must identify their mode explicitly');
assert.equal(handRecognition.includes('allowSettleRetry=!!nearThresholdOscillationTrend'),false,'oscillation diagnostics must never drive forward-settle recognition');
assert.ok(handRecognition.includes("const DISPLAYED_COST_DIAGNOSTIC_VERSION='displayed-cost-diagnostic-1.0'"),'displayed-cost 6 diagnostics must have an explicit version');
assert.ok(handRecognition.includes("DISPLAYED_COST_DIAGNOSTIC_TEMPLATES=Object.freeze({6:Object.freeze"),'diagnostic-only displayed-cost value 6 template must exist');
assert.ok(handRecognition.includes("diagnosticOnly:true,applied:false,value:Number(def.value)"),'displayed-cost 6 probe must be explicitly diagnostic-only');
assert.ok(handRecognition.includes("probe=diagnostic6Probe||matchDisplayedCostDiagnosticFeatures(rows,6)"),'displayed-cost reads must reuse or compute a diagnostic 6 score');
assert.ok(handRecognition.includes("return{...resolveDisplayedCost(ocr,template),diagnostic6Probe:probe}"),'diagnostic 6 score must be attached only after the live resolver result is computed');
assert.ok(handRecognition.includes("diagnosticCostVariants=shouldReadCost||diagnosticProbes?displayedCostFeatureVariants(canvas,center):null"),'ordinary slots below the live cost gate must skip cost feature extraction');
assert.ok(handRecognition.includes("diagnostic6Probe=diagnosticProbes&&diagnosticCostVariants?matchDisplayedCostDiagnosticFeatures(diagnosticCostVariants,6):null"),'all-slot cost6 probing must be explicit diagnostic-only work');
assert.ok(handRecognition.includes("if(shouldReadCost)displayedCost=await readDisplayedCost(canvas,center,worker,diagnosticCostVariants,diagnostic6Probe)"),'live OCR must remain gated while reusing all-slot diagnostic features');
const liveCostTemplateStart=handRecognition.indexOf('const DISPLAYED_COST_TEMPLATES=Object.freeze(');
const liveCostTemplateEnd=handRecognition.indexOf('const DISPLAYED_COST_DIAGNOSTIC_VERSION',liveCostTemplateStart);
assert.ok(liveCostTemplateStart>=0&&liveCostTemplateEnd>liveCostTemplateStart,'live displayed-cost template block must be extractable');
const liveCostTemplateBlock=handRecognition.slice(liveCostTemplateStart,liveCostTemplateEnd);
assert.equal(liveCostTemplateBlock.includes('6:Object.freeze'),false,'diagnostic value 6 must not be added to the live displayed-cost template set');
assert.ok(handRecognition.includes("function fixedLeftAnchorDiagnosticScores(anchorFeatures)"),'fixed-left common-strip diagnostic helper must exist');
assert.ok(handRecognition.includes("diagnosticOnly:true,applied:false,score:+best.score.toFixed(4)"),'common-strip results must be explicitly diagnostic-only');
assert.ok(handRecognition.includes("commonStripScores=diagnosticProbes&&(commonStripAllLayouts||centers.length>=7)?fixedLeftAnchorDiagnosticScores(anchorFeatures):{}"),'common-strip diagnostics must be opt-in during ordinary recognition and allow all layouts for reproducible fixture capture');
assert.ok(handRecognition.includes("matchScores,anchorVariantScores,shadowMatchScores,commonStripScores,displayedCost"),'common-strip evidence must be exported with each dense-layout candidate');
const commonStripDecideStart=handRecognition.indexOf('function decideHandSamples');
const commonStripDecideEnd=handRecognition.indexOf('function latestTargetTurnStart',commonStripDecideStart);
assert.ok(commonStripDecideStart>=0&&commonStripDecideEnd>commonStripDecideStart,'decideHandSamples source block must be extractable for common-strip isolation');
assert.equal(handRecognition.slice(commonStripDecideStart,commonStripDecideEnd).includes('commonStripScores'),false,'common-strip diagnostics must not affect live hand decisions');
assert.ok(handRecognition.includes('allowSettleRetry=!!settleTrend'), 'near-threshold diagnostic must not activate forward-settle retry');
assert.equal(handRecognition.includes('allowSettleRetry=!!nearThresholdSettleDiagnostic'),false,'near-threshold diagnostic must never drive recognition decisions directly');
assert.ok(handRecognition.includes("mode:'near-threshold-same-layout-counterfactual',diagnosticOnly:true,applied:false"),'near-threshold counterfactual must be explicitly diagnostic-only and never applied');
assert.ok(handRecognition.includes('counterfactualRecognitionSummary(retryDecision,nearThresholdSettleDiagnostic.cardId)'),'counterfactual must evaluate the target with the ordinary decision engine output');
assert.ok(handRecognition.includes('function counterfactualTargetEvidence(samples,cardId)'),'counterfactual diagnostics must expose a frame-level target-evidence summarizer');
assert.ok(handRecognition.includes('targetEvidence:counterfactualTargetEvidence(retrySamples,nearThresholdSettleDiagnostic.cardId)'),'counterfactual diagnostics must retain frame-level target evidence from the diagnostic retry window');
assert.ok(handRecognition.includes('targetEvidence:[]'),'counterfactual diagnostics must expose an explicit empty evidence list when no compatible forward window exists');
assert.equal(handRecognition.includes('decision=targetEvidence'),false,'counterfactual target evidence must never replace or drive the live hand decision');
assert.ok(handRecognition.includes('nearThresholdPhaseOffset:.012'),'near-threshold phase probe must retain the measured +12ms diagnostic offset');
assert.ok(handRecognition.includes('function phaseShiftWindowCompatible(referenceFrames,shiftedFrames,width=CFG.maxW)'),'phase probe must require an explicit same-layout compatibility check');
assert.ok(handRecognition.includes("mode:'near-threshold-phase-probe',diagnosticOnly:true,applied:false"),'phase probe must remain explicitly diagnostic-only');
assert.ok(handRecognition.includes('phaseTargetEvidence=counterfactualTargetEvidence(phaseSamples,nearThresholdSettleDiagnostic.cardId)'),'phase probe must compute per-frame target evidence after re-observation');
assert.ok(handRecognition.includes('targetEvidence:phaseTargetEvidence'),'phase probe must export the computed per-frame target evidence');
assert.ok(handRecognition.includes('anchorVariant:variant?{score:finite(variant.score),dx:finite(variant.dx,0)'),'counterfactual evidence must retain anchor variant boundary diagnostics');
assert.ok(handRecognition.includes('anchorBoundaryProbeDx:6'),'anchor boundary extension must remain a diagnostic-only single-step +2px probe beyond the live ±4px range');
assert.ok(handRecognition.includes('ANCHOR_DX=Object.freeze([-4,-2,0,2,4])'),'live anchor recognition search must remain limited to the verified ±4px range');
assert.ok(handRecognition.includes('function anchorBoundaryExtensionDiagnostic(canvas,center,baseScores)'),'anchor boundary extension diagnostic helper must exist');
assert.ok(handRecognition.includes('diagnosticOnly:true,applied:false,baseDx:+baseDx.toFixed(2),probeDx:+probeDx.toFixed(2)'),'anchor boundary extension results must be explicitly non-applied diagnostics');
assert.ok(handRecognition.includes('anchorVariantScores=diagnosticProbes?anchorVariantDiagnosticScoresWithBoundaryProbe(canvas,center,anchorFeatures):{}'),'anchor boundary probes must be omitted from ordinary observations and enabled only for explicit diagnostics');
assert.ok(handRecognition.includes('matches=matchCardFeatures(titleFeature,anchorFeatures),anchorVariantScores=diagnosticProbes?anchorVariantDiagnosticScoresWithBoundaryProbe(canvas,center,anchorFeatures):{}'),'live card matching must run on the original 25 anchor variants before optional diagnostic boundary probing');
assert.ok(handRecognition.includes('edgeProbe:variant.edgeProbe?{diagnosticOnly:variant.edgeProbe.diagnosticOnly===true'),'target evidence must export anchor boundary probe diagnostics');
const decideStart=handRecognition.indexOf('function decideHandSamples');
const decideEnd=handRecognition.indexOf('function settlingRecognitionTrend',decideStart);
assert.ok(decideStart>=0&&decideEnd>decideStart,'decideHandSamples body must be extractable for isolation checks');
assert.equal(handRecognition.slice(decideStart,decideEnd).includes('edgeProbe'),false,'anchor boundary edgeProbe must never drive live hand decisions');
assert.ok(handRecognition.includes('observationLayoutCompatible:phaseObservationCompatible'),'phase probe must revalidate the observed recognition frames, not only the layout scan');
assert.ok(handRecognition.includes('validForComparison:phaseObservationCompatible'),'phase probe must expose whether phase evidence is safe to compare');
assert.ok(handRecognition.includes("reason:phaseObservationCompatible?phaseDecision.reason:'phase-observation-layout-incompatible'"),'phase probe must reject interpretation when observed layouts diverge');
assert.ok(handRecognition.includes('nearThresholdCounterfactual,nearThresholdPhaseProbe,continuityRescue'),'phase probe must be exported with hand diagnostics');
assert.equal(handRecognition.includes('decision=phaseDecision'),false,'phase-probe decision must never replace the live hand decision');
assert.ok(handRecognition.includes('nearThresholdSettleDiagnostic,nearThresholdCounterfactual,nearThresholdPhaseProbe,continuityRescue'),'counterfactual and phase-probe results must be exported with hand diagnostics');
assert.equal(handRecognition.includes('decision=retryDecision'),false,'counterfactual retry decision must never replace the live hand decision');
assert.ok(handRecognition.includes('const allowNearCounterfactual=ctx?.diagnosticProbes===true&&'),'near-threshold counterfactual scans must be explicit diagnostic opt-in, not normal recognition work');
assert.ok(handRecognition.includes('minSepX:.018'),'cost-center minimum separation must retain the real-video-calibrated .018 ratio');
assert.ok(handRecognition.includes('function costCenterSeparated(kept,x,width=CFG.maxW)'),'cost-center peak separation must use the explicit cx-aware helper');
assert.ok(handRecognition.includes('costCenterSeparated(kept,p.x,w)'),'findCostCenters must apply calibrated separation before accepting a peak');
assert.equal(handRecognition.includes('Math.abs(q.x-p.x)<minSep'),false,'legacy q.x/cx mismatch must never return');


const applyStart=review.indexOf('applyDetectedHand(result)');
assert.ok(applyStart>=0,'applyDetectedHand must exist');
const applyBody=review.slice(applyStart,applyStart+1800);
assert.ok(applyBody.includes('result?.recognized||{}'),'applyDetectedHand must consume only current recognized hand');

for(const id of ['quickBlader','zetaBeatrix','barbaros']){
  const start=cardDb.indexOf(`${id}:Object.freeze`);
  assert.ok(start>=0,`${id} config must exist`);
  const block=cardDb.slice(start,start+1800);
  assert.ok(block.includes('candidateThreshold:.90'),`${id} candidate threshold must remain .90`);
}
const zetaStart=cardDb.indexOf('zetaBeatrix:Object.freeze');
assert.ok(cardDb.slice(zetaStart,zetaStart+2200).includes('acceptedCosts:[4,6]'),'Zeta accepted costs must remain [4,6]');
const quickStart=cardDb.indexOf('quickBlader:Object.freeze');
const quickBlock=cardDb.slice(quickStart,quickStart+3200);
assert.ok(quickBlock.includes('overlapMaskedRescue:{minFrames:4'),'Quick must retain the verified overlap-masked rescue config');
assert.ok(quickBlock.includes('minMaskedAnchor:.94'),'Quick overlap rescue must retain the .94 masked-anchor floor');
assert.ok(quickBlock.includes('minCrossCardLeaderMargin:.20'),'Quick overlap rescue must retain cross-card separation');
assert.ok(quickBlock.includes('requireCostProbe:true'),'Quick overlap rescue must require its per-frame cost-probe eligibility');
assert.equal(cardDb.slice(zetaStart,zetaStart+2400).includes('overlapMaskedRescue:'),false,'Zeta must not inherit unvalidated overlap rescue');
const barbarosStart=cardDb.indexOf('barbaros:Object.freeze');
assert.equal(cardDb.slice(barbarosStart,barbarosStart+1800).includes('overlapMaskedRescue:'),false,'Barbaros must not inherit unvalidated overlap rescue');

console.log(JSON.stringify({
  runtime:runtime.length,
  version:latest.version,
  revision:latest.revision,
  build:latest.build,
  cache:latest.cache,
  historyIsolation:true,
  moduleVersionIntegrity:true,
  candidateThresholds:{quickBlader:.90,zetaBeatrix:.90,barbaros:.90},
  zetaAcceptedCosts:[4,6],
  quickOverlapMaskedRescue:true
},null,2));
console.log('RUNTIME INVARIANTS PASS');

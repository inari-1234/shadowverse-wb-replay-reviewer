import fs from 'node:fs';
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
const handRecognition=read('hand-recognition.js');
const stateRecognition=read('state-recognition.js');
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
  'review-engine.js',
  'diagnostics.js'
];
const runtime=[...index.matchAll(/<script[^>]+src="\.\/([^"]+\.js)"/g)].map(m=>m[1]);
assert.deepEqual(runtime,expectedRuntime,'index runtime must remain exactly the approved eight scripts in order');
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
const moduleSources={
  'turn-recognition':turnRecognition,
  'mulligan-class':mulliganClass,
  'card-db':cardDb,
  'hand-recognition':handRecognition,
  'state-recognition':stateRecognition,
  'review-engine':review,
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
assert.equal(/shadowverse-wb-(?:diagnostic|review)-v\d+\.\d+\.\d+-clean/.test(diagnostics),false,'diagnostic and review format IDs must not hard-code an app version');
assert.ok(diagnostics.includes('shadowverse-wb-diagnostic-v${WB.APP.version}-clean'),'diagnostic format ID must derive from WB.APP.version');
assert.ok(diagnostics.includes('shadowverse-wb-review-v${WB.APP.version}-clean'),'review format ID must derive from WB.APP.version');
assert.ok(stateRecognition.includes('WB.stateCaptureHistory=history.slice(-5)'),'state recognition must retain the five most recent captures');
assert.ok(stateRecognition.includes("WB.on('video-reset',()=>{WB.stateCaptureHistory=[]"),'state capture history must reset with the video');
assert.ok(diagnostics.includes('stateCaptureHistory:clone(WB.stateCaptureHistory||[])'),'diagnostic/review exports must include recent state-capture history');
assert.ok(diagnostics.includes('expectedModules:clone(inv.expectedModules)'),'diagnostic export must include expected module versions');
assert.ok(diagnostics.includes('loadedModules:clone(inv.loadedModules)'),'diagnostic export must include loaded module versions');
assert.ok(diagnostics.includes('moduleVersionMismatches:clone(inv.moduleVersionMismatches)'),'diagnostic export must include module version mismatches');
assert.ok(diagnostics.includes('moduleVersionsOk:moduleIntegrity.ok'),'runtime invariant must expose module version integrity status');
assert.ok(index.includes('id="exportHandFixture"'),'diagnostics UI must expose explicit hand-fixture export');
assert.ok(index.includes('通常の診断JSONには画像を含めません'),'UI must state that ordinary diagnostics remain image-free');
assert.ok(diagnostics.includes("format:'shadowverse-wb-hand-fixture-v1'"),'hand fixture format must be versioned independently');
assert.ok(diagnostics.includes('automatic:false'),'raw fixture capture must remain explicit and diagnostic-only');
assert.ok(diagnostics.includes("WB.seekTo(original,'hand-fixture-restore')"),'fixture export must restore the original video position');
assert.ok(app.includes("WB.canvasBlob=(c,q=.82,type='image/jpeg')"),'canvas blob helper must preserve JPEG as the default while allowing an explicit lossless fixture type');
assert.ok(diagnostics.includes("fixtureImagePayload(canvas,quality=.9,mime='image/png')"),'hand fixture images must default to lossless PNG');
assert.ok(diagnostics.includes("imageMime:'image/png',lossless:true,replayGeometryCheck:true,jpegQuality:null"),'fixture capture policy must declare lossless PNG and geometry replay verification');
assert.ok(diagnostics.includes('replayCenters=typeof WB.HandRecognition?.findCostCenters'),'fixture capture must rerun cost-center detection on the exact canvas being exported');
assert.ok(diagnostics.includes('replay:{centers:clone(replayCenters),geometry:replayGeometry}'),'fixture frames must retain replay centers and geometry comparison');
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
assert.ok(handRecognition.includes("diagnosticCostVariants=displayedCostFeatureVariants(canvas,center),diagnostic6Probe=matchDisplayedCostDiagnosticFeatures(diagnosticCostVariants,6)"),'all detected hand slots must receive the diagnostic-only cost6 probe');
assert.ok(handRecognition.includes("if(shouldReadCost)displayedCost=await readDisplayedCost(canvas,center,worker,diagnosticCostVariants,diagnostic6Probe)"),'live OCR must remain gated while reusing all-slot diagnostic features');
const liveCostTemplateStart=handRecognition.indexOf('const DISPLAYED_COST_TEMPLATES=Object.freeze(');
const liveCostTemplateEnd=handRecognition.indexOf('const DISPLAYED_COST_DIAGNOSTIC_VERSION',liveCostTemplateStart);
assert.ok(liveCostTemplateStart>=0&&liveCostTemplateEnd>liveCostTemplateStart,'live displayed-cost template block must be extractable');
const liveCostTemplateBlock=handRecognition.slice(liveCostTemplateStart,liveCostTemplateEnd);
assert.equal(liveCostTemplateBlock.includes('6:Object.freeze'),false,'diagnostic value 6 must not be added to the live displayed-cost template set');
assert.ok(handRecognition.includes("function fixedLeftAnchorDiagnosticScores(anchorFeatures)"),'fixed-left common-strip diagnostic helper must exist');
assert.ok(handRecognition.includes("diagnosticOnly:true,applied:false,score:+best.score.toFixed(4)"),'common-strip results must be explicitly diagnostic-only');
assert.ok(handRecognition.includes("commonStripScores=centers.length>=7?fixedLeftAnchorDiagnosticScores(anchorFeatures):{}"),'common-strip diagnostics must run only for dense seven-plus-card layouts');
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
assert.ok(handRecognition.includes('anchorVariantDiagnosticScoresWithBoundaryProbe(canvas,center,anchorFeatures)'),'observations must attach diagnostic boundary probes without modifying anchorFeatures');
assert.ok(handRecognition.includes('matches=matchCardFeatures(titleFeature,anchorFeatures),anchorVariantScores=anchorVariantDiagnosticScoresWithBoundaryProbe(canvas,center,anchorFeatures)'),'live card matching must run on the original 25 anchor variants before diagnostic boundary probing');
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

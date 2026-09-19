import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root=new URL('../',import.meta.url);
const fixture=JSON.parse(fs.readFileSync(new URL('./recognition-benchmark-cases.json',import.meta.url),'utf8'));
const WB={registerModule(){},log(){},turnTimeline:[]};
const sandbox={
  window:{WB},console,Float32Array,Uint8ClampedArray,Map,
  atob:s=>Buffer.from(s,'base64').toString('binary'),
  document:{createElement(){return {width:0,height:0,getContext(){return {imageSmoothingEnabled:true,drawImage(){},getImageData(){return {data:new Uint8ClampedArray(12*16*4)}}}}}}}
};
vm.createContext(sandbox);
new vm.Script(fs.readFileSync(new URL('card-db.js',root),'utf8')).runInContext(sandbox);
new vm.Script(fs.readFileSync(new URL('hand-recognition.js',root),'utf8')).runInContext(sandbox);

const DB=WB.CardDB,H=WB.HandRecognition;
const cards=Object.fromEntries(DB.recognitionCards().map(c=>[c.id,c]));

function candidate(row,card){
  const source=row.source||'anchor';
  const template=row.template||{};
  const ocr=row.ocr||{};
  const probeFloor=H.temporalProbeFloor(card);
  const temporalProbe=Number(row.score)>=probeFloor;
  const displayedCost={
    accepted:template.accepted===true||ocr.accepted===true,
    value:template.accepted===true?template.value:(ocr.accepted===true?ocr.value:null),
    source:template.accepted===true?'template':(ocr.accepted===true?'ocr':null),
    ocrValue:ocr.value??null,
    ocrAccepted:ocr.accepted===true,
    templateValue:template.value??null,
    templateScore:template.score??null,
    templateThreshold:template.threshold??null,
    templateCenterDx:0,
    templateAccepted:template.accepted===true
  };
  const allowedCost=v=>card.acceptedCosts.includes(Number(v));
  const validatedCost=displayedCost.accepted&&allowedCost(displayedCost.value)?Number(displayedCost.value):null;
  const costMatched=validatedCost!=null;
  return {
    index:row.slot,
    imageBest:{
      cardId:card.id,label:card.label,imageScore:row.score,imageSource:source,
      titleScore:source==='title'?row.score:Number(row.titleScore??.5),
      anchorScore:source==='anchor'?row.score:Number(row.anchorScore??.4),
      temporalProbe,temporalProbeFloor:probeFloor
    },
    displayedCost,
    best:{
      cardId:card.id,label:card.label,imageScore:row.score,
      imageCandidate:Number(row.score)>=Number(card.candidateThreshold),
      imageConfirmed:Number(row.score)>=Number(card.threshold),
      imageSource:source,
      titleScore:source==='title'?row.score:Number(row.titleScore??.5),
      titleThreshold:card.threshold,
      anchorScore:source==='anchor'?row.score:Number(row.anchorScore??.4),
      anchorThreshold:card.anchorThreshold,
      threshold:source==='anchor'?(card.anchorThreshold??card.threshold):card.threshold,
      candidateThreshold:card.candidateThreshold,
      rescueThreshold:card.rescueThreshold,
      temporalProbe,temporalProbeFloor:probeFloor,
      expectedCost:card.expectedCost,acceptedCosts:card.acceptedCosts,
      detectedCost:ocr.value??null,validatedCost,
      ocrCostAccepted:ocr.accepted===true,costAccepted:displayedCost.accepted,
      costMatched,costSource:costMatched?displayedCost.source:null,
      costTemplateValue:template.value??null,costTemplateScore:template.score??null,
      costTemplateThreshold:template.threshold??null,costTemplateCenterDx:0,
      matched:false,decision:costMatched?'image-below-confirm':(temporalProbe?'temporal-probe-only':'image-below-candidate')
    }
  };
}

function samplesFor(testCase){
  const card=cards[testCase.cardId];
  assert.ok(card,`Unknown cardId in benchmark: ${testCase.cardId}`);
  return testCase.samples.map(row=>({
    sampleTime:row.time,counts:{},scores:{},costs:{},
    candidates:[candidate(row,card)]
  }));
}

function scenarioSamples(scenario){
  return scenario.samples.map(frame=>({
    sampleTime:frame.time,counts:{},scores:{},costs:{},
    candidates:frame.candidates.map(row=>{
      const card=cards[row.cardId];
      assert.ok(card,`Unknown cardId in scenario: ${row.cardId}`);
      return candidate(row,card);
    })
  }));
}

function sortedUnique(values){return [...new Set(values)].sort()}
function sameStringSet(a,b){return JSON.stringify(sortedUnique(a))===JSON.stringify(sortedUnique(b))}

const results=[];
const byCard={};
const bySplit={};
for(const testCase of fixture.cases){
  const decision=H.decideHandSamples(samplesFor(testCase));
  const recognized=decision.recognized?.[testCase.cardId]||null;
  const actual=!!recognized;
  const expected=!!testCase.expected.recognized;
  const outcome=expected?(actual?'TP':'FN'):(actual?'FP':'TN');
  const pass=actual===expected&&(!expected||!testCase.expected.decision||recognized?.decision===testCase.expected.decision);
  const row={
    id:testCase.id,split:testCase.split,origin:testCase.origin,cardId:testCase.cardId,
    expected,actual,outcome,pass,decision:recognized?.decision??null,
    expectedDecision:testCase.expected.decision??null
  };
  results.push(row);
  const c=byCard[testCase.cardId]??={TP:0,FN:0,TN:0,FP:0,total:0};
  c[outcome]++;c.total++;
  const s=bySplit[testCase.split]??={TP:0,FN:0,TN:0,FP:0,total:0};
  s[outcome]++;s.total++;
}


const scenarioResults=[];
for(const scenario of fixture.scenarios||[]){
  assert.ok(Array.isArray(scenario.expected?.recognized),`Scenario ${scenario.id} requires an explicit human expected.recognized label`);
  assert.equal(scenario.needsHumanLabel===true,false,`Scenario ${scenario.id} is still marked as needing a human label`);
  const decision=H.decideHandSamples(scenarioSamples(scenario));
  const actual=Object.keys(decision.recognized||{});
  const expected=scenario.expected.recognized;
  const missing=expected.filter(id=>!actual.includes(id));
  const unexpected=actual.filter(id=>!expected.includes(id));
  const decisionMismatches=[];
  for(const [id,expectedDecision] of Object.entries(scenario.expected?.decisions||{})){
    const actualDecision=decision.recognized?.[id]?.decision??null;
    if(actualDecision!==expectedDecision)decisionMismatches.push({cardId:id,expected:expectedDecision,actual:actualDecision});
  }
  const observed=Array.isArray(scenario.observed?.recognized)?scenario.observed.recognized:[];
  scenarioResults.push({
    id:scenario.id,split:scenario.split,origin:scenario.origin,
    observed:sortedUnique(observed),
    expected:sortedUnique(expected),actual:sortedUnique(actual),
    baselineMisses:expected.filter(id=>!observed.includes(id)),
    baselineUnexpected:observed.filter(id=>!expected.includes(id)),
    exact:sameStringSet(actual,expected),missing,unexpected,decisionMismatches
  });
}

const realCases=fixture.cases.filter(x=>x.origin!=='synthetic-safety');
const cardsWithReal=[...new Set(realCases.map(x=>x.cardId))];
const coverage=Object.fromEntries(cardsWithReal.map(id=>{
  const rows=realCases.filter(x=>x.cardId===id);
  return [id,{positive:rows.filter(x=>x.expected.recognized).length,negative:rows.filter(x=>!x.expected.recognized).length,total:rows.length}];
}));
const metrics=Object.fromEntries(Object.entries(byCard).map(([id,v])=>{
  const precision=(v.TP+v.FP)?v.TP/(v.TP+v.FP):null;
  const recall=(v.TP+v.FN)?v.TP/(v.TP+v.FN):null;
  const specificity=(v.TN+v.FP)?v.TN/(v.TN+v.FP):null;
  return [id,{
    precision:precision==null?null:+precision.toFixed(4),
    recall:recall==null?null:+recall.toFixed(4),
    specificity:specificity==null?null:+specificity.toFixed(4),
    support:v.total
  }];
}));
const validationCount=fixture.cases.filter(x=>x.split==='validation').length+(fixture.scenarios||[]).filter(x=>x.split==='validation').length;
const scenarioFailures=scenarioResults.filter(x=>!x.exact||x.decisionMismatches.length);
const scenarioCoverage=Object.fromEntries(Object.keys(cards).map(id=>{
  const positive=(fixture.scenarios||[]).filter(x=>x.origin==='real-diagnostic'&&(x.expected?.recognized||[]).includes(id)).length;
  const negative=(fixture.scenarios||[]).filter(x=>x.origin==='real-diagnostic'&&!(x.expected?.recognized||[]).includes(id)).length;
  return [id,{positive,negative,total:positive+negative}];
}));
const missingScenarioCoverage=fixture.policy.requireFullFrameScenarioCoverage
  ? Object.entries(scenarioCoverage).filter(([,v])=>v.positive<1||v.negative<1)
  : [];

const falsePositives=results.filter(x=>x.outcome==='FP');
const falseNegatives=results.filter(x=>x.outcome==='FN');
const decisionMismatches=results.filter(x=>!x.pass&&x.outcome!=='FP'&&x.outcome!=='FN');
const missingPolarity=fixture.policy.requirePositiveAndNegativePerTunedCard
  ? Object.entries(coverage).filter(([,v])=>v.positive<1||v.negative<1)
  : [];

console.log(JSON.stringify({
  benchmark:fixture.version,
  cases:results.length,
  scenarios:scenarioResults,
  byCard,metrics,bySplit,coverage,scenarioCoverage,
  validation:{cases:validationCount,ready:validationCount>0},
  failures:{falsePositives,falseNegatives,decisionMismatches,missingPolarity,scenarioFailures,missingScenarioCoverage}
},null,2));

assert.equal(falsePositives.length,0,'recognition benchmark must have zero false positives');
assert.equal(falseNegatives.length,0,'recognition benchmark must have zero false negatives');
assert.equal(decisionMismatches.length,0,'recognition benchmark expected decision paths must remain stable');
assert.equal(missingPolarity.length,0,'each tuned card needs at least one real positive and real negative calibration case');
assert.equal(scenarioFailures.length,0,'full-frame benchmark must recognize exactly the expected card set and decision paths');
assert.equal(missingScenarioCoverage.length,0,'each recognition card needs positive and negative full-frame real-device scenario coverage');

if(fixture.policy.validationRequiredForGeneralizationClaim&&validationCount===0){
  console.log('RECOGNITION BENCHMARK NOTE: validation split is empty; calibration PASS does not prove cross-video generalization.');
}
console.log('RECOGNITION BENCHMARK PASS');

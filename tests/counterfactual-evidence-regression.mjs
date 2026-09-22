import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const root=new URL('../',import.meta.url);
const hand=fs.readFileSync(new URL('hand-recognition.js',root),'utf8');
const start=hand.indexOf('function counterfactualTargetEvidence(samples,cardId)');
const end=hand.indexOf('const COUNTERFACTUAL_ORDINARY_DECISIONS',start);
assert.ok(start>=0&&end>start,'counterfactualTargetEvidence helper must be extractable');
const sandbox={};
vm.createContext(sandbox);
vm.runInContext(hand.slice(start,end)+';globalThis.counterfactualTargetEvidence=counterfactualTargetEvidence;',sandbox);
const fn=sandbox.counterfactualTargetEvidence;
assert.equal(typeof fn,'function');

const samples=[
  {
    sampleTime:10.045,
    candidates:[
      {index:0,matchScores:{zetaBeatrix:{imageScore:.395,titleScore:.2,anchorScore:.395},quickBlader:{imageScore:.41}}},
      {index:1,
        matchScores:{zetaBeatrix:{imageScore:.895,titleScore:.53,anchorScore:.895,imageSource:'anchor',anchorVariant:{score:.895,dx:4,angle:0,profileIndex:4,atDxBoundary:true,atAngleBoundary:false,variantCount:25,edgeProbe:{diagnosticOnly:true,applied:false,baseDx:4,probeDx:6,score:.912,angle:0,profileIndex:4,gain:.017,candidateThreshold:.9,reachesCandidateThreshold:true,atAngleBoundary:false}}},quickBlader:{imageScore:.295},barbaros:{imageScore:.22}},
        displayedCost:{accepted:true,value:6,source:'ocr',ocrValue:6,ocrAccepted:true,ocrConfidence:80,templateValue:7,templateScore:.67,templateThreshold:.98,templateAccepted:false},
        best:{cardId:'zetaBeatrix',imageScore:.895,imageSource:'anchor',titleScore:.53,anchorScore:.895,candidateThreshold:.9,decision:'temporal-probe-only',temporalProbe:true,temporalProbeFloor:.89,stableLeaderCostProbe:{enabled:true,tier:'eight-card-fan-cost-confirmed',minScore:.86,requiredCandidateCount:8,minTitleScore:.48,requiredAllowedOcrFrames:1,allowedOcrMinConfidence:60,sideOk:true}}
      }
    ]
  },
  {sampleTime:10.085,candidates:[{index:0,matchScores:{quickBlader:{imageScore:.8}}}]}
];
const rows=JSON.parse(JSON.stringify(fn(samples,'zetaBeatrix')));
assert.equal(rows.length,2);
assert.equal(rows[0].sampleTime,10.045);
assert.equal(rows[0].candidateCount,2);
assert.equal(rows[0].found,true);
assert.equal(rows[0].slot,1);
assert.equal(rows[0].imageScore,.895);
assert.equal(rows[0].imageSource,'anchor');
assert.equal(rows[0].titleScore,.53);
assert.equal(rows[0].anchorScore,.895);
assert.equal(rows[0].candidateThreshold,.9);
assert.equal(rows[0].decision,'temporal-probe-only');
assert.equal(rows[0].temporalProbe,true);
assert.equal(rows[0].temporalProbeFloor,.89);
assert.equal(rows[0].sameCardLeaderMargin,.5);
assert.equal(rows[0].crossCardLeaderMargin,.6);
assert.deepEqual(rows[0].anchorVariant,{score:.895,dx:4,angle:0,profileIndex:4,atDxBoundary:true,atAngleBoundary:false,variantCount:25,edgeProbe:{diagnosticOnly:true,applied:false,baseDx:4,probeDx:6,score:.912,angle:0,profileIndex:4,gain:.017,candidateThreshold:.9,reachesCandidateThreshold:true,atAngleBoundary:false}});
assert.deepEqual(rows[0].displayedCost,{accepted:true,value:6,source:'ocr',ocrValue:6,ocrAccepted:true,ocrConfidence:80,templateValue:7,templateScore:.67,templateThreshold:.98,templateAccepted:false,diagnostic6Probe:null});
assert.deepEqual(rows[0].stableLeaderCostProbe,{tier:'eight-card-fan-cost-confirmed',minScore:.86,requiredCandidateCount:8,minTitleScore:.48,requiredAllowedOcrFrames:1,allowedOcrMinConfidence:60,sideOk:true});
assert.deepEqual(rows[1],{sampleTime:10.085,candidateCount:1,found:false});
assert.equal(JSON.stringify(rows).includes('data:image'),false,'diagnostic target evidence must remain image-free');
console.log('COUNTERFACTUAL EVIDENCE REGRESSION PASS');

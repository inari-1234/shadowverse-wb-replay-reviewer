import assert from 'node:assert/strict';
import {buildReviewQueue} from './diagnostic-review-queue.mjs';

const candidate=(cardId,slot,score,{source='anchor',candidateThreshold=.90,probeFloor=.89,acceptedCosts=[1],ocr=null,template=null}={})=>({
  index:slot,
  imageBest:{cardId,imageScore:score,imageSource:source,titleScore:source==='title'?score:.5,anchorScore:source==='anchor'?score:.4},
  displayedCost:{
    accepted:ocr!=null||template?.accepted===true,
    value:template?.accepted===true?template.value:ocr,
    source:template?.accepted===true?'template':(ocr!=null?'ocr':null),
    ocrValue:ocr,ocrAccepted:ocr!=null,
    templateValue:template?.value??null,templateScore:template?.score??null,templateThreshold:.98,templateAccepted:template?.accepted===true
  },
  best:{
    cardId,imageScore:score,imageSource:source,candidateThreshold,temporalProbeFloor:probeFloor,
    acceptedCosts,ocrCostAccepted:ocr!=null,detectedCost:ocr
  }
});
const snapshot=(base,recognized,rows)=>({
  base,recognized,unresolved:{quickBlader:{},zetaBeatrix:{}},windowMode:'stable-backscan',reason:'fixture',
  samples:rows
});

const diagnostic={
  stateCapture:{hand:{result:snapshot(82.395,{barbaros:{decision:'temporal-slot-consensus'}},[
    {sampleTime:81.835,candidates:[candidate('quickBlader',2,.8907,{ocr:0,template:{value:1,score:.9449,accepted:false}}),candidate('zetaBeatrix',0,.6659,{source:'title',acceptedCosts:[4,6]})]},
    {sampleTime:81.875,candidates:[candidate('quickBlader',2,.8914,{ocr:0,template:{value:1,score:.9430,accepted:false}}),candidate('zetaBeatrix',0,.6661,{source:'title',acceptedCosts:[4,6]})]},
    {sampleTime:81.915,candidates:[candidate('quickBlader',2,.8910,{ocr:0,template:{value:1,score:.9423,accepted:false}}),candidate('zetaBeatrix',0,.6673,{source:'title',acceptedCosts:[4,6]})]},
    {sampleTime:81.955,candidates:[candidate('quickBlader',2,.8940,{ocr:0,template:{value:1,score:.9456,accepted:false}}),candidate('zetaBeatrix',0,.6700,{source:'title',acceptedCosts:[4,6]})]}
  ])}},
  events:[
    {hand:{result:snapshot(37.105,{},[
      {sampleTime:36.985,candidates:[candidate('zetaBeatrix',4,.8594,{acceptedCosts:[4,6]})]},
      {sampleTime:37.025,candidates:[candidate('zetaBeatrix',4,.8581,{acceptedCosts:[4,6]})]},
      {sampleTime:37.065,candidates:[candidate('zetaBeatrix',4,.8581,{acceptedCosts:[4,6]})]},
      {sampleTime:37.105,candidates:[candidate('zetaBeatrix',4,.8581,{acceptedCosts:[4,6]})]}
    ])}},
    {hand:{result:snapshot(50,{},[
      {sampleTime:49.9,candidates:[candidate('quickBlader',1,.72,{source:'title'})]},
      {sampleTime:49.94,candidates:[candidate('quickBlader',1,.73,{source:'title'})]},
      {sampleTime:49.98,candidates:[candidate('quickBlader',1,.71,{source:'title'})]}
    ])}}
  ]
};

const queue=buildReviewQueue(diagnostic);
assert.equal(queue.length,2,'only high-value unresolved review targets should be queued');
assert.equal(queue[0].cardId,'quickBlader');
assert.equal(queue[0].base,82.395);
assert.equal(queue[0].severity,'critical');
assert.ok(queue[0].reasons.includes('ocr-cost-conflict'));
assert.ok(queue[0].reasons.includes('repeated-template-support'));
assert.equal(queue[0].recommendedAction,'human-label');
assert.equal(queue[1].cardId,'zetaBeatrix');
assert.equal(queue[1].base,37.105);
assert.equal(queue[1].stable,true);
assert.equal(queue.some(x=>x.base===50),false,'low-score noise must not enter the default queue');
assert.equal(queue.some(x=>x.cardId==='barbaros'),false,'recognized cards are excluded by default');

const validationQueue=buildReviewQueue(diagnostic,{mode:'validation'});
const recognizedBarbaros=validationQueue.find(x=>x.cardId==='barbaros'&&x.base===82.395);
assert.ok(recognizedBarbaros,'validation mode must include recognized cards for false-positive review');
assert.equal(recognizedBarbaros.priority,100);
assert.ok(recognizedBarbaros.reasons.includes('validation-confirm-recognized'));
assert.equal(recognizedBarbaros.recommendedAction,'human-label');
assert.ok(validationQueue.some(x=>x.cardId==='quickBlader'&&x.base===82.395),'validation mode must retain high-risk unresolved candidates');

const rescueDiagnostic={events:[{hand:{result:{
  base:19.427,windowMode:'stable-backscan',reason:'fixture-rescue',
  recognized:{zetaBeatrix:{decision:'temporal-stable-leader-rescue',confidence:.881}},unresolved:{},
  samples:[
    {sampleTime:19.307,candidates:[candidate('zetaBeatrix',3,.881,{acceptedCosts:[4,6]})]},
    {sampleTime:19.347,candidates:[candidate('zetaBeatrix',3,.882,{acceptedCosts:[4,6]})]},
    {sampleTime:19.387,candidates:[candidate('zetaBeatrix',3,.883,{acceptedCosts:[4,6]})]},
    {sampleTime:19.427,candidates:[candidate('zetaBeatrix',3,.8862,{acceptedCosts:[4,6]})]}
  ]
}}}]};
const rescueQueue=buildReviewQueue(rescueDiagnostic,{mode:'validation'});
assert.equal(rescueQueue.length,1);
assert.equal(rescueQueue[0].cardId,'zetaBeatrix');
assert.equal(rescueQueue[0].priority,130,'validation rescue below candidate threshold should receive extra review priority');
assert.ok(rescueQueue[0].reasons.includes('recognized-via-rescue'));
assert.ok(rescueQueue[0].reasons.includes('recognized-below-candidate-threshold'));
console.log('DIAGNOSTIC REVIEW QUEUE REGRESSION PASS');

import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const WB={
  registerModule(){},
  log(){},
  turnTimeline:[],
  CardDB:{
    recognitionCards(){return[{id:'zetaBeatrix',label:'ゼタ＆ベアトリクス',candidateThreshold:.90,threshold:.92}]}
  }
};
const sandbox={
  window:{WB},console,Float32Array,Uint8ClampedArray,Map,
  atob:s=>Buffer.from(s,'base64').toString('binary'),
  document:{createElement(){return {width:0,height:0,getContext(){return {imageSmoothingEnabled:true,drawImage(){},getImageData(){return {data:new Uint8ClampedArray(12*16*4)}}}}}}}
};
vm.createContext(sandbox);
new vm.Script(fs.readFileSync(new URL('../hand-recognition.js',import.meta.url),'utf8')).runInContext(sandbox);
const H=WB.HandRecognition;
assert.equal(typeof H.nearThresholdOscillationTrend,'function');

const row=(sampleTime,score,titleScore,dx=0)=>({
  sampleTime,
  candidates:[{
    index:7,
    best:{cardId:'zetaBeatrix',imageScore:score,imageSource:'anchor',titleScore,anchorScore:score},
    imageBest:{cardId:'zetaBeatrix',imageScore:score,imageSource:'anchor',titleScore,anchorScore:score},
    matchScores:{zetaBeatrix:{imageScore:score,imageSource:'anchor',titleScore,anchorScore:score,anchorVariant:{score,dx,angle:0,profileIndex:1,atDxBoundary:Math.abs(dx)===4,atAngleBoundary:false,variantCount:25}}}
  }]
});

const exact=[
  row(131.822,.8639,.5136,0),
  row(131.862,.8899,.5277,4),
  row(131.902,.8905,.5306,2),
  row(131.942,.8624,.5041,0)
];
const osc=H.nearThresholdOscillationTrend(exact);
assert.ok(osc,'v4.13.53 exact Zeta oscillation must be diagnosed');
assert.equal(osc.mode,'oscillation');
assert.equal(osc.cardId,'zetaBeatrix');
assert.equal(osc.slot,7);
assert.equal(osc.peak,.8905);
assert.equal(osc.latest,.8624);
assert.equal(osc.gap,.0095);
assert.equal(osc.drop,.0281);
assert.equal(osc.range,.0281);
assert.equal(osc.samples,4);
assert.equal(osc.anchorLed,true);

const steady=[
  row(1,.8663,.4747),
  row(2,.8641,.5053),
  row(3,.8900,.5213),
  row(4,.8905,.5306)
];
assert.equal(H.nearThresholdOscillationTrend(steady),null,'monotonic settling must remain handled by the existing settling diagnostic');

const weak=[
  row(1,.82,.5),
  row(2,.84,.51),
  row(3,.889,.52),
  row(4,.82,.5)
];
assert.equal(H.nearThresholdOscillationTrend(weak),null,'oscillation diagnostic must reject windows whose latest score falls below the .85 safety floor');

const belowMargin=[
  row(1,.86,.5),
  row(2,.87,.51),
  row(3,.882,.52),
  row(4,.86,.5)
];
assert.equal(H.nearThresholdOscillationTrend(belowMargin),null,'oscillation diagnostic must require a peak within .015 of the candidate threshold');

console.log('NEAR-THRESHOLD OSCILLATION REGRESSION PASS');

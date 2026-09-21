import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const hand=fs.readFileSync(new URL('../hand-recognition.js',import.meta.url),'utf8');
const start=hand.indexOf('function anchorBoundaryExtensionDiagnostic(canvas,center,baseScores)');
const end=hand.indexOf('function anchorVariantDiagnosticScoresWithBoundaryProbe',start);
assert.ok(start>=0&&end>start,'anchorBoundaryExtensionDiagnostic helper must be extractable');

const profile={
  '6:-10':.86,
  '6:-5':.89,
  '6:0':.915,
  '6:5':.90,
  '6:10':.87,
  '-6:-10':.70,
  '-6:-5':.72,
  '-6:0':.73,
  '-6:5':.71,
  '-6:10':.69
};
const sandbox={
  CFG:{anchorBoundaryProbeDx:6},
  ANCHOR_ANGLES:[-10,-5,0,5,10],
  anchorSource(){return{}},
  anchorFeatureFromSource(_src,_center,angle,dx){return{angle,dx}},
  cosine(feature,p){return Number(p[`${feature.dx}:${feature.angle}`]??-1)},
  W:{CardDB:{
    recognitionCards(){return[
      {id:'zetaBeatrix',anchorCandidateThreshold:.90,anchorThreshold:.92},
      {id:'quickBlader',anchorCandidateThreshold:.90,anchorThreshold:.92}
    ]},
    anchorRecognitionProfiles(id){return id==='zetaBeatrix'?[profile]:[profile]}
  }}
};
vm.createContext(sandbox);
vm.runInContext(hand.slice(start,end)+';globalThis.anchorBoundaryExtensionDiagnostic=anchorBoundaryExtensionDiagnostic;',sandbox);
const fn=sandbox.anchorBoundaryExtensionDiagnostic;
assert.equal(typeof fn,'function');

const rows=JSON.parse(JSON.stringify(fn(
  {width:1200,height:552},
  {cx:960,cy:487},
  {
    zetaBeatrix:{score:.89,dx:4,angle:0,profileIndex:0,atDxBoundary:true,atAngleBoundary:false,variantCount:25},
    quickBlader:{score:.91,dx:2,angle:0,profileIndex:0,atDxBoundary:false,atAngleBoundary:false,variantCount:25}
  }
)));
assert.deepEqual(Object.keys(rows),['zetaBeatrix'],'only cards whose best anchor is at the current dx boundary should be probed');
assert.deepEqual(rows.zetaBeatrix,{
  diagnosticOnly:true,
  applied:false,
  baseDx:4,
  probeDx:6,
  score:.915,
  angle:0,
  profileIndex:0,
  gain:.025,
  candidateThreshold:.9,
  reachesCandidateThreshold:true,
  atAngleBoundary:false
});

const negative=JSON.parse(JSON.stringify(fn(
  {width:1200,height:552},
  {cx:960,cy:487},
  {zetaBeatrix:{score:.89,dx:-4,angle:0,profileIndex:0,atDxBoundary:true,atAngleBoundary:false,variantCount:25}}
)));
assert.equal(negative.zetaBeatrix.probeDx,-6);
assert.equal(negative.zetaBeatrix.score,.73);
assert.equal(negative.zetaBeatrix.gain,-.16);
assert.equal(negative.zetaBeatrix.reachesCandidateThreshold,false);
assert.equal(negative.zetaBeatrix.diagnosticOnly,true);
assert.equal(negative.zetaBeatrix.applied,false);

console.log('ANCHOR BOUNDARY PROBE REGRESSION PASS');

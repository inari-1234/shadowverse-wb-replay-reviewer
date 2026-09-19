import assert from 'node:assert/strict';
import {findHandSnapshots,pickHandSnapshot,compactCandidate,scenarioFromSnapshot} from './diagnostic-scenario-importer.mjs';

const sample={
  sampleTime:12.34,
  candidates:[{
    index:2,
    displayedCost:{ocrValue:0,ocrAccepted:true,templateValue:1,templateScore:.94494,templateThreshold:.98,templateAccepted:false},
    imageBest:{cardId:'quickBlader',imageScore:.89074,imageSource:'anchor',titleScore:.82544,anchorScore:.89074}
  }]
};
const hand={
  base:12.5,recognized:{quickBlader:{decision:'temporal-stable-leader-rescue'}},unresolved:{},
  samples:[sample],windowMode:'stable-backscan'
};
const diagnostic={
  build:'test-build',
  video:{name:'fixture.mp4'},
  stateCapture:{hand:{result:hand}},
  handRecognition:JSON.parse(JSON.stringify(hand)),
  events:[{hand:{result:{base:20,recognized:{},unresolved:{},samples:[]}}}]
};

const rows=findHandSnapshots(diagnostic);
assert.equal(rows.length,2,'duplicate copies of the same snapshot must collapse');
assert.equal(pickHandSnapshot(diagnostic,12.5),rows[0]);
const compact=compactCandidate(sample.candidates[0]);
assert.deepEqual(compact,{
  slot:2,cardId:'quickBlader',score:.8907,source:'anchor',titleScore:.8254,anchorScore:.8907,
  template:{value:1,score:.9449,threshold:.98,accepted:false},
  ocr:{value:0,accepted:true}
});
const scenario=scenarioFromSnapshot({...diagnostic,sourceName:'diag.json'},hand,{id:'fixture',split:'validation'});
assert.equal(scenario.id,'fixture');
assert.equal(scenario.split,'validation');
assert.deepEqual(scenario.expected.recognized,['quickBlader']);
assert.deepEqual(scenario.expected.decisions,{quickBlader:'temporal-stable-leader-rescue'});
assert.deepEqual(scenario.source.window,[12.34,12.34]);
assert.equal(scenario.samples[0].candidates[0].cardId,'quickBlader');
console.log('DIAGNOSTIC SCENARIO IMPORTER REGRESSION PASS');

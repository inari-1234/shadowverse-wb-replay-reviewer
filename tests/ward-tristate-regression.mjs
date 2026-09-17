import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const WB={
  registerModule(){},onReady(){},playOrder:()=> '先攻',targetSide:()=> 'bottom',
  video:null,turnTimeline:[],log(){},on(){},$(){return null},frameCanvas(){return null},
  videoKey:()=> 'test',currentTurnContext:()=>({})
};
const sandbox={window:{WB},document:{createElement(){return {getContext(){return {}}}}},console,performance:{now:()=>0},setTimeout,clearTimeout,Uint8Array,Uint32Array};
vm.createContext(sandbox);
new vm.Script(fs.readFileSync(new URL('../state-recognition.js',import.meta.url),'utf8')).runInContext(sandbox);
const S=WB.StateRecognition;

const pos=S.classifyWardStats({window:{frac:.166,minThird:.157},attack:{attackFrac:.0072}});
assert.equal(pos.state,'present');
assert.equal(pos.known,true);

const greenStatOnly=S.classifyWardStats({window:{frac:.184,minThird:0},attack:{attackFrac:.0087}});
assert.equal(greenStatOnly.state,'unknown');
assert.equal(greenStatOnly.known,false);

const goldenCardEffect=S.classifyWardStats({window:{frac:.098,minThird:.039},attack:{attackFrac:0}});
assert.notEqual(goldenCardEffect.state,'present','golden card effects must not be accepted as ward shields');

const weakestKnownWard=S.classifyWardStats({window:{frac:.151,minThird:.138},attack:{attackFrac:.0072}});
assert.equal(weakestKnownWard.state,'present','weakest real ward sample must remain above the safe gate');

const followerNoWard=S.classifyWardStats({window:{frac:.128,minThird:.068},attack:{attackFrac:.0262}});
assert.equal(followerNoWard.state,'unknown');

const emptyCandidate=S.classifyWardStats({window:{frac:0,minThird:0},attack:{attackFrac:.0002}});
assert.equal(emptyCandidate.state,'none-candidate');
assert.equal(emptyCandidate.known,false);

const emptySamples=[0,.15,.30,.45].map((offset,i)=>({state:'none-candidate',offset,sampleTime:10+offset,stats:{attack:{attackFrac:i===0?.0018:.0005}}}));
const none=S.decideWardSamples(emptySamples,{nearOwnStart:true});
assert.equal(none.state,'none');
assert.equal(none.known,true);
assert.equal(none.reason,'opponent-board-empty-confirmed');

const obscured=[...emptySamples,{state:'unknown',offset:.60,stats:{attack:{attackFrac:.007}}}];
const unsafeNone=S.decideWardSamples(obscured,{nearOwnStart:true});
assert.equal(unsafeNone.state,'unknown');
assert.equal(unsafeNone.known,false);

const presentWins=S.decideWardSamples([{state:'none-candidate',stats:{attack:{attackFrac:0}}},{state:'present',sampleTime:20.15,stats:{attack:{attackFrac:.01}}}],{nearOwnStart:true});
assert.equal(presentWins.state,'present');
assert.equal(presentWins.known,true);

const directEmpty=S.decideWardSamples([{state:'none-candidate',stats:{attack:{attackFrac:0}}}],{nearOwnStart:false});
assert.equal(directEmpty.state,'unknown','direct single-frame empty must not auto-confirm no ward');

const turn1Rule=await S.recognizeWard({relativeSide:'自分',turn:1,playOrder:'先攻',targetSide:'bottom',time:7.226,row:{side:'bottom',turn:1,time:5.828}});
assert.equal(turn1Rule.state,'none');
assert.equal(turn1Rule.known,true);
assert.equal(turn1Rule.reason,'first-player-own-turn1-rule');


console.log('WARD TRISTATE REGRESSION PASS');

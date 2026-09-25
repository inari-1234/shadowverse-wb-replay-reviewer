import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root=new URL('../',import.meta.url);
const store={};
const ready=[];
const handlers=new Map();
const makeEl=(value='')=>({
  value:String(value),textContent:'',innerHTML:'',dataset:{},hidden:false,disabled:false,tagName:'INPUT',
  addEventListener(type,fn){handlers.set(this._id+':'+type,fn)},
  _id:''
});
const elements={};
const add=(id,value='',tag='INPUT')=>{const e=makeEl(value);e._id=id;e.tagName=tag;elements[id]=e;return e};
for(const [id,value,tag] of [
  ['#reviewProfile','sea-pirate-royal','SELECT'],
  ['#leTurn','2','INPUT'],['#leOppHp','1','INPUT'],['#lePp','1','INPUT'],['#leBoard','0','INPUT'],
  ['#leExtra','no','SELECT'],['#leEp','no','SELECT'],['#leSep','no','SELECT'],['#leWard','none','SELECT'],
  ['#leResult','','DIV'],['#leStatus','','P'],['#leSaved','','DIV'],
  ['#leTacticalEditor','','DETAILS'],['#counterfactualPanel','','SECTION'],
  ['#leTacticalCards','','DIV'],['#leTacticalResources','','DIV'],['#cardDbStatus','','P'],
  ['#leCalc','','BUTTON'],['#leSave','','BUTTON'],
  ['#cfLoadState','','BUTTON'],['#cfSave','','BUTTON'],['#cfNew','','BUTTON'],
  ['#cfName','','INPUT'],['#cfParent','','SELECT'],['#cfSide','自分','SELECT'],['#cfKind','counterfactual','SELECT'],['#cfNote','','TEXTAREA'],
  ['#cfStatus','','P'],['#cfList','','DIV'],
  ['#asSource','','SELECT'],['#asName','','INPUT'],['#asOppHp','','INPUT'],['#asSelfHp','','INPUT'],
  ['#asWard','unknown','SELECT'],['#asFlags','','INPUT'],['#asBoard','','INPUT'],['#asOther','','INPUT'],['#asNote','','TEXTAREA'],
  ['#asCreate','','BUTTON'],['#asTemplate','','P'],['#asStatus','','P'],['#asResults','','DIV']
]) add(id,value,tag);

const tacticalEls={
  quickBlader:add('[data-tactical-card="quickBlader"]','1','SELECT'),
  zetaBeatrix:add('[data-tactical-card="zetaBeatrix"]','0','SELECT'),
  barbaros:add('[data-tactical-card="barbaros"]','0','SELECT'),
  pirateFlags:add('[data-tactical-resource="pirateFlags"]','','INPUT'),
  otherConfirmedDamage:add('[data-tactical-resource="otherConfirmedDamage"]','0','INPUT'),
  damageRoutesChecked:add('[data-tactical-resource="damageRoutesChecked"]','yes','SELECT')
};

const WB={
  APP:{version:'4.13.61',build:'4.13.61-20260925-clean-13-61',revision:'clean-13-61'},
  registerModule(){},onReady(fn){ready.push(fn)},on(){},
  videoMeta:{name:'replay.mp4',size:100,lastModified:123},video:{currentTime:42.5},
  currentTurnContext:()=>({turn:2}),playOrder:()=> '後攻',targetSide:()=> 'bottom',videoKey:()=> 'replay.mp4|100|123',
  $:s=>elements[s]??null,escape:s=>String(s),recordError(){},log(){},
  stateCapture:null,stateCaptureHistory:[],scenes:[],turnTimeline:[],turnValidation:null,mulligan:null,classDetection:null,
  tacticalHandRecognition:null
};
const sandbox={
  window:{WB},localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=String(v)}},
  atob:s=>Buffer.from(s,'base64').toString('binary'),Float32Array,Map,
  console,document:{querySelectorAll:()=>[]}
};
vm.createContext(sandbox);
new vm.Script(fs.readFileSync(new URL('../card-db.js',import.meta.url),'utf8')).runInContext(sandbox);
new vm.Script(fs.readFileSync(new URL('../review-engine.js',import.meta.url),'utf8')).runInContext(sandbox);
for(const fn of ready.splice(0)) fn();

const fire=(id,type='click')=>{
  const fn=handlers.get(id+':'+type);
  assert.equal(typeof fn,'function',`missing handler ${id}:${type}`);
  fn({isTrusted:true,target:elements[id]});
};
const sessionKey='replay.mp4|100|123';

fire('#leSave');
let lethalDb=JSON.parse(store['wb-lethal-v2']);
let snapshots=lethalDb.sessions[sessionKey].snapshots;
assert.equal(snapshots.length,1,'lethal snapshot must be persisted');
assert.equal(snapshots[0].turn,2);
assert.equal(snapshots[0].pp,1);
assert.ok(snapshots[0].lethalRoutes.some(v=>v.includes('クイックブレイダー')),'saved snapshot must retain evaluated lethal route');

fire('#cfLoadState');
elements['#cfName'].value='opponent-root';
elements['#cfParent'].value='';
elements['#cfSide'].value='相手';
elements['#cfKind'].value='actual';
elements['#cfNote'].value='root';
fire('#cfSave');

let cfDb=JSON.parse(store['wb-counterfactual-v1']);
let branches=cfDb.sessions[sessionKey].branches;
assert.equal(branches.length,1);
const parent=branches[0];
assert.equal(parent.state.sideToAct,'相手');
assert.equal(parent.knowledgeCutoffSeconds,42.5);

elements['#cfName'].value='child-line';
elements['#cfParent'].value=parent.id;
elements['#cfSide'].value='自分';
elements['#cfKind'].value='counterfactual';
elements['#cfNote'].value='child';
fire('#cfSave');

cfDb=JSON.parse(store['wb-counterfactual-v1']);
branches=cfDb.sessions[sessionKey].branches;
assert.equal(branches.length,2);
const parentAfter=branches.find(b=>b.id===parent.id);
const child=branches.find(b=>b.parentId===parent.id);
assert.ok(child,'child branch must point to parent');
assert.equal(parentAfter.state.sideToAct,'相手','child save must not mutate parent state');
assert.equal(child.state.sideToAct,'自分');
assert.equal(child.knowledgeCutoffSeconds,parentAfter.knowledgeCutoffSeconds,'child must retain parent knowledge cutoff');
assert.notDeepEqual(child.state,parentAfter.state,'child must have an independently modified state');

elements['#asSource'].value=parent.id;
elements['#asName'].value='reply-after-root';
elements['#asOppHp'].value='5';
elements['#asSelfHp'].value='12';
elements['#asWard'].value='none';
elements['#asFlags'].value='';
elements['#asBoard'].value='0';
elements['#asOther'].value='0';
elements['#asNote'].value='assist';
fire('#asCreate');

cfDb=JSON.parse(store['wb-counterfactual-v1']);
branches=cfDb.sessions[sessionKey].branches;
const assist=branches.find(b=>b.origin==='branch-assist-clean');
assert.ok(assist,'branch assist must create a child branch');
assert.equal(assist.parentId,parent.id);
assert.equal(assist.state.sideToAct,'自分');
assert.equal(assist.knowledgeCutoffSeconds,parentAfter.knowledgeCutoffSeconds,'branch assist must retain parent cutoff');
assert.equal(assist.automation.resourceStatus,'from-saved-lethal-snapshot');
assert.equal(assist.state.pp,1,'branch assist must reuse same-turn saved PP');
assert.equal(assist.state.extraPP,'no');
assert.equal(assist.state.ep,'no');
assert.equal(assist.state.sep,'no');
assert.equal(assist.state.opponentHP,5);
assert.equal(branches.find(b=>b.id===parent.id).state.opponentHP,1,'branch assist must not mutate its parent');

WB.scenes=[{turn:2,time:42.5,playOrder:'後攻',matchup:'ロイヤル',deck:'検証用デッキ',note:'review export'}];
const diagnostics=fs.readFileSync(new URL('../diagnostics.js',import.meta.url),'utf8');
const start=diagnostics.indexOf('function reviewExport(){');
const end=diagnostics.indexOf('\nWB.Diagnostics=',start);
assert.ok(start>=0&&end>start,'reviewExport must be extractable');
const exportSandbox={
  WB,
  window:sandbox.window,
  clone:x=>x==null?x:JSON.parse(JSON.stringify(x)),
  globalThis:null
};
exportSandbox.globalThis=exportSandbox;
vm.createContext(exportSandbox);
new vm.Script(diagnostics.slice(start,end)+';globalThis.reviewExport=reviewExport;').runInContext(exportSandbox);
const review=exportSandbox.reviewExport();
assert.equal(review.format,'shadowverse-wb-review-v4.13.61-clean');
assert.equal(review.scenes.length,1);
assert.equal(review.scenes[0].deck,'検証用デッキ','review export must retain scene deck metadata');
assert.equal(review.lethalStateV2.snapshots.length,1,'review export must contain saved lethal snapshots');
assert.equal(review.counterfactualTreeV1.branches.length,3,'review export must contain parent, child, and assist branches');
assert.equal(review.counterfactualTreeV1.branches.find(b=>b.parentId===parent.id&&b.origin==='branch-assist-clean').knowledgeCutoffSeconds,42.5);

console.log('REVIEW LAYER REGRESSION PASS');

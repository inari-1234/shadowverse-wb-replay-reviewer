import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const read=p=>fs.readFileSync(p,'utf8');
const write=(p,s)=>fs.writeFileSync(p,s);
function exactReplace(src,from,to,label){const n=src.split(from).length-1;if(n!==1)throw new Error(`${label}: expected exactly 1 match, got ${n}`);return src.replace(from,to)}
function replaceBetween(src,start,end,replacement,label){const a=src.indexOf(start),b=src.indexOf(end,a+start.length);if(a<0||b<0)throw new Error(`${label}: boundary missing`);if(src.indexOf(start,a+1)>=0)throw new Error(`${label}: start boundary ambiguous`);return src.slice(0,a)+replacement+'\n'+src.slice(b)}

// P-E1: presentation clarity only. No decision/ranking semantics are changed.
{
 let s=read('coach-explanation.js');
 s=exactReplace(s,"VERSION='pe1-coach-explanation-v1.1.1'","VERSION='pe1-coach-explanation-v1.2.0'",'coach version');
 const describe=`function connectedVerb(a,isLast){if(a?.actionType==='PLAY_CARD')return isLast?'出す':'出して';if(a?.actionType==='EVOLVE')return isLast?'進化する':'進化して';if(a?.actionType==='ATTACK'&&a?.target?.zone==='LEADER')return isLast?'リーダーを攻撃する':'リーダーを攻撃して';if(a?.actionType==='ATTACK')return isLast?'相手フォロワーを攻撃する':'相手フォロワーを攻撃して';return null;}\nfunction describeCandidate(playedMove,candidateId){const row=candidateRow(playedMove,candidateId),actions=(row?.actions||[]).filter(a=>a?.actionType!=='END_TURN');if(!row)return'この候補手';if(!actions.length)return'そのままターンを終える手';const sourceIds=uniq(actions.map(a=>a?.source?.cardId&&String(a.source.cardId)));if(sourceIds.length===1){const label=cardLabel(sourceIds[0])||'フォロワー',verbs=actions.map((a,i)=>connectedVerb(a,i===actions.length-1));if(verbs.every(Boolean)){const particle=actions[0]?.actionType==='ATTACK'?'で':'を';return \`${'${label}'}${'${particle}'}${'${verbs.join(\'\')}'}手\`;}}for(const play of actions.filter(a=>a?.actionType==='PLAY_CARD')){const attack=actions.find(a=>a?.actionType==='ATTACK'&&a?.target?.zone==='LEADER'&&(!a?.source?.cardId||!play?.source?.cardId||a.source.cardId===play.source.cardId));if(attack){const label=cardLabel(play?.source?.cardId)||'フォロワー';return \`${'${label}'}を出してリーダーを攻撃する手\`;}}const bits=[];for(const a of actions){if(a?.actionType==='PLAY_CARD')bits.push(\`${'${cardLabel(a?.source?.cardId)||\'カード\'}'}を出す\`);else if(a?.actionType==='ATTACK'&&a?.target?.zone==='LEADER')bits.push(\`${'${actionLabel(a)}'}でリーダーを攻撃する\`);else if(a?.actionType==='ATTACK')bits.push(\`${'${actionLabel(a)}'}で相手フォロワーを攻撃する\`);else if(a?.actionType==='EVOLVE')bits.push(\`${'${actionLabel(a)}'}を進化する\`);}return bits.length?\`${'${uniq(bits).join(\'、\')}'}手\`:'この候補手';}`;
 s=replaceBetween(s,'function describeCandidate','function evidenceLabel',describe,'describeCandidate');
 const tradeoff=`function tradeoffEvidencePriority(row){const d=Math.abs(Number(row?.difference)||0);if(row?.label==='immediateDamage')return 1000+d;if(row?.label==='opponentLeaderHP')return 900+d;if(row?.label==='EP')return 800;if(row?.label==='SEP')return 780;if(row?.label==='handCount')return 700;if(row?.label==='boardAttack')return 650+d;if(row?.label==='followers')return 630+d;if(row?.label==='boardDefense')return 610+d;return 500+d;}\nfunction tradeoffOtherGroup(pair,playedId,playedMove){const a=id(pair?.aCandidateId),b=id(pair?.bCandidateId),other=a===playedId?b:b===playedId?a:null;if(!other)return null;const rows=(pair?.evidence||[]).filter(r=>id(r?.winnerCandidateId)===other&&r?.evidence?.observationOnly!==true&&r?.confidence!=='INSUFFICIENT_EVIDENCE');if(!rows.length)return null;const sorted=rows.slice().sort((x,y)=>tradeoffEvidencePriority(y)-tradeoffEvidencePriority(x)),reasons=uniq(rows.map(directionalText));return{candidateId:other,description:describeCandidate(playedMove,other),reasons,primaryReason:directionalText(sorted[0]),priority:tradeoffEvidencePriority(sorted[0])};}\nfunction tradeoffPlayedComparison(decision,playedId,playedMove){const pairs=(decision?.ranking?.pairwise||[]).filter(p=>pairSide(p,playedId)),actualAdvantages=uniq(pairs.flatMap(p=>evidenceDirectionalReasons(p,playedId))),groupMap=new Map();for(const p of pairs){const g=tradeoffOtherGroup(p,playedId,playedMove);if(!g)continue;const old=groupMap.get(g.candidateId);if(!old)groupMap.set(g.candidateId,g);else{old.reasons=uniq([...old.reasons,...g.reasons]);if(g.priority>old.priority){old.primaryReason=g.primaryReason;old.priority=g.priority;old.description=g.description;}}}const otherCandidateAdvantages=[...groupMap.values()].sort((a,b)=>b.priority-a.priority||String(a.candidateId).localeCompare(String(b.candidateId))),selected=otherCandidateAdvantages.slice(0,3),otherAdvantages=selected.map(g=>\`${'${g.description}'}：${'${g.primaryReason}'}\`),description=describeCandidate(playedMove,playedId),reasons=[...actualAdvantages.map(x=>\`実際の手が上回る点：${'${x}'}\`),...otherCandidateAdvantages.flatMap(g=>g.reasons.map(x=>\`他候補が上回る点：${'${g.description}'}：${'${x}'}\`))];return{visible:true,status:'CONFIRMED_TRADE_OFF',text:\`実際の手は${'${description}'}と確認できました。候補ごとに長所が異なるため、単独の推奨はしません。\`,reasons,actualAdvantages,otherAdvantages,otherCandidateAdvantages,pairCount:pairs.length};}`;
 s=replaceBetween(s,'function tradeoffPlayedComparison','function playedComparison',tradeoff,'tradeoffPlayedComparison');
 write('coach-explanation.js',s);
}

// Integration Plane: expose carry provenance to presentation without mutating exact beforeState.
{
 let s=read('runtime-authority-binding.js');
 s=exactReplace(s,"const VERSION='pf0a-runtime-authority-binding-v1.1.7'","const VERSION='pf0a-runtime-authority-binding-v1.1.8'",'binding version');
 s=exactReplace(s,"beforeState:before,afterState:after,binding:clone(binding)}}","beforeState:before,afterState:after,preActionResourceAuthority:(()=>{const a=preActionResourceAuthorities.get(id)||null;return a&&String(a.runId||'')===String(runId)?clone(a):null})(),binding:clone(binding)}}",'presentation resource authority');
 write('runtime-authority-binding.js',s);
}

// Review Card: raw exact state remains untouched; provenance is a display annotation only.
{
 let s=read('replay-session.js');
 s=exactReplace(s,"const VERSION='replay-session-clean-1.16';","const VERSION='replay-session-clean-1.17';",'replay version');
 s=exactReplace(s,"function reviewFlag(v){return v==='yes'?'使用可':v==='no'?'使用不可':'未確認'}","function reviewFlag(v){return v==='yes'?'使用可':v==='no'?'使用不可':'未確認'}\nfunction reviewResourceFlag(v,key,authority,state){const direct=reviewFlag(v);if(direct!=='未確認'||!authority||String(authority?.anchorStateId||'')!==String(state?.id||''))return direct;if(String(authority?.carried?.[key]||'')!=='yes')return direct;const t=finite(authority?.sourceTime);return t==null?'使用可（事前観測から引き継ぎ）':`使用可（${t.toFixed(3)}秒の観測から引き継ぎ）`;}",'review resource helper');
 s=exactReplace(s,'function reviewStateRows(state,changedKeys=[]){','function reviewStateRows(state,changedKeys=[],resourceAuthority=null){','reviewStateRows signature');
 s=exactReplace(s,"{key:'ep',label:'EP',value:reviewFlag(r.ep),changed:changed.has('ep')}","{key:'ep',label:'EP',value:reviewResourceFlag(r.ep,'ep',resourceAuthority,state),changed:changed.has('ep')}",'EP display');
 s=exactReplace(s,"{key:'sep',label:'SEP',value:reviewFlag(r.sep),changed:changed.has('sep')}","{key:'sep',label:'SEP',value:reviewResourceFlag(r.sep,'sep',resourceAuthority,state),changed:changed.has('sep')}",'SEP display');
 s=exactReplace(s,'beforeRows:reviewStateRows(beforeState,changedKeys),afterRows:reviewStateRows(afterState,changedKeys)','beforeRows:reviewStateRows(beforeState,changedKeys,useAuthority?authority?.preActionResourceAuthority:null),afterRows:reviewStateRows(afterState,changedKeys,null)','review card provenance wiring');
 write('replay-session.js',s);
}

// Expected module contract.
{
 let s=read('app-core.js');
 s=exactReplace(s,"'replay-session':'replay-session-clean-1.16'","'replay-session':'replay-session-clean-1.17'",'app expected replay version');
 write('app-core.js',s);
}

// Version-only test literals. No semantic assert is changed here.
for(const dirent of fs.readdirSync('tests',{withFileTypes:true})){
 if(!dirent.isFile()||!/[.](?:mjs|cjs|js)$/.test(dirent.name))continue;
 const p=path.join('tests',dirent.name);let s=read(p),n=s;
 n=n.replaceAll('pe1-coach-explanation-v1.1.1','pe1-coach-explanation-v1.2.0');
 n=n.replaceAll('pf0a-runtime-authority-binding-v1.1.7','pf0a-runtime-authority-binding-v1.1.8');
 n=n.replaceAll('replay-session-clean-1.16','replay-session-clean-1.17');
 if(n!==s)write(p,n);
}

// Correct the new test's static variable-name expectation; semantic expectation is unchanged.
{
 const p='tests/pf1r2-coach-clarity-corrective-regression.mjs';let s=read(p);
 s=s.replace(/reviewStateRows\\\(before,changedKeys,/g,'reviewStateRows\\(beforeState,changedKeys,');
 write(p,s);
}

// Register the corrective in the normal Full Gate.
{
 let s=read('tests/run-quality-gate.mjs');
 s=exactReplace(s,"const GATE_VERSION='recognition-quality-gate-v116';","const GATE_VERSION='recognition-quality-gate-v117';",'gate version');
 s=exactReplace(s,"  'tests/pe1r1-tradeoff-no-best-regression.mjs',","  'tests/pe1r1-tradeoff-no-best-regression.mjs',\n  'tests/pf1r2-coach-clarity-corrective-regression.mjs',",'gate test registration');
 write('tests/run-quality-gate.mjs',s);
}

// Recompute exact 20-asset integrity and content-addressed Runtime Build ID.
{
 let index=read('index.html');
 const m=index.match(/const manifest=window\.__wbRuntimeAssetManifest=(\{.*?\});/s);if(!m)throw new Error('runtime manifest not found');
 const manifest=JSON.parse(m[1]);if(!Array.isArray(manifest.assets)||manifest.assets.length!==20)throw new Error(`unexpected runtime asset count: ${manifest.assets?.length}`);
 const integrity={};for(const name of manifest.assets)integrity[name]='sha256-'+createHash('sha256').update(fs.readFileSync(name)).digest('base64');
 manifest.integrity=integrity;const canonical=manifest.assets.map(name=>`${name}:${integrity[name]}`).join('\n');manifest.buildId='candidate-assets-'+createHash('sha256').update(canonical).digest('hex').slice(0,12);
 index=index.replace(m[0],`const manifest=window.__wbRuntimeAssetManifest=${JSON.stringify(manifest)};`);write('index.html',index);
 const latest=JSON.parse(read('latest.json'));latest.runtimeBuildId=manifest.buildId;latest.runtimeAssetCount=manifest.assets.length;latest.updatedAt='2026-10-30T09:45:00+09:00';write('latest.json',JSON.stringify(latest,null,2)+'\n');
 console.log(`RUNTIME_BUILD_ID ${manifest.buildId}`);
}

console.log('P-F1-R2 COACH CLARITY PATCH APPLIED');

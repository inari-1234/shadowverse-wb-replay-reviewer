(()=>{'use strict';
const W=window.WB;if(!W)return;
const V='review-clean-1.7.0',LS='wb-lethal-v2';W.registerModule('review-engine',V);
const rules={protocol:{beforeGrade:['主要リーサル候補を全列挙する','相手HP・PP・Extra PP・EP・SEP・守護・場の攻撃可能総打点・戦術情報を確認する','不明情報が残る場合はリーサルなしと断定しない','反実仮想は分岐直前から独立再計算する']},tacticalSummary:'dynamic-catalog-v1'};
const TACTICAL_CARDS=Object.freeze((W.CardDB?.tacticalCards?.()||[]).map(x=>Object.freeze(x)));
const LEGACY_CARD_KEYS=Object.freeze({barbaros:'barbaros',zetaBeatrix:'zetaBeatrix',quickBlader:'quickBlader'});
const TACTICAL_RESOURCES=Object.freeze([
  {id:'pirateFlags',label:'海賊旗カウント',kind:'text',placeholder:'例 5,2'},
  {id:'otherConfirmedDamage',label:'その他確定打点',kind:'number',placeholder:'0なら0を入力'},
  {id:'damageRoutesChecked',label:'即時打点候補の確認',kind:'coverage'}
]);
const REVIEW_PROFILES=Object.freeze({
  none:Object.freeze({id:'none',label:'使用しない（状態確認のみ）',tactical:false}),
  'sea-pirate-royal':Object.freeze({id:'sea-pirate-royal',label:'海賊ロイヤル',tactical:true})
});
const SEA_PIRATE_RULESET=Object.freeze({
  id:'sea-pirate-royal-runtime-v1',
  cards:Object.freeze({
    quickBlader:Object.freeze({type:'storm',cost:1,baseDamage:1,evolveBonus:2,superBonus:3}),
    zetaBeatrix:Object.freeze({type:'enhance-storm',cost:6,baseDamage:3,evolveBonus:2,superBonus:3}),
    barbaros:Object.freeze({type:'pirate-flag-finisher',cost:7,baseDamage:4,evolveBonus:2,superBonus:3,flagBreakAtOrBelow:5,flagDamage:2})
  })
});
function activeProfile(){const el=W.$('#reviewProfile');return el?String(el.value||'none'):'sea-pirate-royal'}
function profileEnabled(id=activeProfile()){return id==='sea-pirate-royal'}
const clone=x=>JSON.parse(JSON.stringify(x)),key=()=>W.videoMeta?`${W.videoMeta.name}|${W.videoMeta.size}|${W.videoMeta.lastModified}`:null,load=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))||d}catch{return d}},save=(k,x)=>{try{localStorage.setItem(k,JSON.stringify(x))}catch(e){W.recordError('review-persist',e)}};
let ld=load(LS,{sessions:{}});
const ses=(db,make=true)=>{const k=key();if(!k)return null;db.sessions??={};if(make&&!db.sessions[k])db.sessions[k]={sourceKey:k,snapshots:[],branches:[]};return db.sessions[k]};
const val=id=>W.$(id)?.value??'',num=(id,d=null)=>{const raw=val(id);if(raw==='')return d;const x=Number(raw);return Number.isFinite(x)?x:d},bool=v=>v==='yes'?true:v==='no'?false:null;
const parseFlags=raw=>{raw=String(raw??'').trim();if(!raw)return{known:false,values:[]};const values=raw.split(/[、,\s]+/).map(Number).filter(Number.isFinite);return{known:true,values}};
const tacticalCardEl=id=>W.$(`[data-tactical-card="${id}"]`),tacticalResourceEl=id=>W.$(`[data-tactical-resource="${id}"]`),manualCurrent=el=>el?.dataset?.manualVideo===W.videoKey();
function readTactical(){
  const cards={};
  for(const card of TACTICAL_CARDS){const raw=String(tacticalCardEl(card.id)?.value??'unknown'),n=Number(raw);cards[card.id]=raw==='unknown'||!Number.isInteger(n)?{id:card.id,label:card.label,category:card.category,known:false,count:null}:{id:card.id,label:card.label,category:card.category,known:true,count:Math.max(0,Math.min(card.maxCount,n))}}
  const fg=parseFlags(tacticalResourceEl('pirateFlags')?.value??''),otherRaw=String(tacticalResourceEl('otherConfirmedDamage')?.value??'').trim(),otherNum=Number(otherRaw),coverage=String(tacticalResourceEl('damageRoutesChecked')?.value??'unknown');
  return{version:'tactical-v1',cards,resources:{pirateFlags:{known:fg.known,values:fg.values},otherConfirmedDamage:{known:otherRaw!==''&&Number.isFinite(otherNum),value:otherRaw!==''&&Number.isFinite(otherNum)?Math.max(0,otherNum):null},damageRoutesChecked:coverage==='yes'},observedAtSeconds:Number.isFinite(W.video?.currentTime)?+W.video.currentTime.toFixed(2):null}
}
const legacyStatus=c=>!c?.known?'unknown':Number(c.count)>0?'have':'none';
function normalizeCard(s,id,legacyKey){
  const c=s?.tactical?.cards?.[id]||s?.hand?.cards?.[id];
  if(c&&typeof c==='object'&&('known'in c||'count'in c)){const count=Number(c.count);return{id,label:TACTICAL_CARDS.find(x=>x.id===id)?.label||id,known:c.known!==false&&Number.isFinite(count),count:c.known===false||!Number.isFinite(count)?null:Math.max(0,count)}}
  const legacy=s?.hand?.[legacyKey];return{id,label:TACTICAL_CARDS.find(x=>x.id===id)?.label||id,known:legacy==='have'||legacy==='none',count:legacy==='have'?1:legacy==='none'?0:null}
}
function normalizeTactical(s){
  const cards={};for(const def of TACTICAL_CARDS)cards[def.id]=normalizeCard(s,def.id,LEGACY_CARD_KEYS[def.id]||def.id);
  const tr=s?.tactical?.resources||{},flags=tr.pirateFlags&&typeof tr.pirateFlags==='object'?{known:tr.pirateFlags.known!==false,values:Array.isArray(tr.pirateFlags.values)?tr.pirateFlags.values.map(Number).filter(Number.isFinite):[]}:{known:s?.pirateFlagsKnown!==false&&Array.isArray(s?.pirateFlagCountdowns),values:Array.isArray(s?.pirateFlagCountdowns)?s.pirateFlagCountdowns.map(Number).filter(Number.isFinite):[]};
  const od=tr.otherConfirmedDamage&&typeof tr.otherConfirmedDamage==='object'?{known:tr.otherConfirmedDamage.known!==false&&Number.isFinite(Number(tr.otherConfirmedDamage.value)),value:Number.isFinite(Number(tr.otherConfirmedDamage.value))?Math.max(0,Number(tr.otherConfirmedDamage.value)):null}:{known:s?.otherDamageKnown!==false&&Number.isFinite(Number(s?.otherConfirmedLeaderDamage)),value:Number.isFinite(Number(s?.otherConfirmedLeaderDamage))?Math.max(0,Number(s.otherConfirmedLeaderDamage)):null};
  const checked=typeof tr.damageRoutesChecked==='boolean'?tr.damageRoutesChecked:!!s?.hand?.otherDamageRoutesChecked;
  return{version:'tactical-v1',cards,resources:{pirateFlags:flags,otherConfirmedDamage:od,damageRoutesChecked:checked}}
}
function state(){const c=W.currentTurnContext(),t=readTactical(),boardEl=W.$('#leBoard'),boardRaw=String(boardEl?.value??val('#leBoard')).trim(),br=W.stateCapture?.board?.result,imageBoard=String(boardEl?.dataset?.source||'').startsWith('image-board')&&br?.accepted===true&&Number.isFinite(Number(br?.value))&&Number(br.value)===Number(boardRaw),boardFollowers=imageBoard&&Array.isArray(br?.followers)?br.followers.filter(x=>x?.attackable===true&&Number.isFinite(Number(x?.attackValue))).map(x=>Math.max(0,Number(x.attackValue))):[];return{turn:num('#leTurn',c.turn),opponentHP:num('#leOppHp'),pp:num('#lePp'),extraPP:val('#leExtra')||'unknown',ep:val('#leEp')||'unknown',sep:val('#leSep')||'unknown',opponentWard:val('#leWard')||'unknown',pirateFlagCountdowns:t.resources.pirateFlags.values,pirateFlagsKnown:t.resources.pirateFlags.known,knownBoardLeaderDamage:boardRaw===''?null:Math.max(0,Number(boardRaw)||0),boardDamageKnown:boardRaw!=='',boardFollowers,otherConfirmedLeaderDamage:t.resources.otherConfirmedDamage.value,otherDamageKnown:t.resources.otherConfirmedDamage.known,tactical:t,hand:{barbaros:legacyStatus(t.cards.barbaros),zetaBeatrix:legacyStatus(t.cards.zetaBeatrix),quickBlader:legacyStatus(t.cards.quickBlader),cards:clone(t.cards),otherDamageRoutesChecked:t.resources.damageRoutesChecked,recognition:clone(W.tacticalHandRecognition||null)},sideToAct:'自分',observedAtSeconds:Number.isFinite(W.video?.currentTime)?+W.video.currentTime.toFixed(2):null}}
function calculate(s=state(),profile=activeProfile()){if(!profileEnabled(profile)){const pp0=Number.isFinite(Number(s.pp))?Number(s.pp):null,ex0=s.extraPP??(s.extraPPAvailable==null?'unknown':s.extraPPAvailable?'yes':'no'),eff0=pp0==null?null:pp0+(bool(ex0)===true?1:0);return{...clone(s),tactical:normalizeTactical(s),effectivePP:eff0,routes:[],lethalRoutes:[],unknown:[],status:'profile-disabled',reviewProfile:profile}}const hp=Number.isFinite(Number(s.opponentHP))?Number(s.opponentHP):null,pp=Number.isFinite(Number(s.pp))?Number(s.pp):null,ex=s.extraPP??(s.extraPPAvailable==null?'unknown':s.extraPPAvailable?'yes':'no'),ep=s.ep??(s.epAvailable==null?'unknown':s.epAvailable?'yes':'no'),sep=s.sep??(s.sepAvailable==null?'unknown':s.sepAvailable?'yes':'no'),ward=typeof s.opponentWard==='string'?s.opponentWard:s.opponentWard===true?'present':s.opponentWard===false?'none':'unknown',tactical=normalizeTactical(s),bar=tactical.cards.barbaros||{known:false,count:null,label:'バルバロス'},z=tactical.cards.zetaBeatrix||{known:false,count:null,label:'ゼタ＆ベアトリクス'},otherOk=!!tactical.resources.damageRoutesChecked,flagsKnown=!!tactical.resources.pirateFlags.known,boardKnown=s.boardDamageKnown!==false&&Number.isFinite(Number(s.knownBoardLeaderDamage)),otherKnown=!!tactical.resources.otherConfirmedDamage.known,eff=pp==null?null:pp+(bool(ex)===true?1:0),fixed=(boardKnown?Math.max(0,+s.knownBoardLeaderDamage||0):0)+(otherKnown?Math.max(0,+tactical.resources.otherConfirmedDamage.value||0):0),fs=flagsKnown?tactical.resources.pirateFlags.values.map(Number).filter(Number.isFinite):[],unknown=[],routes=[];
if(hp==null)unknown.push('相手HP');if(pp==null)unknown.push('PP');if(ex==='unknown')unknown.push('Extra PP');if(ep==='unknown')unknown.push('EP');if(sep==='unknown')unknown.push('SEP');if(ward==='unknown')unknown.push('守護');if(!boardKnown)unknown.push('場の攻撃可能総打点');if(!otherKnown)unknown.push('その他確定打点');for(const def of TACTICAL_CARDS){const card=tactical.cards[def.id];if(!card?.known)unknown.push(`${def.label}所持数`);}if(bar.known&&bar.count>0&&!flagsKnown)unknown.push('海賊旗カウント');if(!otherOk)unknown.push('その他の即時打点候補');
const add=(name,cost,damage,category='other',meta={})=>routes.push({name,cost,damage,category,...meta,wardState:ward,lethal:hp!=null&&damage>=hp&&ward==='none'});
if(hp!=null&&boardKnown&&fixed>=hp)add('場＋その他確定打点',0,fixed,'board');
const barRule=SEA_PIRATE_RULESET.cards.barbaros;if(bar.known&&bar.count>0&&eff!=null&&eff>=barRule.cost&&flagsKnown&&boardKnown){const d=barRule.baseDamage+fs.filter(x=>x<=barRule.flagBreakAtOrBelow).length*barRule.flagDamage+fixed;add('バルバロス',barRule.cost,d,'hand',{cardId:'barbaros'});if(bool(ep))add('バルバロス＋進化',barRule.cost,d+barRule.evolveBonus,'hand',{cardId:'barbaros'});if(bool(sep))add('バルバロス＋超進化',barRule.cost,d+barRule.superBonus,'hand',{cardId:'barbaros'})}
const zRule=SEA_PIRATE_RULESET.cards.zetaBeatrix;if(z.known&&z.count>0&&eff!=null&&eff>=zRule.cost&&boardKnown){const d=zRule.baseDamage+fixed;add('ゼタ＆ベアトリクス（エンハンス6）',zRule.cost,d,'hand',{cardId:'zetaBeatrix'});if(bool(ep))add('ゼタ＆ベアトリクス＋進化',zRule.cost,d+zRule.evolveBonus,'hand',{cardId:'zetaBeatrix'});if(bool(sep))add('ゼタ＆ベアトリクス＋超進化',zRule.cost,d+zRule.superBonus,'hand',{cardId:'zetaBeatrix'})}
for(const def of TACTICAL_CARDS){const route=SEA_PIRATE_RULESET.cards[def.id];if(route?.type!=='storm')continue;const card=tactical.cards[def.id],cost=Math.max(1,Number(route.cost)||1),baseDamage=Math.max(0,Number(route.baseDamage)||0);if(card?.known&&card.count>0&&eff!=null&&eff>=cost&&boardKnown){const playable=Math.min(card.count,Math.floor(eff/cost)),base=playable*baseDamage+fixed,spent=playable*cost,meta={cardId:def.id,copies:playable,routeType:'storm'};add(`${def.label}×${playable}`,spent,base,'hand',meta);if(bool(ep)&&Number.isFinite(Number(route.evolveBonus)))add(`${def.label}×${playable}＋進化`,spent,base+Number(route.evolveBonus),'hand',meta);if(bool(sep)&&Number.isFinite(Number(route.superBonus)))add(`${def.label}×${playable}＋超進化`,spent,base+Number(route.superBonus),'hand',meta)}}
const lethalRoutes=routes.filter(x=>x.lethal).map(x=>x.name),status=lethalRoutes.length?'confirmed-lethal':unknown.length?'incomplete-do-not-declare-no-lethal':'checked-no-lethal-in-covered-routes';return{...clone(s),tactical,effectivePP:eff,routes,lethalRoutes,unknown,status,reviewProfile:profile}}
function tacticalSummary(x){const t=x.tactical||normalizeTactical(x),owned=TACTICAL_CARDS.map(def=>({def,state:t.cards[def.id]})).filter(x=>x.state?.known&&x.state.count>0).map(x=>`${x.def.label}×${x.state.count}`),unknownCards=TACTICAL_CARDS.filter(def=>!t.cards[def.id]?.known).map(def=>def.label),flags=t.resources.pirateFlags.known?(t.resources.pirateFlags.values.length?t.resources.pirateFlags.values.join(','):'0'):'未確認',boardKnown=x.boardDamageKnown!==false&&Number.isFinite(Number(x.knownBoardLeaderDamage)),boardParts=Array.isArray(x.boardFollowers)?x.boardFollowers.map(Number).filter(Number.isFinite).map(v=>Math.max(0,v)):[],board=boardKnown?`${Math.max(0,Number(x.knownBoardLeaderDamage))}点${boardParts.length?`（${boardParts.join('+')}）`:''}`:'未確認',other=t.resources.otherConfirmedDamage.known?`${t.resources.otherConfirmedDamage.value}点`:'未確認',handRoutes=(x.routes||[]).filter(r=>r.category==='hand').map(r=>`${r.name} ${r.damage}点`);return`戦術情報：${owned.length?owned.join(' / '):'所持確認なし'}
場の攻撃可能総打点：${board}　海賊旗：${flags}　その他確定打点：${other}　候補確認：${t.resources.damageRoutesChecked?'済':'未確認'}
即時打点候補：${handRoutes.length?handRoutes.join(' / '):'現在のPPでは計算可能候補なし'}${unknownCards.length?`\nカード未確認：${unknownCards.join(' / ')}`:''}`}
function decisionSnapshot(x=calculate()){
  const t=x.tactical||normalizeTactical(x),rec=x?.hand?.recognition||W.tacticalHandRecognition||null,recognized=rec?.recognized&&typeof rec.recognized==='object'?rec.recognized:{};
  const currentHand=TACTICAL_CARDS.map(def=>{const card=t.cards?.[def.id]||{known:false,count:null},row=recognized[def.id],known=card?.known===true&&Number.isFinite(Number(card.count)),count=known?Math.max(0,Number(card.count)):null,fromImage=row?.known===true&&Number.isFinite(Number(row.count))&&Number(row.count)>0;return{id:def.id,label:def.label,category:def.category,known,count,source:fromImage?'image-current-hand':known?'state-or-manual':'unknown',confidence:fromImage&&Number.isFinite(Number(row.confidence))?Number(row.confidence):null}}).filter(row=>row.known&&Number(row.count)>0);
  const boardKnown=x.boardDamageKnown!==false&&Number.isFinite(Number(x.knownBoardLeaderDamage)),other=t.resources?.otherConfirmedDamage||{known:false,value:null},flags=t.resources?.pirateFlags||{known:false,values:[]},ward=typeof x.opponentWard==='string'?x.opponentWard:'unknown';
  const routes=(x.routes||[]).map(r=>({name:r.name,category:r.category,cost:r.cost,damage:r.damage,cardId:r.cardId||null,copies:r.copies??null,wardState:r.wardState,lethal:!!r.lethal}));
  return{version:'decision-input-v1',observedAtSeconds:Number.isFinite(Number(x.observedAtSeconds))?Number(x.observedAtSeconds):null,context:{turn:x.turn??null,sideToAct:x.sideToAct||'自分',opponentHP:Number.isFinite(Number(x.opponentHP))?Number(x.opponentHP):null,pp:Number.isFinite(Number(x.pp))?Number(x.pp):null,effectivePP:Number.isFinite(Number(x.effectivePP))?Number(x.effectivePP):null,extraPP:x.extraPP??'unknown',ep:x.ep??'unknown',sep:x.sep??'unknown',opponentWard:ward},currentHand,handRecognition:{available:!!rec,windowMode:rec?.windowMode??null,currentRecognizedIds:Object.keys(recognized)},resources:{boardDamage:{known:boardKnown,value:boardKnown?Math.max(0,Number(x.knownBoardLeaderDamage)):null,followers:boardKnown&&Array.isArray(x.boardFollowers)?x.boardFollowers.map(Number).filter(Number.isFinite).map(v=>Math.max(0,v)):[]},otherConfirmedDamage:{known:other.known===true&&Number.isFinite(Number(other.value)),value:other.known===true&&Number.isFinite(Number(other.value))?Math.max(0,Number(other.value)):null},pirateFlags:{known:flags.known===true,values:Array.isArray(flags.values)?flags.values.map(Number).filter(Number.isFinite):[]},damageRoutesChecked:!!t.resources?.damageRoutesChecked},routes,coverage:{missing:Array.isArray(x.unknown)?x.unknown.slice():[],candidateRouteCount:routes.length,lethalCandidateCount:routes.filter(r=>r.lethal).length,complete:x.status!=='incomplete-do-not-declare-no-lethal'},status:x.status,invariants:{priorStableHandPromotedToCurrent:false,currentHandSource:'normalized-current-state'}};
}
function decisionSummary(d){const ward=d.context.opponentWard==='present'?'あり':d.context.opponentWard==='none'?'なし':'未確認',hand=d.currentHand.length?d.currentHand.map(c=>`${c.label}×${c.count}`).join(' / '):'確認済みの該当カードなし',board=d.resources.boardDamage.known?`${d.resources.boardDamage.value}点${d.resources.boardDamage.followers?.length?`（${d.resources.boardDamage.followers.join('+')}）`:''}`:'未確認',other=d.resources.otherConfirmedDamage.known?`${d.resources.otherConfirmedDamage.value}点`:'未確認',status=d.status==='confirmed-lethal'?'リーサル候補あり':d.status==='checked-no-lethal-in-covered-routes'?'確認済み範囲ではリーサル候補なし':'未確認あり（リーサルなし断定禁止）',missing=d.coverage.missing.length?d.coverage.missing.join(' / '):'なし';return`判断入力：${d.context.turn??'?'}T / 有効PP ${d.context.effectivePP??'?'} / 相手HP ${d.context.opponentHP??'?'} / 守護 ${ward}
現在手札（確認済み）：${hand}
確定打点：場 ${board} / その他 ${other}
判断状態：${status}
未確認：${missing}`}

const WINDOW_COACH_VERSION='review-window-coach-v1';
const WINDOW_FIELD_LABELS=Object.freeze({pp:'PP',opponentHP:'相手HP',extraPP:'Extra PP',ep:'EP',sep:'SEP',opponentWard:'相手守護',boardDamage:'盤面打点',state:'状態'});
function coachFinite(v){if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null}
function coachResourceLabel(v){return v==='yes'?'使用可':v==='no'?'使用不可':'未確認'}
function coachWardLabel(v){return v==='present'?'あり確認':v==='none'?'なし確認':'未確認'}
function deriveWindowCoach(model={}){
  const before=model.beforeState||{},after=model.afterState||{},changes=Array.isArray(model.observedChanges)?model.observedChanges:[],
    unknown=[...new Set((Array.isArray(model.unknownFields)?model.unknownFields:[]).map(String))],
    unresolved=[...new Set((Array.isArray(model.unresolved)?model.unresolved:[]).map(String))],
    focus=[],questions=[],cautions=[];
  let hpDrop=null,boardDelta=null,ppDelta=null,resourceChanged=false,wardChanged=false;
  for(const a of changes){
    const from=coachFinite(a?.data?.from),to=coachFinite(a?.data?.to);
    if(a?.type==='opponent-hp-change'&&from!=null&&to!=null){
      hpDrop={from,to,delta:to-from};
      if(to<from){focus.push(`相手HPが ${from} → ${to}。残りHP ${to} と、変化後の盤面打点・守護・残りPPを並べて次の勝ち筋を確認する。`);questions.push('このHP減少の後、次のターンまでに必要な残り打点はどう変わったか？')}
      else focus.push(`相手HPが ${from} → ${to} に変化。回復・ダメージ源は断定せず、勝ち筋への影響を確認する。`)
    }else if(a?.type==='board-damage-change'&&from!=null&&to!=null){
      boardDelta={from,to,delta:to-from};
      if(to>from){focus.push(`攻撃可能打点が ${from} → ${to} に増加。増えた打点を今使う価値と、盤面に残す価値を比較する。`);questions.push('増えた攻撃可能打点を相手HPへ通す価値と、盤面維持の価値はどちらが高かったか？')}
      else if(to<from){focus.push(`攻撃可能打点が ${from} → ${to} に減少。攻撃・交換・除去など、何による減少かは未確定なので動画で使われ方を確認する。`);questions.push('減った打点は相手HPへの攻撃、盤面交換、その他の変化のどれだったか？')}
    }else if(a?.type==='pp-change'&&from!=null&&to!=null){
      ppDelta={from,to,delta:to-from};
      if(to<from){focus.push(`PPが ${from} → ${to} に減少。使用カードは断定せず、残りPP ${to} で別の手順を残せていたか確認する。`);questions.push('残ったPPで、別の有力手順や行動順を残せていたか？')}
      else focus.push(`PPが ${from} → ${to} に変化。変化理由を推定せず、前後の選択肢を確認する。`)
    }else if(a?.type==='resource-change'){
      resourceChanged=true;const key=String(a?.data?.resource||''),label=WINDOW_FIELD_LABELS[key]||key||'資源',fv=String(a?.data?.from??'unknown'),tv=String(a?.data?.to??'unknown');
      focus.push(`${label}が ${coachResourceLabel(fv)} → ${coachResourceLabel(tv)} に変化。使用したとは断定せず、タイミングと得られた打点・盤面価値を確認する。`);
      questions.push(`${label}の変化は、この局面で得た打点・盤面・テンポに見合っていたか？`)
    }else if(a?.type==='ward-change'){
      wardChanged=true;const fv=String(a?.data?.from??'unknown'),tv=String(a?.data?.to??'unknown');
      focus.push(`相手守護が ${coachWardLabel(fv)} → ${coachWardLabel(tv)} に変化。攻撃先と残り打点への影響を確認する。`);
      questions.push('守護状態の変化で、相手HPへ通せる打点や攻撃順はどう変わったか？')
    }
  }
  if(changes.length>1)cautions.push('同一区間で複数の変化を観測していますが、同一カード・同一行動による変化とは結び付けません。');
  if(unresolved.length)cautions.push(`未確定の因果: ${unresolved.join(' / ')}。`);
  if(unknown.length)cautions.push(`未確認項目（${unknown.map(x=>WINDOW_FIELD_LABELS[x]||x).join(' / ')}）があるため、最善手・リーサル有無・プレイの良否は断定しません。`);
  const afterHp=coachFinite(after.opponentHP),afterBoard=after.boardDamageKnown===true?coachFinite(after.boardDamage):null,afterWard=String(after.opponentWard||'unknown');
  if(afterHp!=null&&afterBoard!=null&&afterWard==='none'&&afterBoard>=afterHp){
    focus.push(`変化後の確認済み盤面打点 ${afterBoard} は相手HP ${afterHp} 以上です。守護なし確認済みのため、実際に攻撃可能なリーサル候補か動画で再確認する。`);
    questions.push('攻撃可能状態・攻撃先・追加の阻害要因まで確認すると、本当にその場で勝ち切れたか？')
  }
  let summary='観測変化を基準に、判断直前と変化後を見比べる局面です。';
  if(hpDrop?.delta<0)summary='相手HPが減った局面です。残りHPと次の打点計画を重点確認します。';
  else if(boardDelta?.delta>0)summary='攻撃可能打点が増えた局面です。打点を使うか残すかを重点確認します。';
  else if(boardDelta?.delta<0)summary='攻撃可能打点が減った局面です。打点の使われ方と盤面価値を重点確認します。';
  else if(ppDelta?.delta<0)summary='PPが減った局面です。残りPPと行動順の余地を重点確認します。';
  else if(resourceChanged)summary='戦術資源が変化した局面です。使うタイミングと得られた価値を重点確認します。';
  else if(wardChanged)summary='守護状態が変化した局面です。攻撃経路への影響を重点確認します。';
  if(!focus.length)focus.push('判断直前と変化後を動画で見比べ、確認できる事実だけで選択肢を整理する。');
  if(!questions.length)questions.push('この変化によって、次の行動候補と相手への圧力はどう変わったか？');
  return{version:WINDOW_COACH_VERSION,id:model.id?`coach:${model.id}`:null,turn:model.turn??null,reviewStart:coachFinite(model.reviewStart),reviewEnd:coachFinite(model.reviewEnd),
    basis:'observation-only',deckSpecific:false,usesCurrentHand:false,summary,focus,questions,cautions,unknownFields:unknown,
    judgement:'hold',judgementReason:'使用カード・効果源・行動順が確定していないため、この情報だけではプレイの良否を断定しません。',
    causalAttribution:false,cardAttribution:false};
}
function deriveWindowCoaches(models=[]){return(Array.isArray(models)?models:[]).map(deriveWindowCoach)}
function publishEvaluation(x,d=null){if(!W.videoMeta||!x)return;W.emit('review-evaluated',{atSeconds:Number.isFinite(Number(W.video?.currentTime))?+Number(W.video.currentTime).toFixed(3):null,turn:Number.isFinite(Number(x.turn))?Number(x.turn):null,reviewProfile:x.reviewProfile||activeProfile(),status:x.status||'unknown',lethalRoutes:clone(x.lethalRoutes||[]),unknown:clone(x.unknown||[]),decision:d?clone(d):null})}
function renderLethal(){const o=W.$('#leResult');if(!o)return null;if(!profileEnabled()){const x=calculate();window.__wbDecisionInputV1=null;window.__wbTacticalV1={profile:activeProfile(),db:clone(W.CardDB?.meta||null),catalog:clone(TACTICAL_CARDS),current:clone(x.tactical),handRecognition:clone(W.tacticalHandRecognition||null),routes:[],decisionInput:null};o.textContent='戦術レビューは使用していません。上の「現在の状況」で認識結果を確認できます。';publishEvaluation(x,null);return x}const x=calculate(),d=decisionSnapshot(x);window.__wbDecisionInputV1=clone(d);window.__wbTacticalV1={db:clone(W.CardDB?.meta||null),catalog:clone(TACTICAL_CARDS),current:clone(x.tactical),handRecognition:clone(W.tacticalHandRecognition||null),routes:clone(x.routes.filter(r=>r.category==='hand')),decisionInput:clone(d)};o.textContent=`${decisionSummary(d)}

${tacticalSummary(x)}

`+(x.routes.map(r=>`${r.lethal?'◎ ':''}${r.name}：${r.damage}点${r.wardState==='present'?'（守護あり）':r.wardState==='unknown'?'（守護未確認）':''}`).join('\n')||'該当する既知ルートはまだ計算できません。')+(x.lethalRoutes.length?`\nリーサル候補：${x.lethalRoutes.join(' / ')}`:x.unknown.length?`\n未確認：${x.unknown.join(' / ')}\n→「リーサルなし」と断定禁止`:'\n確認対象ルート内ではリーサルなし');publishEvaluation(x,d);return x}
function renderTacticalEditor(){const cb=W.$('#leTacticalCards'),rb=W.$('#leTacticalResources'),dbs=W.$('#cardDbStatus');if(dbs){const m=W.CardDB?.meta;dbs.textContent=m?`カードDB：登録${m.registeredCards??m.verifiedCards}枚 / 自動画像認識${m.recognitionEnabledCards}枚（段階拡張中）`:'カードDBを読み込めません';}if(cb)cb.innerHTML=TACTICAL_CARDS.map(card=>`<label class="tacticalItem"><span><b>${W.escape(card.label)}</b><small>${W.escape(card.category)}</small></span><select data-tactical-card="${card.id}"><option value="unknown">未確認</option><option value="0">なし</option>${Array.from({length:card.maxCount},(_,i)=>`<option value="${i+1}">${i+1}枚</option>`).join('')}</select></label>`).join('');if(rb)rb.innerHTML=TACTICAL_RESOURCES.map(r=>r.kind==='coverage'?`<label class="tacticalItem"><span><b>${W.escape(r.label)}</b><small>主要候補を確認したときだけ「確認済み」</small></span><select data-tactical-resource="${r.id}"><option value="unknown">未確認</option><option value="yes">確認済み</option></select></label>`:`<label class="tacticalItem"><span><b>${W.escape(r.label)}</b><small>${r.id==='pirateFlags'?'複数はカンマ区切り':'手札以外で確定している追加打点'}</small></span><input data-tactical-resource="${r.id}" type="${r.kind}" ${r.kind==='number'?'min="0"':''} placeholder="${W.escape(r.placeholder||'')}"></label>`).join('')}
function applyDetectedHand(result){W.tacticalHandRecognition=clone(result||null);if(!profileEnabled()){W.log('hand-recognition-review-skipped',{profile:activeProfile(),videoKey:W.videoKey()});renderLethal();return{applied:[],conflicts:[],recognized:clone(result?.recognized||{}),reviewProfile:activeProfile()}}const applied=[],conflicts=[];for(const [id,row] of Object.entries(result?.recognized||{})){const el=tacticalCardEl(id);if(!el||row?.known!==true||!Number.isFinite(Number(row.count))||Number(row.count)<=0)continue;const count=Math.max(1,Math.min(Number(row.count),Number(TACTICAL_CARDS.find(x=>x.id===id)?.maxCount)||3));if(manualCurrent(el)){if(Number(el.value)!==count)conflicts.push({cardId:id,manual:el.value,recognized:count});continue}el.value=String(count);el.dataset.source='image-hand';delete el.dataset.manualVideo;applied.push({cardId:id,count,confidence:row.confidence??null})}W.log('hand-recognition-apply',{applied,conflicts,videoKey:W.videoKey()});renderLethal();return{applied,conflicts,recognized:clone(result?.recognized||{})}}
function syncProfileUi(){const enabled=profileEnabled(),editor=W.$('#leTacticalEditor'),panel=W.$('#counterfactualPanel');if(editor)editor.hidden=!enabled;if(panel)panel.hidden=!enabled;for(const id of ['#leCalc','#leSave']){const e=W.$(id);if(e)e.disabled=!enabled}return enabled}
function resetTacticalEditor(){for(const e of document.querySelectorAll('[data-tactical-card]')){e.value='unknown';delete e.dataset.source;delete e.dataset.manualVideo}for(const e of document.querySelectorAll('[data-tactical-resource]')){e.value=e.tagName==='SELECT'?'unknown':'';delete e.dataset.source;delete e.dataset.manualVideo}W.tacticalHandRecognition=null;window.__wbTacticalV1={db:clone(W.CardDB?.meta||null),catalog:clone(TACTICAL_CARDS),current:readTactical(),handRecognition:null,routes:[]};renderLethal()}
function publishReviewState(){const lethal=clone(window.__wbLethalV2||{sourceKey:key(),snapshots:[],protocol:rules.protocol}),counterfactual=clone(window.__wbCounterfactualV1||{sourceKey:key(),branches:[],protocol:{}});if(W.videoMeta)W.emit('review-state-changed',{lethal,counterfactual})}
function expose(){const l=ses(ld,false);window.__wbLethalV2={sourceKey:key(),snapshots:clone(l?.snapshots||[]),protocol:rules.protocol};publishReviewState()}
function saveL(){const s=state(),critical=['extraPP','ep','sep','opponentWard'].filter(k=>s[k]==='unknown');if(critical.length){W.$('#leStatus').textContent=`保存しません：${critical.join(' / ')} が未確認です。`;return}const x=calculate(s),q=ses(ld);x.id='l'+Date.now().toString(36);x.createdAt=new Date().toISOString();q.snapshots.push(x);save(LS,ld);expose();W.$('#leStatus').textContent=`${x.turn??'?'}Tの状態を保存しました。`;renderSaved()}
function renderSaved(){const o=W.$('#leSaved'),q=ses(ld,false)?.snapshots||[];if(o)o.innerHTML=q.slice(-6).map(x=>`<div class="branchItem"><b>${x.turn??'?'}T</b><div>${x.lethalRoutes?.length?'候補：'+W.escape(x.lethalRoutes.join(' / ')):x.unknown?.length?'未確認：'+W.escape(x.unknown.join(' / ')):'主要候補内リーサルなし'}</div></div>`).join('')}
W.ReviewEngine={version:V,rules,ruleset:SEA_PIRATE_RULESET,profiles:REVIEW_PROFILES,activeProfile,profileEnabled,catalog:{cards:TACTICAL_CARDS,resources:TACTICAL_RESOURCES},calculate,state,normalizeTactical,readTactical,tacticalSummary,decisionSnapshot,decisionSummary,deriveWindowCoach,deriveWindowCoaches,renderLethal,expose,publishReviewState,renderTacticalEditor,resetTacticalEditor,applyDetectedHand,syncProfileUi};
W.onReady(()=>{renderTacticalEditor();syncProfileUi();W.on('state-hand-recognized',detail=>applyDetectedHand(detail?.result||null));W.on('state-captured',()=>renderLethal());W.on('state-input-changed',()=>renderLethal());W.$('#reviewProfile')?.addEventListener('change',()=>{syncProfileUi();if(profileEnabled()&&W.tacticalHandRecognition)applyDetectedHand(W.tacticalHandRecognition);else renderLethal();W.log('review-profile-change',{profile:activeProfile(),videoKey:W.videoKey()});W.emit('review-profile-changed',{profile:activeProfile()})});const tacticalChanged=e=>{if(e?.isTrusted){const el=e.target,id=el?.dataset?.tacticalCard||el?.dataset?.tacticalResource||null;if(id){el.dataset.source='manual';el.dataset.manualVideo=W.videoKey()}W.log('tactical-manual',{kind:el?.dataset?.tacticalCard?'card':'resource',id,value:el?.value??null,videoKey:W.videoKey()})}renderLethal()};W.$('#leTacticalCards')?.addEventListener('change',tacticalChanged);W.$('#leTacticalResources')?.addEventListener('input',tacticalChanged);W.$('#leTacticalResources')?.addEventListener('change',tacticalChanged);W.$('#leCalc')?.addEventListener('click',renderLethal);W.$('#leSave')?.addEventListener('click',saveL);W.on('video-reset',()=>{resetTacticalEditor();expose();renderSaved()});expose();renderLethal();renderSaved();W.log('module-ready',{module:'review-engine',version:V,reviewProfiles:true,defaultProfile:'none',stateBoundaryEvents:true,replaySessionEvents:true,tacticalRuleset:SEA_PIRATE_RULESET.id,counterfactualModule:'counterfactual-review',tacticalCatalog:true,tacticalDynamicUi:true,quickBladerRoute:true,cardDbBacked:true,handAutoApply:true,decisionInputV1:true,reviewWindowCoach:'observation-only-v1',historyIsolation:true})})})();

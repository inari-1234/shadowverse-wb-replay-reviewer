export const V5_SHADOW_VERSION='recognition-v5-shadow-0.8';

const finite=v=>Number.isFinite(Number(v))?Number(v):null;
export function median(values){
  const xs=(values||[]).map(Number).filter(Number.isFinite).sort((a,b)=>a-b);
  if(!xs.length)return null;
  const m=Math.floor(xs.length/2);
  return xs.length%2?xs[m]:(xs[m-1]+xs[m])/2;
}
export function percentile(values,p=.5){
  const xs=(values||[]).map(Number).filter(Number.isFinite).sort((a,b)=>a-b);
  if(!xs.length)return null;
  const q=Math.max(0,Math.min(1,Number(p)||0));
  const pos=(xs.length-1)*q,lo=Math.floor(pos),hi=Math.ceil(pos);
  if(lo===hi)return xs[lo];
  const f=pos-lo;
  return xs[lo]*(1-f)+xs[hi]*f;
}
export function distinctFrames(rows){
  const out=[],seen=new Set();
  for(const row of rows||[]){
    const key=row?.visualFrameId??row?.imageHash??row?.frameKey??row?.sampleTime;
    if(key==null||seen.has(String(key)))continue;
    seen.add(String(key));
    out.push(row);
  }
  return out;
}
function scoreSummary(values){
  const xs=(values||[]).map(Number).filter(Number.isFinite);
  return{
    frames:xs.length,
    median:median(xs),
    p25:percentile(xs,.25),
    p75:percentile(xs,.75),
    min:xs.length?Math.min(...xs):null,
    max:xs.length?Math.max(...xs):null
  };
}
function thresholdDecision(top,thresholds={}){
  if(!top)return{available:false,accepted:null,classId:null,threshold:null,score:null,reason:'no-class-evidence'};
  const threshold=finite(thresholds?.[top.id]);
  if(threshold==null)return{available:false,accepted:null,classId:null,threshold:null,score:top.median??null,reason:'no-threshold'};
  const accepted=finite(top.median)!=null&&Number(top.median)>=threshold;
  return{available:true,accepted,classId:accepted?String(top.id):null,threshold,score:top.median??null,reason:accepted?'threshold-met':'below-threshold'};
}
export function aggregateClassScores(rows,{scoreField='scores',thresholds={}}={}){
  const frames=distinctFrames(rows),classes=new Set();
  for(const row of frames)for(const id of Object.keys(row?.[scoreField]||{}))classes.add(id);
  const ranked=[...classes].map(id=>{
    const values=frames.map(r=>finite(r?.[scoreField]?.[id])).filter(v=>v!=null);
    const summary=scoreSummary(values);
    return{id:String(id),...summary,support:frames.length?values.length/frames.length:0};
  }).sort((a,b)=>(b.median??-Infinity)-(a.median??-Infinity)||(b.support-a.support)||String(a.id).localeCompare(String(b.id)));
  const top=ranked[0]||null,next=ranked[1]||null;
  const topWithMargin=top?{...top,margin:next&&top.median!=null&&next.median!=null?top.median-next.median:null}:null;
  return{
    mode:'shadow',
    applied:false,
    distinctFrames:frames.length,
    ranked,
    top:topWithMargin,
    thresholdDecision:thresholdDecision(topWithMargin,thresholds)
  };
}
function normalizeCostRow(row){
  const cost=row?.cost&&typeof row.cost==='object'?row.cost:row||{};
  const scores={...(cost?.scores||row?.templateScores||{})};
  const legacyD6=finite(row?.diagnostic6Score);
  if(legacyD6!=null&&finite(scores['6'])==null)scores['6']=legacyD6;
  const thresholds={};
  const d6Threshold=finite(cost?.diagnostic6?.threshold??row?.diagnostic6Threshold);
  if(d6Threshold!=null)thresholds['6']=d6Threshold;
  return{
    frameKey:row?.frameKey??row?.imageHash??row?.sampleTime,
    sampleTime:row?.sampleTime??null,
    scores,
    thresholds,
    ocrValue:finite(cost?.ocrValue??row?.ocrValue),
    ocrConfidence:finite(cost?.ocrConfidence??row?.ocrConfidence)
  };
}
export function aggregateCostEvidence(rows){
  const frames=distinctFrames((rows||[]).map(normalizeCostRow));
  const thresholds={};
  for(const row of frames)for(const [id,value] of Object.entries(row?.thresholds||{}))if(finite(value)!=null)thresholds[id]=finite(value);
  const classes=aggregateClassScores(frames,{scoreField:'scores',thresholds});
  const ocrVotes={};
  for(const row of frames){
    const value=finite(row?.ocrValue);
    if(value==null)continue;
    const conf=Math.max(0,finite(row?.ocrConfidence)??0);
    const key=String(value);
    ocrVotes[key]=(ocrVotes[key]||0)+Math.max(1,conf);
  }
  const rankedOcr=Object.entries(ocrVotes).map(([id,weight])=>({id,weight})).sort((a,b)=>b.weight-a.weight||a.id.localeCompare(b.id));
  const visualClass=classes.thresholdDecision?.classId??null,ocrTop=rankedOcr[0]||null;
  return{
    version:V5_SHADOW_VERSION,
    mode:'shadow',
    applied:false,
    distinctFrames:classes.distinctFrames,
    visual:classes,
    ocr:{ranked:rankedOcr,top:ocrTop},
    disagreement:!!(visualClass&&ocrTop&&String(visualClass)!==String(ocrTop.id))
  };
}
export function aggregateCostSlots(records){
  const groups=new Map();
  for(const row of records||[]){
    if(finite(row?.slot)==null)continue;
    const videoKey=String(row?.videoKey??'unknown'),slot=Number(row.slot),key=videoKey+'|'+slot;
    if(!groups.has(key))groups.set(key,{videoKey,slot,rows:[]});
    groups.get(key).rows.push(row);
  }
  return[...groups.values()].sort((a,b)=>a.videoKey.localeCompare(b.videoKey)||a.slot-b.slot).map(g=>({
    videoKey:g.videoKey,
    slot:g.slot,
    evidence:aggregateCostEvidence(g.rows)
  }));
}
export function aggregateCardEvidence(rows){
  return{
    version:V5_SHADOW_VERSION,
    mode:'shadow',
    applied:false,
    ...aggregateClassScores(rows,{scoreField:'cardScores'})
  };
}
function visibilitySummary(rows){
  const frames=distinctFrames(rows),rightRatios=frames.map(r=>finite(r?.visibility?.rightVisibleRatio)).filter(v=>v!=null),occlusion=frames.map(r=>finite(r?.visibility?.rightOcclusionRatio)).filter(v=>v!=null),rightGaps=frames.map(r=>finite(r?.visibility?.rightGap)).filter(v=>v!=null),leftGaps=frames.map(r=>finite(r?.visibility?.leftGap)).filter(v=>v!=null),anchorSpans=frames.map(r=>finite(r?.visibility?.anchorRightSpanPx)).filter(v=>v!=null),candidateCounts=frames.map(r=>finite(r?.candidateCount)).filter(v=>v!=null);
  return{
    frames:frames.length,
    candidateCountMedian:median(candidateCounts),
    leftGapMedian:median(leftGaps),
    rightGapMedian:median(rightGaps),
    anchorRightSpanMedian:median(anchorSpans),
    rightVisibleRatioMedian:median(rightRatios),
    rightOcclusionRatioMedian:median(occlusion),
    geometryLimited:median(rightRatios)!=null&&median(rightRatios)<1
  };
}
function frameTopConsistency(rows,scoreField,classId){
  const frames=distinctFrames(rows);
  if(!frames.length||!classId)return null;
  let valid=0,wins=0;
  for(const row of frames){
    const scores=row?.[scoreField]||{},ranked=Object.entries(scores).map(([id,v])=>[String(id),finite(v)]).filter(x=>x[1]!=null).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
    if(!ranked.length)continue;
    valid++;
    if(ranked[0][0]===String(classId))wins++;
  }
  return valid?wins/valid:null;
}
function visibilityConfidenceVector(frames,normal,masked,visibility,recoveryByClass){
  const normalTop=normal?.top||null,maskedTop=masked?.top||null;
  const normalTopId=normalTop?.id??null,maskedTopId=maskedTop?.id??null;
  const rankAgreement=!!(normalTopId&&maskedTopId&&normalTopId===maskedTopId);
  const normalConsistency=frameTopConsistency(frames,'cardScores',normalTopId);
  const maskedConsistency=frameTopConsistency(frames,'maskedCardScores',maskedTopId);
  const normalMargin=finite(normalTop?.margin),maskedMargin=finite(maskedTop?.margin);
  const recovery=maskedTopId?recoveryByClass?.[maskedTopId]??null:null;
  const gain=finite(recovery?.gain);
  return{
    geometryLimited:visibility?.geometryLimited===true,
    normalTopId,
    maskedTopId,
    rankAgreement,
    normalTopConsistency:normalConsistency,
    maskedTopConsistency:maskedConsistency,
    normalMargin,
    maskedMargin,
    marginGain:normalMargin!=null&&maskedMargin!=null?maskedMargin-normalMargin:null,
    scoreGain:gain,
    supportRatioMedian:finite(recovery?.supportRatioMedian),
    rankPreservingRecovery:visibility?.geometryLimited===true&&rankAgreement&&gain!=null&&gain>0&&maskedMargin!=null&&normalMargin!=null&&maskedMargin>normalMargin,
    rankConflict:visibility?.geometryLimited===true&&!!(normalTopId&&maskedTopId)&&normalTopId!==maskedTopId,
    degradedUnderMask:visibility?.geometryLimited===true&&rankAgreement&&gain!=null&&gain<=0
  };
}
function aggregateMaskedCardEvidence(rows){
  const frames=distinctFrames(rows),classes=new Set();
  for(const row of frames)for(const id of Object.keys(row?.maskedCardScores||{}))classes.add(id);
  const ranked=[...classes].map(id=>{
    const values=frames.map(r=>finite(r?.maskedCardScores?.[id])).filter(v=>v!=null);
    const supports=frames.map(r=>finite(r?.maskedCardMeta?.[id]?.supportRatio)).filter(v=>v!=null);
    const summary=scoreSummary(values);
    return{id:String(id),...summary,support:frames.length?values.length/frames.length:0,supportRatioMedian:median(supports)};
  }).sort((a,b)=>(b.median??-Infinity)-(a.median??-Infinity)||(b.support-a.support)||String(a.id).localeCompare(String(b.id)));
  const top=ranked[0]||null,next=ranked[1]||null;
  return{
    ranked,
    top:top?{...top,margin:next&&top.median!=null&&next.median!=null?top.median-next.median:null}:null
  };
}
export function aggregateVisibilityCardEvidence(rows){
  const frames=distinctFrames(rows),normal=aggregateClassScores(frames,{scoreField:'cardScores'}),masked=aggregateMaskedCardEvidence(frames),common40=aggregateClassScores(frames,{scoreField:'commonStrip40Scores'}),common50=aggregateClassScores(frames,{scoreField:'commonStrip50Scores'}),visibility=visibilitySummary(frames);
  const recoveryByClass={};
  const normalMap=new Map((normal.ranked||[]).map(x=>[x.id,x]));
  for(const row of masked.ranked||[]){
    const n=normalMap.get(row.id);
    recoveryByClass[row.id]={
      normalMedian:n?.median??null,
      maskedMedian:row.median??null,
      gain:n?.median!=null&&row.median!=null?row.median-n.median:null,
      supportRatioMedian:row.supportRatioMedian??null
    };
  }
  const topId=masked.top?.id??normal.top?.id??null;
  return{
    version:V5_SHADOW_VERSION,
    mode:'shadow',
    applied:false,
    distinctFrames:frames.length,
    visibility,
    normal,
    masked,
    commonStrip:{left40:common40,left50:common50},
    topClassId:topId,
    recovery:topId?recoveryByClass[topId]??null:null,
    recoveryByClass,
    confidence:{
      ...visibilityConfidenceVector(frames,normal,masked,visibility,recoveryByClass),
      commonStrip:{
        left40TopId:common40?.top?.id??null,
        left50TopId:common50?.top?.id??null,
        left40Margin:finite(common40?.top?.margin),
        left50Margin:finite(common50?.top?.margin),
        left40Consistency:frameTopConsistency(frames,'commonStrip40Scores',common40?.top?.id??null),
        left50Consistency:frameTopConsistency(frames,'commonStrip50Scores',common50?.top?.id??null),
        stripsAgree:!!(common40?.top?.id&&common50?.top?.id&&common40.top.id===common50.top.id),
        left40AgreesNormal:!!(common40?.top?.id&&normal?.top?.id&&common40.top.id===normal.top.id),
        left50AgreesNormal:!!(common50?.top?.id&&normal?.top?.id&&common50.top.id===normal.top.id),
        left40AgreesMasked:!!(common40?.top?.id&&masked?.top?.id&&common40.top.id===masked.top.id),
        left50AgreesMasked:!!(common50?.top?.id&&masked?.top?.id&&common50.top.id===masked.top.id)
      }
    }
  };
}
export function aggregateVisibilityCardSlots(records){
  const groups=new Map();
  for(const row of records||[]){
    if(finite(row?.slot)==null)continue;
    const videoKey=String(row?.videoKey??'unknown'),slot=Number(row.slot),key=videoKey+'|'+slot;
    if(!groups.has(key))groups.set(key,{videoKey,slot,rows:[]});
    groups.get(key).rows.push(row);
  }
  return[...groups.values()].sort((a,b)=>a.videoKey.localeCompare(b.videoKey)||a.slot-b.slot).map(g=>({
    videoKey:g.videoKey,
    slot:g.slot,
    evidence:aggregateVisibilityCardEvidence(g.rows)
  }));
}

function commonStripFrameSlotScores(records,scoreField){
  const frames=new Map();
  for(const row of records||[]){
    const videoKey=String(row?.videoKey??'unknown'),frameKey=String(row?.frameKey??row?.sampleTime??'unknown'),slot=finite(row?.slot);
    if(slot==null)continue;
    const scores=row?.[scoreField]||{},key=videoKey+'|'+frameKey;
    if(!frames.has(key))frames.set(key,{videoKey,frameKey,rows:[]});
    frames.get(key).rows.push({slot:Number(slot),scores});
  }
  return [...frames.values()];
}
export function aggregateCommonStripUniqueness(records,{scoreField='commonStrip40Scores'}={}){
  const frames=commonStripFrameSlotScores(records,scoreField),groups=new Map();
  for(const frame of frames){
    const cardIds=new Set();
    for(const row of frame.rows)for(const id of Object.keys(row.scores||{}))cardIds.add(String(id));
    for(const id of cardIds){
      const ranked=frame.rows.map(row=>({slot:row.slot,score:finite(row?.scores?.[id])})).filter(x=>x.score!=null).sort((a,b)=>b.score-a.score||a.slot-b.slot);
      if(!ranked.length)continue;
      const top=ranked[0],next=ranked[1]||null,key=frame.videoKey+'|'+id;
      if(!groups.has(key))groups.set(key,{videoKey:frame.videoKey,cardId:id,frames:[]});
      groups.get(key).frames.push({
        frameKey:frame.frameKey,
        topSlot:top.slot,
        topScore:top.score,
        runnerUpSlot:next?.slot??null,
        runnerUpScore:next?.score??null,
        slotMargin:next?top.score-next.score:null
      });
    }
  }
  return [...groups.values()].sort((a,b)=>a.videoKey.localeCompare(b.videoKey)||a.cardId.localeCompare(b.cardId)).map(group=>{
    const winnerCounts=new Map();
    for(const row of group.frames)winnerCounts.set(row.topSlot,(winnerCounts.get(row.topSlot)||0)+1);
    const winners=[...winnerCounts.entries()].sort((a,b)=>b[1]-a[1]||a[0]-b[0]);
    const dominantSlot=winners[0]?.[0]??null,dominantFrames=winners[0]?.[1]??0,total=group.frames.length;
    const dominantRows=group.frames.filter(x=>x.topSlot===dominantSlot),margins=dominantRows.map(x=>finite(x.slotMargin)).filter(x=>x!=null),scores=dominantRows.map(x=>finite(x.topScore)).filter(x=>x!=null);
    return{
      videoKey:group.videoKey,
      cardId:group.cardId,
      scoreField,
      distinctFrames:total,
      dominantSlot,
      dominantFrameRatio:total?dominantFrames/total:null,
      topScoreMedian:median(scores),
      topScoreMin:scores.length?Math.min(...scores):null,
      slotMarginMedian:median(margins),
      slotMarginMin:margins.length?Math.min(...margins):null,
      slotWinnerCounts:Object.fromEntries(winners.map(([slot,count])=>[String(slot),count])),
      frames:group.frames
    };
  });
}
export function aggregateMultiInstanceCardPeaks(records,{scoreField='commonStrip40Scores'}={}){
  const slots=new Map();
  for(const row of records||[]){
    const slot=finite(row?.slot);if(slot==null)continue;
    const videoKey=String(row?.videoKey??'unknown'),scores=row?.[scoreField]||{};
    for(const [cardId,rawScore] of Object.entries(scores)){
      const score=finite(rawScore);if(score==null)continue;
      const key=videoKey+'|'+String(cardId)+'|'+Number(slot);
      if(!slots.has(key))slots.set(key,{videoKey,cardId:String(cardId),slot:Number(slot),rows:[]});
      slots.get(key).rows.push({...row,score});
    }
  }
  const byCard=new Map();
  for(const group of slots.values()){
    const unique=distinctFrames(group.rows),scores=unique.map(x=>finite(x.score)).filter(x=>x!=null);
    if(!scores.length)continue;
    const row={
      slot:group.slot,
      distinctFrames:unique.length,
      scoreMedian:median(scores),
      scoreMin:Math.min(...scores),
      scoreMax:Math.max(...scores),
      scoreRange:Math.max(...scores)-Math.min(...scores)
    };
    const key=group.videoKey+'|'+group.cardId;
    if(!byCard.has(key))byCard.set(key,{videoKey:group.videoKey,cardId:group.cardId,slots:[]});
    byCard.get(key).slots.push(row);
  }
  return [...byCard.values()].sort((a,b)=>a.videoKey.localeCompare(b.videoKey)||a.cardId.localeCompare(b.cardId)).map(group=>({
    videoKey:group.videoKey,
    cardId:group.cardId,
    scoreField,
    mode:'multi-instance',
    applied:false,
    slots:group.slots.sort((a,b)=>b.scoreMedian-a.scoreMedian||a.slot-b.slot)
  }));
}

export function fuseVisualEvidenceSources({normal=null,left40=null,left50=null}={},floor=.90){
  const sources={normal:finite(normal),left40:finite(left40),left50:finite(left50)};
  const values=Object.values(sources).filter(x=>x!=null),supporting=Object.entries(sources).filter(([,v])=>v!=null&&v>=floor).map(([k])=>k);
  return{
    sources,
    availableSources:values.length,
    robustMedian:median(values),
    sourceMin:values.length?Math.min(...values):null,
    sourceMax:values.length?Math.max(...values):null,
    sourceRange:values.length?Math.max(...values)-Math.min(...values):null,
    supportingSources:supporting,
    supportingCount:supporting.length,
    floor,
    sourceConsensus:supporting.length>=2,
    applied:false
  };
}

export function aggregateFusedCardSlots(records,{floor=.90,minFrames=3}={}){
  const groups=new Map();
  for(const row of records||[]){
    const slot=finite(row?.slot);if(slot==null)continue;
    const videoKey=String(row?.videoKey??'unknown');
    const cardIds=new Set([
      ...Object.keys(row?.cardScores||{}),
      ...Object.keys(row?.commonStrip40Scores||{}),
      ...Object.keys(row?.commonStrip50Scores||{})
    ]);
    for(const cardId of cardIds){
      const normal=finite(row?.cardScores?.[cardId]),left40=finite(row?.commonStrip40Scores?.[cardId]),left50=finite(row?.commonStrip50Scores?.[cardId]);
      if(normal==null&&left40==null&&left50==null)continue;
      const key=videoKey+'|'+Number(slot)+'|'+String(cardId);
      if(!groups.has(key))groups.set(key,{videoKey,slot:Number(slot),cardId:String(cardId),rows:[]});
      groups.get(key).rows.push({...row,fused:fuseVisualEvidenceSources({normal,left40,left50},floor)});
    }
  }
  return [...groups.values()].sort((a,b)=>a.videoKey.localeCompare(b.videoKey)||a.slot-b.slot||a.cardId.localeCompare(b.cardId)).map(g=>{
    const unique=distinctFrames(g.rows),fused=unique.map(x=>x.fused),scores=fused.map(x=>finite(x.robustMedian)).filter(x=>x!=null),supportFrames=fused.filter(x=>x.sourceConsensus).length;
    return{
      videoKey:g.videoKey,
      slot:g.slot,
      cardId:g.cardId,
      mode:'visual-source-fusion',
      floor,
      minFrames,
      distinctFrames:unique.length,
      scoreMedian:median(scores),
      scoreMin:scores.length?Math.min(...scores):null,
      scoreMax:scores.length?Math.max(...scores):null,
      scoreRange:scores.length?Math.max(...scores)-Math.min(...scores):null,
      sourceConsensusFrames:supportFrames,
      sourceConsensusRatio:unique.length?supportFrames/unique.length:0,
      shadowEligible:unique.length>=minFrames&&supportFrames>=minFrames,
      applied:false,
      frames:fused
    };
  });
}

export function summarizeTrackEvidence(row={}){
  const patchSimilarity=finite(row?.patchSimilarity),topScore=finite(row?.topScore),runnerScore=finite(row?.runnerScore),margin=finite(row?.margin??(topScore!=null&&runnerScore!=null?topScore-runnerScore:null));
  return{
    cardId:row?.cardId==null?null:String(row.cardId),
    slotChanged:finite(row?.from?.slot)!=null&&finite(row?.to?.slot)!=null?Number(row.from.slot)!==Number(row.to.slot):null,
    handCountChanged:finite(row?.from?.handCount)!=null&&finite(row?.to?.handCount)!=null?Number(row.from.handCount)!==Number(row.to.handCount):null,
    patchSimilarity,
    topScore,
    runnerScore,
    margin,
    imageFloorSupport:(patchSimilarity!=null&&patchSimilarity>=.90)||(topScore!=null&&topScore>=.90),
    applied:false
  };
}

export function aggregateCommonStripComparisons(records){
  return{
    left40:aggregateCommonStripUniqueness(records,{scoreField:'commonStrip40Scores'}),
    left50:aggregateCommonStripUniqueness(records,{scoreField:'commonStrip50Scores'})
  };
}

export function aggregateCardSlots(records){
  const groups=new Map();
  for(const row of records||[]){
    if(finite(row?.slot)==null)continue;
    const videoKey=String(row?.videoKey??'unknown'),slot=Number(row.slot),key=videoKey+'|'+slot;
    if(!groups.has(key))groups.set(key,{videoKey,slot,rows:[]});
    groups.get(key).rows.push(row);
  }
  return[...groups.values()].sort((a,b)=>a.videoKey.localeCompare(b.videoKey)||a.slot-b.slot).map(g=>({
    videoKey:g.videoKey,
    slot:g.slot,
    evidence:aggregateCardEvidence(g.rows)
  }));
}
export function shadowComparison({legacy=null,costRows=[],cardRows=[]}={}){
  return{
    version:V5_SHADOW_VERSION,
    mode:'shadow',
    applied:false,
    legacy,
    cost:aggregateCostEvidence(costRows),
    cards:aggregateCardEvidence(cardRows)
  };
}
export function shadowComparisonFromRecords(records,{legacy=null}={}){
  return{
    version:V5_SHADOW_VERSION,
    mode:'shadow',
    applied:false,
    legacy,
    costSlots:aggregateCostSlots(records),
    cardSlots:aggregateCardSlots(records),
    visibilityCardSlots:aggregateVisibilityCardSlots(records),
    commonStripUniqueness:aggregateCommonStripComparisons(records),
    commonStripMultiInstance:{
      left40:aggregateMultiInstanceCardPeaks(records,{scoreField:'commonStrip40Scores'}),
      left50:aggregateMultiInstanceCardPeaks(records,{scoreField:'commonStrip50Scores'})
    },
    fusedCardSlots:aggregateFusedCardSlots(records)
  };
}

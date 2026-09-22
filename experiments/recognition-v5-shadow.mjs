export const V5_SHADOW_VERSION='recognition-v5-shadow-0.3';

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
    const key=row?.frameKey??row?.imageHash??row?.sampleTime;
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
  const frames=distinctFrames(rows),normal=aggregateClassScores(frames,{scoreField:'cardScores'}),masked=aggregateMaskedCardEvidence(frames),visibility=visibilitySummary(frames);
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
    topClassId:topId,
    recovery:topId?recoveryByClass[topId]??null:null,
    recoveryByClass
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
    visibilityCardSlots:aggregateVisibilityCardSlots(records)
  };
}

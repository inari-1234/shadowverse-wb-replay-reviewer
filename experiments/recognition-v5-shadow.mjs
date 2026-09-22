export const V5_SHADOW_VERSION='recognition-v5-shadow-0.1';

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
export function aggregateClassScores(rows,{scoreField='scores'}={}){
  const frames=distinctFrames(rows),classes=new Set();
  for(const row of frames)for(const id of Object.keys(row?.[scoreField]||{}))classes.add(id);
  const ranked=[...classes].map(id=>{
    const values=frames.map(r=>finite(r?.[scoreField]?.[id])).filter(v=>v!=null);
    const summary=scoreSummary(values);
    return{id,...summary,support:frames.length?values.length/frames.length:0};
  }).sort((a,b)=>(b.median??-Infinity)-(a.median??-Infinity)||(b.support-a.support)||String(a.id).localeCompare(String(b.id)));
  const top=ranked[0]||null,next=ranked[1]||null;
  return{
    mode:'shadow',
    applied:false,
    distinctFrames:frames.length,
    ranked,
    top:top?{...top,margin:next&&top.median!=null&&next.median!=null?top.median-next.median:null}:null
  };
}
export function aggregateCostEvidence(rows){
  const frames=distinctFrames(rows);
  const normalized=frames.map(row=>{
    const scores={...(row?.templateScores||{})};
    const d6=finite(row?.diagnostic6Score);
    if(d6!=null)scores['6']=d6;
    return{...row,scores};
  });
  const classes=aggregateClassScores(normalized,{scoreField:'scores'});
  const ocrVotes={};
  for(const row of frames){
    const value=finite(row?.ocrValue);
    if(value==null)continue;
    const conf=Math.max(0,finite(row?.ocrConfidence)??0);
    const key=String(value);
    ocrVotes[key]=(ocrVotes[key]||0)+Math.max(1,conf);
  }
  const rankedOcr=Object.entries(ocrVotes).map(([id,weight])=>({id,weight})).sort((a,b)=>b.weight-a.weight||a.id.localeCompare(b.id));
  return{
    version:V5_SHADOW_VERSION,
    mode:'shadow',
    applied:false,
    distinctFrames:classes.distinctFrames,
    visual:classes,
    ocr:{ranked:rankedOcr,top:rankedOcr[0]||null},
    disagreement:!!(classes.top&&rankedOcr[0]&&String(classes.top.id)!==String(rankedOcr[0].id))
  };
}
export function aggregateCardEvidence(rows){
  return{
    version:V5_SHADOW_VERSION,
    mode:'shadow',
    applied:false,
    ...aggregateClassScores(rows,{scoreField:'cardScores'})
  };
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

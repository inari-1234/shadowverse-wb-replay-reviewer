import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {findHandSnapshots} from './diagnostic-scenario-importer.mjs';

const round4=v=>Number.isFinite(Number(v))?+Number(v).toFixed(4):null;
const median=values=>{
  const xs=values.filter(Number.isFinite).sort((a,b)=>a-b);
  if(!xs.length)return null;
  const m=Math.floor(xs.length/2);
  return xs.length%2?xs[m]:(xs[m-1]+xs[m])/2;
};

function strongestRows(snapshot,cardId){
  const rows=[];
  for(const sample of snapshot.samples||[]){
    const candidates=(sample.candidates||[]).filter(row=>{
      const ib=row?.imageBest||row?.best||{};
      return ib.cardId===cardId&&Number.isFinite(Number(ib.imageScore));
    });
    if(!candidates.length)continue;
    const row=candidates.reduce((best,current)=>{
      const a=Number((best.imageBest||best.best||{}).imageScore);
      const b=Number((current.imageBest||current.best||{}).imageScore);
      return b>a?current:best;
    });
    rows.push({sampleTime:sample.sampleTime,row});
  }
  return rows;
}

function cardIdsForSnapshot(snapshot){
  const ids=new Set([
    ...Object.keys(snapshot.recognized||{}),
    ...Object.keys(snapshot.unresolved||{})
  ]);
  for(const sample of snapshot.samples||[]){
    for(const row of sample.candidates||[]){
      const id=(row.imageBest||row.best||{}).cardId;
      if(id)ids.add(id);
    }
  }
  return [...ids];
}

function summarizeCard(snapshot,cardId){
  const rows=strongestRows(snapshot,cardId);
  if(!rows.length)return null;
  const scores=rows.map(({row})=>Number((row.imageBest||row.best||{}).imageScore)).filter(Number.isFinite);
  const slots=rows.map(({row})=>Number(row.index)).filter(Number.isFinite);
  const sources=rows.map(({row})=>(row.imageBest||row.best||{}).imageSource).filter(Boolean);
  const bestRow=rows.reduce((best,current)=>{
    const a=Number((best.row.imageBest||best.row.best||{}).imageScore);
    const b=Number((current.row.imageBest||current.row.best||{}).imageScore);
    return b>a?current:best;
  });
  const best=bestRow.row.best||bestRow.row.imageBest||{};
  const acceptedCosts=Array.isArray(best.acceptedCosts)?best.acceptedCosts.map(Number):[];
  const candidateThreshold=Number.isFinite(Number(best.candidateThreshold))?Number(best.candidateThreshold):.90;
  const probeFloor=Number.isFinite(Number(best.temporalProbeFloor))?Number(best.temporalProbeFloor):Math.max(.85,candidateThreshold-.01);
  let costConflictFrames=0,templateSupportFrames=0,ocrZeroFrames=0,anchorFrames=0;
  for(const {row} of rows){
    const b=row.best||{};
    const ib=row.imageBest||b;
    const dc=row.displayedCost||{};
    if(ib.imageSource==='anchor')anchorFrames++;
    if(b.ocrCostAccepted===true&&b.detectedCost!=null&&acceptedCosts.length&&!acceptedCosts.includes(Number(b.detectedCost)))costConflictFrames++;
    if(dc.ocrAccepted===true&&Number(dc.ocrValue)===0)ocrZeroFrames++;
    if(dc.templateValue!=null&&acceptedCosts.includes(Number(dc.templateValue))&&Number(dc.templateScore)>=.94)templateSupportFrames++;
  }
  const range=Math.max(...scores)-Math.min(...scores);
  const sameSlot=slots.length===rows.length&&new Set(slots).size===1;
  const stable=rows.length>=3&&sameSlot&&range<=.015;
  const maxScore=Math.max(...scores);
  const minScore=Math.min(...scores);
  const nearFloor=maxScore>=candidateThreshold-.05;
  const recognized=Object.prototype.hasOwnProperty.call(snapshot.recognized||{},cardId);
  const unresolved=Object.prototype.hasOwnProperty.call(snapshot.unresolved||{},cardId);

  let priority=0;
  const reasons=[];
  if(!recognized){
    if(maxScore>=candidateThreshold){priority+=55;reasons.push('at-or-above-candidate-threshold')}
    else if(maxScore>=probeFloor){priority+=45;reasons.push('at-or-above-temporal-probe-floor')}
    else if(nearFloor){priority+=35;reasons.push('within-0.05-of-candidate-threshold')}
    if(stable){priority+=30;reasons.push('stable-same-slot')}
    if(costConflictFrames>0){priority+=30;reasons.push('ocr-cost-conflict')}
    if(templateSupportFrames>=3){priority+=25;reasons.push('repeated-template-support')}
    if(anchorFrames>=3){priority+=10;reasons.push('repeated-anchor-match')}
    if(unresolved){priority+=5;reasons.push('unresolved')}
  }

  return {
    cardId,recognized,unresolved,
    frames:rows.length,
    sampleTimes:rows.map(x=>round4(x.sampleTime)),
    slot:sameSlot?slots[0]:null,
    sameSlot,stable,
    sourceMode:sources.length?[...new Set(sources)].join('+'):null,
    minScore:round4(minScore),maxScore:round4(maxScore),medianScore:round4(median(scores)),scoreRange:round4(range),
    candidateThreshold:round4(candidateThreshold),probeFloor:round4(probeFloor),
    costConflictFrames,ocrZeroFrames,templateSupportFrames,anchorFrames,
    priority,reasons
  };
}

export function buildReviewQueue(diagnostic,{minPriority=50,includeRecognized=false}={}){
  const snapshots=findHandSnapshots(diagnostic);
  const items=[];
  for(const snapshot of snapshots){
    for(const cardId of cardIdsForSnapshot(snapshot)){
      const summary=summarizeCard(snapshot,cardId);
      if(!summary)continue;
      if(summary.recognized&&!includeRecognized)continue;
      if(summary.priority<minPriority)continue;
      items.push({
        base:round4(snapshot.base),
        windowMode:snapshot.windowMode??null,
        handReason:snapshot.reason??null,
        ...summary,
        severity:summary.priority>=120?'critical':summary.priority>=75?'high':'medium',
        recommendedAction:'human-label'
      });
    }
  }
  return items.sort((a,b)=>b.priority-a.priority||b.maxScore-a.maxScore||a.base-b.base);
}

function parseArgs(argv){
  const args={file:null,minPriority:50,includeRecognized:false};
  const rest=[...argv];
  args.file=rest.shift()||null;
  while(rest.length){
    const flag=rest.shift();
    if(flag==='--min-priority')args.minPriority=Number(rest.shift());
    else if(flag==='--include-recognized')args.includeRecognized=true;
    else throw new Error(`Unknown argument: ${flag}`);
  }
  if(!args.file)throw new Error('Usage: node tests/diagnostic-review-queue.mjs <diagnostic.json> [--min-priority 50] [--include-recognized]');
  return args;
}

const isCli=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isCli){
  const args=parseArgs(process.argv.slice(2));
  const diagnostic=JSON.parse(fs.readFileSync(args.file,'utf8'));
  const queue=buildReviewQueue(diagnostic,args);
  console.log(JSON.stringify({
    source:path.basename(args.file),
    generatedFrom:'diagnostic-review-queue-v1',
    humanLabelsRequired:true,
    items:queue
  },null,2));
}

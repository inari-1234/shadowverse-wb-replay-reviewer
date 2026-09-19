import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const round4=v=>Number.isFinite(Number(v))?+Number(v).toFixed(4):null;

export function findHandSnapshots(root){
  const found=[];
  const seen=new Set();
  const visit=value=>{
    if(Array.isArray(value)){for(const x of value)visit(x);return}
    if(!value||typeof value!=='object')return;
    if(Number.isFinite(Number(value.base))&&Array.isArray(value.samples)&&value.recognized&&typeof value.recognized==='object'){
      const times=value.samples.map(x=>round4(x?.sampleTime));
      const key=JSON.stringify([round4(value.base),times,Object.keys(value.recognized||{}).sort()]);
      if(!seen.has(key)){seen.add(key);found.push(value)}
    }
    for(const x of Object.values(value))visit(x);
  };
  visit(root);
  return found.sort((a,b)=>Number(a.base)-Number(b.base));
}

export function pickHandSnapshot(root,base,tolerance=.001){
  const target=Number(base);
  if(!Number.isFinite(target))throw new Error('base must be a finite number');
  const rows=findHandSnapshots(root)
    .map(x=>({row:x,delta:Math.abs(Number(x.base)-target)}))
    .filter(x=>x.delta<=tolerance)
    .sort((a,b)=>a.delta-b.delta);
  if(!rows.length)throw new Error(`No hand snapshot found near base ${target}`);
  return rows[0].row;
}

export function compactCandidate(row){
  const ib=row?.imageBest||row?.best||{};
  const dc=row?.displayedCost||{};
  const out={
    slot:Number(row?.index),
    cardId:ib.cardId??null,
    score:round4(ib.imageScore),
    source:ib.imageSource??null
  };
  if(Number.isFinite(Number(ib.titleScore)))out.titleScore=round4(ib.titleScore);
  if(Number.isFinite(Number(ib.anchorScore)))out.anchorScore=round4(ib.anchorScore);
  if(dc.templateValue!=null||Number.isFinite(Number(dc.templateScore))){
    out.template={
      value:dc.templateValue??null,
      score:round4(dc.templateScore),
      threshold:round4(dc.templateThreshold),
      accepted:dc.templateAccepted===true
    };
  }
  if(dc.ocrValue!=null||dc.ocrAccepted===true){
    out.ocr={value:dc.ocrValue??null,accepted:dc.ocrAccepted===true};
  }
  return out;
}

export function scenarioFromSnapshot(diagnostic,snapshot,{id,split='calibration'}={}){
  const base=round4(snapshot.base);
  const recognized=Object.keys(snapshot.recognized||{}).sort();
  const decisions=Object.fromEntries(recognized.map(cardId=>[cardId,snapshot.recognized[cardId]?.decision??null]));
  const samples=(snapshot.samples||[]).map(sample=>({
    time:round4(sample.sampleTime),
    candidates:(sample.candidates||[]).map(compactCandidate)
  }));
  const sampleTimes=samples.map(x=>x.time).filter(Number.isFinite);
  return {
    id:id||`real-full-frame-${base}`,
    split,
    origin:'real-diagnostic',
    source:{
      diagnostic:diagnostic?.sourceName||diagnostic?.fileName||null,
      build:diagnostic?.build??null,
      video:diagnostic?.video?.name??diagnostic?.video?.fileName??null,
      base,
      window:sampleTimes.length?[Math.min(...sampleTimes),Math.max(...sampleTimes)]:null
    },
    expected:{recognized,decisions},
    samples
  };
}

function parseArgs(argv){
  const args={file:null,base:null,id:null,split:'calibration'};
  const rest=[...argv];
  args.file=rest.shift()||null;
  while(rest.length){
    const flag=rest.shift();
    const value=rest.shift();
    if(flag==='--base')args.base=Number(value);
    else if(flag==='--id')args.id=value;
    else if(flag==='--split')args.split=value;
    else throw new Error(`Unknown argument: ${flag}`);
  }
  if(!args.file||!Number.isFinite(args.base))throw new Error('Usage: node tests/diagnostic-scenario-importer.mjs <diagnostic.json> --base <seconds> [--id <id>] [--split calibration|validation]');
  if(!['calibration','validation'].includes(args.split))throw new Error('split must be calibration or validation');
  return args;
}

const isCli=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isCli){
  const args=parseArgs(process.argv.slice(2));
  const diagnostic=JSON.parse(fs.readFileSync(args.file,'utf8'));
  diagnostic.sourceName=path.basename(args.file);
  const snapshot=pickHandSnapshot(diagnostic,args.base);
  console.log(JSON.stringify(scenarioFromSnapshot(diagnostic,snapshot,{id:args.id,split:args.split}),null,2));
}

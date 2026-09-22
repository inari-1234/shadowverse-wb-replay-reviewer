export const V5_DATASET_VERSION='recognition-v5-dataset-0.1';

const finite=v=>Number.isFinite(Number(v))?Number(v):null;
function candidateCardScores(candidate){
  const out={};
  for(const [id,row] of Object.entries(candidate?.matchScores||{})){
    const score=finite(row?.imageScore);
    if(score!=null)out[id]=score;
  }
  return out;
}
function costScores(candidate){
  const out={};
  const live=candidate?.displayedCost||{};
  const templateValue=finite(live.templateValue),templateScore=finite(live.templateScore);
  if(templateValue!=null&&templateScore!=null)out[String(templateValue)]=templateScore;
  const d6=finite(live?.diagnostic6Probe?.score);
  if(d6!=null)out['6']=d6;
  return out;
}
export function observationRecordsFromSamples(samples,{videoKey=null,frameHashes={}}={}){
  const out=[];
  for(const frame of samples||[]){
    const t=finite(frame?.sampleTime);
    for(const cand of frame?.candidates||[]){
      out.push({
        datasetVersion:V5_DATASET_VERSION,
        videoKey,
        sampleTime:t,
        frameKey:frameHashes?.[String(t)]||t,
        candidateCount:finite(frame?.candidateCount)??(frame?.candidates?.length??null),
        slot:finite(cand?.index),
        center:cand?.center?{cx:finite(cand.center.cx),cy:finite(cand.center.cy)}:null,
        cardScores:candidateCardScores(cand),
        cost:{
          scores:costScores(cand),
          ocrValue:finite(cand?.displayedCost?.ocrValue),
          ocrConfidence:finite(cand?.displayedCost?.ocrConfidence),
          liveValue:finite(cand?.displayedCost?.value),
          liveSource:cand?.displayedCost?.source??null,
          diagnostic6:cand?.displayedCost?.diagnostic6Probe?{
            score:finite(cand.displayedCost.diagnostic6Probe.score),
            threshold:finite(cand.displayedCost.diagnostic6Probe.threshold),
            reachesThreshold:cand.displayedCost.diagnostic6Probe.reachesThreshold===true
          }:null
        },
        legacy:{
          imageBest:cand?.imageBest?.cardId??null,
          best:cand?.best?.cardId??null,
          decision:cand?.best?.decision??null,
          matched:cand?.best?.matched===true
        }
      });
    }
  }
  return out;
}
export function datasetFromDiagnostic(diagnostic){
  const recognition=diagnostic?.handRecognition||diagnostic?.stateCapture?.hand?.result||null;
  const samples=recognition?.samples||[];
  return{
    version:V5_DATASET_VERSION,
    sourceFormat:diagnostic?.format??null,
    sourceType:'diagnostic',
    video:diagnostic?.video??null,
    records:observationRecordsFromSamples(samples,{videoKey:diagnostic?.stateCapture?.context?.videoKey??diagnostic?.video?.name??null})
  };
}
export function datasetFromFixture(bundle){
  const hashes={};
  for(const frame of bundle?.frames||[]){
    const t=finite(frame?.sampleTime);
    if(t!=null&&frame?.image?.sha256)hashes[String(t)]=frame.image.sha256;
  }
  return{
    version:V5_DATASET_VERSION,
    sourceFormat:bundle?.format??null,
    sourceType:'fixture',
    video:bundle?.video??null,
    records:observationRecordsFromSamples(bundle?.recognition?.samples||[],{
      videoKey:bundle?.context?.videoKey??bundle?.video?.name??null,
      frameHashes:hashes
    }),
    images:(bundle?.frames||[]).map(frame=>({
      sampleTime:finite(frame?.sampleTime),
      sha256:frame?.image?.sha256??null,
      mime:frame?.image?.mime??null,
      width:finite(frame?.width),
      height:finite(frame?.height),
      replayGeometry:frame?.replay?.geometry??null
    }))
  };
}

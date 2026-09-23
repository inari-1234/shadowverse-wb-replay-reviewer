export const V5_DATASET_VERSION='recognition-v5-dataset-0.6';

const finite=v=>Number.isFinite(Number(v))?Number(v):null;
function candidateCardScores(candidate){
  const out={};
  for(const [id,row] of Object.entries(candidate?.matchScores||{})){
    const score=finite(row?.imageScore);
    if(score!=null)out[id]=score;
  }
  return out;
}
function candidateMaskedCardScores(candidate){
  const out={};
  for(const [id,row] of Object.entries(candidate?.shadowMatchScores||{})){
    const score=finite(row?.score);
    if(score!=null)out[id]=score;
  }
  return out;
}
function candidateMaskedCardMeta(candidate){
  const out={};
  for(const [id,row] of Object.entries(candidate?.shadowMatchScores||{})){
    const score=finite(row?.score);
    if(score==null)continue;
    out[id]={
      score,
      supportRatio:finite(row?.supportRatio),
      visibleCells:finite(row?.visibleCells),
      totalCells:finite(row?.totalCells),
      rightGap:finite(row?.rightGap),
      limitX:finite(row?.limitX),
      marginPx:finite(row?.marginPx),
      normalization:row?.normalization??null
    };
  }
  return out;
}
function candidateCommonStripScores(candidate,mode){
  const out={};
  for(const [id,row] of Object.entries(candidate?.commonStripScores||{})){
    const score=finite(row?.[mode]?.score);
    if(score!=null)out[id]=score;
  }
  return out;
}
function candidateCommonStripMeta(candidate,mode){
  const out={};
  for(const [id,row] of Object.entries(candidate?.commonStripScores||{})){
    const x=row?.[mode];
    if(!x||finite(x?.score)==null)continue;
    out[id]={
      score:finite(x.score),
      dx:finite(x.dx),
      angle:finite(x.angle),
      profileIndex:finite(x.profileIndex),
      columns:finite(x.columns),
      supportRatio:finite(x.supportRatio),
      normalization:x.normalization??null,
      diagnosticOnly:x.diagnosticOnly===true,
      applied:x.applied===true
    };
  }
  return out;
}
function candidateVisibility(candidate){
  const g=candidate?.geometry||{},rightGap=finite(g?.rightGapToCostCenter),leftGap=finite(g?.leftGapToCostCenter),anchorSpan=finite(g?.anchorRightSpanPx);
  const rightVisibleRatio=rightGap!=null&&anchorSpan!=null&&anchorSpan>0?Math.max(0,Math.min(1,rightGap/anchorSpan)):null;
  return{
    leftGap,
    rightGap,
    anchorRightSpanPx:anchorSpan,
    titleRightSpanPx:finite(g?.titleRightSpanPx),
    titleLeftSpanPx:finite(g?.titleLeftSpanPx),
    isRightmost:g?.isRightmost===true,
    rightVisibleRatio,
    rightOcclusionRatio:rightVisibleRatio==null?null:+(1-rightVisibleRatio).toFixed(4)
  };
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
    const t=finite(frame?.sampleTime),hash=frameHashes?.[String(t)]||null,identity=frame?.frameIdentity||{},visualFrameId=identity?.visualFrameId??frame?.visualFrameId??null,actualTime=finite(identity?.actualTime??frame?.actualTime),mediaTime=finite(identity?.mediaTime??frame?.mediaTime),presentedFrames=finite(identity?.presentedFrames??frame?.presentedFrames),runtimeKey=visualFrameId??(presentedFrames!=null?'presented:'+presentedFrames:null)??(mediaTime!=null?'media:'+mediaTime.toFixed(6):null),frameKey=hash||runtimeKey||t,frameIdentitySource=hash?'sha256':visualFrameId!=null?'visual-frame-id':presentedFrames!=null?'presentedFrames':mediaTime!=null?'mediaTime':'sampleTime';
    for(const cand of frame?.candidates||[]){
      out.push({
        datasetVersion:V5_DATASET_VERSION,
        videoKey,
        sampleTime:t,
        requestedTime:finite(identity?.requestedTime??frame?.requestedTime??t),
        actualTime,
        mediaTime,
        presentedFrames,
        visualFrameId:visualFrameId==null?null:String(visualFrameId),
        frameKey,
        frameIdentitySource,
        roiAppearanceId:(cand?.roiAppearanceId??cand?.roiHash??null)==null?null:String(cand?.roiAppearanceId??cand?.roiHash),
        candidateCount:finite(frame?.candidateCount)??(frame?.candidates?.length??null),
        slot:finite(cand?.index),
        center:cand?.center?{cx:finite(cand.center.cx),cy:finite(cand.center.cy)}:null,
        cardScores:candidateCardScores(cand),
        maskedCardScores:candidateMaskedCardScores(cand),
        maskedCardMeta:candidateMaskedCardMeta(cand),
        commonStrip40Scores:candidateCommonStripScores(cand,'left40'),
        commonStrip50Scores:candidateCommonStripScores(cand,'left50'),
        commonStrip40Meta:candidateCommonStripMeta(cand,'left40'),
        commonStrip50Meta:candidateCommonStripMeta(cand,'left50'),
        visibility:candidateVisibility(cand),
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
  const out={
    version:V5_DATASET_VERSION,
    sourceFormat:diagnostic?.format??null,
    sourceType:'diagnostic',
    frameIdentityQuality:null,
    video:diagnostic?.video??null,
    records:observationRecordsFromSamples(samples,{videoKey:diagnostic?.stateCapture?.context?.videoKey??diagnostic?.video?.name??null})
  };
  out.frameIdentityQuality=out.records.some(x=>x.frameIdentitySource!=='sampleTime')?'runtime-frame-id-partial':'time-fallback';
  return out;
}
export function datasetFromFixture(bundle){
  const hashes={};
  for(const frame of bundle?.frames||[]){
    const t=finite(frame?.sampleTime);
    if(t!=null&&frame?.image?.sha256)hashes[String(t)]=frame.image.sha256;
  }
  const records=observationRecordsFromSamples(bundle?.recognition?.samples||[],{
    videoKey:bundle?.context?.videoKey??bundle?.video?.name??null,
    frameHashes:hashes
  });
  return{
    version:V5_DATASET_VERSION,
    sourceFormat:bundle?.format??null,
    sourceType:'fixture',
    frameIdentityQuality:records.some(x=>x.frameIdentitySource==='sha256')?'sha256-partial':'time-fallback',
    video:bundle?.video??null,
    records,
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

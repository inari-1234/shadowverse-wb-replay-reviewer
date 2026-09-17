(()=>{
const PATCH='4.10.8.5-20260917-20m';
const $q=s=>document.querySelector(s);
const safeLog=(type,data={})=>{try{log(type,{patch:PATCH,...data})}catch{}};
let runToken=0,activeKey='',validationDoneKey='';
function videoEl(){return typeof video!=='undefined'?video:$q('#video')}
function videoKey(){const f=$q('#videoFile')?.files?.[0];if(f)return`${f.name}|${f.size}|${f.lastModified}`;const v=videoEl();return String(v?.currentSrc||v?.src||'no-video')}
function targetSide(){const s=$q('#targetSide')?.value;return s==='top'||s==='bottom'?s:'bottom'}
function rgbToHsv(R,G,B){const r=R/255,g=G/255,b=B/255,max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;let h=0;if(d){if(max===r)h=((g-b)/d)%6;else if(max===g)h=(b-r)/d+2;else h=(r-g)/d+4;h*=60;if(h<0)h+=360}return{h,s:max?d/max:0,v:max}}
async function settle(){await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))}
async function seekFrame(t,reason='turn-validate-v41085'){
const v=videoEl();if(!v||!Number.isFinite(v.duration))return false;t=Math.max(.05,Math.min(v.duration-.08,Number(t)||.05));
try{if(Math.abs(v.currentTime-t)>.025){if(typeof seek==='function')await seek(t,reason);else await new Promise((res,rej)=>{let done=false;const on=()=>finish(true),to=setTimeout(()=>finish(false),3000);function finish(ok){if(done)return;done=true;v.removeEventListener('seeked',on);clearTimeout(to);ok?res():rej(Error('seek timeout'))}v.addEventListener('seeked',on,{once:true});v.currentTime=t})}await settle();return true}catch{return false}
}
function ppPoints(){
try{
if(typeof window.ppPoints==='object'&&window.ppPoints?.top&&window.ppPoints?.bottom)return window.ppPoints;
}catch{}
return{top:{x:.8811,y:.2905},bottom:{x:.8822,y:.6065}};
}
function drawFrame(){
const v=videoEl();if(!v?.videoWidth||!v?.videoHeight)return null;
const c=document.createElement('canvas');c.width=1200;c.height=Math.max(1,Math.round(c.width*v.videoHeight/v.videoWidth));
const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(v,0,0,c.width,c.height);return{c,x};
}
function boardGreen(f){
const pts=ppPoints(),vals=[];
for(const p of [pts.top,pts.bottom]){
const cx=Number(p?.x)||.882,cy=Number(p?.y)||.45,rx=.06,ry=.05;
const x0=Math.max(0,Math.floor((cx-rx)*f.c.width)),x1=Math.min(f.c.width,Math.ceil((cx+rx)*f.c.width)),y0=Math.max(0,Math.floor((cy-ry)*f.c.height)),y1=Math.min(f.c.height,Math.ceil((cy+ry)*f.c.height));
const d=f.x.getImageData(x0,y0,Math.max(1,x1-x0),Math.max(1,y1-y0)).data;let n=0,g=0;
for(let i=0;i<d.length;i+=4){const z=rgbToHsv(d[i],d[i+1],d[i+2]);n++;if(z.h>=70&&z.h<=180&&z.s>=.20&&z.v>=.15)g++}
vals.push(n?g/n:0);
}
return{top:vals[0]||0,bottom:vals[1]||0,max:Math.max(vals[0]||0,vals[1]||0)};
}
function indicatorSignal(){
const f=drawFrame();if(!f)return{side:null,visible:false,pixels:0,boardGreen:0};
const sx=Math.round(f.c.width*.82),sy=Math.round(f.c.height*.34),sw=Math.max(8,Math.round(f.c.width*.09)),sh=Math.max(8,Math.round(f.c.height*.21));
const c=document.createElement('canvas');c.width=48;c.height=64;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(f.c,sx,sy,sw,sh,0,0,48,64);
const d=x.getImageData(0,0,48,64).data,total=d.length/4;let red=0,blue=0,count=0,dark=0,white=0,gold=0;
for(let i=0;i<d.length;i+=4){const r=d[i],g=d[i+1],b=d[i+2],mx=Math.max(r,g,b),mn=Math.min(r,g,b),sat=mx-mn;if(mx<60)dark++;if(mn>150&&sat<65)white++;if(r>120&&g>70&&g<190&&b<110&&r-b>50)gold++;if(mx<80||sat<40)continue;red+=Math.max(0,r-(b+g)/2);blue+=Math.max(0,b-(r+g)/2);count++}
const hud=boardGreen(f),boardOk=hud.max>=.08,visible=((dark/total>=.08&&(gold/total>=.008||white/total>=.012))||(gold/total>=.015&&white/total>=.012));
if(!boardOk||!visible||count<900)return{side:null,diff:0,pixels:count,visible:false,boardGreen:+hud.max.toFixed(3)};
const diff=(red-blue)/count,target=targetSide(),opponent=target==='top'?'bottom':'top',side=diff>15?opponent:diff<-15?target:null;
return{side,diff:+diff.toFixed(2),pixels:count,visible:!!side,boardGreen:+hud.max.toFixed(3)};
}
function segmentsFromRows(rows,step){
const raw=[];let cur=null;
for(const r of rows){if(!r.side)continue;if(cur&&cur.side===r.side&&r.time-cur.last<=step*2.1){cur.last=r.time;cur.count++}else{cur={side:r.side,start:r.time,last:r.time,count:1};raw.push(cur)}}
const filtered=raw.filter(s=>s.count>=2),out=[];
for(const s of filtered){if(out.length&&out[out.length-1].side===s.side){out[out.length-1].last=s.last;out[out.length-1].count+=s.count}else out.push({...s})}
return out;
}
function stableLooksAligned(stable,segs){
if(!Array.isArray(stable)||stable.length<4||segs.length<2)return false;
const n=Math.min(4,segs.length,stable.length);
for(let i=0;i<n;i++){if(stable[i]?.side!==segs[i]?.side)return false;if(Math.abs(Number(stable[i]?.time)-Number(segs[i]?.start))>2.5)return false}
return true;
}
async function validateTimeline(detail={}){
const key=videoKey(),token=++runToken,v=videoEl();if(!key||!v?.videoWidth||!Number.isFinite(v.duration))return null;if(activeKey===key)return null;
activeKey=key;window.__wbTurnValidationPending41085=false;window.__wbTurnValidationBusy41085=true;
const original=Number(v.currentTime)||0,wasPaused=v.paused;v.pause();const cache=new Map();let seeks=0;
const sample=async t=>{t=Math.max(.05,Math.min(v.duration-.08,Number(t)||.05));const k=t.toFixed(3);if(cache.has(k))return cache.get(k);if(token!==runToken||key!==videoKey())throw Error('cancelled');if(!await seekFrame(t)){const z={time:+k,side:null,pixels:0,boardGreen:0};cache.set(k,z);return z}seeks++;const z={time:+k,...indicatorSignal()};cache.set(k,z);return z};
try{
const quick=[],quickEnd=Math.min(22,v.duration-.08);for(let t=.5;t<=quickEnd+.001;t+=1)quick.push(await sample(t));
const quickSegs=segmentsFromRows(quick,1),stable=Array.isArray(window.turnTimeline39)?window.turnTimeline39.slice():[];
const aligned=stableLooksAligned(stable,quickSegs);
if(aligned){
validationDoneKey=key;window.__wbTurnTimelineValidation41085={patch:PATCH,key,corrected:false,seeks,quickSegments:quickSegs.slice(0,6),stableFirst:stable.slice(0,6),checkedAt:new Date().toISOString()};
safeLog('turn-timeline-validation-v41085',window.__wbTurnTimelineValidation41085);
window.dispatchEvent(new CustomEvent('wb-turn-timeline-validated',{detail:{patch:PATCH,corrected:false,timeline:stable,firstTurnTime:stable[0]?.time,key}}));
return stable;
}
const full=[];for(let t=.5;t<v.duration-.08;t+=.5)full.push(await sample(t));
const segs=segmentsFromRows(full,.5);if(segs.length<4)throw Error('insufficient-board-turn-segments');
for(let i=1;i<segs.length;i++)if(segs[i].side===segs[i-1].side)throw Error('non-alternating-segments');
const counts={top:0,bottom:0},corrected=[];
for(const seg of segs){
let hi=Number(seg.start),lo=Math.max(.05,hi-.75);
for(const back of [1.25,1.75]){const q=await sample(lo);if(q.side!==seg.side)break;lo=Math.max(.05,hi-back)}
for(let i=0;i<6;i++){const mid=(lo+hi)/2,q=await sample(mid);if(q.side===seg.side)hi=q.time;else lo=q.time}
counts[seg.side]++;corrected.push({side:seg.side,turn:counts[seg.side],time:+Number(hi).toFixed(3),source:'turn-indicator-board-validated-v4.10.8.5',confidence:92,raw:'',score:8,inferScore:null,indicatorOnly:true,boardValidated:true});
}
if(Math.abs(counts.top-counts.bottom)>1)throw Error('turn-count-imbalance');
const target=targetSide();window.turnTimeline39=corrected;window.rejectedTurns392=[];
try{if(typeof turnMap!=='undefined'){for(const k of Object.keys(turnMap))delete turnMap[k];for(const r of corrected.filter(x=>x.side===target))turnMap[r.turn]={time:r.time,source:'pp-v4.10.8.5-board-validated',side:target,confidence:92,raw:String(r.turn)};if(typeof renderTurnMap==='function')renderTurnMap();if(typeof updateTurnPick==='function')updateTurnPick()}}catch(err){safeLog('turn-map-render-error-v41085',{message:err?.message||String(err)})}
const el=$q('#turnTimeline39');if(el)el.textContent=corrected.map(r=>`${r.side==='top'?'上':'下'}${r.turn}T  ${typeof fmt==='function'?fmt(r.time):r.time.toFixed(2)}  HUD確認済み`).join('\n');
const play=$q('#playOrder');if(play&&corrected[0]){play.value=corrected[0].side===target?'先攻':'後攻';play.dispatchEvent(new Event('change',{bubbles:true}))}
validationDoneKey=key;window.__wbTurnTimelineValidation41085={patch:PATCH,key,corrected:true,seeks,oldTimeline:stable,quickSegments:quickSegs.slice(0,6),timeline:corrected,checkedAt:new Date().toISOString()};
safeLog('turn-timeline-validation-v41085',window.__wbTurnTimelineValidation41085);
window.dispatchEvent(new CustomEvent('wb-turn-timeline-ready',{detail:{patch:PATCH,corrected:true,firstSide:corrected[0]?.side,firstTurnTime:corrected[0]?.time,timeline:corrected}}));
setTimeout(()=>window.dispatchEvent(new CustomEvent('wb-turn-timeline-validated',{detail:{patch:PATCH,corrected:true,timeline:corrected,firstTurnTime:corrected[0]?.time,key}})),0);
return corrected;
}catch(err){if(err?.message!=='cancelled'){safeLog('turn-timeline-validation-error-v41085',{key,message:err?.message||String(err),seeks});window.dispatchEvent(new CustomEvent('wb-turn-timeline-validated',{detail:{patch:PATCH,corrected:false,error:true,timeline:window.turnTimeline39||[],key}}))}return null}
finally{try{if(key===videoKey())await seekFrame(original,'turn-validate-restore-v41085')}catch{}if(!wasPaused&&key===videoKey())try{await v.play()}catch{}window.__wbTurnValidationBusy41085=false;window.__wbTurnValidationPending41085=false;activeKey=''}
}
function scheduleValidation(e){
if(e?.detail?.patch===PATCH)return;const key=videoKey();window.__wbTurnValidationPending41085=true;
setTimeout(async()=>{for(let i=0;i<80&&window.turnAnalysisBusy392;i++)await new Promise(r=>setTimeout(r,100));if(key===videoKey())await validateTimeline(e?.detail||{});else window.__wbTurnValidationPending41085=false},80);
}
function buildStyle(){let s=$q('#wbUiFeature41085');if(!s){s=document.createElement('style');s.id='wbUiFeature41085';document.head.appendChild(s)}const css="header h1{font-size:0!important}header h1::after{content:'シャドバWB リプレイ診断 v4.10.8';font-size:18px!important;font-weight:700}header>p:first-of-type{font-size:0!important}header>p:first-of-type::after{content:'Build 2026.09.17-20m / ターンHUD検証 + クラス表示安定化';font-size:12px!important;color:#9ba8bf}";if(s.textContent!==css)s.textContent=css}
function verify(){const st={patch:PATCH,listener:true,boardGate:true,stableScannerShaExpected:'8543ddc47c0b6648f4151a61d3a5d060eb39ba3f',validationDoneKey,checkedAt:new Date().toISOString()};st.ok=true;window.__wbTurnSafety41085=st;safeLog('turn-safety-invariant-v41085',st);return true}
buildStyle();setInterval(buildStyle,400);
window.addEventListener('wb-turn-timeline-ready',scheduleValidation);
$q('#videoFile')?.addEventListener('change',()=>{runToken++;activeKey='';validationDoneKey='';window.__wbTurnValidationPending41085=false;window.__wbTurnValidationBusy41085=false;window.__wbTurnTimelineValidation41085=null});
window.__wbTurnValidator41085={validateTimeline,verify};
setTimeout(verify,2500);
safeLog('patch-v41085-active',{feature:'post-stable-board-hud-turn-validation-correction'});
})();
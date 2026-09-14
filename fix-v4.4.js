(()=>{
  const PATCH='4.4-20260914-18';
  const $q=s=>document.querySelector(s);
  const header=$q('header h1'),sub=$q('header p');
  if(header) header.textContent='シャドバWB リプレイ診断 v4.4';
  if(sub) sub.textContent='Build 2026.09.14-18 / マリガンプレビュー + クラスマーク候補';

  const old=$q('#mulliganPanel43');
  let panel=$q('#mulliganClassPanel44');
  if(!panel){
    panel=document.createElement('section');panel.id='mulliganClassPanel44';panel.className='panel';
    panel.innerHTML=`
      <h2>3. マリガン・クラス確認</h2>
      <p id="previewStatus44" class="help">動画を選ぶと、マリガン区間をアプリ内にプレビューします。</p>
      <div class="buttons"><button id="previewMulligan44" class="primary">マリガンを再表示</button></div>
      <div id="mulliganPreview44" style="display:flex;gap:8px;overflow-x:auto;padding:8px 0 2px;scroll-snap-type:x proximity"></div>
      <div class="grid" style="margin-top:10px">
        <div>
          <div class="muted">検出したクラスマーク</div>
          <canvas id="classMark44" width="220" height="120" style="width:100%;max-width:260px;background:#000;border-radius:10px"></canvas>
        </div>
        <label>対面クラス
          <select id="classSelect44">
            <option value="">未判定</option><option>エルフ</option><option>ロイヤル</option><option>ウィッチ</option><option>ドラゴン</option><option>ナイトメア</option><option>ビショップ</option><option>ネメシス</option>
          </select>
          <div id="classStatus44" class="help">クラスマークを解析します。確信度が低い場合は自動確定しません。</div>
        </label>
      </div>`;
    const anchor=old||$q('#autoPrepPanel42')||$q('#scanTurns')?.closest('.panel');
    if(anchor) anchor.parentNode.insertBefore(panel,anchor.nextSibling);
  }
  if(old) old.style.display='none';

  const previewBox=$q('#mulliganPreview44'),previewStatus=$q('#previewStatus44'),classCanvas=$q('#classMark44'),classStatus=$q('#classStatus44'),classSelect=$q('#classSelect44');
  let running=false,runToken=0;
  window.classDetection44=null;

  function firstPPBoundary(){
    const vals=[];const times=window.autoPrep42?.summary?.times;
    if(times)for(const side of ['top','bottom'])for(const v of Object.values(times[side]||{})){const n=Number(v);if(Number.isFinite(n)&&n>0)vals.push(n)}
    for(const x of (window.turnTimeline39||[])){const n=Number(x?.time);if(Number.isFinite(n)&&n>0)vals.push(n)}
    for(const v of Object.values(turnMap||{})){const n=Number(v?.time);if(Number.isFinite(n)&&n>0)vals.push(n)}
    return vals.length?Math.min(...vals):null;
  }
  function previewPlan(){const first=firstPPBoundary();let end=first!=null?first-.7:Math.min(12,video.duration-.2);end=Math.max(6,Math.min(end,16,video.duration-.2));const start=Math.max(.5,end-12),a=[];for(let t=start;t<=end+.001&&a.length<26;t+=.5)a.push(+t.toFixed(2));return {first,end,start,times:a}}
  async function seekSafe44(t){t=Math.max(0,Math.min(video.duration-.05,t));if(Math.abs(video.currentTime-t)>.025)await seek(t,'preview-v44');await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))}

  function rgbToHsv(r,g,b){r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;let h=0;if(d){if(max===r)h=((g-b)/d)%6;else if(max===g)h=(b-r)/d+2;else h=(r-g)/d+4;h*=60;if(h<0)h+=360}return {h,s:max?d/max:0,v:max}}
  function hueDist(a,b){let d=Math.abs(a-b)%360;return Math.min(d,360-d)}
  const HUE_CLASSES=[['エルフ',115],['ロイヤル',50],['ウィッチ',245],['ドラゴン',25],['ナイトメア',335],['ネメシス',185]];
  function analyzeMark(src){
    const sx=Math.round(src.width*.793),sy=Math.round(src.height*.045),sw=Math.round(src.width*.046),sh=Math.round(src.height*.105),c=document.createElement('canvas');c.width=92;c.height=92;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(src,sx,sy,sw,sh,0,0,c.width,c.height);
    const d=x.getImageData(0,0,c.width,c.height).data,pts=[];let brightLowSat=0,total=0;
    for(let i=0;i<d.length;i+=4){const hsv=rgbToHsv(d[i],d[i+1],d[i+2]);if(hsv.v<.28)continue;total++;if(hsv.s<.25&&hsv.v>.62)brightLowSat++;if(hsv.s>.28&&hsv.v>.38)pts.push(hsv)}
    let result={candidate:'',confidence:0,hue:null,saturationPixels:pts.length,canvas:c};
    if(total>0&&brightLowSat/total>.22&&pts.length<total*.35){result={...result,candidate:'ビショップ',confidence:.68,hue:null};return result}
    if(pts.length<60)return result;
    let sxv=0,syv=0,swv=0;for(const p of pts){const w=p.s*p.v,rad=p.h*Math.PI/180;sxv+=Math.cos(rad)*w;syv+=Math.sin(rad)*w;swv+=w}let hue=Math.atan2(syv,sxv)*180/Math.PI;if(hue<0)hue+=360;
    let best=null;for(const [name,center] of HUE_CLASSES){const dist=hueDist(hue,center),score=Math.max(0,1-dist/55);if(!best||score>best.score)best={name,score,dist}}
    const density=Math.min(1,pts.length/(c.width*c.height*.16));const confidence=(best?.score||0)*(.55+.45*density);
    result={...result,candidate:confidence>=.48?best.name:'',confidence:+confidence.toFixed(3),hue:+hue.toFixed(1)};return result;
  }
  function drawMark(c){if(!classCanvas||!c)return;const x=classCanvas.getContext('2d');x.clearRect(0,0,classCanvas.width,classCanvas.height);x.imageSmoothingEnabled=false;x.drawImage(c,0,0,classCanvas.width,classCanvas.height)}
  function thumb(src,t){const c=document.createElement('canvas');c.width=220;c.height=Math.round(220*src.height/src.width);c.getContext('2d').drawImage(src,0,0,c.width,c.height);const wrap=document.createElement('div');wrap.style.cssText='flex:0 0 150px;scroll-snap-align:start';const img=document.createElement('img');img.src=c.toDataURL('image/jpeg',.72);img.style.cssText='width:150px;border-radius:8px;display:block';const cap=document.createElement('div');cap.className='muted';cap.textContent=`${fmt(t)}`;wrap.append(img,cap);return wrap}
  function finishClass(results){
    const good=results.filter(x=>x.candidate&&x.confidence>=.48),counts={};for(const r of good){const k=r.candidate;counts[k]??={n:0,sum:0,best:null};counts[k].n++;counts[k].sum+=r.confidence;if(!counts[k].best||r.confidence>counts[k].best.confidence)counts[k].best=r}
    let best=null;for(const [name,v] of Object.entries(counts)){const score=v.n+v.sum*.65;if(!best||score>best.score)best={name,score,...v}}
    let accepted=false;if(best&&best.n>=2){accepted=true;classSelect.value=best.name;const matchup=$q('#matchup');if(matchup&&!matchup.value.trim())matchup.value=best.name;drawMark(best.best.canvas)}
    else if(good.length){good.sort((a,b)=>b.confidence-a.confidence);drawMark(good[0].canvas)}
    window.classDetection44={patch:PATCH,accepted,candidate:best?.name||good[0]?.candidate||'',votes:best?.n||0,confidence:best?+(best.sum/best.n).toFixed(3):+(good[0]?.confidence||0),samples:results.map(x=>({time:x.time,candidate:x.candidate,confidence:x.confidence,hue:x.hue}))};
    if(classStatus)classStatus.textContent=accepted?`自動候補：${best.name}（${best.n}フレーム一致）。違う場合は選択欄で修正してください。`:'自動判定は保留しました。クラスマーク画像を確認して手動選択してください。';
    try{log('class-detect-v44',window.classDetection44)}catch{}
  }
  async function buildPreview44(){
    if(running||!video?.src||!isFinite(video.duration)||video.duration<=0)return;running=true;const token=++runToken,original=video.currentTime;video.pause();if(previewBox)previewBox.innerHTML='';if(previewStatus)previewStatus.textContent='マリガン区間を表示中…';if(classStatus)classStatus.textContent='クラスマークを解析中…';
    try{
      const plan=previewPlan(),results=[];for(let i=0;i<plan.times.length;i++){if(token!==runToken)throw new Error('cancelled');const t=plan.times[i];await seekSafe44(t);const src=frameCanvas(1000);previewBox?.appendChild(thumb(src,t));const r=analyzeMark(src);r.time=t;results.push(r)}finishClass(results);if(previewStatus)previewStatus.textContent=`マリガンプレビュー：${fmt(plan.start)}〜${fmt(plan.end)} / ${plan.times.length}枚（横にスクロールできます）`;try{log('mulligan-preview-v44',{start:plan.start,end:plan.end,frames:plan.times.length,firstPP:plan.first})}catch{}
    }catch(err){if(err?.message!=='cancelled'&&previewStatus)previewStatus.textContent='プレビュー作成失敗：'+(err?.message||String(err));}
    finally{try{if(token===runToken)await seekSafe44(original)}catch{}running=false}
  }
  function waitAndPreview(){let n=0;const id=setInterval(()=>{n++;if(window.autoPrep42||n>18){clearInterval(id);setTimeout(buildPreview44,120)}},350)}

  $q('#previewMulligan44')?.addEventListener('click',()=>{runToken++;running=false;buildPreview44()});
  classSelect?.addEventListener('change',()=>{const m=$q('#matchup');if(m&&classSelect.value)m.value=classSelect.value;try{log('class-manual-v44',{value:classSelect.value})}catch{}});
  $q('#videoFile')?.addEventListener('change',()=>{runToken++;running=false;window.classDetection44=null;if(previewBox)previewBox.innerHTML='';if(classSelect)classSelect.value='';if(previewStatus)previewStatus.textContent='動画読込後にマリガンを自動表示します。'});
  video?.addEventListener('loadedmetadata',()=>setTimeout(waitAndPreview,250));
  try{log('patch-v44-active',{patch:PATCH})}catch{}
})();
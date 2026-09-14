(()=>{
  const PATCH='4.6.1-20260914-28';
  const LATEST_CACHE='wb-review-v4-6-1-20260914-28';
  const $q=s=>document.querySelector(s);
  const header=$q('header h1'),sub=$q('header p');
  if(header)header.textContent='シャドバWB リプレイ診断 v4.6.1';
  if(sub)sub.textContent='Build 2026.09.14-28 / ホーム画面版の最新版更新';

  const head=$q('header');
  let bar=$q('#wbLatestBar461');
  if(head&&!bar){
    bar=document.createElement('div');
    bar.id='wbLatestBar461';
    bar.style.cssText='display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:8px';
    bar.innerHTML=`<button id="wbForceLatest461" type="button" style="padding:7px 10px;background:#2563eb">最新版に更新</button><span id="wbUpdateStatus461" style="font-size:11px;color:#9ba8bf">ホーム画面版が古い時はここを押してください。</span>`;
    head.appendChild(bar);
  }
  const btn=$q('#wbForceLatest461'),st=$q('#wbUpdateStatus461');
  let forcing=false;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  function status(t){if(st)st.textContent=t}

  async function ensureRegistration(){
    if(!('serviceWorker' in navigator))return null;
    try{
      // 同じ sw.js を updateViaCache:none で再登録し、iOSホーム画面でも更新確認を強制しやすくする。
      return await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});
    }catch(e){
      try{return await navigator.serviceWorker.getRegistration()}catch{return null}
    }
  }
  async function waitInstall(reg,timeout=4200){
    if(!reg)return;
    let w=reg.installing||reg.waiting;
    if(!w)return;
    if(w.state==='activated'||w.state==='redundant')return;
    await Promise.race([
      new Promise(resolve=>w.addEventListener('statechange',()=>{if(w.state==='activated'||w.state==='redundant')resolve()},{once:false})),
      sleep(timeout)
    ]);
  }
  async function purgeOldCaches(){
    if(!('caches' in window))return;
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith('wb-review-')&&k!==LATEST_CACHE).map(k=>caches.delete(k)));
  }

  async function forceLatest(){
    if(forcing)return;forcing=true;if(btn)btn.disabled=true;
    status('最新版を確認しています…');
    try{
      const reg=await ensureRegistration();
      if(reg){
        await reg.update();
        await waitInstall(reg);
      }
      await purgeOldCaches();
      // 旧Service Workerが制御中でも、次のナビゲーションは時刻付きURLで取り直す。
      status('更新しました。最新版で再起動します…');
      try{sessionStorage.setItem('wb-force-latest-at',String(Date.now()))}catch{}
      await sleep(180);
      const u=new URL(location.href);u.searchParams.set('latest',String(Date.now()));u.hash='';
      location.replace(u.href);
    }catch(e){
      console.error(e);status('更新に失敗しました。通信を確認してもう一度押してください。');if(btn)btn.disabled=false;forcing=false;
      try{log('force-latest-error-v461',{patch:PATCH,message:e?.message||String(e)})}catch{}
    }
  }
  btn?.addEventListener('click',forceLatest);

  // ホーム画面起動時は毎回、裏でService Workerの更新確認だけ行う。勝手な再読込はしない。
  setTimeout(async()=>{
    try{
      const reg=await ensureRegistration();
      if(reg)await reg.update();
      status('最新版を確認済み。古い表示なら「最新版に更新」を押してください。');
      try{log('latest-check-v461',{patch:PATCH,controller:!!navigator.serviceWorker?.controller})}catch{}
    }catch(e){status('更新確認はできませんでした。必要なら「最新版に更新」を押してください。')}
  },500);

  try{log('patch-v461-active',{patch:PATCH,latestCache:LATEST_CACHE})}catch{}
})();
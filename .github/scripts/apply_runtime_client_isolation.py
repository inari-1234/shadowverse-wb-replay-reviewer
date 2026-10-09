from pathlib import Path
import json, re, hashlib, base64


def read(p): return Path(p).read_text()
def write(p,s): Path(p).write_text(s)
def replace_between(text,start,end,new):
    i=text.index(start); j=text.index(end,i)
    return text[:i]+new+text[j:]

# 1) Make runtime byte verification lazy and mobile-safe. SRI still protects every executed script.
idx=read('index.html')
start="  const b64=bytes=>"
end="  for(const src of localScripts)"
new_block="""  const b64=bytes=>{let s='';for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode(...bytes.subarray(i,Math.min(bytes.length,i+0x8000)));return btoa(s)};
  const verify=async name=>{const expected=manifest.integrity[name],url=window.__wbAssetUrl('./'+name);try{const res=await fetch(url,{cache:'no-store'});if(!res.ok)throw new Error('HTTP '+res.status);if(!globalThis.crypto?.subtle)throw new Error('WebCrypto unavailable');const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',await res.arrayBuffer())),actual='sha256-'+b64(digest);return{name,ok:actual===expected,expected,actual,url,error:actual===expected?null:'HASH_MISMATCH'}}catch(err){return{name,ok:false,expected,actual:null,url,error:err?.message||String(err)}}};
  let authorityPromise=null;
  window.__wbVerifyRuntimeBuildAuthority=({force=false,concurrency=4}={})=>{
    if(!candidate)return Promise.resolve({version:manifest.version,buildId:manifest.buildId,total:0,verified:0,ok:true,mode:'main-not-enforced',rows:[]});
    if(authorityPromise&&!force)return authorityPromise;
    const limit=Math.max(1,Math.min(4,Number(concurrency)||4));
    authorityPromise=(async()=>{const rows=new Array(manifest.assets.length);let cursor=0;const worker=async()=>{for(;;){const i=cursor++;if(i>=manifest.assets.length)return;rows[i]=await verify(manifest.assets[i])}};await Promise.all(Array.from({length:Math.min(limit,manifest.assets.length)},()=>worker()));const firstFailure=rows.find(x=>!x.ok)||null,value={version:manifest.version,buildId:manifest.buildId,total:rows.length,verified:rows.filter(x=>x.ok).length,ok:rows.length>0&&rows.every(x=>x.ok),rows,firstFailure:firstFailure?{name:firstFailure.name,error:firstFailure.error||null,expected:firstFailure.expected||null,actual:firstFailure.actual||null,url:firstFailure.url||null}:null,environment:{secureContext:globalThis.isSecureContext===true,serviceWorkerControlled:'serviceWorker'in navigator&&!!navigator.serviceWorker.controller},checkedAt:new Date().toISOString()};window.__wbRuntimeBuildAuthority=value;return value})();
    window.__wbRuntimeBuildAuthorityPromise=authorityPromise;return authorityPromise;
  };
  window.__wbRuntimeBuildAuthorityPromise=candidate?null:Promise.resolve({version:manifest.version,buildId:manifest.buildId,total:0,verified:0,ok:true,mode:'main-not-enforced',rows:[]});
"""
idx=replace_between(idx,start,end,new_block)
write('index.html',idx)

# 2) App runtime: old SW must be detached before verification. A still-controlling page auto-reloads once.
app=read('app-core.js')
app=replace_between(app,"WB.ensureRuntimeBuildAuthority=async()=>","WB.emit=",'''WB.ensureRuntimeBuildAuthority=async()=>{if(WB.runtimeChannel!=='candidate')return{ok:true,version:'runtime-code-authority-v1',mode:'main-not-enforced',buildId:APP.build,total:0,verified:0,rows:[]};if('serviceWorker'in navigator&&navigator.serviceWorker.controller){const err=new Error('旧Service Workerがこの画面を制御しているため、実行コードを検証できません。');err.code='RUNTIME_SERVICE_WORKER_CONTROLLER_PRESENT';WB.recordError('runtime-build-authority',err,{controller:true});throw err}let authority;try{const verifier=window.__wbVerifyRuntimeBuildAuthority;if(typeof verifier!=='function')throw new Error('Runtime verifier unavailable');authority=WB.runtimeBuildAuthority?.ok===true?WB.runtimeBuildAuthority:await verifier()}catch(err){authority={ok:false,version:'runtime-code-authority-v1',buildId:window.__wbRuntimeAssetManifest?.buildId||null,total:Number(window.__wbRuntimeAssetManifest?.assets?.length||0),verified:0,rows:[],firstFailure:{name:'runtime-verifier',error:err?.message||String(err),expected:null,actual:null,url:null}}}WB.runtimeBuildAuthority=authority||window.__wbRuntimeBuildAuthority||null;if(WB.runtimeBuildAuthority?.ok!==true){const f=WB.runtimeBuildAuthority?.firstFailure,detail=f?.error||(f?.name?`照合失敗: ${f.name}`:'');const err=new Error(`実行コードの整合性を確認できないため解析を停止しました。${detail?' '+detail:''}`);err.code='RUNTIME_BUILD_AUTHORITY_INVALID';WB.recordError('runtime-build-authority',err,{authority:WB.runtimeBuildAuthority});throw err}return WB.runtimeBuildAuthority};
''')
app=replace_between(app,"WB.disableCandidateServiceWorker=async()=>","WB.fetchCandidateLatest=",'''WB.disableCandidateServiceWorker=async()=>{if(WB.runtimeChannel!=='candidate')return{candidate:false,unregistered:0,controllerBefore:false,controllerAfter:false,scopes:[]};let unregistered=0,controllerBefore=false,controllerAfter=false,scopes=[];try{if('serviceWorker'in navigator){controllerBefore=!!navigator.serviceWorker.controller;const href=String(location.href),regs=typeof navigator.serviceWorker.getRegistrations==='function'?await navigator.serviceWorker.getRegistrations():[(await navigator.serviceWorker.getRegistration('./'))].filter(Boolean);for(const reg of regs){const scope=String(reg?.scope||'');if(scope&&href.startsWith(scope)){scopes.push(scope);if(await reg.unregister())unregistered++}}controllerAfter=!!navigator.serviceWorker.controller}WB.swInfo={mode:'candidate-no-sw',build:APP.build,unregistered,controllerBefore,controllerAfter,scopes};WB.log('candidate-service-worker-disabled',WB.swInfo)}catch(err){WB.recordError('candidate-service-worker-disable',err)}return{candidate:true,unregistered,controllerBefore,controllerAfter,scopes}};
''')
app=replace_between(app,"WB.initCandidateChannel=async()=>","WB.setUiView=",'''WB.initCandidateChannel=async()=>{if(WB.runtimeChannel!=='candidate')return;const header=document.querySelector('header');if(!header)return;let box=document.querySelector('#candidateChannel');if(!box){box=document.createElement('div');box.id='candidateChannel';box.style.cssText='display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px;font-size:11px;color:#cbd5e1';const status=document.createElement('span');status.id='candidateChannelStatus';status.textContent='コード確認中…';const button=document.createElement('button');button.id='candidateRefresh';button.type='button';button.textContent='更新';button.style.cssText='padding:6px 9px;font-size:11px';button.addEventListener('click',WB.refreshCandidate);box.append(status,button);header.appendChild(box)}const status=WB.$('#candidateChannelStatus');if(status){status.textContent='コード確認中…';status.style.color=''}const isolation=await WB.disableCandidateServiceWorker(),buildId=window.__wbRuntimeAssetManifest?.buildId||APP.build,page=new URL(location.href),isolationMarker=page.searchParams.get('_wbiso');if(isolation.controllerAfter){if(isolationMarker!==buildId){if(status)status.textContent='旧キャッシュ経路を解除中…';page.searchParams.set('channel','candidate');page.searchParams.set('_wb',String(Date.now()));page.searchParams.set('_wbiso',buildId);WB.log('candidate-runtime-isolation-reload',{buildId,isolation});location.replace(page.href);return}const authority={ok:false,version:'runtime-code-authority-v1',buildId,total:Number(window.__wbRuntimeAssetManifest?.assets?.length||0),verified:0,rows:[],firstFailure:{name:'service-worker',error:'SERVICE_WORKER_CONTROLLER_STUCK',expected:null,actual:null,url:null},environment:{secureContext:globalThis.isSecureContext===true,serviceWorkerControlled:true}};WB.runtimeBuildAuthority=authority;if(status){status.textContent='旧Service Workerを解除できないため解析停止';status.style.color='#fca5a5'}WB.recordError('candidate-runtime-isolation',new Error('SERVICE_WORKER_CONTROLLER_STUCK'),{authority,isolation});return}const latest=await WB.fetchCandidateLatest();let runtimeAuthority=null;try{runtimeAuthority=await WB.ensureRuntimeBuildAuthority()}catch(_err){runtimeAuthority=WB.runtimeBuildAuthority||window.__wbRuntimeBuildAuthority||null}if(status){const latestBuild=latest?.build||null;if(runtimeAuthority?.ok===true)status.textContent=`candidate ${runtimeAuthority.buildId} / ${runtimeAuthority.verified}/${runtimeAuthority.total}一致${latestBuild&&latestBuild!==APP.build?' / 更新あり':''}`;else{const f=runtimeAuthority?.firstFailure,detail=f?.error==='HASH_MISMATCH'?`ハッシュ不一致 ${f.name}`:f?.error||f?.name||'照合失敗';status.textContent=`コード不一致 ${runtimeAuthority?.verified||0}/${runtimeAuthority?.total||window.__wbRuntimeAssetManifest?.assets?.length||0}（${detail}）— 解析停止`;status.style.color='#fca5a5'}}WB.log('candidate-channel-ready',{build:APP.build,latestBuild:latest?.build||null,runtimeBuildAuthority:runtimeAuthority,isolation})};
''')
write('app-core.js',app)

# 3) Regression contract for the client-isolation boundary.
t=read('tests/pf1r2-runtime-code-authority-regression.mjs')
t=t.replace("assert.match(index,/__wbRuntimeBuildAuthorityPromise/,'candidate must start source verification independently of review output');", "assert.match(index,/__wbVerifyRuntimeBuildAuthority/,'candidate must expose lazy source verification independently of review output');\nassert.doesNotMatch(index,/Promise\\.all\\(manifest\\.assets\\.map\\(verify\\)\\)/,'candidate must not launch all verification fetches before service-worker isolation');\nassert.match(index,/Math\\.min\\(4/,'runtime verification must cap mobile fetch concurrency');")
write('tests/pf1r2-runtime-code-authority-regression.mjs',t)

iso_test="""import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
const index=read('index.html'),app=read('app-core.js'),sw=read('sw.js');
assert.match(index,/__wbVerifyRuntimeBuildAuthority/,'runtime verifier must be lazy-callable');
assert.doesNotMatch(index,/candidate\?Promise\.all\(manifest\.assets\.map\(verify\)\)/,'verification must not start eagerly during document parsing');
assert.match(index,/Math\.min\(4/,'mobile verifier concurrency must be bounded');
assert.match(index,/firstFailure/,'runtime authority must preserve first failure diagnostics');
assert.match(app,/getRegistrations/,'candidate isolation must inspect active service-worker registrations');
assert.match(app,/controllerBefore/,'candidate isolation must record whether a controller existed');
assert.match(app,/controllerAfter/,'candidate isolation must prove whether the current page remains controlled');
assert.match(app,/RUNTIME_SERVICE_WORKER_CONTROLLER_PRESENT/,'analysis must fail closed while a service worker controls candidate');
assert.match(app,/_wbiso/,'candidate must use a one-reload isolation marker');
assert.match(app,/SERVICE_WORKER_CONTROLLER_STUCK/,'candidate must stop instead of entering an isolation reload loop');
const init=app.slice(app.indexOf('WB.initCandidateChannel=async()=>'),app.indexOf('WB.setUiView='));
assert.ok(init.indexOf('disableCandidateServiceWorker')>=0&&init.indexOf('ensureRuntimeBuildAuthority')>init.indexOf('disableCandidateServiceWorker'),'candidate must detach service worker before byte verification');
assert.ok(init.indexOf('controllerAfter')<init.indexOf('ensureRuntimeBuildAuthority'),'candidate must resolve the controller boundary before byte verification');
assert.match(app,/コード不一致 .*（\$\{detail\}）/,'candidate UI must expose verification failure cause');
assert.match(sw,/candidateProtectedRequest/,'candidate SW network-only protection must remain present');
console.log('P-F1-R2 RUNTIME CLIENT ISOLATION REGRESSION PASS');
"""
write('tests/pf1r2-runtime-client-isolation-regression.mjs',iso_test)

g=read('tests/run-quality-gate.mjs')
g=g.replace("const GATE_VERSION='recognition-quality-gate-v105';","const GATE_VERSION='recognition-quality-gate-v106';")
needle="  'tests/pf1r2-runtime-code-authority-regression.mjs',\n"
if needle not in g: raise SystemExit('gate insertion point missing')
g=g.replace(needle,needle+"  'tests/pf1r2-runtime-client-isolation-regression.mjs',\n",1)
write('tests/run-quality-gate.mjs',g)

# 4) Recompute the exact content authority after app-core changed.
assets=['app-core.js','turn-recognition.js','mulligan-class.js','card-db.js','hand-recognition.js','state-recognition.js','replay-session.js','review-engine.js','counterfactual-review.js','diagnostics.js','coach-integration.js','coach-explanation.js','runtime-decision-pipeline.js','runtime-authority-binding.js','legal-action-sequence.js','outcome-backtracking.js','comparison-decision.js','played-move-authority.js','position-state-runtime.js','common-rule-engine-runtime.js']
integrity={}; hex_digests={}
for p in assets:
    data=Path(p).read_bytes(); d=hashlib.sha256(data).digest(); hex_digests[p]=d.hex(); integrity[p]='sha256-'+base64.b64encode(d).decode()
seed='\n'.join(f'{p}:{hex_digests[p]}' for p in sorted(assets)).encode(); build_id='candidate-assets-'+hashlib.sha256(seed).hexdigest()[:12]
manifest={'version':'runtime-code-authority-v1','buildId':build_id,'assets':assets,'integrity':integrity}
idx=read('index.html')
idx,repl=re.subn(r'window\.__wbRuntimeAssetManifest=\{.*?\};','window.__wbRuntimeAssetManifest='+json.dumps(manifest,separators=(',',':'))+';',idx,count=1,flags=re.S)
if repl!=1: raise SystemExit('manifest replacement failed')
write('index.html',idx)
latest=json.loads(read('latest.json')); latest['runtimeBuildId']=build_id; latest['runtimeAssetCount']=len(assets); write('latest.json',json.dumps(latest,ensure_ascii=False,indent=2)+'\n')
print('runtime client isolation build',build_id,'assets',len(assets))

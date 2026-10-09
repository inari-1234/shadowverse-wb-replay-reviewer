import fs from 'node:fs';
import assert from 'node:assert/strict';

const app=fs.readFileSync(new URL('../app-core.js',import.meta.url),'utf8');
const latest=JSON.parse(fs.readFileSync(new URL('../latest.json',import.meta.url),'utf8'));

assert.ok(latest.build.includes('stablecoarseorder1uiopt5r1candidate1'));
assert.ok(app.includes("href.includes('/candidate-live/')"));
assert.ok(app.includes("/[?&]channel=candidate(?:&|$)/"));
assert.ok(app.includes("runtimeChannel:RUNTIME_CHANNEL"));
assert.ok(app.includes("WB.runtimeChannel==='candidate')WB.initCandidateChannel();else WB.registerServiceWorker()"));
assert.ok(app.includes("navigator.serviceWorker.getRegistration('./')"));
assert.ok(app.includes("reg.unregister()"));
assert.ok(app.includes("fetch('./latest.json?_wb='+Date.now(),{cache:'no-store'})"));
assert.ok(app.includes("button.textContent='更新'"));
assert.ok(app.includes("u.searchParams.set('_wb',String(Date.now()))"));
assert.ok(app.includes('runtimeAuthority?.ok===true'),'candidate status must depend on direct runtime code authority');
assert.ok(app.includes('runtimeAuthority.buildId'),'candidate status must show the verified runtime build id');
assert.ok(app.includes('runtimeAuthority.verified}/${runtimeAuthority.total}一致'),'candidate status must show verified/total agreement');
assert.ok(app.includes("latestBuild&&latestBuild!==APP.build?' / 更新あり':''"),'candidate status must preserve the update-available hint after authority status');
assert.ok(app.includes('コード不一致'),'candidate status must expose runtime code mismatch');
assert.ok(app.includes('解析停止'),'candidate mismatch must be fail-closed to the user');
console.log('CANDIDATE UPDATE CHANNEL REGRESSION PASS');

import fs from 'node:fs';
import assert from 'node:assert/strict';

const app=fs.readFileSync(new URL('../app-core.js',import.meta.url),'utf8');
const latest=JSON.parse(fs.readFileSync(new URL('../latest.json',import.meta.url),'utf8'));

assert.ok(latest.build.includes('stablecoarseorder1live1'));
assert.ok(app.includes("href.includes('/candidate-live/')"));
assert.ok(app.includes("/[?&]channel=candidate(?:&|$)/"));
assert.ok(app.includes("runtimeChannel:RUNTIME_CHANNEL"));
assert.ok(app.includes("WB.runtimeChannel==='candidate')WB.initCandidateChannel();else WB.registerServiceWorker()"));
assert.ok(app.includes("navigator.serviceWorker.getRegistration('./')"));
assert.ok(app.includes("reg.unregister()"));
assert.ok(app.includes("fetch('./latest.json?_wb='+Date.now(),{cache:'no-store'})"));
assert.ok(app.includes("button.textContent='最新版を再読込'"));
assert.ok(app.includes("u.searchParams.set('_wb',String(Date.now()))"));
assert.ok(app.includes("status.textContent=latestBuild&&latestBuild!==APP.build?'新しいcandidateがあります"));
console.log('CANDIDATE UPDATE CHANNEL REGRESSION PASS');

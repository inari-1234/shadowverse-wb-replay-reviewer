import fs from 'node:fs';
import assert from 'node:assert/strict';

const fixture=JSON.parse(fs.readFileSync(new URL('./pf1r2-0923-offline-expected-fixture.json',import.meta.url),'utf8'));
const test=fs.readFileSync(new URL('./pf1r2-0923-offline-expected-regression.mjs',import.meta.url),'utf8');
assert.equal(fixture.expected.visibleTradeOff.classification,'TRADE_OFF');
assert.equal(fixture.expected.visibleTradeOff.recommendedCandidate,null);
assert.match(test,/Quick-evolve and do-nothing candidates/);
assert.match(test,/matchedActions\.some\(a=>a\.actionType==='EVOLVE'/,'played-move oracle must explicitly prove Quick + evolve');
assert.match(test,/Quick-only/,'offline fixture must explicitly preserve Quick without evolve as a learning candidate');
assert.match(test,/どちら|長所|推奨手を1つに絞れません/,'offline coach oracle must distinguish trade-off from insufficient evidence');
console.log('P-F1-R2 09-23 LEARNING-CANDIDATE ORACLE REGRESSION PASS');

import fs from 'node:fs';
import assert from 'node:assert/strict';

const fixture=JSON.parse(fs.readFileSync(new URL('./pf1r2-0923-offline-expected-fixture.json',import.meta.url),'utf8'));
const test=fs.readFileSync(new URL('./pf1r2-0923-offline-expected-regression.mjs',import.meta.url),'utf8');
assert.equal(fixture.expected.visibleTradeOff.classification,'TRADE_OFF');
assert.equal(fixture.expected.visibleTradeOff.recommendedCandidate,null);
assert.equal(fixture.expected.quickOnlyCandidateGenerated,true,'fixture must explicitly require Quick without evolve');
assert.equal(fixture.expected.coachTradeOffHeadline,'候補ごとに異なる長所があるため、推奨手を1つに絞れません。');
assert.equal(fixture.expected.playedMoveLabel,'刹那のクイックブレイダー＋進化');
assert.match(test,/Quick-evolve and do-nothing candidates/);
assert.match(test,/matchedActions\.some\(a=>a\.actionType==='EVOLVE'/,'played-move oracle must explicitly prove Quick + evolve');
assert.match(test,/Quick-only/,'offline fixture must explicitly preserve Quick without evolve as a learning candidate');
assert.match(test,/coach\.headline,fixture\.expected\.coachTradeOffHeadline/,'offline coach oracle must assert the trade-off wording rather than insufficient evidence');
console.log('P-F1-R2 09-23 LEARNING-CANDIDATE ORACLE REGRESSION PASS');

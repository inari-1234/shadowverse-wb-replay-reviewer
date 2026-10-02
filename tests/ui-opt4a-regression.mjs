import fs from 'node:fs';
import assert from 'node:assert/strict';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const replay=fs.readFileSync(new URL('../replay-session.js',import.meta.url),'utf8');
const state=fs.readFileSync(new URL('../state-recognition.js',import.meta.url),'utf8');
const diag=fs.readFileSync(new URL('../diagnostics.js',import.meta.url),'utf8');

for(const id of ['matchProgressWrap','matchProgressLabel','matchProgressPct','matchProgressBar','matchProgressDetail']){
  assert.ok(html.includes(`id="${id}"`),`whole-match progress UI missing: ${id}`);
}
assert.ok(state.includes("function setMatchProgress(processed,total,currentTurn=null,state='running')"));
assert.ok(state.includes("setMatchProgress(0,plan.length,null,'running')"));
assert.ok(state.includes("progressPosition=i+1;setMatchProgress(progressPosition,plan.length,item.turn,'running')"));
assert.ok(state.includes("setMatchProgress(result.cancelled?progressPosition:plan.length,plan.length,null,result.cancelled?'cancelled':'complete')"));
assert.ok(state.includes('result.completedTurns++'),'analysis success count must remain a separate metric from processing progress');
assert.ok(state.includes('result.skippedTurns++'),'skip count must remain separate from processing progress');

assert.ok(replay.includes('function reviewComparisonRows(model)'),'before/after states must be merged into one comparison model');
assert.ok(replay.includes('class="reviewComparisonTable"'));
assert.ok(replay.includes("r.changed?'isChanged':'isQuiet'"));
assert.ok(replay.includes('class="reviewUnknown">未確認</span>'),'unknown cells must have a dedicated uncertainty class');
assert.equal(replay.includes('reviewSeekButton('),false,'legacy direct-video seek control must be removed from review cards');
assert.equal(replay.includes('判断直前を見る'),false,'legacy before-video wording must be removed');
assert.equal(replay.includes('変化後を見る'),false,'legacy after-video wording must be removed');
assert.ok(replay.includes("reviewFrameButton('直前フレーム'"));
assert.ok(replay.includes("reviewFrameButton('変化後フレーム'"));
assert.ok(replay.includes("W.previewSeekCount=(W.previewSeekCount||0)+1"));
assert.ok(replay.includes("W.previewSeekReasons=W.previewSeekReasons||{}"));
assert.equal(replay.includes("W.seekCount++"),false,'replay UI layer must never increment analysis seek metrics');
assert.equal(replay.includes("W.seekTo(t,'review-window-"),false,'frame preview must not use the analysis seek function');
assert.ok(diag.includes('previewSeek:{count:Number(WB.previewSeekCount||0),reasons:clone(WB.previewSeekReasons||{})}'));

for(const cls of ['reviewUnknown','reviewUncertain','reviewUnresolved','reviewCoachCaution']){
  assert.ok(html.includes('.'+cls),`amber uncertainty styling missing: ${cls}`);
}
assert.ok(html.includes('background:#fff4cc')&&html.includes('border:1px solid #e9a23b'),'unknown styling must use amber background and border');
assert.ok(html.includes('.bad{color:#b42318}'),'technical error styling must remain red');
assert.ok(html.includes('.runtimeMedia{position:absolute!important;width:1px!important;height:1px!important'),'recognition video must remain visually hidden during analysis');
assert.ok(html.includes('.runtimeMedia.reviewPlaybackActive{position:relative!important;width:100%!important'),'the same recognition video may become visible after video selection for review');
assert.ok(html.includes('class="manualCorrection"'),'manual play-order fallback must remain collapsed');
assert.ok(html.includes('id="reviewFrameSheet" class="reviewFrameSheet hidden"'),'static frame evidence must use a hidden modal/sheet surface');

const decisionStart=replay.indexOf('function renderDecisionWindowCard');
const decisionEnd=replay.indexOf('async function previewSeekTo',decisionStart);
const decision=replay.slice(decisionStart,decisionEnd);
const rendered=decision.slice(decision.indexOf('return`<article'));
assert.ok(rendered.indexOf('reviewObservationSummary')<rendered.indexOf('${renderReviewComparison(model)}'),'observed changes must render before the comparison table');
assert.ok(rendered.indexOf('${renderReviewComparison(model)}')<rendered.indexOf('${frames}'),'comparison must render before frame evidence');
assert.ok(rendered.indexOf('${frames}')<rendered.indexOf('${reasonHtml}'),'frame evidence must render before the reason block');
assert.ok(rendered.indexOf('${reasonHtml}')<rendered.indexOf('${renderWindowCoach(model.coach)}'),'reason must render before tactical coach');

console.log('UI OPT4A REGRESSION PASS');

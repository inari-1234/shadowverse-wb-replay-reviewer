import fs from 'node:fs';
import assert from 'node:assert/strict';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../app-core.js',import.meta.url),'utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
const duplicates=[...new Set(ids.filter((id,i)=>ids.indexOf(id)!==i))];

assert.deepEqual(duplicates,[],'HTML ids must remain unique');
for(const id of ['videoFile','video','targetSide','playOrder','scanTurns','cancelScan','turnTimeline','previewMulligan','turnPick','goTurn','leFill','stateSummary','leAnalyzeTurn','analyzeMatch','cancelMatch','reviewPoints','observedEpisodes','actionTimeline','captureScene','exportDiag']){
  assert.equal(ids.includes(id),true,'required UI id missing: '+id);
}
assert.ok(html.includes('data-ui-tab="review"')&&html.includes('data-ui-tab="detail"')&&html.includes('data-ui-tab="tools"'));
assert.ok(html.includes('id="replayPanel"')&&html.includes('data-ui-view="review"'));
assert.ok(html.includes('id="lethalPanel" class="panel uiView" data-ui-view="detail"'));
assert.ok(html.includes('id="counterfactualPanel" class="panel uiView" data-ui-view="tools"'));
assert.ok(html.includes('まず重要局面だけ確認し、必要なときに観測区間や個別状態を開きます。'));
assert.ok(html.indexOf('id="reviewPoints"')<html.indexOf('class="reviewActionArea"'),'review results must precede operations');
assert.ok(html.includes('<summary>判定ルール・安全条件</summary>'),'technical turn rules must be collapsed by default');
const reviewSafetyStart=html.indexOf('<details class="compactDetails"><summary>自動振り返りの判定・安全条件</summary>');
assert.ok(reviewSafetyStart>=0,'review safety details must remain in a details block');
const reviewSafetyTag=html.slice(reviewSafetyStart,html.indexOf('>',reviewSafetyStart)+1);
assert.equal(/\sopen(?:\s|>|=)/.test(reviewSafetyTag),false,'review safety details must be collapsed by default');
assert.ok(app.includes("WB.setUiView=view=>"));
assert.ok(app.includes("WB.updateUiSummary=()=>"));
assert.ok(app.includes("['metadata','timeline','video-reset','match-analysis-complete','task-finished']"));
assert.ok(app.includes("重要局面を上から確認し、必要な箇所だけ詳細を開いてください。"));
console.log('UI INFORMATION HIERARCHY REGRESSION PASS');

import fs from 'node:fs';
import assert from 'node:assert/strict';

const purpose=fs.readFileSync(new URL('../PURPOSE.md',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const review=fs.readFileSync(new URL('../review-engine.js',import.meta.url),'utf8');
const counter=fs.readFileSync(new URL('../counterfactual-review.js',import.meta.url),'utf8');
const replay=fs.readFileSync(new URL('../replay-session.js',import.meta.url),'utf8');
const state=fs.readFileSync(new URL('../state-recognition.js',import.meta.url),'utf8');

assert.ok(purpose.includes('録画済みリプレイから観測できる情報を安全に抽出し、試合後の振り返りを支援する'));
assert.ok(purpose.includes('Observation Core — 本体'));
assert.ok(purpose.includes('Tactical Review — 補助'));
assert.ok(purpose.includes('Counterfactual Simulation — 補助'));
assert.ok(purpose.includes('Diagnostics / Research — 開発専用'));
assert.ok(purpose.includes('false CONFIRMED'));

for(const fn of ['function cf()','function saveCf()','function assist()']){
  assert.equal(review.includes(fn),false,`${fn} must not remain in review-engine`);
  assert.ok(counter.includes(fn),`${fn} must live in counterfactual-review`);
}
assert.ok(review.includes("counterfactualModule:'counterfactual-review'"));
assert.equal(review.includes("branchAssist:'branch-assist-clean'"),false,'branch-assist responsibility metadata must not remain in review-engine');
assert.equal(review.includes('independentState:true'),false,'counterfactual independent-state responsibility must not remain in review-engine');
assert.ok(counter.includes("const VERSION='counterfactual-review-clean-1.0'"));
assert.ok(counter.includes("CS='wb-counterfactual-v1'"),'existing counterfactual storage key must be preserved');
assert.ok(counter.includes("W.ReviewEngine?.calculate?.(s)"),'counterfactual must consume tactical evaluation through the public ReviewEngine boundary');
assert.ok(counter.includes("W.ReviewEngine?.publishReviewState?.()"),'counterfactual persistence must publish through the shared review-state boundary');

assert.ok(index.includes('戦術シミュレーション（補助）'));
assert.ok(index.includes('録画から得た観測事実とは別の手入力シミュレーション'));
assert.ok(index.includes('Action Timelineの観測事実へは混ぜません'));
assert.ok(index.includes('後から得た公開情報を自動遮断する仕組みではありません。'));
assert.ok(index.includes('戦術レビュー用の分岐です。各枝は親状態を独立コピーし、保存された判断時点の状態を基準に評価します。後から得た公開情報を自動遮断する仕組みではありません。'),'counterfactual safety wording must remain exact and uninterrupted');
assert.equal(state.includes('captureStatePair'),false,'purpose cleanup must remove superseded fixed-pair API');
assert.equal(state.includes('statePairTarget'),false,'purpose cleanup must remove superseded fixed-pair helper');

assert.ok(replay.includes('states:[],actions:[],observedEpisodes:[]'),'ReplaySession observation core must remain explicit');
assert.ok(replay.includes('decisionWindows:[]'),'Decision Window must remain a derived Observation Core structure');
assert.ok(replay.includes('observationReviewPoints:[]'),'ReplaySession must persist observation-derived ReviewPoints separately');
assert.ok(replay.includes('supplementalReviewPoints:[]'),'ReplaySession must persist tactical/manual ReviewPoints separately');
assert.ok(replay.includes('s.reviewPoints=mergeReviewPoints(s.observationReviewPoints,s.supplementalReviewPoints)'),'legacy merged reviewPoints view must be derived from separated domains');
assert.ok(replay.includes("decisionWindows:'same-turn-state-pair<=3s-noncausal'"),'Decision Window contract must remain same-turn, bounded, and non-causal');
assert.ok(replay.includes("reviewWindowUi:'before-after-observed-importance-unknown-noncausal-navigation+coach-v1'"),'Phase 16 review UI must remain observation-only and non-causal');
assert.ok(index.includes('未確認は未確認のまま残し'),'Phase 16 UI must explicitly preserve unknown values');
assert.ok(index.includes('使用カード・効果源・行動順を推定しません'),'Phase 16 UI must explicitly reject causal/card inference');
assert.ok(review.includes("const WINDOW_COACH_VERSION='review-window-coach-v1'"),'Phase 17 tactical coach must have an explicit observation-only contract');
assert.ok(review.includes("basis:'observation-only'"),'Phase 17 coach must be based only on observed Decision Window facts');
assert.ok(review.includes("deckSpecific:false"),'generic coach must remain independent of deck-specific tactical profile');
assert.ok(review.includes("usesCurrentHand:false"),'generic coach must not silently import current hand/card recognition');
assert.ok(review.includes("causalAttribution:false,cardAttribution:false"),'generic coach must deny causal and card attribution');
assert.ok(review.includes("judgement:'hold'"),'generic coach must hold good/bad judgement when action identity is unknown');
assert.ok(index.includes('デッキ固有カード、使用カード、効果源、行動順を推測してプレイの良否を断定しません'),'Phase 17 UI must disclose its inference boundary');
assert.ok(review.includes("const CARD_USE_CANDIDATE_VERSION='card-use-candidate-v1'"),'Phase 18 card-use candidate layer must be explicit');
assert.ok(review.includes("ambiguityPolicy:'unique-among-positively-observed-supported-cards'"),'Phase 18 must reject ambiguous same-cost candidates');
assert.ok(review.includes("afterAbsenceUsed:false,pastHandTraceUsed:false,effectAttributionUsed:false"),'Phase 18 must not treat disappearance/history/effects as card-use proof');
assert.ok(review.includes("causalAttribution:false,cardAttribution:'candidate-only'"),'Phase 18 may expose only candidate attribution, never causal confirmation');
assert.ok(review.includes("createsAction:false"),'Phase 18 candidate must not create Action Timeline events');
assert.ok(index.includes('候補はカード使用の確定ではなく、Action Timelineにも追加しません。'),'Phase 18 UI must disclose candidate-only/no-action semantics');
assert.equal(replay.includes("'card-play'"),false,'purpose boundary must continue forbidding inferred card-play actions');
assert.equal(review.includes("'card-play'"),false,'Phase 18 review layer must not introduce inferred card-play actions');

console.log('PURPOSE BOUNDARY REGRESSION PASS');

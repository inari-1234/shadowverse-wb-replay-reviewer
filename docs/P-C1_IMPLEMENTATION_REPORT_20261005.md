# ui-opt6P P-C1 Outcome Backtracking — Implementation Report

- Date: 2026-10-05
- Repository: `inari-1234/shadowverse-wb-replay-reviewer`
- Candidate branch: `candidate/ui-opt6p-pc1-outcome-backtracking`
- Upstream P-A1 branch: `candidate/ui-opt6p-pa1-legal-action-sequence`
- Upstream base SHA: `1de0f12dcec638b5ffc43b1ee6500b93783340ff`
- Module: `outcome-backtracking.js`
- Module version: `pc1-outcome-backtracking-v1.0.0`
- Corrective implementation SHA: `b1de70a44c14d5b2acae5de5b6fbdd4f2a4e78de`
- Final full-gate SHA: `c6a2a4af92f9ea725b07152964b80e60ef79b8b6`
- Post-gate temporary-scaffolding cleanup SHA: `1f4e4c1b93b90bd46f085c759401534fdc24032f`
- Final Recognition Quality Gate: Run #1022 / Run ID `37268029130`
- Final gate result: `QUALITY GATE PASS: 63/63`
- Main branch: NOT UPDATED

## 1. P-C1 DESIGN SUMMARY

P-C1 is implemented as an authority-preserving outcome-analysis layer above P-A1. It does not create an independent legality engine, Game State, or rule-resolution implementation.

Dependencies are injected through `WB.OutcomeBacktracking.create({ actionEngine, stateAdapter, ruleEngine }, options)`:

- `actionEngine`: P-A1 contract authority (`generateLegalActions`, `applyAction`, `stateFingerprint`)
- `stateAdapter`: PositionState view/identity authority
- `ruleEngine`: Common Rule Engine authority for terminal/rule-authority information

Public engine contract:

- `evaluateSequence(positionState, sequence, limits)`
- `evaluateSequences(positionState, sequences, limits)`
- `compareOutcomes(outcomeA, outcomeB)`
- `backtrack(result, nodeId)`
- `captureState(positionState, perspectivePlayer)`

Only P-A1 `LEGAL` actions are executable. Non-LEGAL input is rejected as unresolved and is never silently promoted to legal.

## 2. OUTCOME MODEL

Each evaluated sequence retains:

- sequence identity and source/result state identity
- action IDs and depth
- immediate outcome
- future outcome
- terminal / lethal / survival status
- leader HP and opponent leader HP
- board structure
- hand and resource state
- PP / EP / SEP
- persistent and temporary resources
- damage / drain / heal
- resource spend and remaining resources
- opponent responses
- continuations
- rule authority
- uncertainty
- reason codes and evidence
- a parent-linked exploration graph for backtracking

Large PositionState objects are not exposed as unbounded copies in every Outcome record. State references use state ID plus the authoritative P-A1 fingerprint, while structural snapshots/deltas and graph ancestry preserve comparison and explanation data.

## 3. IMMEDIATE OUTCOME MODEL

Immediately after applying the supplied P-A1 Legal Sequence, P-C1 can retain:

- damage to opponent leader
- damage to own leader
- drain amount
- heal amount
- own / opponent leader HP
- own / opponent board summaries
- PP / EP / SEP
- hand resources and known/unknown hand structure
- generated cards and tokens
- destroyed own/opponent card instance IDs
- crest / flag / destroyed count / play count / once-per-turn state / special counters
- persistent / temporary modifiers
- terminal status
- immediate lethal status
- reason/evidence data

Drain source is not inferred from a generic HP increase. When an authoritative outcome-event stream is unavailable, the outcome remains explicitly uncertain rather than guessing that healing was Drain.

## 4. FUTURE OUTCOME MODEL

Future exploration is structured as:

`source -> supplied legal sequence -> opponent response -> self continuation -> optional deeper continuation`

The default horizon supports the required current turn -> opponent turn -> next self turn model, and `maxTurns` allows bounded extension into later turns.

FutureOutcome contains opponent responses, continuations, a confirmed structural envelope, draw status, search statistics, exact unknown reason codes, truncation state, and configured search limits.

## 5. LETHAL BACKTRACKING MODEL

The stable lethal contract is:

- `IMMEDIATE_LETHAL`
- `NEXT_TURN_LETHAL_FORCED`
- `NEXT_TURN_LETHAL_POSSIBLE`
- `MULTI_TURN_LETHAL_POSSIBLE`
- `NO_CONFIRMED_LETHAL`
- `LETHAL_UNKNOWN`

Immediate terminal lethal prunes all later exploration.

`NEXT_TURN_LETHAL_FORCED` is only available when every confirmed opponent-response branch retains next-turn lethal and the search is not dependent on unresolved/truncated uncertainty. Unknown hand, unknown draw, indeterminate rule order, or search truncation prevents promotion to a falsely confirmed forced lethal.

The result graph stores parent links, phases, actor, action IDs, and state references. `backtrack(result, nodeId)` can reconstruct which choices led to a later result.

## 6. OPPONENT RESPONSE MODEL

Response contract:

- `KNOWN_RESPONSE`
- `OBSERVED_AVAILABLE_RESPONSE`
- `RULE_GUARANTEED_RESPONSE`
- `UNKNOWN_HAND_DEPENDENT_RESPONSE`
- `NO_KNOWN_RESPONSE`

Current P-C1 obtains executable responses only from P-A1 Legal Action generation. It does not synthesize removal, healing, Ward answers, or other cards that are not represented by authoritative state/rule information.

A late contract audit found that the first implementation could classify a generic unknown rule/effect as `UNKNOWN_HAND_DEPENDENT_RESPONSE`. That was corrected before final judgment. Exact `unknownReasonCodes` are now preserved; unknown-hand classification is only used for hidden/card-dependent uncertainty. `UNKNOWN_EFFECT_RULE` therefore remains rule uncertainty rather than being mislabeled as hidden-hand uncertainty.

## 7. SURVIVAL MODEL

Stable survival contract:

- `CONFIRMED_SURVIVAL`
- `POSSIBLE_SURVIVAL`
- `CONFIRMED_DEATH`
- `SURVIVAL_UNKNOWN`

Opponent-turn terminal loss is tracked independently from offensive lethal timing, allowing later Decision Logic to compare aggression against survival without collapsing them into one score.

## 8. DRAIN / HEAL MODEL

P-C1 separates:

- damage
- Drain
- direct heal
- own final HP
- opponent final HP
- opponent future Drain amount / heal amount

Outcome events may be supplied by the PositionState adapter, Rule Engine, or authoritative state event record. Missing event authority is surfaced through uncertainty instead of source guessing.

`compareOutcomes` also exposes future opponent Drain-risk deltas, so a sequence that leaves a Drain target can be distinguished from a sequence that clears the board even when the former has higher immediate damage.

## 9. RESOURCE OUTCOME MODEL

Tracked structural resources include:

- PP / max PP
- EP / SEP
- hand count
- known hand / unknown hand count
- generated cards
- tokens
- crest
- flag
- destroyed count
- play count
- once-per-turn state
- special counters
- persistent modifiers
- temporary modifiers

Resource state is not reduced to only hand count. The model is intentionally descriptive rather than assigning an AI value score in P-C1.

## 10. OUTCOME COMPARISON CONTRACT

`compareOutcomes(A, B)` returns structured deltas including:

- `damageDelta`
- own/opponent `leaderHpDelta`
- own/opponent `boardDelta`
- PP / EP / SEP / hand `resourceDelta`
- immediate `drainDelta`
- `futureOpponentDrainRiskDelta`
- `healDelta`
- `lethalTimingDelta`
- `survivalDelta`
- `uncertaintyDelta`
- reason codes

P-C1 does not decide that A or B is globally “best.” It provides the dimensions required by the next Comparison / Decision Logic stage.

## 11. SEARCH / PRUNING STRATEGY

Bounded controls implemented/available in the contract:

- `maxDepth`
- `maxNodes` as a shared/global evaluation budget
- `maxBranches`
- `maxOpponentResponses`
- `maxContinuations`
- `maxTurns`
- terminal pruning
- duplicate-state suppression
- path-local cycle detection
- memoization
- conservative exact-state dominance pruning

Limits do not approximate omitted branches as known outcomes. Hitting a limit propagates truncation/uncertainty so confirmed lethal/survival claims are not fabricated from incomplete search.

## 12. MEMOIZATION / DEDUP STRATEGY

Memoization uses the P-A1 authoritative state fingerprint together with search depth. Duplicate suppression and dominance pruning are restricted to exact authoritative fingerprints.

No heuristic state merge is performed across differing fingerprints. Therefore history-sensitive differences that P-S1/P-A1 encode in PositionState/fingerprint — such as trigger registration/order, destroyed/play counts, once-use state, temporary duration, or modifier application order — are not intentionally discarded by P-C1.

Cycle detection is path-local, preventing infinite loops while allowing the same authoritative state to be reused safely in separate search contexts through memoization.

## 13. UNKNOWN / HIDDEN INFORMATION HANDLING

P-C1 never converts an unresolved P-A1 branch into a legal branch.

Unknown classes remain explicit, including:

- unknown card/rule dependency
- unknown effect rule
- unknown target rule
- unknown opponent response
- indeterminate rule order
- unresolved legality/outcome
- unknown draw
- missing outcome-event authority

Unknown draw cannot become confirmed lethal. Unknown opponent hand is not materialized as a specific card. Unknown rule/effect is not mislabeled as unknown hand after the corrective implementation.

Confirmed outcomes and unknown-dependent outcomes therefore remain structurally separable.

## 14. REASON CODE TABLE

Representative stable reason-code groups:

### Immediate / lethal
- `IMMEDIATE_DAMAGE_CONFIRMED`
- `IMMEDIATE_SELF_DAMAGE_CONFIRMED`
- `IMMEDIATE_LETHAL_CONFIRMED`
- `NEXT_TURN_LETHAL_CONFIRMED`
- `NEXT_TURN_LETHAL_POSSIBLE`
- `NEXT_TURN_LETHAL_BLOCKED_BY_WARD`

### Drain / heal
- `DRAIN_AMOUNT_CONFIRMED`
- `DRAIN_SOURCE_UNKNOWN`
- `HEAL_AMOUNT_CONFIRMED`
- `DRAIN_RECOVERS_OUT_OF_LETHAL_RANGE`

### Unknown / authority
- `UNKNOWN_CARD_RULE`
- `UNKNOWN_EFFECT_RULE`
- `UNKNOWN_TARGET_RULE`
- `UNKNOWN_OPPONENT_RESPONSE`
- `INDETERMINATE_RULE_ORDER`
- `UNRESOLVED_LEGALITY`
- `UNRESOLVED_OUTCOME`
- `UNKNOWN_DRAW`
- `OUTCOME_EVENT_AUTHORITY_MISSING`

### Search / pruning
- `TERMINAL_PRUNED`
- `DUPLICATE_STATE`
- `EXACT_STATE_DOMINANCE_PRUNED`
- `CYCLE_DETECTED`
- `DEPTH_LIMIT`
- `NODE_LIMIT`
- `BRANCH_LIMIT`
- `OPPONENT_RESPONSE_LIMIT`
- `CONTINUATION_LIMIT`
- `TURN_LIMIT`
- `MEMO_HIT`
- `SEARCH_TRUNCATED`

### Resources / safety
- `RESOURCE_ADVANTAGE_PP`
- `RESOURCE_ADVANTAGE_HAND`
- `SURVIVAL_NOT_GUARANTEED`
- `OPPONENT_RESPONSE_UNKNOWN_HAND`

Some codes are stable/reserved contract vocabulary for downstream or later authoritative integrations and are not necessarily emitted by every v1 execution path.

## 15. AUTOMATED TEST RESULTS

`tests/pc1-outcome-backtracking-regression.mjs` covers all required OC cases:

- OC-01..OC-10: immediate damage/lethal/terminal pruning/board/resources/drain/heal
- OC-11..OC-17: next-turn lethal, Ward, removal, heal, Drain-target consequences
- OC-18..OC-20: unknown hand, unknown draw, indeterminate rule ordering
- OC-21..OC-25: memoization, duplicate suppression, cycle detection, depth/node limits
- OC-26..OC-30: outcome differences, future lethal vs immediate damage, resource conservation, survival, non-LEGAL input rejection
- Required comparison Cases A-D
- bounded multi-turn lethal extension
- maxBranches safe truncation
- corrective regression: unknown effect remains `UNKNOWN_EFFECT_RULE` and is not mislabeled as unknown hand

Result in final gate:

`P-C1 Outcome Backtracking regression PASS: OC-01..OC-30 + comparison cases A-D`

## 16. REGRESSION TEST RESULTS

Final GitHub Actions authority:

- Workflow: Recognition Quality Gate
- Run: #1022
- Run ID: `37268029130`
- Commit: `c6a2a4af92f9ea725b07152964b80e60ef79b8b6`
- Result: SUCCESS
- Final result: `QUALITY GATE PASS: 63/63`

The final run includes and passes P-A1 Legal Action/Sequence regression, P-C1 regression/static validation, Replay Session/Window, Tactical Rules Boundary, video/seek/input fast path, runtime invariants, UI regressions, Recognition v5 regressions, and recognition benchmark.

The recognition benchmark retains its existing caveat that incomplete/non-raw-fixture validation coverage does not prove cross-video generalization. The benchmark itself passes, and P-C1 introduces no regression to that existing boundary.

## 17. STATIC VALIDATION RESULTS

`tests/pc1-static-validation.mjs` passes and checks:

- module registration/version
- unique status/reason-code values
- P-A1 API contract references
- search-limit contract presence
- non-LEGAL input rejection
- explicit lethal/survival unknown states
- no duplicated `applyCoreAction` implementation
- no unsafe `eval`, `new Function`, or random fallback
- explicit missing outcome-event authority
- conservative exact-state dominance contract

Final output:

`P-C1 static validation PASS`

## 18. REMAINING OPEN ISSUES

No blocking P-C1 issue remains and no P-A1/P-S1/P-R1 UPSTREAM DEFECT was identified during this implementation/regression cycle.

Non-blocking integration boundaries:

1. Exact Drain-vs-generic-heal attribution is strongest when the production PositionState/Rule Engine supplies an authoritative outcome-event stream. When absent, P-C1 intentionally reports uncertainty instead of guessing.
2. `KNOWN_RESPONSE` and `RULE_GUARANTEED_RESPONSE` remain available contract classifications for later explicit provenance. Current generated legal responses are principally represented as observed available responses unless stronger upstream provenance exists.
3. Win-rate estimation, AI scoring, opponent-hand inference, deck inference, and natural-language Coach generation remain out of scope by design.

## 19. P-C1 PASS / HOLD JUDGMENT

**P-C1 PASS — ENGINE / CONTRACT COMPLETE**

PASS basis:

- consumes P-A1 legal actions/sequences without duplicating legality logic
- immediate and future outcomes are represented separately
- opponent response and self continuation are explored with bounded search
- lethal/survival/drain/heal/board/resource differences are retained
- hidden/unknown information remains explicit and non-invented
- exact unknown semantics corrective completed before final judgment
- memoization/dedup/cycle/terminal pruning are present
- comparison-ready API is stable
- required OC-01..OC-30 and comparison cases pass
- full existing quality gate passes 63/63 after the corrective change

## 20. NEXT STAGE READY / NOT READY

**READY — Comparison / Decision Logic**

The next stage may consume P-C1 Outcomes to determine trade-offs such as:

- immediate damage vs future lethal
- board retention vs opponent Drain risk
- resource conservation vs tempo
- survival vs aggression
- best sequence vs meaningful alternatives

P-C1 itself intentionally stops before global best-action scoring or Coach natural-language generation.

---

Final authority for P-C1 acceptance is the post-corrective full-gate result above. `main` has not been modified by this P-C1 implementation.
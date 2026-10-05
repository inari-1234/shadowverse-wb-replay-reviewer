# ui-opt6P P-A1 — Legal Action / Sequence Generator

Reference date: 2026-10-05

Branch: `candidate/ui-opt6p-pa1-legal-action-sequence`

Implementation: `legal-action-sequence.js`

Regression: `tests/pa1-legal-action-sequence-regression.mjs`

Quality gate: `tests/run-quality-gate.mjs` / `recognition-quality-gate-v83`

## 1. P-A1 DESIGN SUMMARY

P-A1 is implemented as an authority-preserving engine. It does not introduce a second PositionState model and it does not duplicate Common Rule Engine trigger/effect ordering.

The engine requires three injected authorities:

- `stateAdapter`: reads the authoritative PositionState and applies the direct/core action transition.
- `ruleEngine`: resolves pending effects/triggers and terminal/authority status.
- `cardAuthority`: supplies registered card-specific legality, target, choice and cost rules.

This separation is deliberate. The repository `main` at the start of this stage did not contain concrete P-S1/P-R1 runtime symbols, so P-A1 binds through explicit interfaces instead of inventing an incompatible parallel implementation.

Public factory/API:

- `WB.LegalActionSequence.create(deps, options)`
- `engine.generateLegalActions(positionState)`
- `engine.applyAction(positionState, action)`
- `engine.generateSequences(positionState, limits)`
- `engine.stateFingerprint(positionState)`

Version: `pa1-legal-action-sequence-v1.0.0`.

## 2. ACTION MODEL

Supported rule-level action types:

- `PLAY_CARD`
- `ATTACK`
- `EVOLVE`
- `SUPER_EVOLVE`
- `ACTIVATE`
- `TARGET_SELECT`
- `CHOICE_SELECT`
- `END_TURN`

A generated legal action contains:

- `actionId`
- `actionType`
- `actorPlayer`
- `source`
- `target`
- `choice`
- `cost`
- `requiredState.stateId`
- `requiredState.fingerprint`
- `resultingState` (populated after successful application)
- `ruleAuthority`
- `legality`
- `uncertainty`
- `sequenceDepth`
- `reasonCodes`
- optional `meta`

The action does not embed a full PositionState copy.

## 3. LEGALITY MATRIX

| Area | LEGAL | ILLEGAL | UNKNOWN / UNRESOLVED |
| --- | --- | --- | --- |
| Play card | registered card, sufficient PP, field capacity, card predicate satisfied | insufficient PP, field full, explicit card predicate false | missing card authority, missing cost/target/choice rule, unresolved card predicate |
| Attack | attack-ready follower and legal target | already attacked, cannot attack, summoning sickness, Ward restriction, leader restriction | missing attack readiness/state authority |
| Normal evolve | evolve window open, EP > 0, source eligible | window closed, EP unavailable, already evolved | eligibility/window authority missing |
| Super evolve | super-evolve window open, SEP > 0, source eligible | window closed, SEP unavailable, already evolved | eligibility/window authority missing |
| Target/Choice | authority-supplied option | authority rejects option | target/choice authority unavailable |
| Activate | authority explicitly declares legal activation | authority explicitly declares illegal | activation legality unresolved |
| End turn | state permits end turn | state explicitly forbids it | unresolved state may be diagnosed upstream |

Only `LEGAL` entries are returned in `actions`. Illegal and unknown candidates are retained separately as diagnostics and never silently promoted.

## 4. ACTION GENERATOR

`generateLegalActions` performs:

1. PositionState validity gate.
2. P-R1 authority/ordering gate.
3. terminal-state gate.
4. active-player PositionState view resolution.
5. pending target/choice decision handling, if present.
6. play-card enumeration.
7. attack-source and legal-target enumeration, including Ward.
8. separate normal-evolve and super-evolve enumeration.
9. authority-declared activation enumeration.
10. end-turn enumeration.

Unknown cards are emitted as `UNKNOWN_CARD_AUTHORITY` diagnostics and are not guessed.

## 5. ACTION APPLY PIPELINE

`applyAction` uses the following pipeline:

1. Require `LEGAL` action.
2. Verify `requiredState.fingerprint` to reject stale actions.
3. Re-generate legal actions for the current state and require an equivalent `actionId`.
4. Call `stateAdapter.applyCoreAction` for core cost/direct transition.
5. Call `ruleEngine.resolveAfterAction` for trigger/effect resolution.
6. Stop on `INDETERMINATE_RULE_ORDER`, `UNKNOWN`, `UNRESOLVED` or resolution failure.
7. Validate resulting PositionState.
8. Check terminal status.
9. Return the resulting state ID/fingerprint and an action record populated with `resultingState`.

P-A1 does not reimplement cross-player or same-controller trigger ordering. The test authority verifies that `TURN_PLAYER_FIRST` and registration order pass through the P-R1 interface.

## 6. SEQUENCE GENERATOR

`generateSequences` builds a bounded action tree from the current PositionState. Each action is applied before the next legal set is generated, so legality is recalculated after every state transition.

Branch stops include:

- terminal state
- `END_TURN`
- unresolved/indeterminate rule authority
- invalid state
- effect resolution error
- depth limit
- node limit
- sequence limit
- cycle
- duplicate-state convergence

`END_TURN` ends the same-turn branch and does not generate more same-turn actions.

## 7. STATE DEDUPLICATION STRATEGY

If the P-S1 adapter provides `fingerprint(state)`, that authoritative fingerprint is used. If it does not, P-A1 uses a conservative stable serialization of the complete state; it does not remove history fields on its own.

This means performance may be less aggressive without a P-S1 fingerprint, but correctness/history preservation is preferred.

Duplicate-state behavior:

- the duplicate state is not expanded again;
- the converging sequence is still retained as a witness with `DUPLICATE_STATE`;
- path-local cycles stop with `CYCLE_DETECTED`.

This prevents exponential re-expansion without erasing evidence that a legal alternative sequence exists.

## 8. UNKNOWN / INDETERMINATE HANDLING

Supported safe-failure codes include:

- `UNKNOWN_CARD_AUTHORITY`
- `UNKNOWN_CARD_RULE`
- `UNKNOWN_TARGET_RULE`
- `UNKNOWN_EFFECT_RULE`
- `UNKNOWN_ATTACK_RULE`
- `UNKNOWN_EVOLVE_RULE`
- `UNKNOWN_SUPER_EVOLVE_RULE`
- `UNKNOWN_STATE_SCHEMA`
- `UNRESOLVED_LEGALITY`
- `INDETERMINATE_RULE_ORDER`

There is no silent fallback from UNKNOWN to LEGAL or ILLEGAL.

An unresolved global Rule Engine ordering gate returns `UNRESOLVED` with zero legal actions. A per-card unknown stays outside `actions` and is exposed in `unknown` diagnostics.

## 9. REASON CODE TABLE

Representative codes implemented:

- `LEGAL_ENOUGH_PP`
- `ILLEGAL_NOT_ENOUGH_PP`
- `ILLEGAL_FIELD_FULL`
- `ILLEGAL_ALREADY_ATTACKED`
- `ILLEGAL_CANNOT_ATTACK`
- `ILLEGAL_SUMMONING_SICKNESS`
- `ILLEGAL_WARD_RESTRICTS_TARGET`
- `ILLEGAL_LEADER_ATTACK_RESTRICTED`
- `ILLEGAL_NOT_ENOUGH_EP`
- `ILLEGAL_NOT_ENOUGH_SEP`
- `ILLEGAL_EVOLVE_WINDOW_CLOSED`
- `ILLEGAL_SUPER_EVOLVE_WINDOW_CLOSED`
- `ILLEGAL_ALREADY_EVOLVED`
- `ILLEGAL_STATE_CHANGED`
- `UNKNOWN_CARD_AUTHORITY`
- `UNKNOWN_CARD_RULE`
- `UNKNOWN_TARGET_RULE`
- `UNKNOWN_EFFECT_RULE`
- `INDETERMINATE_RULE_ORDER`
- `TERMINAL_STATE`
- `END_TURN_BRANCH`
- `DUPLICATE_STATE`
- `CYCLE_DETECTED`
- `DEPTH_LIMIT`
- `NODE_LIMIT`
- `SEQUENCE_LIMIT`
- `EFFECT_RESOLUTION_FAILURE`

Card authorities can additionally provide stable card-specific reason codes.

## 10. AUTOMATED TEST RESULTS

Dedicated P-A1 regression: **PASS**.

Coverage includes LA-01 through LA-20 requirements and multi-action sequences:

- PP insufficient / sufficient
- field full
- attack generation
- already-attacked suppression
- Ward target restriction
- leader-attack restriction
- normal evolution
- super evolution
- target branching
- choice branching
- state transition
- trigger resolution
- terminal stop
- end-turn stop
- unknown-card safe handling
- indeterminate-order safe stop
- source registration order
- turn-player-first ordering through Rule Engine
- duplicate-state suppression
- stale-action fingerprint rejection
- pending target/choice action generation
- Play -> Attack
- Play -> Evolve -> Attack
- Attack -> Play
- Play -> Play
- Evolve -> Attack
- Action -> Trigger -> next Action
- mid-sequence legality change
- search limits
- conservative full-state fingerprint fallback

## 11. REGRESSION TEST RESULTS

GitHub Actions `Recognition Quality Gate` Run #1020: **PASS / SUCCESS**.

The P-A1 regression is part of `recognition-quality-gate-v83`, so the existing replay, review, recognition, seek/video, tactical and benchmark regressions passed in the same gate execution as P-A1.

## 12. STATIC VALIDATION RESULTS

**PASS** for the implemented branch.

Verified by Node execution in CI and the dedicated regression import/execution path:

- no syntax/import failure
- module registration succeeds
- action type constants are unique
- legal/illegal/unknown remain distinct
- unknown card/rule paths do not silently fall back
- action application rejects stale state fingerprints
- Common Rule Engine resolution is mandatory after core action application
- terminal states do not generate subsequent actions

## 13. REMAINING OPEN ISSUES

No P-A1 blocking defect is known from the implemented engine/tests.

Integration note, not a P-A1 logic defect: at this stage the repository `main` does not expose concrete P-S1/P-R1 runtime modules under those stage names. Therefore `legal-action-sequence.js` intentionally consumes injected `stateAdapter` / `ruleEngine` contracts. When the concrete P-S1/P-R1 runtime binding is introduced, it must implement those contracts rather than duplicating state/rule logic inside P-A1.

Card-specific legality remains authority-driven. Unregistered cards remain UNKNOWN by design and must not be guessed.

## 14. P-A1 PASS / HOLD JUDGEMENT

**P-A1 PASS — ENGINE / CONTRACT COMPLETE**

The implemented generator produces legal actions only, excludes explicit illegal actions, isolates unknown actions, applies actions through the state authority, delegates trigger/effect resolution to the Rule Engine, stops terminal/end-turn/unresolved branches, supports bounded multi-step sequence generation and preserves duplicate/cycle evidence without re-expansion.

`main` is not modified by this stage.

## 15. P-C1 READY / NOT READY JUDGEMENT

**P-C1 READY**

P-C1 can consume:

- `generateLegalActions(state).actions`
- `applyAction(state, action)`
- `generateSequences(state, limits).sequences`
- resulting state IDs/fingerprints
- reason codes
- terminal/duplicate/cycle/limit stop reasons

P-C1 must continue to treat P-A1 legality as authoritative and must not convert UNKNOWN branches into assumed legal lines for scoring/backtracking.

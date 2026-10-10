# P-F1-R2 authority-only presentation regression migration map

Purpose: migrate `tests/pf1r2-authority-only-presentation-regression.mjs` from the pre-P0-2 DOM-decoration contract to the Single Presentation Authority contract **without weakening any behavioral protection**.

| Pre-P0-2 assertion / protection | New contract assertion | Status |
|---|---|---|
| No P-D1 OK row is required; HOLD must not block fresh authority presentation | `CoachIntegration.snapshot().count === 0` and `decorate() >= 1` | Preserved |
| Review Card is marked as fresh exact authority | `model.authorityPresentation.authority === 'fresh-exact'` | Preserved |
| 8T display starts at 113.638 and ends at 116.338 | `model.reviewStart/end` + rendered time `01:53.6 → 01:56.3` | Preserved |
| PP changes 2 → 1 | `model.beforeState.pp === 2`, `afterState.pp === 1` | Preserved |
| boardDamage changes 0 → 3 | `model.beforeState.boardDamage === 0`, `afterState.boardDamage === 3` | Preserved |
| Before-frame button points to 113.638 | rendered `data-review-frame-time="113.638"` for `before` | Preserved |
| Playback authority starts at 113.638 | `ReplaySession.reviewAuthorityPlaybackStart(windowId) === 113.638` | Preserved |
| Legacy coach remains independent when no comparison coach exists | rendered `.reviewCoach` exists and no `[data-comparison-coach="1"]` exists | Preserved |
| Incomplete/stale binding cannot rewrite time/PP/playback | no `authorityPresentation`; base start 115.888 / PP1 retained; playback override null | Preserved |

No pre-P0-2 behavioral assertion is deleted. Only the observation point changes from `CoachIntegration` mutating DOM nodes to `ReplaySession` owning the presentation model and renderer/playback consuming that model.

Red-proof requirement: this migrated regression must fail against the P0-2 parent HEAD because that HEAD does not implement ReplaySession Single Presentation Authority. It must pass on the P0-2 candidate HEAD.

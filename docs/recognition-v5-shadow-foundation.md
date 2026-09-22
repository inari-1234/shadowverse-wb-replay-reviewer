# Recognition Engine v5 Shadow Foundation

## Status

This is an **offline / shadow-only** foundation. It is not part of the eight runtime scripts and it must not change the live recognition result.

Current production remains v4.13.56.

## Why v5 exists

The v4 line has accumulated reliable diagnostics and regression protection, but some misses require increasingly specific rescue logic. Recent Zeta evidence showed that the card identity itself can remain strongly separated while the displayed cost OCR oscillates between 3 and 6. This is a sign that the next gains should come from separating observation, classification and decision rather than adding more card-specific exceptions.

## Architecture

v5 is split into four layers.

1. **Dataset layer**
   - Converts diagnostic JSON or lossless hand fixtures into a stable observation schema.
   - Uses fixture SHA-256 as the preferred decoded-frame identity.
   - Keeps legacy decisions only as reference metadata, never as ground truth.

2. **Visual evidence layer**
   - Cost recognition is treated as a small closed-set classification problem.
   - Card recognition is treated as ranked class evidence, not a single absolute threshold.
   - Per-frame outputs keep class scores and margins.

3. **Temporal aggregation layer**
   - Duplicate decoded frames are removed before aggregation.
   - Median, interquartile range, support and top-1 margin are calculated across distinct frames.
   - OCR-versus-visual disagreement is preserved explicitly.

4. **Decision layer**
   - Not implemented in v5 shadow 0.1.
   - No v5 score may affect the production v4 decision.
   - Promotion requires separate calibration and validation data.

## Current files

- `experiments/recognition-v5-shadow.mjs`
- `experiments/v5-dataset-extractor.mjs`
- `tests/recognition-v5-shadow-regression.mjs`
- `tests/v5-dataset-extractor-regression.mjs`

None of these files are loaded by `index.html`.

## Data policy

Human labels remain authoritative.

Use:
- calibration data for model or threshold fitting;
- validation data only after a candidate is frozen;
- safety negatives for known false-positive shapes.

Do not:
- copy `observed` into `expected`;
- count repeated captures of the same event as independent validation;
- count duplicate decoded frames as additional temporal support.

## Model strategy

Start with the smallest reliable classifier.

### Displayed cost
Preferred order:
1. prototype / nearest-template classifier;
2. compact linear or shallow model if needed;
3. tiny CNN exported to ONNX only after enough labeled crops exist.

### Card identity
Preferred order:
1. common normalized card crop;
2. embedding / prototype ranking with top-1 margin;
3. compact learned classifier only after cross-video data is sufficient.

## Browser execution policy

Initial model execution must have a WebAssembly fallback. GPU acceleration is optional and must be benchmarked on the actual iPhone before becoming a dependency.

## Promotion criteria

A v5 component can influence live recognition only when all are true:

- production v4 regression gate still passes;
- the component has positive and negative calibration coverage;
- at least one separate validation video contains both positive and negative evidence for the tuned class;
- false positives do not increase;
- full-state scenario comparison does not regress;
- shadow output and production output can be compared on the same observations;
- rollback is possible without changing stored data.

## Shadow 0.2 integration

- The canonical dataset record shape is now consumed directly by the shadow evaluator.
- Cost evidence supports one-vs-rest thresholds and explicit abstention.
- Temporal median can accept a class even when an individual frame falls below threshold.
- Diagnostic JSON without image hashes is marked as time-fallback frame identity; lossless fixtures remain the preferred source for decoded-frame deduplication.
- The 2026-09-22 v4.13.56 all-slot cost6 observation is retained as calibration evidence only, not validation ground truth.

## Shadow 0.3 visibility evidence

- Dataset records now preserve normal card scores, overlap-masked scores, masked support ratios, and per-slot geometry.
- The evaluator reports geometry-limited layouts without turning masked evidence into a production decision.
- A cross-video calibration snapshot now covers Barbaros at five cards (normal median 0.9405) and nine cards (normal median 0.3577, masked median 0.7254).
- The observed nine-card right gap is 33 px against a 46 px anchor span, so the production ROI is geometrically occluded.
- This is calibration evidence only. No masked-score production threshold has been introduced.

## Shadow 0.4 visibility confidence

- Visibility evidence now records normal-vs-masked rank agreement, temporal top-class consistency, score recovery, margin gain, and masked support.
- Rank-preserving recovery is diagnostic only: geometry must be limited, normal and masked top classes must agree, and both score and margin must improve.
- Rank conflicts are surfaced explicitly instead of turning masked scores into an automatic rescue.
- The nine-card Barbaros slot is a rank-preserving recovery case; several other nine-card slots are rank-conflict or weak-margin cases.
- No production threshold or recognition decision uses these fields.

## Shadow 0.5 fixed common-strip evidence

- Dense layouts (7+ cards) now export two diagnostic-only anchor comparisons using the same left-side columns for every card: left40 and left50.
- This addresses a limitation of adaptive masking: the compared region changes as overlap changes, so scores are not directly comparable across hand counts.
- Offline cross-video calibration using the five-card success frame and an eight-card fixture showed the Barbaros candidate improving from about 0.51 normal / 0.77 adaptive-mask to about 0.81-0.82 with fixed left-side evidence.
- The fixed strips are not production thresholds and are not used by decideHandSamples.
- v5 shadow 0.5 aggregates left40 and left50 separately and keeps agreement, temporal consistency and margins as diagnostics.

## Immediate next milestones

1. Export lossless fixtures from multiple videos and create dataset manifests.
2. Label displayed-cost crops for several digits, especially 3 vs 6.
3. Measure per-class confusion, not only recognition success.
4. Add a v5 cost classifier in shadow mode.
5. Add card ranking after cost classification is stable.
6. Only then design the v5 decision layer.

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

## Immediate next milestones

1. Export lossless fixtures from multiple videos and create dataset manifests.
2. Label displayed-cost crops for several digits, especially 3 vs 6.
3. Measure per-class confusion, not only recognition success.
4. Add a v5 cost classifier in shadow mode.
5. Add card ranking after cost classification is stable.
6. Only then design the v5 decision layer.

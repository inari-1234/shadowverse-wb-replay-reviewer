# Authority Ledger BOOT Checklist v0.1

1. Fix the current baseline SHA and Runtime Build ID before making claims.
2. Run the Authority Ledger checker; inspect only claims marked `REVERIFY_REQUIRED` or `REFERENCE_ONLY`.
3. Do not mix claim strength: `CONFIRMED` = direct target-environment observation, `REPRODUCED` = replay/reproduction, `INFERRED` = inference only.
4. Check the Integration Plane as well as functional modules: event order, persistence/restore, mutation ownership, presentation authority, run isolation, runtime asset authority.
5. Convert device-only failures into raw trace / fixture evidence when possible.
6. For semantic test changes, record old-assert → new-assert correspondence.
7. Except for a machine-verified version-literal-only change, require old production + new test = RED and new production + new test = GREEN.
8. A prior PASS is reusable only if the Gate represented the behavior now being claimed and no invalidation path changed.
9. Runtime assets and their manifest must be self-consistent by SHA before device evidence can become Authority.
10. Final reports must distinguish `CONFIRMED`, `REPRODUCED`, `INFERRED`, and unverified items; never strengthen a claim beyond its evidence.

## Version-literal-only exception

The exception applies only when every changed token in the test expectation is a version/build identifier string literal and no executable assertion logic, condition, fixture value, reason code, semantic label, or expected behavior changes. If that condition cannot be established mechanically, use the normal RED/GREEN rule.

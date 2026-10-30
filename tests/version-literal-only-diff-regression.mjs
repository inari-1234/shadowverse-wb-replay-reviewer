import assert from 'node:assert/strict';
import {classifyUnifiedDiff,isVersionIdentifierLiteral,isVersionLiteralOnlyLinePair} from '../tools/check-version-literal-only-test-diff.mjs';

assert.equal(isVersionIdentifierLiteral('pe2-coach-integration-v1.2.3'),true);
assert.equal(isVersionIdentifierLiteral('candidate-assets-30043285ebe1'),true);
assert.equal(isVersionIdentifierLiteral('diagnostics-clean-1.60'),true);
assert.equal(isVersionIdentifierLiteral('CONFIRMED_TRADE_OFF'),false);

assert.equal(isVersionLiteralOnlyLinePair("assert.equal(E.version,'pe1-coach-explanation-v1.1.0');","assert.equal(E.version,'pe1-coach-explanation-v1.1.1');"),true,'version literal replacement is eligible');
assert.equal(isVersionLiteralOnlyLinePair("assert.equal(x.status,'UNAVAILABLE');","assert.equal(x.status,'CONFIRMED_TRADE_OFF');"),false,'semantic label replacement is never eligible');
assert.equal(isVersionLiteralOnlyLinePair("assert.equal(x.count,5);","assert.equal(x.count,6);"),false,'numeric expectation change is not a string-literal version exception');
assert.equal(isVersionLiteralOnlyLinePair("assert.ok(x.visible);","assert.equal(x.visible,true);"),false,'assertion logic changes are rejected');

const positive=`diff --git a/tests/a.mjs b/tests/a.mjs\n--- a/tests/a.mjs\n+++ b/tests/a.mjs\n@@ -1 +1 @@\n-assert.equal(VERSION,'pf0a-runtime-authority-binding-v1.1.6');\n+assert.equal(VERSION,'pf0a-runtime-authority-binding-v1.1.7');\n`;
assert.equal(classifyUnifiedDiff(positive).version_literal_only,true,'pure version-literal test diff is eligible');

const semantic=`diff --git a/tests/a.mjs b/tests/a.mjs\n--- a/tests/a.mjs\n+++ b/tests/a.mjs\n@@ -1 +1 @@\n-assert.equal(reason,'NO_SEQUENCE_CANDIDATES');\n+assert.equal(reason,'OPPONENT_WARD_UNRESOLVED');\n`;
assert.equal(classifyUnifiedDiff(semantic).version_literal_only,false,'reason-code changes require normal RED/GREEN evidence');

const production=`diff --git a/coach-explanation.js b/coach-explanation.js\n--- a/coach-explanation.js\n+++ b/coach-explanation.js\n@@ -1 +1 @@\n-const VERSION='v1.1.0';\n+const VERSION='v1.1.1';\n`;
assert.equal(classifyUnifiedDiff(production).version_literal_only,false,'exception never applies outside tests/');

console.log('VERSION-LITERAL-ONLY DIFF REGRESSION PASS');

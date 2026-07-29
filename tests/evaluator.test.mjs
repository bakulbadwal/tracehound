import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { auditOutput, validateExpectation } from "../evals/lib/evaluator.mjs";

const fixtureUrl = new URL("../evals/golden-set.json", import.meta.url);
const cases = JSON.parse(await readFile(fixtureUrl, "utf8"));

for (const evalCase of cases) {
  test(evalCase.id, () => {
    const result = auditOutput(evalCase);
    assert.deepEqual(validateExpectation(result, evalCase.expectation), []);
  });
}

test("every citation resolves to a supplied evidence record", () => {
  const evalCase = cases.find((item) => item.id === "invented_identifier_and_dangling_citation");
  const result = auditOutput(evalCase);
  assert.deepEqual(result.diagnostics.danglingIds, ["E99"]);
  assert.deepEqual(result.diagnostics.inventedIdentifiers, ["0xdeadbeef"]);
});

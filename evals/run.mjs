import { readFile } from "node:fs/promises";
import { auditOutput, validateExpectation } from "./lib/evaluator.mjs";

const fixtureUrl = new URL("./golden-set.json", import.meta.url);
const cases = JSON.parse(await readFile(fixtureUrl, "utf8"));
let failed = 0;

for (const evalCase of cases) {
  const result = auditOutput(evalCase);
  const errors = validateExpectation(result, evalCase.expectation);
  const status = errors.length ? "FAIL" : "PASS";
  console.log(
    `${status} ${evalCase.id} | faith=${result.scores.faithfulness} citations=${result.scores.citationQuality} abstention=${result.scores.abstention} | ${result.violations.join(", ") || "no violations"}`
  );
  if (errors.length) {
    failed += 1;
    for (const error of errors) console.error(`  - ${error}`);
  }
}

console.log(`\n${cases.length - failed}/${cases.length} golden cases passed.`);
if (failed) process.exitCode = 1;

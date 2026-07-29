# TraceHound evals

This suite measures the parts of TraceHound that are probabilistic: the narration and the
demand-letter draft. The underlying watchlist lookup remains deterministic application logic and
belongs in unit tests, not an LLM judge.

Run both checks locally:

```bash
npm test
npm run eval
```

`npm run eval` runs a hand-labeled golden set through a deterministic policy checker. It catches
invented on-chain identifiers, dangling or missing citations, false watchlist claims, unsupported
ownership attribution, verified-contract/owner conflation, hidden truncation, missing IC3 and
legal-advice notices, and freeze or legal overclaims.

The checker is intentionally conservative and transparent. It does not claim to understand every
semantic failure. `judge-prompt.md` defines the complementary model-judge rubric; that judge is
**designed but not calibrated**, so its score must not be treated as evidence of quality yet. See
`validation-plan.md` for the work required before using it in CI or product decisions.

## Adding a case

Add an object to `golden-set.json` containing the output type, candidate text, evidence records,
and expected required/forbidden violations or score bounds. Keep cases synthetic or scrubbed:
real victim addresses and complaint numbers do not belong in the repository.

# TraceHound — agent instructions

Agentic on-chain hack tracer with an executable eval layer. Next.js app, deployed on Vercel,
plus a read-only MCP server. Built for individual crypto-theft victims whose cases are too small
for Chainalysis/TRM-tier vendors.

## Non-negotiable constraints

This project's value is that it is **honest about its limits**. The README's "What this is not"
section and the eval layer exist to enforce that. Breaking any of the following is a correctness
bug, not a style choice:

- **Never claim a specific exchange or wallet-owner relationship for an address.** A verified
  contract name (from Etherscan `getsourcecode`) is an objective fact; ownership is a guess. Never
  conflate them.
- **Never imply the demand letter can compel a freeze.** Only an exchange's compliance team can
  freeze funds, generally only with law enforcement process. The letter is a drafting aid.
- **Always tell the victim to file with IC3 regardless.**
- **Every material model claim must cite a stable evidence record.** `src/lib/evidence.ts` produces
  the shared records used by prompts, the UI, and the evals. Do not let a prompt make claims outside
  that contract.
- **Disclose truncation.** If the BFS walk was capped, the output must say so.

## The eval layer is a contract, not decoration

`evals/` holds a golden set, a deterministic policy gate (`evals/lib/evaluator.mjs`), a judge
rubric, and a validation plan. Run `npm test` and `npm run eval`. If you change prompts, the
letter-drafting flow, or the evidence contract, **run the evals and expect them to catch you**.
The judge is deliberately marked *designed, not validated* — do not describe it as validated
anywhere until it has been calibrated against hand-labeled examples.

## The MCP server is read-only by design

Exposed tools return evidence records with stable IDs rather than prose, so a consuming agent has
something to cite. Letter drafting is **deliberately not exposed**, and a test fails if the
read-only tool set ever grows a write path. Do not "helpfully" add one.

## Practical

- Secrets are server-side only (`ETHERSCAN_API_KEY`, `ANTHROPIC_API_KEY`). Never move an API call
  to the client.
- `data/watchlist.json` holds **real OFAC SDN** addresses, refreshed by
  `npm run update-watchlist`. Don't hand-edit it.
- `docs/screenshot.png` is reused by the GitHub profile README — if the UI changes materially,
  retake it from the live site rather than leaving a stale image.

Shared personal context (global conventions, memory index, cached research): see
`~/.codex/AGENTS.md` for the map, or `~/.claude/CLAUDE.md` directly.

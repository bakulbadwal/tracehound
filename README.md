# TraceHound

**Live:** https://tracehound.vercel.app

![TraceHound screenshot](docs/screenshot.png)

Agentic on-chain hack tracer with executable evals, built for the gap institutional vendors (Chainalysis, TRM Labs, Elliptic) leave open: individual cases too small for those vendors to prioritize, too niche for FBI to move fast on. Built from experience working with FBI and U.S. Secret Service on a hack + tracking/referring $6M of crypto crime.

Give it a seed address (e.g. an exploited contract or a hacker's wallet), and it:

1. Walks live outgoing transfers N hops out using the real Etherscan v2 API (works across
   Ethereum, BNB Chain, Polygon, Arbitrum — anywhere Etherscan's unified API covers), rendered as
   a radial hop-by-hop graph (seed at center, watchlist hits highlighted) alongside a full table.
2. Flags any address on the watchlist (`data/watchlist.json`) — populated with **real, current
   OFAC SDN-sanctioned digital currency addresses** (105 as of this writing, EVM-format only:
   ETH/ARB/BSC/USDC/USDT-on-EVM), pulled directly from the U.S. Treasury's official SDN list.
   Refresh it any time with `npm run update-watchlist`.
3. Has an LLM agent narrate the trace in plain English — this narration step, not the hop-walk,
   is the actual differentiator over clicking through a block explorer by hand. Every material
   model claim is required to cite a stable evidence record displayed with the output.
4. Looks up each address's **verified smart contract name** (free, via Etherscan's official
   `getsourcecode` endpoint) — e.g. flagging that a hop went to `UniswapV2Router02`, not a
   person's wallet. This is deliberately different from exchange/mixer attribution: it's an
   objective fact ("this address is a verified contract named X"), not a guess about ownership.
5. Can draft a demand/freeze-request letter from the real trace facts (loss amount + optional
   FBI IC3 complaint number), for victims whose case is too small for a Chainalysis/TRM-tier
   vendor to prioritize. It never claims a specific exchange relationship, never claims the
   letter itself can compel a freeze, and always tells the victim to file with IC3 regardless.

## What this is not

Read this before treating any output as authoritative:

- **No mixer/exchange attribution database.** The watchlist has real OFAC sanctions data (see
  above), but it does not know which addresses belong to mixers or exchanges — that data set is
  most of what Chainalysis, TRM Labs, and Elliptic actually sell, built over years from
  subpoenas and law-enforcement cooperation. Community datasets exist if you want to extend it:
  https://github.com/OffcierCia/On-Chain-Investigations-Tools-List
- **No freezing capability.** Only an exchange's compliance team can freeze funds, and generally
  only with law enforcement legal process behind it. This tool drafts the letter from real trace
  facts; it never sends it, never claims an exchange relationship, and never guarantees a hold.
- **No cross-chain bridge/mixer demixing.** Following funds through a bridge or a mixer like
  Tornado Cash requires dedicated heuristics this MVP doesn't implement.
- **Not court-admissible chain of custody.** No cryptographic proof of data integrity, no expert
  witness track record.

What it's honest about being: a real, functional first-hop tracer with an autonomous narration
layer, useful for a fast first look at where funds moved — not a regulatory-grade investigation
platform.

## Setup

```bash
npm install
cp .env.example .env.local
# fill in ETHERSCAN_API_KEY (free, https://etherscan.io/apis)
# fill in ANTHROPIC_API_KEY (https://console.anthropic.com/)
npm run dev
```

Open http://localhost:3000, paste an address, pick a chain and hop depth, and trace.

## Architecture

```
src/
  app/
    page.tsx              UI: address form, results, narrative
    api/trace/route.ts    server-side chain walk (keeps API keys off the client)
    api/narrate/route.ts  LLM narration of the trace graph
    api/draft-letter/     LLM-drafted demand/freeze-request letter from trace facts
  mcp/
    server.ts             MCP stdio server: read-only trace/watchlist/evidence tools
  lib/
    etherscan.ts           Etherscan v2 API client (tx history + verified-contract lookup)
    evidence.ts            stable evidence records shared by prompts, UI, and evals
    trace.ts               BFS outward walk, fan-out capping, watchlist + contract enrichment
    validate.ts            shared trace-input rules, so the HTTP route and MCP can't drift
    watchlist.ts            watchlist lookup
  components/
    TraceGraphView.tsx      radial SVG hop graph (hand-rolled, no charting library)
scripts/
  update-watchlist.js      pulls the real OFAC SDN advanced XML and refreshes watchlist.json
  mcp-smoke.mjs            end-to-end MCP wiring check over a real stdio client
data/
  watchlist.json           known-address list — burn/zero + real OFAC-sanctioned addresses
evals/
  golden-set.json          synthetic clean and adversarial model-output cases
  lib/evaluator.mjs        deterministic policy and evidence checker
  judge-prompt.md          complementary semantic rubric (not yet calibrated)
```

## Evals

**At a glance:**

| Layer | What it does | Status |
|---|---|---|
| Golden set — [`evals/golden-set.json`](evals/golden-set.json) | Synthetic clean + adversarial model-output cases | Built |
| Deterministic gate — [`evals/lib/evaluator.mjs`](evals/lib/evaluator.mjs) | Catches invented identifiers, false watchlist claims, missing citations, unsafe letter claims — `npm run eval` | Built, executable |
| Judge rubric — [`evals/judge-prompt.md`](evals/judge-prompt.md) | Semantic failures pattern checks can't reliably catch | Designed |
| Calibration plan — [`evals/validation-plan.md`](evals/validation-plan.md) | Labeled splits, per-violation precision/recall, re-calibration triggers | Planned — not yet validated |

The obvious thing to evaluate here is the OFAC watchlist matching, and that would be a mistake:
it's a deterministic set-membership check against `watchlist.json`. Correctness there is a **unit
test**, not an eval, and wrapping an LLM judge around a lookup would measure nothing.

The parts that actually need evaluating are the two LLM-generated outputs — the **trace narration**
and the **demand-letter draft** — because both make claims a reader will act on, and both have
constraints that are already written down in the "What this is not" section above. That makes the
eval criteria unusually concrete:

**Faithfulness** — does the narration describe only what the trace data actually shows? Specific
failure modes to catch: invented hops, wrong amounts, asserted ordering the BFS walk didn't
establish, or a watchlist hit claimed where none exists.

**Constraint compliance** — the tool's stated guarantees are testable as pass/fail criteria:
- never claims a specific exchange relationship for an address
- never claims the letter itself can compel a freeze
- always tells the victim to file with IC3 regardless
- never presents a verified-contract name as ownership attribution

A violation of any of these is a real-world problem, not a style issue — the user may act on the
output, and overclaiming is the failure mode with actual consequences.

The built evaluation layer has two parts:

1. An **executable deterministic gate** over a synthetic golden set. It catches invented on-chain
   identifiers, false watchlist claims, missing/dangling evidence citations, unsupported owner or
   exchange attribution, verified-contract/ownership conflation, missing truncation disclosure,
   and unsafe letter claims. Run it with `npm test` and `npm run eval`.
2. A **semantic judge rubric and calibration plan** for failures that pattern checks cannot reliably
   understand. The judge is designed but deliberately not represented as validated. It must be
   calibrated against independently hand-labeled examples before its scores can gate releases.

Runtime output now uses the same evidence contract: prompts receive numbered evidence records,
material claims must cite them, and the UI exposes the full evidence appendix. That does not make
the model infallible; it makes claims inspectable and gives the evals a concrete contract to test.

See [`evals/README.md`](evals/README.md) and
[`evals/validation-plan.md`](evals/validation-plan.md) for scope and calibration requirements.

## MCP server

TraceHound exposes its trace, watchlist, and evidence layers to any MCP client — Claude Desktop,
Claude Code, another agent.

```bash
npm run mcp:build     # compile src/mcp + src/lib to dist/ (separate from the Next build)
npm run mcp           # start the server on stdio
npm run mcp:smoke     # verify the wiring end-to-end with a real MCP client
```

To use it from Claude Desktop or Claude Code, point an MCP client at the built server:

```json
{
  "mcpServers": {
    "tracehound": {
      "command": "node",
      "args": ["/absolute/path/to/tracehound/dist/src/mcp/server.js"],
      "env": { "ETHERSCAN_API_KEY": "your-key" }
    }
  }
}
```

| Tool | Returns |
|---|---|
| `trace_address(address, chain?, depth?)` | Trace summary plus `EvidenceRecord[]` with stable IDs, and a `traceId` |
| `check_watchlist(address)` | Exact-address watchlist match, with the not-evidence-of-legitimacy caveat attached |
| `get_evidence(traceId)` | The evidence records for a trace already run this session |

Two design decisions worth stating, because they are the point rather than an implementation
detail:

**It returns evidence records, not prose.** The eval layer's whole contract is that every material
claim cites a stable evidence ID. If this interface handed back a paragraph, a consuming agent
would have nothing to cite and the citation discipline would be lost exactly where it matters
most — at the machine-to-machine boundary, where no human is reading. So `trace_address` returns
the same `E1`/`E2`/`E3` records the UI and the letter drafter use, and every response repeats the
["What this is not"](#what-this-is-not) limitations inline, since an agent may never see this
README.

**It is read-only, and letter drafting is deliberately not exposed.** Producing a legal demand
letter should not be something an agent can trigger unattended; it stays behind the UI where a
human reads it before it exists. [`tests/mcp.test.mjs`](tests/mcp.test.mjs) fails if a tool is
ever added to the server without that decision being revisited.

Trace storage for `get_evidence` is in-memory and scoped to the server process (persistent case
storage is still future scope, below), so traces do not survive a restart.

## Roadmap ideas (not built — future scope)

Ordered by signal, not by effort. The first three are about making the evidence claim hold up;
the rest extend reach.

- **Calibrate the judge rubric.** This is the highest-value gap in the repo, because it is the one
  place the project's own standard is not yet met. [`evals/judge-prompt.md`](evals/judge-prompt.md)
  is designed but unvalidated, and an uncalibrated judge is a confidence signal with nothing behind
  it. [`evals/validation-plan.md`](evals/validation-plan.md) already specifies the work: labeled
  splits, per-violation TPR/TNR against human labels, and re-calibration triggers. Until that runs,
  the deterministic gate is the only layer that has earned trust.
- **Watchlist staleness as evidence.** A watchlist miss is currently reported with the caveat that
  absence is not evidence of legitimacy — true, but incomplete. The evidence record should carry
  *when* `data/watchlist.json` was last refreshed from the OFAC SDN list and how many entries it
  holds. A no-match against a six-month-old list is a materially weaker claim than one against a
  list pulled this morning, and right now nothing downstream can tell those apart.
- **Evidence integrity and deterministic replay.** Record the raw Etherscan responses behind a
  trace and hash each evidence record over its source payload. Two payoffs: evals become runnable
  offline against fixtures instead of live chain state, and a trace becomes re-verifiable after the
  fact. This does not make output court-admissible — that needs chain of custody and an expert
  witness, neither of which is a software feature — but it closes the gap between "we assert this"
  and "you can check this."
- **MCP resources and prompts, not only tools.** The server currently exposes tools. Exposing a
  completed trace as an MCP *resource* with a stable URI would let a client re-read a case without
  a tool round-trip, and shipping an MCP *prompt* that encodes the citation contract would push the
  evidence discipline into the consuming agent's context rather than relying on it to read tool
  descriptions carefully.
- **Etherscan rate-limit and backoff handling.** At depth 5 with a fan-out cap of 8, a single trace
  can issue enough calls to hit the free tier's limit mid-walk. There is no retry or backoff today,
  so a throttled response surfaces as a failed trace rather than a slower one.
- Incoming-transfer tracing (where funds *came from*), not just outward.
- Bridge-hop following.
- Persistent case storage so a trace can be revisited/exported as a report (PDF). Would also give
  the MCP server's `get_evidence` a durable backing store instead of per-process memory.

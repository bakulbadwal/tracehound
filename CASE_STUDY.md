# Case Study — TraceHound
### A product-thinking write-up (not a README). To run it, see [README](./README.md); this is the *why*.

An agentic on-chain hack tracer for the users institutional forensics leaves behind: individual victims whose cases are too small for Chainalysis/TRM to prioritize and too niche for the FBI to move on quickly.

---

## The problem — and the user nobody serves

When someone gets their crypto stolen, there's a brutal gap. The tools that actually trace stolen funds (Chainalysis, TRM Labs, Elliptic) are enterprise-priced and sell to banks and governments — they won't take a $40k individual theft. Law enforcement is overloaded and slow. So the individual victim is left staring at a block explorer they don't know how to read, with no way to even produce a credible first account of where their money went.

**I know this user because I was this user** — I was hacked, which pulled me into ~4 years of cybercrime-analytics volunteer work (FBI referrals, ~$6M in flagged flows, Senate-subcommittee testimony). TraceHound is the tool I wished existed at hour one: a fast, honest first look that a non-expert can run.

## The core product insight

**The differentiator isn't the trace — it's the narration.** Walking transfers hop-by-hop is something a block explorer already does. The thing a victim can't do is *understand* it. So the product bet is: the LLM agent that narrates the trace in plain English — "funds moved from your contract to X, then split across three wallets, one of which is an OFAC-sanctioned address" — is where the actual value is created. The hop-walk is table stakes; the agentic interpretation layer is the product.

## Key product decisions & tradeoffs

| Decision | Why | Tradeoff accepted |
|---|---|---|
| **Serve the underserved tail, not compete with Chainalysis** | The enterprise vendors own the high end via years of subpoena-built attribution data. Competing there is hopeless; the *abandoned* segment (small victims) is real and unserved. | Deliberately smaller ceiling. Correct — it's a wedge, not a frontal assault. |
| **LLM narration as the headline feature** | It's the step that turns raw hops into something a non-expert can act on — the actual job-to-be-done. | Adds model cost + a hallucination surface constrained with evidence IDs, visible citations, and executable evals. |
| **Ship an aggressively honest "What this is not" section** | The fastest way to lose a victim's trust — or create legal exposure — is to overclaim. No mixer attribution, no freeze capability, no court-admissible custody. Saying so *is* the product's integrity. | Looks less impressive at a glance. But trust is the whole product in this domain; overclaiming would be malpractice. |
| **Draft a demand letter from real trace facts only** | Gives the victim a concrete next artifact — but it never claims an exchange relationship, never claims it can compel a freeze, and always routes them to IC3. | Constrained, less "magic." Right call — a tool that overpromises legal outcomes to desperate people is harmful. |
| **Verified-contract naming (objective) over ownership guessing (speculative)** | "This address is a verified contract named UniswapV2Router02" is a checkable fact; "this wallet belongs to Binance" is a guess. Ship facts, flag guesses. | Less coverage than a paid attribution DB. But it's honest, and honesty is the moat here. |

## How I'd measure success

**North-star:** did a victim leave with something they didn't have before — a credible trace narrative + a usable next step (IC3 filing, a drafted letter)? That's the job.

**Supporting metrics I'd instrument:** traces completed vs. started (drop-off = confusion points); % of traces that hit a watchlist address; letters generated; and — the real outcome, hardest to attribute — cases where the output actually helped a victim get traction with an exchange or law enforcement.

**Honest gap:** it's a functional MVP with no usage telemetry today. Before scaling, I'd want qualitative signal (do victims find the narration actually clarifying?) over vanity metrics.

## Roadmap

1. **Bridge/mixer heuristics** — the biggest capability gap; following funds through Tornado-style mixers is where most traces currently dead-end.
2. **Community attribution data** — integrate open datasets to extend beyond OFAC-only flagging without pretending to Chainalysis-grade coverage.
3. **Calibrate the semantic judge on human labels** — the deterministic evidence/constraint eval harness is now built. The remaining work is a scrubbed real-trace set, two-person labeling, and held-out validation before semantic scores can gate releases. (The agent is measured, while the limits of that measurement stay explicit.)

## Why this write-up exists

TraceHound is where three things I care about converge: agentic AI as the interpretation layer, an underserved real user, and rigorous honesty about a tool's limits. This document is the product-thinking layer — the problem, the user (me, once), the decisions, and how I'd measure and extend it. If you're reading it as a hiring signal, that's the intent.

---

*Tech: Next.js, Etherscan v2 API (multi-chain), Anthropic API for the narration agent, real OFAC SDN watchlist. Part of a broader portfolio at [github.com/bakulbadwal](https://github.com/bakulbadwal).*

# TraceHound Design System

## Product character

TraceHound is a digital forensics case desk, not a crypto trading dashboard and not an AI marketing surface. The interface should feel like a credible investigative record: sober, precise, evidence-first, and easy to audit.

The visual model combines:

- the density and grid discipline of an institutional operations console;
- the calm, trustworthy restraint of a financial compliance product;
- the status semantics of an incident-response tool;
- the surface economy of a well-edited developer tool.

## Experience principles

1. **Evidence before interpretation.** Transaction facts and evidence IDs appear before or beside agent-generated prose.
2. **The graph is a work surface.** It is the one dark, high-contrast canvas inside an otherwise light case file.
3. **Status must be explicit.** Sample, truncated, flagged, verified-contract, generated, and user-reported information use distinct labels; color never carries meaning alone.
4. **Density with hierarchy.** Hairlines, compact metadata, and open tables are welcome, but every region needs a clear label and reading order.
5. **No synthetic certainty.** UI language must not imply proprietary attribution, legal authority, or verified ownership when those facts are not available.
6. **Responsive by reordering.** On narrow screens the case becomes a vertical investigative sequence, not a shrunken desktop dashboard.

## Visual system

### Color

| Token | Use | Value |
| --- | --- | --- |
| Paper | Page and primary surfaces | `#f4f5f7` / `#ffffff` |
| Ink | Primary copy | `#161616` |
| Secondary ink | Supporting copy | `#525252` |
| Hairline | Dividers and table grid | `#d9dde3` |
| Graphite | Transaction graph canvas | `#111820` |
| Cobalt | Primary actions and links | `#0f62fe` |
| Red | Watchlist / adverse indicator | `#da1e28` |
| Amber | Sample data, truncation, caution | `#f1c21b` |
| Green | Completed / verified state only | `#198038` |

Red, amber, and green always appear with text labels. Verified-contract styling means the contract name was returned by the explorer; it does not establish ownership.

### Typography

- Interface: IBM Plex Sans, with system sans-serif fallbacks.
- Addresses, evidence IDs, chain IDs, and compact metadata: IBM Plex Mono, with system monospace fallbacks.
- Large display type is deliberately avoided. The product should read like an instrument, not a landing page.

### Geometry

- Square or near-square corners: 0–2px.
- One-pixel borders and table rules organize the interface.
- Shadows are nearly absent; hierarchy comes from spacing, contrast, and grid placement.
- Controls are at least 40px high and retain visible keyboard focus.

## Page anatomy

1. **Case desk header** — product identity, workspace description, and supported-chain context.
2. **Trace intake** — concise purpose statement, address/chain/depth fields, and explicit primary action.
3. **Sample warning** — persistent whenever fabricated demonstration data is loaded.
4. **Case strip** — active chain, seed, requested depth, truncation state, and evidence count.
5. **Investigation workspace** — dark graph and open trace ledger in the primary column; evidence record and analyst brief in the right rail.
6. **Draft correspondence** — a separate downstream action; generated text remains traceable to its evidence appendix.
7. **Scope record** — product limitations remain visible, not buried behind a tooltip.

## Component rules

### Transaction graph

- The canvas is graphite with a faint grid.
- Seed is cobalt, watchlist hits are red, verified contracts are amber, and ordinary addresses remain neutral.
- Labels remain address-derived. Do not invent entity names, transaction amounts, timestamps, or attribution.
- Explorer links and hover labels remain functional.

### Evidence record

- Evidence is open by default in the investigation rail.
- IDs are stable anchors (`E1`, `E2`, …), visually separate from labels and detail.
- Long addresses and transaction hashes may wrap; nothing is silently clipped.

### Analyst brief

- The brief is visibly marked as generated interpretation.
- Evidence citations remain in the text.
- Loading, missing, and generated states are textually explicit.

### Trace ledger

- The table is open and inspectable rather than hidden in cards.
- Horizontal scrolling is acceptable on small screens; the page itself must never overflow.

### Correspondence

- User-reported loss and complaint data remain visually distinct from traced facts.
- Sample mode repeats its warning inside the drafting workspace.
- Copying is an explicit user action.

## Responsive behavior

- Desktop (`>= 1040px`): 12-column work surface with a roughly 2:1 primary/rail split.
- Tablet: the rail moves below the graph while retaining a two-column evidence/brief arrangement when space allows.
- Mobile (`<= 680px`): all fields and actions stack; case metadata scrolls horizontally; graph, evidence, brief, ledger, correspondence, and scope follow in that order.
- No critical action depends on hover.

## Avoid

- navy-and-neon “AI tool” styling;
- gradients, glassmorphism, glowing controls, and decorative motion;
- pill-shaped cards everywhere;
- invented case management, export, autosave, or attribution capabilities;
- claims that an exchange, custodian, mixer, or owner has been identified unless the underlying trace data supports that exact claim.

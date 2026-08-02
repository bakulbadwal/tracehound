#!/usr/bin/env node
//
// TraceHound as an MCP server (v0, read-only).
//
// Why this exists: the trace, watchlist lookup, and evidence builders are already clean, typed,
// server-side functions. Exposing them over MCP lets any MCP client — Claude Desktop, Claude
// Code, another agent — run a trace and receive *evidence records* instead of prose.
//
// That distinction is the whole point. TraceHound's eval layer enforces that every material
// claim cites a stable evidence ID. If the agent-facing interface returned a paragraph, an
// agent consuming it would have nothing to cite and the citation discipline would be lost at
// exactly the boundary where it matters most. So every trace response carries the same
// EvidenceRecord[] the UI and the letter drafter use, with the same E1/E2/E3 IDs.
//
// Deliberately NOT exposed:
//   - Letter drafting. Producing a legal demand letter is not something an agent should be able
//     to trigger unattended; it stays behind the UI where a human reads it before it exists.
//   - Any write path. Every tool here is read-only.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { traceOutward, TraceGraph } from "../lib/trace";
import { checkAddress } from "../lib/watchlist";
import { buildTraceEvidence, EvidenceRecord } from "../lib/evidence";
import {
  validateTraceInput,
  supportedChainKeys,
  isValidAddress,
  missingEtherscanKeyError,
  MIN_DEPTH,
  MAX_DEPTH,
  DEFAULT_DEPTH,
} from "../lib/validate";

// Every trace response repeats these. An agent that only ever sees this interface — never the
// README — must still be told what the output does not establish, or it will overstate the
// findings downstream. This mirrors the "What this is not" section of the README verbatim in
// substance; keep the two in sync.
const LIMITATIONS = [
  "Follows OUTGOING transfers only (where funds went), not incoming provenance.",
  "Watchlist matching is exact-address only against data/watchlist.json. A miss is not evidence an address is clean.",
  "No mixer or exchange attribution. A verified contract name does NOT establish wallet ownership.",
  "No cross-chain bridge or mixer demixing; a trace stops where funds enter one.",
  "Not court-admissible: no chain-of-custody guarantee and no cryptographic integrity proof.",
] as const;

// get_evidence needs somewhere to look up a prior trace. Persistent case storage is still
// future scope (see README roadmap), so this is an in-memory store scoped to the life of the
// server process — bounded so a long-running session cannot grow without limit.
const MAX_STORED_TRACES = 20;

type StoredTrace = {
  id: string;
  address: string;
  chainKey: string;
  depth: number;
  graph: TraceGraph;
  evidence: EvidenceRecord[];
};

const traceStore = new Map<string, StoredTrace>();
let traceCounter = 0;

function storeTrace(trace: Omit<StoredTrace, "id">): StoredTrace {
  traceCounter += 1;
  const id = `trace-${traceCounter}`;
  const stored: StoredTrace = { id, ...trace };
  traceStore.set(id, stored);

  // Map preserves insertion order, so the first key is always the oldest.
  while (traceStore.size > MAX_STORED_TRACES) {
    const oldest = traceStore.keys().next().value;
    if (oldest === undefined) break;
    traceStore.delete(oldest);
  }
  return stored;
}

function ok(payload: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }] };
}

function fail(message: string) {
  return {
    isError: true,
    content: [{ type: "text" as const, text: JSON.stringify({ error: message }, null, 2) }],
  };
}

const server = new McpServer({ name: "tracehound", version: "0.1.0" });

server.registerTool(
  "trace_address",
  {
    title: "Trace an address",
    description:
      "Walk outgoing transfers from a compromised address up to N hops and return the trace " +
      "graph plus structured evidence records with stable IDs (E1, E2, ...). Cite those IDs " +
      "for any material claim you make about the trace. Read-only; performs no writes and " +
      "sends nothing to anyone.",
    inputSchema: {
      address: z.string().describe("The seed address to trace from (0x + 40 hex characters)."),
      chain: z
        .enum(supportedChainKeys() as [string, ...string[]])
        .optional()
        .describe("Chain to trace on. Defaults to ethereum."),
      depth: z
        .number()
        .int()
        .optional()
        .describe(
          `Hops to follow, ${MIN_DEPTH}-${MAX_DEPTH}. Defaults to ${DEFAULT_DEPTH}. Values outside the range are clamped, not rejected.`
        ),
    },
  },
  async ({ address, chain, depth }) => {
    const keyError = missingEtherscanKeyError();
    if (keyError) return fail(keyError);

    const validated = validateTraceInput({ address, chain, depth });
    if (!validated.ok) return fail(validated.error);

    const input = validated.value;
    try {
      const graph = await traceOutward(input.address, input.chain.id, input.depth);
      const evidence = buildTraceEvidence(graph);
      const stored = storeTrace({
        address: input.address,
        chainKey: input.chainKey,
        depth: input.depth,
        graph,
        evidence,
      });

      return ok({
        traceId: stored.id,
        seed: graph.seed,
        chain: input.chain.name,
        // Report the depth actually used, since out-of-range requests are clamped silently.
        depthRequested: depth ?? DEFAULT_DEPTH,
        depthUsed: input.depth,
        addressesTouched: graph.nodes.length,
        transfersFollowed: graph.edges.length,
        watchlistHits: graph.nodes.filter((n) => n.watchlistHit).length,
        truncated: graph.truncated,
        evidence,
        limitations: LIMITATIONS,
      });
    } catch (err) {
      return fail(err instanceof Error ? err.message : "Trace failed");
    }
  }
);

server.registerTool(
  "check_watchlist",
  {
    title: "Check an address against the watchlist",
    description:
      "Exact-address lookup against data/watchlist.json. A hit is a real match against the " +
      "configured source (e.g. the OFAC SDN list). A miss means only that the address is not " +
      "in the local list — it is NOT evidence the address is clean, and must never be " +
      "reported as one.",
    inputSchema: {
      address: z.string().describe("Address to check (0x + 40 hex characters)."),
    },
  },
  async ({ address }) => {
    if (!isValidAddress(address)) {
      return fail("Provide a valid 0x... address (40 hex characters).");
    }
    const hit = checkAddress(address);
    return ok({
      address,
      match: hit,
      matched: hit !== null,
      caveat:
        "Absence from the watchlist is not evidence of legitimacy. The list contains only what " +
        "has been loaded into data/watchlist.json.",
    });
  }
);

server.registerTool(
  "get_evidence",
  {
    title: "Get evidence records for a prior trace",
    description:
      "Return the evidence records for a trace produced earlier in this session, by traceId. " +
      "Use this to re-read the citable records (E1, E2, ...) without re-running the trace. " +
      "Storage is in-memory and scoped to this server process — traces do not survive a restart.",
    inputSchema: {
      traceId: z.string().describe("The traceId returned by trace_address, e.g. \"trace-1\"."),
    },
  },
  async ({ traceId }) => {
    const stored = traceStore.get(traceId);
    if (!stored) {
      const known = Array.from(traceStore.keys());
      return fail(
        known.length > 0
          ? `Unknown traceId "${traceId}". Known traces this session: ${known.join(", ")}`
          : `Unknown traceId "${traceId}". No traces have been run in this session yet.`
      );
    }
    return ok({
      traceId: stored.id,
      seed: stored.graph.seed,
      chain: stored.chainKey,
      depthUsed: stored.depth,
      evidence: stored.evidence,
      limitations: LIMITATIONS,
    });
  }
);

// Every tool registered above is read-only. This is the declared intent; registeredToolNames()
// below reports what the server actually exposes, and tests/mcp.test.mjs fails if they diverge.
export const READ_ONLY_TOOL_NAMES = ["trace_address", "check_watchlist", "get_evidence"] as const;

// Reads the live registry rather than this file's source. That distinction matters: a tool
// registered from an imported helper (registerLetterTools(server), say) never appears as a
// registerTool call in this file, so any source-level check would stay green while the server
// exposed a write path at runtime. The SDK has no public accessor for the tool set, so this
// reaches into its internal registry — and throws rather than returning empty if that shape ever
// changes, because a guard that silently degrades to "no tools found" would pass vacuously and
// be worse than no guard at all.
export function registeredToolNames(): string[] {
  const registry = (server as unknown as { _registeredTools?: Record<string, unknown> })
    ._registeredTools;
  if (!registry || typeof registry !== "object") {
    throw new Error(
      "Cannot read the MCP tool registry — the SDK's internal shape changed. Update " +
        "registeredToolNames() so the read-only guard in tests/mcp.test.mjs keeps working."
    );
  }
  return Object.keys(registry).sort();
}

export { server };

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdout is the MCP transport — anything written there that is not a protocol message
  // corrupts the stream. All human-facing output must go to stderr.
  console.error("TraceHound MCP server running on stdio");
}

// Only start the transport when executed directly, so importing this module (in tests, or to
// mount the server elsewhere) does not try to take over stdio.
if (require.main === module) {
  main().catch((err) => {
    console.error("TraceHound MCP server failed to start:", err);
    process.exit(1);
  });
}

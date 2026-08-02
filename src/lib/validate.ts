// Shared input validation for every entry point that can start a trace.
//
// There are now two: the HTTP route (src/app/api/trace/route.ts) and the MCP server
// (src/mcp/server.ts). Keeping the rules here means the two cannot drift on what counts as a
// valid address, a supported chain, or an acceptable hop depth — a drift that would be easy to
// miss and would show up as the agent-facing interface accepting traces the UI rejects.
import { CHAINS, Chain } from "./etherscan";

export const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export const MIN_DEPTH = 1;
export const MAX_DEPTH = 5;
export const DEFAULT_DEPTH = 3;
export const DEFAULT_CHAIN = "ethereum";

export type TraceInput = {
  address: string;
  chainKey: string;
  chain: Chain;
  depth: number;
};

export type ValidationResult =
  | { ok: true; value: TraceInput }
  | { ok: false; error: string };

export function supportedChainKeys(): string[] {
  return Object.keys(CHAINS);
}

export function isValidAddress(value: unknown): value is string {
  return typeof value === "string" && ADDRESS_RE.test(value);
}

// Depth is clamped rather than rejected: an agent asking for 50 hops wants "as deep as you go",
// and failing the call outright is less useful than returning the deepest trace we allow. The
// response reports the depth actually used so the caller is never misled about what it got.
export function clampDepth(raw: unknown): number {
  // null and "" must be treated as "not supplied", not as 0 — Number(null) is 0, which would
  // silently clamp an omitted depth to MIN_DEPTH instead of the default.
  if (raw === null || raw === undefined || raw === "") return DEFAULT_DEPTH;
  const n = Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_DEPTH;
  return Math.min(Math.max(Math.trunc(n), MIN_DEPTH), MAX_DEPTH);
}

export function validateTraceInput(raw: {
  address?: unknown;
  chain?: unknown;
  depth?: unknown;
}): ValidationResult {
  if (!isValidAddress(raw.address)) {
    return { ok: false, error: "Provide a valid 0x... address (40 hex characters)." };
  }

  const chainKey = typeof raw.chain === "string" && raw.chain.length > 0 ? raw.chain : DEFAULT_CHAIN;
  const chain = CHAINS[chainKey];
  if (!chain) {
    return {
      ok: false,
      error: `Unsupported chain "${chainKey}". Supported: ${supportedChainKeys().join(", ")}`,
    };
  }

  return {
    ok: true,
    value: { address: raw.address, chainKey, chain, depth: clampDepth(raw.depth) },
  };
}

// Both entry points need the same "is the upstream data source actually configured" check.
export function missingEtherscanKeyError(): string | null {
  if (process.env.ETHERSCAN_API_KEY) return null;
  return "ETHERSCAN_API_KEY is not set. Get a free key at https://etherscan.io/apis and add it to .env.local";
}

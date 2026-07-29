import { TraceGraph } from "./trace";
import { Chain } from "./etherscan";
import { buildTraceEvidence } from "./evidence";

// Fabricated data for demoing the UI without live API keys. Addresses are placeholder
// patterns (repeating hex digits), not real wallets — this must never be presented
// as, or mistaken for, an actual trace result.
export const SAMPLE_SEED = "0x1111111111111111111111111111111111111a";

export const sampleChain: Chain = {
  id: 1,
  name: "Ethereum",
  nativeSymbol: "ETH",
  explorerBase: "https://etherscan.io",
};

export const sampleGraph: TraceGraph = {
  seed: SAMPLE_SEED,
  chainId: 1,
  truncated: false,
  nodes: [
    { address: "0x1111111111111111111111111111111111111a", depth: 0, watchlistHit: null, contractName: null },
    { address: "0x2222222222222222222222222222222222222b", depth: 1, watchlistHit: null, contractName: null },
    {
      address: "0x3333333333333333333333333333333333333c",
      depth: 1,
      watchlistHit: null,
      contractName: "SAMPLE_Router (illustrative)",
    },
    {
      address: "0x4444444444444444444444444444444444444d",
      depth: 2,
      watchlistHit: { address: "0x4444444444444444444444444444444444444d", label: "SAMPLE: flagged mixer", category: "mixer", source: "demo" },
      contractName: null,
    },
    { address: "0x5555555555555555555555555555555555555e", depth: 2, watchlistHit: null, contractName: null },
  ],
  edges: [
    { hash: "0xaaa1", from: "0x1111111111111111111111111111111111111a", to: "0x2222222222222222222222222222222222222b", value: "5000000000000000000", valueUnit: "native", timestamp: "0", depth: 0 },
    { hash: "0xaaa2", from: "0x1111111111111111111111111111111111111a", to: "0x3333333333333333333333333333333333333c", value: "12000000", valueUnit: "token", tokenSymbol: "USDC", timestamp: "0", depth: 0 },
    { hash: "0xaaa3", from: "0x2222222222222222222222222222222222222b", to: "0x4444444444444444444444444444444444444d", value: "5000000000000000000", valueUnit: "native", timestamp: "0", depth: 1 },
    { hash: "0xaaa4", from: "0x3333333333333333333333333333333333333c", to: "0x5555555555555555555555555555555555555e", value: "12000000", valueUnit: "token", tokenSymbol: "USDC", timestamp: "0", depth: 1 },
  ],
};

export const sampleEvidence = buildTraceEvidence(sampleGraph);

export const sampleNarrative = `SAMPLE REPORT — fabricated data for UI demonstration only, not a real trace. [E1]

Starting from the seed address, funds split across two paths within the first hop: roughly
5 ETH moved to one address, while 12,000 USDC moved to a second. [E2][E3] One second-hop address
matches a SAMPLE watchlist entry (labeled "flagged mixer" for demo purposes only — this is
not a real classification). [E6] No other addresses in this walk matched anything on the
watchlist. [E1] The trace also encountered the verified contract name SAMPLE_Router
(illustrative); that name does not establish ownership. [E7] This narrative is illustrative;
run a real trace with your own API keys to see actual output.`;

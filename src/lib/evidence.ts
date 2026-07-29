import { TraceGraph } from "./trace";

export type EvidenceKind =
  | "trace-summary"
  | "transfer"
  | "watchlist-hit"
  | "verified-contract"
  | "user-input";

export type EvidenceRecord = {
  id: string;
  kind: EvidenceKind;
  label: string;
  detail: string;
  data: Record<string, string | number | boolean | null>;
};

function nextId(records: EvidenceRecord[]) {
  return `E${records.length + 1}`;
}

export function buildTraceEvidence(graph: TraceGraph): EvidenceRecord[] {
  const records: EvidenceRecord[] = [];
  const flaggedNodes = graph.nodes.filter((node) => node.watchlistHit);
  const maxDepth = Math.max(0, ...graph.nodes.map((node) => node.depth));

  records.push({
    id: nextId(records),
    kind: "trace-summary",
    label: "Trace summary",
    detail: `${graph.nodes.length} addresses and ${graph.edges.length} transfers followed from ${graph.seed}; ${flaggedNodes.length} watchlist hit(s); trace ${graph.truncated ? "was" : "was not"} truncated.`,
    data: {
      seedAddress: graph.seed,
      chainId: graph.chainId,
      hopsFollowed: maxDepth,
      addressesTouched: graph.nodes.length,
      transfersFollowed: graph.edges.length,
      watchlistHitCount: flaggedNodes.length,
      truncated: graph.truncated,
    },
  });

  graph.edges.slice(0, 100).forEach((edge) => {
    const unit = edge.valueUnit === "token" ? edge.tokenSymbol || "token units" : "native units";
    records.push({
      id: nextId(records),
      kind: "transfer",
      label: `Transfer at hop ${edge.depth + 1}`,
      detail: `${edge.from} sent ${edge.value} ${unit} to ${edge.to} in transaction ${edge.hash}.`,
      data: {
        from: edge.from,
        to: edge.to,
        hash: edge.hash,
        value: edge.value,
        valueUnit: edge.valueUnit,
        tokenSymbol: edge.tokenSymbol || null,
        depth: edge.depth,
      },
    });
  });

  flaggedNodes.forEach((node) => {
    const hit = node.watchlistHit!;
    records.push({
      id: nextId(records),
      kind: "watchlist-hit",
      label: `Watchlist match: ${hit.label}`,
      detail: `${node.address} matched ${hit.label} (${hit.category}) in ${hit.source}.`,
      data: {
        address: node.address,
        depth: node.depth,
        label: hit.label,
        category: hit.category,
        source: hit.source,
      },
    });
  });

  graph.nodes
    .filter((node) => node.contractName)
    .forEach((node) => {
      records.push({
        id: nextId(records),
        kind: "verified-contract",
        label: `Verified contract: ${node.contractName}`,
        detail: `${node.address} has the verified contract name ${node.contractName}; this does not establish wallet ownership.`,
        data: {
          address: node.address,
          depth: node.depth,
          contractName: node.contractName,
        },
      });
    });

  return records;
}

export function buildLetterEvidence(
  graph: TraceGraph,
  lossAmount: string,
  lossCurrency: string,
  ic3Number?: string
): EvidenceRecord[] {
  const records = buildTraceEvidence(graph);
  records.push({
    id: nextId(records),
    kind: "user-input",
    label: "Reported loss",
    detail: `The user reported a loss of ${lossAmount} ${lossCurrency}.`,
    data: { lossAmount, lossCurrency },
  });

  if (ic3Number) {
    records.push({
      id: nextId(records),
      kind: "user-input",
      label: "IC3 complaint number",
      detail: `The user supplied IC3 complaint number ${ic3Number}.`,
      data: { ic3Number },
    });
  }

  return records;
}

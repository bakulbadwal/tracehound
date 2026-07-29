"use client";

import { useMemo, useState } from "react";
import { TraceGraph } from "@/lib/trace";
import { Chain } from "@/lib/etherscan";

const RING_SPACING = 78;
const CENTER_RADIUS = 0;
const NODE_R = 9;
const SEED_NODE_R = 13;

type Point = { x: number; y: number };

function shorten(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function TraceGraphView({ graph, chain }: { graph: TraceGraph; chain: Chain }) {
  const [hovered, setHovered] = useState<string | null>(null);

  const { positions, maxRadius } = useMemo(() => {
    const byDepth = new Map<number, typeof graph.nodes>();
    for (const node of graph.nodes) {
      const list = byDepth.get(node.depth) ?? [];
      list.push(node);
      byDepth.set(node.depth, list);
    }

    const positions = new Map<string, Point>();
    let maxRadius = SEED_NODE_R;

    for (const [depth, nodesAtDepth] of byDepth.entries()) {
      const radius = depth === 0 ? CENTER_RADIUS : 40 + depth * RING_SPACING;
      maxRadius = Math.max(maxRadius, radius + NODE_R);
      const angleOffset = depth * 0.35; // stagger rings so spokes don't stack radially

      nodesAtDepth.forEach((node, i) => {
        if (depth === 0) {
          positions.set(node.address.toLowerCase(), { x: 0, y: 0 });
          return;
        }
        const angle = angleOffset + (i / nodesAtDepth.length) * Math.PI * 2;
        positions.set(node.address.toLowerCase(), {
          x: radius * Math.cos(angle),
          y: radius * Math.sin(angle),
        });
      });
    }

    return { positions, maxRadius };
  }, [graph.nodes]);

  const edgePairs = useMemo(() => {
    const seen = new Map<string, { from: string; to: string; count: number; flagged: boolean }>();
    for (const edge of graph.edges) {
      const key = `${edge.from.toLowerCase()}|${edge.to.toLowerCase()}`;
      const existing = seen.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        const toNode = graph.nodes.find((n) => n.address.toLowerCase() === edge.to.toLowerCase());
        seen.set(key, {
          from: edge.from,
          to: edge.to,
          count: 1,
          flagged: !!(toNode?.watchlistHit && toNode.watchlistHit.category !== "burn"),
        });
      }
    }
    return Array.from(seen.values());
  }, [graph.edges, graph.nodes]);

  const pad = 24;
  const size = (maxRadius + pad) * 2;
  const viewBox = `${-(maxRadius + pad)} ${-(maxRadius + pad)} ${size} ${size}`;

  return (
    <section className="panel graph-panel">
      <div className="graph-header">
        <div>
          <div className="section-kicker section-kicker-inverse">Transaction graph</div>
          <h2>Outgoing flow by hop</h2>
        </div>
        <div className="graph-depth">Depth {Math.max(0, ...graph.nodes.map((n) => n.depth))}</div>
      </div>
      <div className="graph-wrap">
        <svg viewBox={viewBox} className="graph-svg" role="img" aria-label="On-chain trace graph">
          <g>
            {edgePairs.map((e, i) => {
              const from = positions.get(e.from.toLowerCase());
              const to = positions.get(e.to.toLowerCase());
              if (!from || !to) return null;
              return (
                <line
                  key={i}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  className={e.flagged ? "graph-edge graph-edge-flagged" : "graph-edge"}
                />
              );
            })}
          </g>
          <g>
            {graph.nodes.map((node) => {
              const p = positions.get(node.address.toLowerCase());
              if (!p) return null;
              const isSeed = node.depth === 0;
              const isFlagged = !!(node.watchlistHit && node.watchlistHit.category !== "burn");
              const isContract = !!node.contractName;
              const key = node.address.toLowerCase();
              const nodeClass = isSeed
                ? "graph-node graph-node-seed"
                : isFlagged
                ? "graph-node graph-node-flagged"
                : isContract
                ? "graph-node graph-node-contract"
                : "graph-node";
              return (
                <a
                  key={key}
                  href={`${chain.explorerBase}/address/${node.address}`}
                  target="_blank"
                  rel="noreferrer"
                  onMouseEnter={() => setHovered(key)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <circle cx={p.x} cy={p.y} r={isSeed ? SEED_NODE_R : NODE_R} className={nodeClass} />
                  {(isSeed || isFlagged || isContract || hovered === key) && (
                    <text x={p.x} y={p.y - (isSeed ? SEED_NODE_R : NODE_R) - 6} className="graph-label" textAnchor="middle">
                      {shorten(node.address)}
                      {node.contractName ? ` (${node.contractName})` : ""}
                    </text>
                  )}
                </a>
              );
            })}
          </g>
        </svg>
      </div>
      <div className="graph-legend">
        <span><span className="legend-dot legend-seed" />Seed</span>
        <span><span className="legend-dot legend-flagged" />Watchlist hit</span>
        <span><span className="legend-dot legend-contract" />Verified contract</span>
        <span><span className="legend-dot legend-normal" />Address</span>
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";
import { TraceGraph } from "@/lib/trace";
import { Chain } from "@/lib/etherscan";
import { TraceResults } from "@/components/TraceResults";
import { TraceGraphView } from "@/components/TraceGraphView";
import { NarrativeReport } from "@/components/NarrativeReport";
import { SiteHeader } from "@/components/SiteHeader";
import { LetterDrafter } from "@/components/LetterDrafter";
import { sampleGraph, sampleChain, sampleNarrative, sampleEvidence } from "@/lib/sampleTrace";
import { EvidenceRecord } from "@/lib/evidence";

function shorten(address: string) {
  return `${address.slice(0, 8)}…${address.slice(-6)}`;
}

export default function Home() {
  const [address, setAddress] = useState("");
  const [chainKey, setChainKey] = useState("ethereum");
  const [depth, setDepth] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [graph, setGraph] = useState<TraceGraph | null>(null);
  const [chain, setChain] = useState<Chain | null>(null);
  const [narrative, setNarrative] = useState<string | null>(null);
  const [narrativeEvidence, setNarrativeEvidence] = useState<EvidenceRecord[]>([]);
  const [narrating, setNarrating] = useState(false);
  const [isSample, setIsSample] = useState(false);

  async function runTrace(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setGraph(null);
    setNarrative(null);
    setNarrativeEvidence([]);
    setIsSample(false);

    try {
      const res = await fetch("/api/trace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, chain: chainKey, depth }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Trace failed");
      setGraph(data.graph);
      setChain(data.chain);

      setNarrating(true);
      const narRes = await fetch("/api/narrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ graph: data.graph }),
      });
      const narData = await narRes.json();
      if (narRes.ok) {
        setNarrative(narData.narrative);
        setNarrativeEvidence(narData.evidence || []);
      }
      setNarrating(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function loadSample() {
    setError(null);
    setGraph(sampleGraph);
    setChain(sampleChain);
    setNarrative(sampleNarrative);
    setNarrativeEvidence(sampleEvidence);
    setIsSample(true);
  }

  return (
    <>
      <SiteHeader />
      <div className="wrap">
        <section className="hero" aria-labelledby="page-title">
          <div className="section-kicker">New investigation</div>
          <h1 id="page-title">Trace blockchain flows. Preserve the record.</h1>
          <p className="subtitle">
            Follow outgoing transfers from a seed address, surface watchlist matches, and
            assemble an evidence-linked brief for further investigation.
          </p>
        </section>

        <form onSubmit={runTrace} className="panel intake-panel">
          <div className="panel-heading-row">
            <div>
              <div className="section-kicker">Trace intake</div>
              <h2>Open a blockchain trace</h2>
            </div>
            <div className="record-label">Public-chain record</div>
          </div>
          <div className="form-grid">
            <div className="field field-address">
              <label className="field-label" htmlFor="seed-address">Seed address</label>
              <input
                id="seed-address"
                type="text"
                placeholder="0x..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="chain">Chain</label>
              <select id="chain" value={chainKey} onChange={(e) => setChainKey(e.target.value)}>
                <option value="ethereum">Ethereum</option>
                <option value="bsc">BNB Chain</option>
                <option value="polygon">Polygon</option>
                <option value="arbitrum">Arbitrum</option>
              </select>
            </div>
            <div className="field">
              <label className="field-label" htmlFor="depth">Max depth</label>
              <select id="depth" value={depth} onChange={(e) => setDepth(Number(e.target.value))}>
                <option value={1}>1 hop</option>
                <option value={2}>2 hops</option>
                <option value={3}>3 hops</option>
                <option value={4}>4 hops</option>
                <option value={5}>5 hops</option>
              </select>
            </div>
          </div>
          <div className="actions-row">
            <button type="submit" className="primary" disabled={loading}>
              {loading ? "Tracing…" : "Trace address"}
            </button>
            <button type="button" className="ghost" onClick={loadSample} disabled={loading}>
              Load sample case
            </button>
          </div>
          {error && <div className="error">{error}</div>}
        </form>

        {isSample && (
          <div className="sample-banner" role="status">
            <strong>Sample data</strong>
            <span>Fabricated for demonstration only. This is not a real trace.</span>
          </div>
        )}

        {graph && chain && (
          <>
            <section className="case-strip" aria-label="Active trace record">
              <div className="case-strip-primary">
                <span className="case-status"><span className="status-dot" />Active trace</span>
                <span className="case-seed" title={graph.seed}>{shorten(graph.seed)}</span>
              </div>
              <div className="case-field">
                <span>Chain</span>
                <strong>{chain.name}</strong>
              </div>
              <div className="case-field">
                <span>Depth</span>
                <strong>{Math.max(0, ...graph.nodes.map((node) => node.depth))} hops</strong>
              </div>
              <div className="case-field">
                <span>Evidence</span>
                <strong>{narrativeEvidence.length || "Pending"}</strong>
              </div>
              <div className="case-field">
                <span>Fan-out</span>
                <strong className={graph.truncated ? "state-caution" : "state-clear"}>
                  {graph.truncated ? "Truncated" : "Complete"}
                </strong>
              </div>
            </section>

            <section className="investigation-shell" aria-label="Investigation workspace">
              <div className="investigation-graph">
                <TraceGraphView graph={graph} chain={chain} />
              </div>
              <aside className="investigation-rail">
                {(narrative || narrating) && (
                  <NarrativeReport narrative={narrative} evidence={narrativeEvidence} loading={narrating} />
                )}
              </aside>
              <div className="investigation-ledger">
                <TraceResults graph={graph} chain={chain} />
              </div>
            </section>
          </>
        )}
        {graph && <LetterDrafter graph={graph} isSample={isSample} />}

        <footer className="scope-footer">
          <div className="section-kicker">Scope record</div>
          <strong>Investigative aid, not an authoritative forensic report.</strong>
          <p>
            TraceHound follows live public on-chain transfers, narrates them with an LLM agent,
            and can draft a demand letter from trace facts. It does not have a proprietary
            attribution database, cannot demix cross-chain or mixer flows, and cannot freeze
            funds. Treat output as a fast first look and drafting aid, not verified attribution
            or legal advice. Full scope is documented in the repository README.
          </p>
        </footer>
      </div>
    </>
  );
}

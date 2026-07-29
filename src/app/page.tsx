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
        <div className="hero">
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            LIVE ON-CHAIN DATA
          </div>
          <h1>Trace where exploited funds moved</h1>
          <p className="subtitle">
            Give TraceHound a seed address and it walks live outgoing transfers hop by hop,
            flags anything on your watchlist, and has an agent narrate the trace in plain
            English. Built as a scoped, honest MVP — see the scope note below before treating
            any output as authoritative.
          </p>
        </div>

        <form onSubmit={runTrace} className="panel">
          <div className="panel-label">New trace</div>
          <div className="form-grid">
            <div className="field field-address">
              <label className="field-label">Seed address</label>
              <input
                type="text"
                placeholder="0x..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label className="field-label">Chain</label>
              <select value={chainKey} onChange={(e) => setChainKey(e.target.value)}>
                <option value="ethereum">Ethereum</option>
                <option value="bsc">BNB Chain</option>
                <option value="polygon">Polygon</option>
                <option value="arbitrum">Arbitrum</option>
              </select>
            </div>
            <div className="field">
              <label className="field-label">Depth</label>
              <select value={depth} onChange={(e) => setDepth(Number(e.target.value))}>
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
              {loading ? "Tracing…" : "Run trace"}
            </button>
            <button type="button" className="ghost" onClick={loadSample} disabled={loading}>
              View sample report
            </button>
          </div>
          {error && <div className="error">{error}</div>}
        </form>

        {isSample && (
          <div className="sample-banner">SAMPLE DATA — fabricated for demonstration, not a real trace</div>
        )}

        {graph && chain && <TraceGraphView graph={graph} chain={chain} />}
        {graph && chain && <TraceResults graph={graph} chain={chain} />}
        {(narrative || narrating) && (
          <NarrativeReport narrative={narrative} evidence={narrativeEvidence} loading={narrating} />
        )}
        {graph && <LetterDrafter graph={graph} isSample={isSample} />}

        <div className="scope-footer">
          <strong>Scope note:</strong> TraceHound follows live public on-chain transfers, narrates
          them with an LLM agent, and can draft a demand letter from the trace facts — it does not
          have a proprietary attribution database, cannot demix cross-chain/mixer flows, and
          cannot itself freeze funds (only an exchange&apos;s compliance team can do that, and
          usually only with law enforcement involved). Treat output as a fast first look and a
          drafting aid, not a verified forensic report or legal advice. Full scope is documented
          in the repo README.
        </div>
      </div>
    </>
  );
}

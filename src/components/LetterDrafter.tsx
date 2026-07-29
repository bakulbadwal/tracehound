"use client";

import { useState } from "react";
import { TraceGraph } from "@/lib/trace";
import { EvidenceRecord } from "@/lib/evidence";
import { EvidenceAppendix } from "@/components/EvidenceAppendix";

export function LetterDrafter({ graph, isSample }: { graph: TraceGraph; isSample: boolean }) {
  const [lossAmount, setLossAmount] = useState("");
  const [lossCurrency, setLossCurrency] = useState("USD");
  const [ic3Number, setIc3Number] = useState("");
  const [letter, setLetter] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<EvidenceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function draft(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setLetter(null);
    setEvidence([]);
    try {
      const res = await fetch("/api/draft-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ graph, lossAmount, lossCurrency, ic3Number }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Letter drafting failed");
      setLetter(data.letter);
      setEvidence(data.evidence || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function copy() {
    if (!letter) return;
    navigator.clipboard.writeText(letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section className="panel letter-panel">
      <div className="panel-heading-row">
        <div>
          <div className="section-kicker">Draft correspondence</div>
          <h2>Demand or freeze-request letter</h2>
        </div>
        <div className="record-label">Evidence-linked draft</div>
      </div>
      <p className="panel-intro">
        Add user-reported loss information, then generate a working draft grounded in the trace record.
      </p>
      {isSample && (
        <div className="sample-banner sample-banner-compact">
          <strong>Sample trace loaded</strong>
          <span>The letter will use fabricated demonstration data.</span>
        </div>
      )}
      <form onSubmit={draft} className="form-grid">
        <div className="field">
          <label className="field-label" htmlFor="loss-amount">Reported loss amount</label>
          <input
            id="loss-amount"
            type="text"
            placeholder="e.g. 12500"
            value={lossAmount}
            onChange={(e) => setLossAmount(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="loss-currency">Currency</label>
          <select id="loss-currency" value={lossCurrency} onChange={(e) => setLossCurrency(e.target.value)}>
            <option value="USD">USD</option>
            <option value="ETH">ETH</option>
            <option value="USDC">USDC</option>
            <option value="USDT">USDT</option>
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="ic3-number">IC3 complaint # (optional)</label>
          <input
            id="ic3-number"
            type="text"
            placeholder="I-2026..."
            value={ic3Number}
            onChange={(e) => setIc3Number(e.target.value)}
          />
        </div>
      </form>
      <div className="actions-row">
        <button type="button" className="primary" onClick={draft} disabled={loading || !lossAmount}>
          {loading ? "Drafting…" : "Draft letter"}
        </button>
        {letter && (
          <button type="button" className="ghost" onClick={copy}>
            {copied ? "Copied" : "Copy to clipboard"}
          </button>
        )}
      </div>
      {error && <div className="error">{error}</div>}
      {letter && (
        <div className="draft-output">
          <div className="section-kicker">Generated draft</div>
          <div className="narrative letter-copy">
            {letter}
          </div>
          <EvidenceAppendix evidence={evidence} />
        </div>
      )}
    </section>
  );
}

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
    <div className="panel">
      <div className="panel-label">Draft demand / freeze-request letter</div>
      {isSample && (
        <div className="sample-banner" style={{ marginBottom: 14 }}>
          SAMPLE TRACE LOADED — letter will draft from fabricated demo data
        </div>
      )}
      <form onSubmit={draft} className="form-grid">
        <div className="field">
          <label className="field-label">Loss amount</label>
          <input
            type="text"
            placeholder="e.g. 12500"
            value={lossAmount}
            onChange={(e) => setLossAmount(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label className="field-label">Currency</label>
          <select value={lossCurrency} onChange={(e) => setLossCurrency(e.target.value)}>
            <option value="USD">USD</option>
            <option value="ETH">ETH</option>
            <option value="USDC">USDC</option>
            <option value="USDT">USDT</option>
          </select>
        </div>
        <div className="field">
          <label className="field-label">IC3 complaint # (optional)</label>
          <input
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
        <>
          <div className="narrative" style={{ marginTop: 16, whiteSpace: "pre-wrap" }}>
            {letter}
          </div>
          <EvidenceAppendix evidence={evidence} />
        </>
      )}
    </div>
  );
}

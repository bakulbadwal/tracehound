"use client";

import { EvidenceAppendix } from "@/components/EvidenceAppendix";
import { EvidenceRecord } from "@/lib/evidence";

export function NarrativeReport({
  narrative,
  evidence,
  loading,
}: {
  narrative: string | null;
  evidence: EvidenceRecord[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="rail-stack">
        <section className="panel report-card">
          <div className="section-kicker">Analyst brief</div>
          <div className="meta"><span className="spinner" />Agent is narrating the trace…</div>
        </section>
      </div>
    );
  }
  if (!narrative) return null;

  return (
    <div className="rail-stack">
      <section className="panel evidence-card">
        <EvidenceAppendix evidence={evidence} open />
      </section>
      <section className="panel report-card">
        <div className="report-header">
          <div>
            <div className="section-kicker">Analyst brief</div>
            <div className="report-title">Trace interpretation</div>
          </div>
          <div className="report-timestamp"><span className="generated-dot" />AI-generated</div>
        </div>
        <div className="narrative">{narrative}</div>
      </section>
    </div>
  );
}

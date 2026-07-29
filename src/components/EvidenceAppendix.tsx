import { EvidenceRecord } from "@/lib/evidence";

export function EvidenceAppendix({ evidence }: { evidence: EvidenceRecord[] }) {
  if (!evidence.length) return null;

  return (
    <details className="evidence-appendix">
      <summary>Evidence used ({evidence.length} records)</summary>
      <div className="evidence-list">
        {evidence.map((record) => (
          <div className="evidence-record" key={record.id}>
            <span className="evidence-id">[{record.id}]</span>
            <div>
              <div className="evidence-label">{record.label}</div>
              <div className="evidence-detail">{record.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}

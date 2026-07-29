import { EvidenceRecord } from "@/lib/evidence";

export function EvidenceAppendix({
  evidence,
  open = false,
}: {
  evidence: EvidenceRecord[];
  open?: boolean;
}) {
  if (!evidence.length) return null;

  return (
    <details className="evidence-appendix" open={open}>
      <summary>
        <span>Evidence record</span>
        <span className="evidence-count">{evidence.length} records</span>
      </summary>
      <div className="evidence-list">
        {evidence.map((record) => (
          <div className="evidence-record" key={record.id}>
            <span className={`evidence-id evidence-kind-${record.kind}`}>{record.id}</span>
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

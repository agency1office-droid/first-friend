export function AnimalPublicStatusBanner({
  phase,
  statusLabel,
  detailTitle,
  description,
  noticeDaysRemaining,
}: {
  phase: string;
  statusLabel: string;
  detailTitle?: string;
  description?: string;
  noticeDaysRemaining: number | null;
}) {
  return <div className={`ff-detail-gallery-status ff-public-status-${phase}`} role="status" aria-label="보호 단계">
    <div className="ff-detail-status-main">
      {phase === "notice" && noticeDaysRemaining !== null && <span className="ff-detail-status-day">D-{noticeDaysRemaining}</span>}
      <strong>{statusLabel}</strong>
    </div>
    <details className="ff-detail-status-details">
      <summary>알아보기</summary>
      <div className="ff-detail-status-description">
        <strong>{detailTitle || statusLabel}</strong>
        <p>{description || "공공데이터를 기준으로 현재 보호 상태를 안내합니다."}</p>
      </div>
    </details>
  </div>;
}

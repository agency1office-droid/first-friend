export function LoadingIndicator({ label = "데이터를 불러오는 중" }: { label?: string }) {
  return <span className="ff-loading-indicator" role="status" aria-label={label}><span aria-hidden="true" /></span>;
}

export default function AnimalDetailLoading() {
  return (
    <div className="ff-detail-loading" role="status" aria-label="친구 정보를 불러오는 중">
      <span className="ff-detail-loading-spinner" aria-hidden="true" />
      <span className="sr-only">친구 정보를 불러오는 중</span>
    </div>
  );
}

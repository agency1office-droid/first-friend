export type OperationRow = Record<string, unknown> & { id: string | number };
export const operationResources = {
  applications: { label: "입양 신청", table: "applications", title: "animal_id", search: "animal_id", statuses: ["submitted", "review", "consulting", "approved", "rejected", "handover", "completed", "withdrawn", "return_support"], pending: ["submitted", "review", "consulting"], fields: "id,animal_id,status,guardian_id,household,care_plan,readiness_score,suitability_score,suitability_json,absence_plan,emergency_plan,created_at" },
  registrations: { label: "동물 등록", table: "direct_animals", title: "name", search: "name", statuses: ["review", "published", "closed", "draft"], pending: ["review"], fields: "id,name,species,region,status,rescue_story,adoption_terms,created_at" },
  verifications: { label: "보호처·역할 인증", table: "verification_requests", title: "organization", search: "organization", statuses: ["submitted", "verified", "rejected"], pending: ["submitted"], fields: "id,requested_role,organization,status,evidence_key,created_at" },
  reports: { label: "신고 검토", table: "reports", title: "reason", search: "reason", statuses: [], pending: [], fields: "id,target_type,target_id,reason,severity,created_at" },
  returns: { label: "돌봄 위기 도움", table: "return_requests", title: "reason", search: "reason", statuses: ["open", "connected", "resolved"], pending: ["open", "connected"], fields: "id,application_id,reason,urgency,safe_until,status,created_at" },
  members: { label: "회원 조회", table: "members", title: "display_name", search: "display_name", statuses: [], pending: [], fields: "id,display_name,role,verified,sanctioned,home_region,created_at" },
  audits: { label: "처리 기록", table: "admin_audit_logs", title: "action", search: "action", statuses: [], pending: [], fields: "id,action,target_type,target_id,created_at,after_json" },
  certifications: { label: "외부 입양 인증", table: "adoption_certifications", title: "animal_name", search: "animal_name", statuses: ["submitted", "verified", "rejected"], pending: ["submitted"], fields: "id,animal_name,shelter_name,status,created_at" },
  appeals: { label: "제재 이의제기", table: "sanction_appeals", title: "reason", search: "reason", statuses: ["submitted", "accepted", "rejected"], pending: ["submitted"], fields: "id,reason,status,created_at" },
  fundraisers: { label: "모금 심사", table: "fundraisers", title: "title", search: "title", statuses: ["review", "open", "rejected", "settled"], pending: ["review"], fields: "id,title,animal_id,purpose,target_amount,status,created_at" },
} as const;
export type OperationResource = keyof typeof operationResources;
export const operationLabels: Record<string, string> = {
  submitted: "접수", review: "검토 대기", consulting: "상담 중", approved: "승인", rejected: "반려", handover: "인계 중", completed: "완료", withdrawn: "철회", return_support: "돌봄 지원", published: "공개", closed: "종료", draft: "작성 중", verified: "인증 완료", connected: "연결 중", resolved: "해결", accepted: "수용", open: "진행 중", settled: "정산 완료",
  id: "번호", animal_id: "동물 번호", status: "상태", guardian_id: "담당 보호처", household: "가족 구성", care_plan: "돌봄 계획", readiness_score: "준비도", suitability_score: "적합도", suitability_json: "적합도 검토", absence_plan: "부재 시 돌봄", emergency_plan: "응급 상황 계획", created_at: "접수 일시", name: "이름", species: "동물 종류", region: "지역", rescue_story: "구조 이야기", adoption_terms: "입양 조건", requested_role: "요청 역할", organization: "보호처 이름", target_type: "대상 종류", target_id: "대상 번호", reason: "내용", severity: "위험도", application_id: "입양 신청 번호", urgency: "긴급도", safe_until: "돌봄 가능 기한", display_name: "회원 이름", role: "역할", sanctioned: "이용 제한", home_region: "활동 지역", action: "처리 내용", after_json: "처리 후 기록", animal_name: "동물 이름", shelter_name: "보호처 이름", title: "제목", purpose: "목적", target_amount: "목표 금액", member: "일반 회원", shelter: "보호소", foster: "임시보호", veterinarian: "수의사", admin: "운영자", normal: "일반", high: "높음", critical: "긴급",
};
export function parseOperationQuery(params: URLSearchParams) {
  const resource = params.get("resource") || "applications";
  if (!Object.hasOwn(operationResources, resource)) throw new Error("업무 종류를 확인해 주세요.");
  const config = operationResources[resource as OperationResource];
  const page = Number(params.get("page") || 1);
  const status = params.get("status") || "";
  const q = (params.get("q") || "").trim();
  const sort = params.get("sort") || "oldest";
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000 || q.length > 100 || !["oldest", "newest"].includes(sort) || (status && !(config.statuses as readonly string[]).includes(status))) throw new Error("검색 조건을 확인해 주세요.");
  return { resource: resource as OperationResource, page, status, q, sort, pageSize: 20 };
}
export function canUseOperations(role: unknown, verified: unknown, sanctioned: unknown) {
  return !sanctioned && (role === "admin" || (role === "shelter" && verified === true));
}
export function resourceAllowed(resource: OperationResource, role: unknown) {
  return role === "admin" || ["applications", "registrations", "returns"].includes(resource);
}

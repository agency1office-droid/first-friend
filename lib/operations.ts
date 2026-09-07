export type OperationRow = Record<string, unknown> & { id: string | number };
export const operationResources = {
  imageJobs: { label: "동물 사진 변환", table: "animal_image_jobs", title: "animal_id", search: "animal_id", statuses: ["pending", "processing", "completed", "failed", "superseded"], pending: ["pending", "processing", "failed"], fields: "id,animal_id,slot,status,attempt_count,next_attempt_at,last_error,created_at,updated_at" },
  publicAnimals: { label: "공공 동물 DB", table: "public_animals", title: "name", search: "id", statuses: [], pending: [], fields: "id,name,notice_no,species,breed,age,sex,region,shelter_id,shelter_name,shelter_phone,image_1,image_2,summary,process_state,active,hidden,updated,synced_at" },
  applications: { label: "입양 신청", table: "applications", title: "animal_id", search: "animal_id", statuses: ["submitted", "review", "consulting", "approved", "rejected", "handover", "completed", "withdrawn", "return_support"], pending: ["submitted", "review", "consulting"], fields: "id,member_id,animal_id,status,guardian_id,household,care_plan,readiness_score,suitability_score,suitability_json,absence_plan,emergency_plan,created_at" },
  registrations: { label: "동물 등록", table: "direct_animals", title: "name", search: "name", statuses: ["review", "published", "closed", "draft"], pending: ["review"], fields: "id,member_id,name,species,region,status,rescue_story,health_json,life_json,adoption_terms,image_key,updated_at,created_at" },
  verifications: { label: "보호처·역할 인증", table: "verification_requests", title: "organization", search: "organization", statuses: ["submitted", "verified", "rejected"], pending: ["submitted"], fields: "id,member_id,requested_role,organization,representative_name,business_number,shelter_type,status,evidence_key,reviewed_by,created_at" },
  reports: { label: "신고 검토", table: "reports", title: "reason", search: "reason", statuses: ["open","resolved","closed"], pending: ["open"], fields: "id,target_type,target_id,reason,severity,status,created_at" },
  returns: { label: "돌봄 위기 도움", table: "return_requests", title: "reason", search: "reason", statuses: ["open", "connected", "resolved"], pending: ["open", "connected"], fields: "id,application_id,reason,urgency,safe_until,status,created_at" },
  members: { label: "회원 관리", table: "members", title: "display_name", search: "display_name", statuses: [], pending: [], fields: "id,email,display_name,role,verified,sanctioned,home_region,created_at" },
  posts: { label: "이야기 관리", table: "posts", title: "title", search: "title", statuses: [], pending: [], fields: "id,member_id,category,title,body,hidden,views,shares,created_at" },
  questions: { label: "질문 관리", table: "community_questions", title: "title", search: "title", statuses: ["open","answered"], pending: ["open"], fields: "id,member_id,title,body,category,status,hidden,created_at" },
  answers: { label: "답변 관리", table: "community_answers", title: "body", search: "body", statuses: [], pending: [], fields: "id,member_id,question_id,body,hidden,created_at" },
  drawings: { label: "그림 관리", table: "drawing_posts", title: "title", search: "title", statuses: [], pending: [], fields: "id,member_id,title,description,image_key,species,tags_json,status,hidden,created_at" },
  updates: { label: "보호소 소식", table: "shelter_updates", title: "title", search: "title", statuses: [], pending: [], fields: "id,shelter_id,title,body,hidden,created_at" },
  shelters: { label: "보호소 관리", table: "shelter_profiles", title: "name", search: "name", statuses: [], pending: [], fields: "id,owner_id,public_id,name,organization,region,introduction,verified,created_at" },
  shelterNeeds: { label: "보호소 필요 물품", table: "shelter_needs", title: "item_name", search: "item_name", statuses: ["needed","fulfilled"], pending: [], fields: "id,shelter_id,item_name,target_quantity,received_quantity,unit_price,status" },
  volunteers: { label: "봉사 공고", table: "volunteer_posts", title: "title", search: "title", statuses: ["open","closed"], pending: [], fields: "id,shelter_id,title,description,region,scheduled_at,capacity,status,created_at" },
  volunteerApplications: { label: "봉사 신청", table: "volunteer_applications", title: "message", search: "message", statuses: ["submitted","accepted","declined","completed"], pending: ["submitted"], fields: "id,post_id,member_id,message,status,created_at" },
  lost: { label: "실종·발견 관리", table: "lost_reports", title: "description", search: "description", statuses: ["active","contacting","resolved","closed"], pending: ["active","contacting"], fields: "id,member_id,kind,species,region,occurred_at,description,image_key,status,created_at" },
  support: { label: "후원·제휴 의향", table: "support_records", title: "title", search: "title", statuses: ["intent","contacted","closed"], pending: ["intent"], fields: "id,member_id,kind,title,amount,status,disclosure,created_at" },
  pledges: { label: "모금 참여 의향", table: "fundraiser_pledges", title: "member_id", search: "member_id", statuses: [], pending: [], fields: "id,fundraiser_id,member_id,amount,status,created_at" },
  tickets: { label: "고객 문의", table: "support_tickets", title: "title", search: "title", statuses: ["open","answered","closed"], pending: ["open"], fields: "id,member_id,title,body,reply,status,created_at" },
  campaigns: { label: "이메일·마케팅", table: "outreach_campaigns", title: "title", search: "title", statuses: ["draft","queued","completed","cancelled"], pending: ["queued"], fields: "id,title,body,channel,audience,href,status,created_at" },
  deliveries: { label: "발송 기록", table: "outreach_deliveries", title: "recipient", search: "recipient", statuses: ["pending","processing","accepted","failed","skipped"], pending: ["pending","processing","failed"], fields: "id,campaign_id,member_id,recipient,status,provider_id,error,created_at" },
  notifications: { label: "서비스 알림 기록", table: "notifications", title: "title", search: "title", statuses: [], pending: [], fields: "id,member_id,type,title,body,read,created_at" },
  audits: { label: "처리 기록", table: "admin_audit_logs", title: "action", search: "action", statuses: [], pending: [], fields: "id,actor_id,action,target_type,target_id,created_at,before_json,after_json" },
  certifications: { label: "외부 입양 인증", table: "adoption_certifications", title: "animal_name", search: "animal_name", statuses: ["submitted", "verified", "rejected"], pending: ["submitted"], fields: "id,member_id,application_id,source,animal_name,shelter_name,evidence_key,status,reviewed_by,created_at" },
  appeals: { label: "제재 이의제기", table: "sanction_appeals", title: "reason", search: "reason", statuses: ["submitted", "accepted", "rejected"], pending: ["submitted"], fields: "id,member_id,sanction_id,reason,evidence_key,status,reviewed_by,created_at" },
  fundraisers: { label: "모금 심사", table: "fundraisers", title: "title", search: "title", statuses: ["review", "open", "rejected", "settled"], pending: ["review"], fields: "id,shelter_id,title,animal_id,purpose,target_amount,raised_amount,evidence_key,status,created_at" },
} as const;
export type OperationResource = keyof typeof operationResources;
// Group by the operator's work, not by database tables (see docs/OPERATIONS_REFERENCES.md).
export const operationGroups: { label: string; keys: OperationResource[] }[] = [
  { label: "회원·보호소", keys: ["members", "shelters", "verifications"] },
  { label: "동물·입양", keys: ["publicAnimals", "registrations", "applications", "certifications", "returns", "lost"] },
  { label: "커뮤니티", keys: ["posts", "questions", "answers", "drawings", "updates"] },
  { label: "봉사·후원", keys: ["volunteers", "volunteerApplications", "shelterNeeds", "support", "fundraisers", "pledges"] },
  { label: "문의·신고", keys: ["tickets", "reports", "appeals"] },
  { label: "마케팅·알림", keys: ["campaigns", "deliveries", "notifications"] },
  { label: "안전과 운영", keys: ["imageJobs", "audits"] },
];
export const operationLabels: Record<string, string> = {
  slot: "사진 순서", attempt_count: "시도 횟수", next_attempt_at: "다음 재시도", last_error: "실패 이유", superseded: "원본 변경으로 종료",
  item_name:"필요 물품", target_quantity:"필요 수량", received_quantity:"받은 수량", unit_price:"예상 단가 (원)", needed:"모집 중", fulfilled:"수령 완료",
  shelter_phone:"보호처 연락처", representative_name:"대표자·신청자 이름", business_number:"사업자·면허 번호", shelter_type:"보호소 유형", reviewed_by:"심사한 운영자 번호", actor_id:"처리한 운영자 번호", before_json:"처리 전 기록", sanction_id:"제재 번호", source:"인증 경로", health_json:"건강 정보", life_json:"생활 정보", occurred_at:"발생 일시", kind:"종류", tags_json:"그림 태그", raised_amount:"참여 의향 합계 (결제 아님)",
  notice_no:"공고번호", breed:"품종", age:"나이", sex:"성별", summary:"특징", process_state:"공공 원본 상태", updated:"원본 갱신일", synced_at:"마지막 수집", updated_at:"마지막 수정", image_key:"대표 사진 경로",
  login_methods:"연결된 로그인", marketing_email:"이메일 마케팅 동의", marketing_notification:"앱 마케팅 동의",
  declined:"미승인",confirmed:"전달 확인",pledged:"참여 의향",
  email:"이메일", member_id:"회원 번호", owner_id:"담당자 번호", public_id:"공공 보호소 번호", category:"분류", body:"본문", description:"설명", hidden:"숨김", views:"조회수", shares:"공유수", introduction:"소개", scheduled_at:"예정 일시", capacity:"모집 인원", message:"신청 내용", amount:"의향 금액 (결제 아님)", disclosure:"안내 사항", reply:"답변", channel:"발송 수단", audience:"대상", href:"연결 주소", recipient:"수신 주소", campaign_id:"캠페인 번호", provider_id:"발송 접수 번호", error:"확인할 문제", read:"읽음", type:"알림 종류", active:"진행 중", contacting:"연락 중", answered:"답변 완료", intent:"의향 접수", contacted:"연락 확인", queued:"발송 대기", cancelled:"취소", pending:"대기", processing:"처리 중", failed:"실패", skipped:"제외", email_channel:"이메일", all:"수신 동의 회원 전체", notification:"앱 알림", post_id:"게시물 번호", shelter_id:"보호소 번호", question_id:"질문 번호", fundraiser_id:"모금 번호",
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
  const queue = params.get("queue") || "";
  if (queue && (queue !== "pending" || !config.pending.length || status)) throw new Error("처리 대기 조건을 확인해 주세요.");
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000 || q.length > 100 || !["oldest", "newest"].includes(sort) || (status && !(config.statuses as readonly string[]).includes(status))) throw new Error("검색 조건을 확인해 주세요.");
  return { resource: resource as OperationResource, page, status, q, sort, queue, pageSize: 20 };
}
export function canUseOperations(role: unknown, verified: unknown, sanctioned: unknown) {
  return !sanctioned && (role === "admin" || (role === "shelter" && verified === true));
}
export function resourceAllowed(resource: OperationResource, role: unknown) {
  return role === "admin" || ["applications", "registrations", "returns"].includes(resource);
}

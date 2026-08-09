// DUMMY INTEGRATION: 보호센터의 공식 신청 시스템과 계약이 체결되면 이 어댑터만 실제 API 전송으로 교체합니다.
export async function sendToOfficialShelter(payload: { applicationId:number; animalId:string }) { return { provider:"dummy-shelter-adapter", externalId:`DUMMY-${payload.applicationId}`, delivered:false, message:"공식 보호센터 연동 전이므로 운영 대기열에만 기록했습니다." }; }

// DUMMY INTEGRATION: 이메일·문자·푸시 사업자 선정 뒤 실제 발송 코드로 교체합니다. D1 알림함은 현재 실제로 동작합니다.
export async function sendExternalNotification(payload: { memberId:string; title:string; body:string }) { void payload; return { provider:"dummy-notification-adapter", delivered:false }; }

// DUMMY INTEGRATION: 전문 운송업체 검증과 계약 전까지 예약 제안만 저장하고 결제·배차는 수행하지 않습니다.
export async function requestVerifiedTransport(payload: { applicationId:number; region:string }) { return { provider:"dummy-transport-adapter", requestId:`DUMMY-TRANSPORT-${payload.applicationId}`, dispatched:false }; }

// DUMMY INTEGRATION: 법률 검토가 끝나면 검토된 약정 버전과 전자서명 증명 서비스로 교체합니다.
export async function registerLegalAgreement(payload:{applicationId:number;version:string}) { return { provider:"dummy-legal-registry", receipt:`DUMMY-AGREEMENT-${payload.applicationId}-${payload.version}`, legallyRegistered:false }; }

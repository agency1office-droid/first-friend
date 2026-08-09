// DUMMY INTEGRATION: 보호센터의 공식 신청 시스템과 계약이 체결되면 이 어댑터만 실제 API 전송으로 교체합니다.
export async function sendToOfficialShelter(payload: { applicationId:number; animalId:string }) { return { provider:"dummy-shelter-adapter", externalId:`DUMMY-${payload.applicationId}`, delivered:false, message:"공식 보호센터 연동 전이므로 운영 대기열에만 기록했습니다." }; }

// DUMMY INTEGRATION: 이메일·문자·푸시 사업자 선정 뒤 실제 발송 코드로 교체합니다. D1 알림함은 현재 실제로 동작합니다.
export async function sendExternalNotification(payload: { memberId:string; title:string; body:string }) { void payload; return { provider:"dummy-notification-adapter", delivered:false }; }

// DUMMY INTEGRATION: 전문 운송업체 검증과 계약 전까지 예약 제안만 저장하고 결제·배차는 수행하지 않습니다.
export async function requestVerifiedTransport(payload: { applicationId:number; region:string }) { return { provider:"dummy-transport-adapter", requestId:`DUMMY-TRANSPORT-${payload.applicationId}`, dispatched:false }; }

// DUMMY INTEGRATION: 법률 검토가 끝나면 검토된 약정 버전과 전자서명 증명 서비스로 교체합니다.
export async function registerLegalAgreement(payload:{applicationId:number;version:string}) { return { provider:"dummy-legal-registry", receipt:`DUMMY-AGREEMENT-${payload.applicationId}-${payload.version}`, legallyRegistered:false }; }

// DUMMY INTEGRATION: PG·상품 공급자·보험사와 계약 전입니다. 내부 D1에는 사용자의 명시적 의향만 실제 기록하고 돈을 청구하지 않습니다.
export async function beginPartnerCheckout(payload:{recordId:number;kind:string;amount:number}) { return { provider:"dummy-checkout-adapter", checkoutId:`DUMMY-CHECKOUT-${payload.recordId}`, kind:payload.kind, amount:payload.amount, charged:false }; }

// DUMMY INTEGRATION: 지도 사업자 키가 없을 때 정확한 좌표를 만들지 않습니다. 공개 화면에는 시·군·구와 설명용 격자만 사용합니다.
export async function resolveCoarseMap(payload:{region:string}) { return { provider:"dummy-coarse-map", region:payload.region.split(" ").slice(0,2).join(" "), exactCoordinates:false }; }

// DUMMY INTEGRATION: 카카오 SDK 앱 키가 없을 때 Web Share/링크 복사를 사용합니다. 카카오톡 공유 템플릿 계약 후 교체합니다.
export async function createSocialShare(payload:{url:string;title:string}) { return { provider:"web-share-fallback", ...payload, kakaoSdk:false }; }

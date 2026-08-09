import { desc, eq } from "drizzle-orm";
import { accountSanctions, adminAuditLogs, applicationEvents, applications, directAnimals, handoverReservations, members, moderationActions, notifications, posts, reports, returnRequests, verificationRequests } from "../../../db/schema";
import { sendExternalNotification, sendToOfficialShelter } from "../../../lib/integrations";
import { authenticatedDb, clean } from "../_helpers";

const operator = (role: string) => role === "admin" || role === "shelter";

export async function GET() {
  const auth = await authenticatedDb();
  if (!auth) return Response.json({ error: "본인 확인이 필요합니다." }, { status: 401 });
  if (!operator(auth.member.role)) return Response.json({ error: "인증된 보호처 또는 운영자만 이용할 수 있습니다." }, { status: 403 });
  const isAdmin=auth.member.role==="admin";
  const [applicationRows, registrationRows, verificationRows, reportRows, auditRows] = await Promise.all([
    isAdmin?auth.db.select().from(applications).orderBy(desc(applications.suitabilityScore),desc(applications.createdAt)).limit(50):auth.db.select().from(applications).where(eq(applications.guardianId,auth.user.userId)).orderBy(desc(applications.suitabilityScore),desc(applications.createdAt)).limit(50),
    isAdmin?auth.db.select().from(directAnimals).orderBy(desc(directAnimals.createdAt)).limit(50):auth.db.select().from(directAnimals).where(eq(directAnimals.memberId,auth.user.userId)).orderBy(desc(directAnimals.createdAt)).limit(50),
    isAdmin?auth.db.select().from(verificationRequests).orderBy(desc(verificationRequests.createdAt)).limit(30):Promise.resolve([]),
    isAdmin?auth.db.select().from(reports).orderBy(desc(reports.createdAt)).limit(50):Promise.resolve([]),
    isAdmin?auth.db.select().from(adminAuditLogs).orderBy(desc(adminAuditLogs.createdAt)).limit(50):Promise.resolve([]),
  ]);
  const allReturnRows=await auth.db.select().from(returnRequests).orderBy(desc(returnRequests.createdAt)).limit(50),applicationIds=new Set(applicationRows.map(row=>row.id)),returnRows=isAdmin?allReturnRows:allReturnRows.filter(row=>applicationIds.has(row.applicationId));
  return Response.json({ summary: { applications: applicationRows.length, reviews: registrationRows.filter(x => x.status === "review").length, reports: reportRows.length, returns: returnRows.filter(x=>x.status!=="resolved").length }, applications: applicationRows, registrations: registrationRows, verifications: verificationRows, reports: reportRows, returns:returnRows, audits:auditRows });
}

export async function POST(request: Request) {
  const auth = await authenticatedDb();
  if (!auth) return Response.json({ error: "본인 확인이 필요합니다." }, { status: 401 });
  if (!operator(auth.member.role)) return Response.json({ error: "운영자 권한이 필요합니다." }, { status: 403 });
  const data = await request.json() as Record<string, unknown>;
  const action = clean(data.action, 40), id = Number(data.id), note = clean(data.note, 500);
  if (action === "application-status") {
    const allowed = ["review", "consulting", "approved", "rejected", "handover", "completed", "return_support"] as const;
    const candidate = clean(data.status, 30);
    if (!allowed.includes(candidate as typeof allowed[number])) return Response.json({ error: "상태를 확인해 주세요." }, { status: 400 });
    const status = candidate as typeof allowed[number];
    const current=await auth.db.query.applications.findFirst({where:eq(applications.id,id)});
    if(!current||(auth.member.role!=="admin"&&current.guardianId!==auth.user.userId))return Response.json({error:"담당 신청만 처리할 수 있습니다."},{status:403});
    const [row] = await auth.db.update(applications).set({ status }).where(eq(applications.id, id)).returning();
    if (!row) return Response.json({ error: "신청을 찾을 수 없습니다." }, { status: 404 });
    await auth.db.insert(applicationEvents).values({ applicationId: id, actorId: auth.user.userId, eventType: `status:${status}`, note });
    await auth.db.insert(notifications).values({ memberId: row.memberId, type: "application_status", title: "입양 신청 상태가 변경됐어요", body: `신청 #${id}: ${status}`, href: `/applications/${id}` });
    await sendExternalNotification({ memberId: row.memberId, title: "입양 신청 상태 변경", body: status });
    const shelterTransfer = status === "review" ? await sendToOfficialShelter({ applicationId: id, animalId: row.animalId }) : null;
    return Response.json({ row, shelterTransfer });
  }
  if(action==="guardian-message"){
    const current=await auth.db.query.applications.findFirst({where:eq(applications.id,id)}),body=clean(data.body,1000);
    if(!current||(auth.member.role!=="admin"&&current.guardianId!==auth.user.userId))return Response.json({error:"담당 신청만 상담할 수 있습니다."},{status:403});
    if(body.length<2)return Response.json({error:"메시지를 입력해 주세요."},{status:400});
    const {applicationMessages}=await import("../../../db/schema");const[message]=await auth.db.insert(applicationMessages).values({applicationId:id,senderId:auth.user.userId,body}).returning();
    await auth.db.insert(notifications).values({memberId:current.memberId,type:"application_message",title:"보호처에서 상담 메시지가 왔어요",body:body.slice(0,100),href:`/applications/${id}`});
    return Response.json({message},{status:201});
  }
  if(action==="return-status"){
    const requestRow=await auth.db.query.returnRequests.findFirst({where:eq(returnRequests.id,id)});if(!requestRow)return Response.json({error:"도움 요청을 찾을 수 없습니다."},{status:404});const application=await auth.db.query.applications.findFirst({where:eq(applications.id,requestRow.applicationId)});if(!application||(auth.member.role!=="admin"&&application.guardianId!==auth.user.userId))return Response.json({error:"담당 요청만 처리할 수 있습니다."},{status:403});const status=clean(data.status,20)as"connected"|"resolved";if(!["connected","resolved"].includes(status))return Response.json({error:"상태를 확인해 주세요."},{status:400});const[row]=await auth.db.update(returnRequests).set({status}).where(eq(returnRequests.id,id)).returning();await auth.db.insert(notifications).values({memberId:requestRow.memberId,type:"return_support",title:"돌봄 위기 도움 상태가 바뀌었어요",body:status==="connected"?"보호처가 상담·임시돌봄 연결을 확인하고 있어요.":"도움 요청이 해결됨으로 기록됐어요.",href:`/applications/${requestRow.applicationId}`});return Response.json({row})
  }
  if (action === "registration-status") {
    if(auth.member.role!=="admin")return Response.json({error:"직접 등록 공개 심사는 운영자만 할 수 있습니다."},{status:403});
    const status = clean(data.status, 20) as "published" | "closed";
    if (!(["published", "closed"] as string[]).includes(status)) return Response.json({ error: "상태를 확인해 주세요." }, { status: 400 });
    const current=await auth.db.query.directAnimals.findFirst({where:eq(directAnimals.id,id)});if(!current||(auth.member.role!=="admin"&&current.memberId!==auth.user.userId))return Response.json({error:"담당 등록만 처리할 수 있습니다."},{status:403});
    const [row] = await auth.db.update(directAnimals).set({ status, updatedAt: new Date().toISOString() }).where(eq(directAnimals.id, id)).returning();
    return Response.json({ row });
  }
  if (action === "moderate") {
    if(auth.member.role!=="admin")return Response.json({error:"안전 조치는 운영자만 할 수 있습니다."},{status:403});
    await auth.db.insert(moderationActions).values({ actorId: auth.user.userId, targetType: clean(data.targetType, 30), targetId: clean(data.targetId, 40), action: clean(data.moderationAction, 40), reason: note || "운영 정책에 따른 조치" });
    return Response.json({ ok: true });
  }
  if(action==="verification-status"){if(auth.member.role!=="admin")return Response.json({error:"역할 인증 심사는 운영자만 할 수 있습니다."},{status:403});const status=clean(data.status,20) as "verified"|"rejected";if(!["verified","rejected"].includes(status))return Response.json({error:"심사 상태를 확인해 주세요."},{status:400});const before=await auth.db.query.verificationRequests.findFirst({where:eq(verificationRequests.id,id)});const[row]=await auth.db.update(verificationRequests).set({status,reviewedBy:auth.user.userId}).where(eq(verificationRequests.id,id)).returning();if(row&&status==="verified")await auth.db.update(members).set({role:row.requestedRole,verified:true}).where(eq(members.id,row.memberId));await auth.db.insert(adminAuditLogs).values({actorId:auth.user.userId,action:`verification:${status}`,targetType:"verification",targetId:String(id),beforeJson:JSON.stringify(before||{}),afterJson:JSON.stringify(row||{})});return Response.json({row})}
  if(action==="post-visibility"){if(auth.member.role!=="admin")return Response.json({error:"게시물 안전 조치는 운영자만 할 수 있습니다."},{status:403});const hidden=data.hidden===true,before=await auth.db.query.posts.findFirst({where:eq(posts.id,id)}),[row]=await auth.db.update(posts).set({hidden}).where(eq(posts.id,id)).returning();await auth.db.insert(adminAuditLogs).values({actorId:auth.user.userId,action:hidden?"post:hidden":"post:restored",targetType:"post",targetId:String(id),beforeJson:JSON.stringify(before||{}),afterJson:JSON.stringify(row||{})});return Response.json({row})}
  if(action==="account-sanction-target"){if(auth.member.role!=="admin")return Response.json({error:"계정 제재 확정은 운영자만 할 수 있습니다."},{status:403});const report=await auth.db.query.reports.findFirst({where:eq(reports.id,id)});if(!report)return Response.json({error:"신고를 찾을 수 없습니다."},{status:404});let memberId="";if(report.targetType==="post"){const target=await auth.db.query.posts.findFirst({where:eq(posts.id,Number(report.targetId))});memberId=target?.memberId||""}else if(report.targetType==="animal"&&report.targetId.startsWith("direct-")){const target=await auth.db.query.directAnimals.findFirst({where:eq(directAnimals.id,Number(report.targetId.slice(7)))});memberId=target?.memberId||""}if(!memberId)return Response.json({error:"신고 대상 계정을 확인할 수 없어 제재하지 않았습니다."},{status:422});const target=await auth.db.query.members.findFirst({where:eq(members.id,memberId)});if(!target)return Response.json({error:"계정을 찾을 수 없습니다."},{status:404});const reason=note||"운영자 신고 검토 후 확정",digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(target.email.trim().toLowerCase())),fingerprintHash=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,"0")).join("");await auth.db.update(members).set({sanctioned:true}).where(eq(members.id,memberId));const[row]=await auth.db.insert(accountSanctions).values({memberId,actorId:auth.user.userId,reason,status:"confirmed",fingerprintHash}).returning();await auth.db.insert(adminAuditLogs).values({actorId:auth.user.userId,action:"account:sanctioned",targetType:"member",targetId:memberId,afterJson:JSON.stringify({reason,reportId:id})});return Response.json({row})}
  if(action==="guardian-confirm-handover"){const application=await auth.db.query.applications.findFirst({where:eq(applications.id,id)});if(!application||(auth.member.role!=="admin"&&application.guardianId!==auth.user.userId))return Response.json({error:"담당 신청만 인계 확인할 수 있습니다."},{status:403});const reservation=await auth.db.query.handoverReservations.findFirst({where:eq(handoverReservations.applicationId,id)});if(!reservation)return Response.json({error:"인계 예약을 찾을 수 없습니다."},{status:404});await auth.db.update(handoverReservations).set({guardianConfirmed:true,status:reservation.adopterConfirmed?"completed":"confirmed"}).where(eq(handoverReservations.applicationId,id));if(reservation.adopterConfirmed)await auth.db.update(applications).set({status:"completed"}).where(eq(applications.id,id));await auth.db.insert(adminAuditLogs).values({actorId:auth.user.userId,action:"handover:guardian-confirmed",targetType:"application",targetId:String(id),afterJson:JSON.stringify({guardianConfirmed:true})});return Response.json({ok:true})}
  return Response.json({ error: "지원하지 않는 작업입니다." }, { status: 400 });
}

import { desc, eq } from "drizzle-orm";
import { adoptionCertifications } from "../../../db/schema";
import { authenticatedDb, clean } from "../_helpers";

async function hash(value:string){const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value.trim().toUpperCase()));return Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,"0")).join("")}

export async function GET(){const auth=await authenticatedDb();if(!auth)return Response.json({error:"본인 확인이 필요합니다."},{status:401});const rows=await auth.db.select().from(adoptionCertifications).where(eq(adoptionCertifications.memberId,auth.user.userId)).orderBy(desc(adoptionCertifications.createdAt));return Response.json({certifications:rows})}

export async function POST(request:Request){const auth=await authenticatedDb();if(!auth)return Response.json({error:"본인 확인이 필요합니다."},{status:401});const data=await request.json()as Record<string,unknown>,shelterName=clean(data.shelterName,120),animalName=clean(data.animalName,80),verificationCode=clean(data.verificationCode,80),evidenceKey=clean(data.evidenceKey,240);if(!shelterName||!animalName||verificationCode.length<6||!evidenceKey)return Response.json({error:"보호소·동물·인증코드·입양 증빙을 모두 확인해 주세요."},{status:400});const[row]=await auth.db.insert(adoptionCertifications).values({memberId:auth.user.userId,source:"external",shelterName,animalName,verificationCodeHash:await hash(verificationCode),evidenceKey}).returning();return Response.json({certification:row},{status:201})}

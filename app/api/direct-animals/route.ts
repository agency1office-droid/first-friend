import { animalMedia, directAnimals } from "../../../db/schema";
import { authenticatedDb, clean } from "../_helpers";

export async function POST(request: Request) {
  const auth = await authenticatedDb();
  if (!auth) return Response.json({ error: "본인 확인이 필요합니다." }, { status: 401 });
  if (!auth.member.fosterEducationCompleted && !["foster", "shelter", "admin"].includes(auth.member.role)) return Response.json({ error: "임시보호자 기본 교육을 먼저 완료해 주세요." }, { status: 403 });
  const data = await request.json() as Record<string, unknown>;
  const imageKeys=Array.isArray(data.imageKeys)?data.imageKeys.map(v=>clean(v,240)).filter(Boolean).slice(0,8):[],videoKey=clean(data.videoKey,240);
  const name = clean(data.name, 60), species = clean(data.species, 20), region = clean(data.region, 80), rescueStory = clean(data.rescueStory), adoptionTerms = clean(data.adoptionTerms), imageKey = imageKeys[0]||clean(data.imageKey, 240);
  if (!name || !species || !region || rescueStory.length < 30 || adoptionTerms.length < 20) return Response.json({ error: "필수 등록 내용을 자세히 작성해 주세요." }, { status: 400 });
  const [animal] = await auth.db.insert(directAnimals).values({ memberId: auth.user.userId, name, species, region, rescueStory, adoptionTerms, imageKey: imageKey || null, healthJson: JSON.stringify(data.health || {}), lifeJson: JSON.stringify(data.life || {}) }).returning();
  const media=[...imageKeys.map((objectKey,sortOrder)=>({animalId:animal.id,mediaType:"image" as const,objectKey,sortOrder})),...(videoKey?[{animalId:animal.id,mediaType:"video" as const,objectKey:videoKey,sortOrder:99}]:[])];
  if(media.length)await auth.db.insert(animalMedia).values(media);
  return Response.json({ animal }, { status: 201 });
}

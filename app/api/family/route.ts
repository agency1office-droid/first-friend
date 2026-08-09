import { authenticatedDb, clean } from "../_helpers";
import { familyRooms } from "../../../db/schema";

export async function POST(request:Request){const auth=await authenticatedDb();if(!auth)return Response.json({error:"로그인이 필요합니다."},{status:401});const data=await request.json() as Record<string,unknown>;const animalId=clean(data.animalId,80),title=clean(data.title,120);if(!animalId||!title)return Response.json({error:"동물 정보가 필요합니다."},{status:400});const shareToken=crypto.randomUUID().replaceAll("-","");const [room]=await auth.db.insert(familyRooms).values({ownerId:auth.user.userId,animalId,shareToken,title}).returning();return Response.json({room,href:`/family/${shareToken}`},{status:201});}

import { desc, eq } from "drizzle-orm";
import { notifications } from "../../../db/schema";
import { authenticatedDb } from "../_helpers";
export async function GET(){const auth=await authenticatedDb();if(!auth)return Response.json({error:"본인 확인이 필요합니다."},{status:401});const rows=await auth.db.select().from(notifications).where(eq(notifications.memberId,auth.user.userId)).orderBy(desc(notifications.createdAt)).limit(50);return Response.json({notifications:rows});}
export async function POST(){const auth=await authenticatedDb();if(!auth)return Response.json({error:"본인 확인이 필요합니다."},{status:401});await auth.db.update(notifications).set({read:true}).where(eq(notifications.memberId,auth.user.userId));return Response.json({ok:true});}

import { eq } from "drizzle-orm";
import { authenticatedDb, clean } from "../_helpers";
import { members } from "../../../db/schema";

export async function GET(){const auth=await authenticatedDb();if(!auth)return Response.json({homeRegion:""});return Response.json({homeRegion:auth.member.homeRegion});}

export async function POST(request: Request) {
  const auth = await authenticatedDb();
  if (!auth) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const data = await request.json() as Record<string, unknown>;
  const homeRegion = clean(data.homeRegion, 40).split(" ").slice(0, 2).join(" ");
  if (homeRegion.length < 2) return Response.json({ error: "시·군·구 수준의 지역을 입력해 주세요." }, { status: 400 });
  await auth.db.update(members).set({ homeRegion }).where(eq(members.id, auth.user.userId));
  return Response.json({ homeRegion });
}

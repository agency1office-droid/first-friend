import { and, eq } from "drizzle-orm";
import { notifications } from "../../../../db/schema";
import { authenticatedDb } from "../../_helpers";

export async function GET() {
  const auth = await authenticatedDb();
  if (!auth) return Response.json({ unread: 0 }, { status: 401 });
  const rows = await auth.db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.memberId, auth.user.userId), eq(notifications.read, false)));
  return Response.json({ unread: rows.length });
}

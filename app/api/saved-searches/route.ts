import { getChatGPTUser } from "../../chatgpt-auth";
import { getSupabaseServerClient } from "../../../lib/supabase/server";
import { isSavedSearchCriteria } from "../../../lib/saved-search-criteria";
import { clean, readJson } from "../_helpers";

function searchRow(row: Record<string, unknown>) {
  return { ...row, criteriaJson: row.criteria_json, alertsEnabled: row.alerts_enabled, createdAt: row.created_at };
}
const unavailable = () => Response.json({ error: "검색 조건을 처리하지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 503 });

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "본인 확인이 필요해요." }, { status: 401 });
  const { data, error } = await getSupabaseServerClient().from("saved_searches").select("*").eq("member_id", user.userId).order("created_at", { ascending: false });
  if (error) return unavailable();
  return Response.json({ searches: (data || []).map(searchRow) }, { headers: { "cache-control": "no-store" } });
}
export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "본인 확인이 필요해요." }, { status: 401 });
  const data = await readJson(request), name = clean(data?.name, 80);
  if (!name || !isSavedSearchCriteria(data?.criteria)) return Response.json({ error: "검색 조건을 확인해 주세요." }, { status: 400 });
  const client = getSupabaseServerClient();
  const { data: search, error } = await client.from("saved_searches").insert({ member_id: user.userId, name, criteria_json: JSON.stringify(data.criteria), alerts_enabled: true }).select("*").single();
  if (error) return unavailable();
  await client.from("notifications").insert({ member_id: user.userId, type: "search_saved", title: "신규 친구 알림을 켰어요", body: `${name} 조건과 닮은 친구가 등록되면 알려드릴게요.`, href: "/mypage" });
  return Response.json({ search: searchRow(search) }, { status: 201 });
}
export async function PATCH(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "본인 확인이 필요해요." }, { status: 401 });
  const data = await readJson(request), id = Number(data?.id);
  if (!Number.isSafeInteger(id) || id <= 0 || typeof data?.alertsEnabled !== "boolean") return Response.json({ error: "알림 설정을 확인해 주세요." }, { status: 400 });
  const { data: row, error } = await getSupabaseServerClient().from("saved_searches").update({ alerts_enabled: data.alertsEnabled }).eq("id", id).eq("member_id", user.userId).select("*").maybeSingle();
  if (error) return unavailable();
  return row ? Response.json({ search: searchRow(row) }) : Response.json({ error: "저장 검색을 찾을 수 없어요." }, { status: 404 });
}
export async function DELETE(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "본인 확인이 필요해요." }, { status: 401 });
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isSafeInteger(id) || id <= 0) return Response.json({ error: "검색 조건을 확인해 주세요." }, { status: 400 });
  const { count, error } = await getSupabaseServerClient().from("saved_searches").delete({ count: "exact" }).eq("id", id).eq("member_id", user.userId);
  if (error) return unavailable();
  return count ? Response.json({ deleted: true }) : Response.json({ error: "저장 검색을 찾을 수 없어요." }, { status: 404 });
}

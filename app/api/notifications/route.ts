import { getChatGPTUser } from "../../chatgpt-auth";
import { getSupabaseServerClient } from "../../../lib/supabase/server";

type Criteria = { species?: string; breed?: string; coat?: string; age?: string; gender?: string; region?: string; query?: string; tags?: string[] };
type StoredAnimal = Awaited<ReturnType<typeof import("../../../lib/public-animal-store").getNearbyAnimalsPage>>["items"][number];

function matches(criteria: Criteria, animal: StoredAnimal) {
  const text = `${animal.name} ${animal.breed} ${animal.species} ${animal.ageGroup} ${animal.sex} ${animal.region} ${animal.colors.join(" ")} ${animal.traits.join(" ")}`.toLowerCase();
  return (!criteria.species || criteria.species === "전체" || animal.species.includes(criteria.species))
    && (!criteria.breed || criteria.breed === "상관 없음" || text.includes(criteria.breed.toLowerCase()))
    && (!criteria.coat || criteria.coat === "상관 없음" || text.includes(criteria.coat.toLowerCase()))
    && (!criteria.age || criteria.age === "상관 없음" || animal.ageGroup === criteria.age)
    && (!criteria.gender || criteria.gender === "상관 없음" || animal.sex.includes(criteria.gender))
    && (!criteria.region || criteria.region === "전국" || animal.region.startsWith(criteria.region))
    && (!criteria.query || text.includes(criteria.query.toLowerCase()))
    && (!(criteria.tags?.length) || criteria.tags.some(tag => text.includes(tag.toLowerCase())));
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "본인 확인이 필요합니다." }, { status: 401 });
  const client = getSupabaseServerClient();
  const [{ data: searches }, { data: existing }] = await Promise.all([
    client.from("saved_searches").select("id,name,criteria_json,alerts_enabled").eq("member_id", user.userId),
    client.from("notifications").select("href").eq("member_id", user.userId).eq("type", "saved_search_match"),
  ]);
  const hrefs = new Set((existing || []).map(row => String(row.href || "")));
  let animals: StoredAnimal[] = [];
  try {
    // 알림 조회에서도 공공 API를 직접 호출하지 않고, 동기화된 DB를 사용합니다.
    const { getNearbyAnimalsPage } = await import("../../../lib/public-animal-store");
    animals = (await getNearbyAnimalsPage({ limit: 100, sort: "recent" })).items;
  } catch {
    animals = [];
  }
  const notifications: Array<Record<string, unknown>> = [];
  const matchedSearchIds: number[] = [];
  for (const search of (searches || []).filter(row => row.alerts_enabled)) {
    let criteria: Criteria;
    try { criteria = JSON.parse(search.criteria_json || "{}"); } catch { continue; }
    const matched = animals.filter(animal => matches(criteria, animal)).slice(0, 3);
    if (!matched.length) continue;
    matchedSearchIds.push(Number(search.id));
    for (const animal of matched) {
      const href = `/friends/${animal.id}?savedSearch=${search.id}`;
      if (hrefs.has(href)) continue;
      notifications.push({ member_id: user.userId, type: "saved_search_match", title: `${search.name} 조건의 새 친구`, body: `${animal.name} · ${animal.region}. 공개된 태그가 저장 조건과 맞아요.`, href });
      hrefs.add(href);
    }
  }
  if (notifications.length) await client.from("notifications").insert(notifications);
  if (matchedSearchIds.length) await client.from("saved_searches").update({ last_matched_at: new Date().toISOString() }).in("id", [...new Set(matchedSearchIds)]);
  const { data: rows } = await client.from("notifications").select("id,title,body,href,read,created_at").eq("member_id", user.userId).order("created_at", { ascending: false }).limit(50);
  return Response.json({ notifications: (rows || []).map(row => ({ ...row, createdAt: row.created_at })) });
}

export async function POST() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "본인 확인이 필요합니다." }, { status: 401 });
  await getSupabaseServerClient().from("notifications").update({ read: true }).eq("member_id", user.userId);
  return Response.json({ ok: true });
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { isSavedSearchCriteria, type SavedSearchCriteria } from "./saved-search-criteria";

type StoredAnimal = Awaited<ReturnType<typeof import("./public-animal-store").getNearbyAnimalsPage>>["items"][number];

function matches(criteria: SavedSearchCriteria, animal: StoredAnimal) {
  const text = [animal.name, animal.breed, animal.species, animal.ageGroup, animal.sex, animal.region, animal.colors.join(" "), animal.traits.join(" ")].join(" ").toLowerCase();
  return (!criteria.species || criteria.species === "전체" || animal.species.includes(criteria.species))
    && (!criteria.breed || criteria.breed === "상관 없음" || text.includes(criteria.breed.toLowerCase()))
    && (!criteria.coat || criteria.coat === "상관 없음" || text.includes(criteria.coat.toLowerCase()))
    && (!criteria.age || criteria.age === "상관 없음" || animal.ageGroup === criteria.age)
    && (!criteria.gender || criteria.gender === "상관 없음" || animal.sex.includes(criteria.gender))
    && (!criteria.region || criteria.region === "전국" || animal.region.startsWith(criteria.region))
    && (!criteria.query || text.includes(criteria.query.toLowerCase()))
    && (!(criteria.tags?.length) || criteria.tags.some(tag => text.includes(tag.toLowerCase())));
}

// ponytail: 인스턴스 메모리 스로틀. 함수 인스턴스가 바뀌면 초기화되지만 30분 간격이면 충분하다.
const lastRefresh = new Map<string, number>();
const REFRESH_INTERVAL_MS = 30 * 60 * 1000;

/** 알림이 켜진 저장 검색에 맞는 새 친구를 찾아 알림을 만든다. 벨 배지와 알림함이 같은 함수를 써서 수가 어긋나지 않는다. */
export async function refreshSavedSearchMatches(client: SupabaseClient, memberId: string, { force = false } = {}) {
  if (!force && Date.now() - (lastRefresh.get(memberId) || 0) < REFRESH_INTERVAL_MS) return 0;
  lastRefresh.set(memberId, Date.now());
  const [{ data: searches }, { data: existing }] = await Promise.all([
    client.from("saved_searches").select("id,name,criteria_json,alerts_enabled").eq("member_id", memberId).eq("alerts_enabled", true),
    client.from("notifications").select("href").eq("member_id", memberId).eq("type", "saved_search_match"),
  ]);
  if (!searches?.length) return 0;
  const hrefs = new Set((existing || []).map(row => String(row.href || "")));
  let animals: StoredAnimal[] = [];
  try {
    // 공공 API를 직접 부르지 않고 동기화된 DB를 쓴다.
    const { getNearbyAnimalsPage } = await import("./public-animal-store");
    animals = (await getNearbyAnimalsPage({ limit: 100, sort: "recent" })).items;
  } catch { animals = []; }
  const notifications: Array<Record<string, unknown>> = [];
  const matchedSearchIds: number[] = [];
  for (const search of searches) {
    let criteria: unknown;
    try { criteria = JSON.parse(search.criteria_json || "{}"); } catch { continue; }
    if (!isSavedSearchCriteria(criteria)) continue;
    const validCriteria = criteria;
    const matched = animals.filter(animal => matches(validCriteria, animal)).slice(0, 3);
    if (!matched.length) continue;
    matchedSearchIds.push(Number(search.id));
    for (const animal of matched) {
      const href = "/friends/" + animal.id + "?savedSearch=" + search.id;
      if (hrefs.has(href)) continue;
      notifications.push({ member_id: memberId, type: "saved_search_match", title: search.name + " 조건의 새 친구", body: animal.name + " · " + animal.region + ". 저장한 조건과 맞는 친구예요.", href });
      hrefs.add(href);
    }
  }
  if (notifications.length) await client.from("notifications").insert(notifications);
  if (matchedSearchIds.length) await client.from("saved_searches").update({ last_matched_at: new Date().toISOString() }).in("id", [...new Set(matchedSearchIds)]);
  return notifications.length;
}

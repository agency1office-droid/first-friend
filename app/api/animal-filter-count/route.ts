import { getNearbyAnimalsPage } from "../../../lib/public-animal-store";
import { getSupabaseServerClient } from "../../../lib/supabase/server";

const list = (value: string | null) => value ? value.split(",").map(item => item.trim()).filter(Boolean) : [];
const ageLabels: Record<string, string> = { young: "어린 친구", adult: "청년 친구", mature: "어른", senior: "나이 많은 친구", unknown: "나이 미상" };

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const ageGroups = list(params.get("ageGroup"));
    const neutered = list(params.get("neutered"));
    // 나이 필터는 projection RPC가 오래된 배포본이거나 결과가 0건일 때
    // 전체 동물 수로 대체될 수 있으므로, DB count를 직접 사용합니다.
    if (ageGroups.length && !neutered.length) {
      let query = getSupabaseServerClient().from("public_animals").select("id", { count: "exact", head: true }).eq("active", true);
      const species = params.get("species");
      const sex = list(params.get("sex")).map(value => value === "female" ? "암컷" : value === "unknown" ? "미상" : "수컷");
      const sizes = list(params.get("sizeGroup"));
      const breedCodes = list(params.get("breedKeys")).map(value => value.split(":")[1]).filter(value => /^\d{6}$/.test(value));
      const color = params.get("color");
      if (species === "dog") query = query.eq("species", "강아지");
      if (species === "cat") query = query.eq("species", "고양이");
      if (sex.length) query = query.in("sex", sex);
      if (sizes.length) query = query.in("size_group", sizes);
      if (breedCodes.length) query = query.in("kind_cd", breedCodes);
      if (color && color !== "all") query = query.ilike("color_search", `%${color}%`);
      query = query.in("age_group", ageGroups.map(value => ageLabels[value]).filter(Boolean));
      const { count, error } = await query;
      if (error) throw error;
      return Response.json({ count: count || 0 }, { headers: { "cache-control": "no-store" } });
    }
    const result = await getNearbyAnimalsPage({
      species: params.get("species") || "all",
      breedKeys: list(params.get("breedKeys")),
      sex: params.get("sex") || "all",
      neutered: params.get("neutered") || "all",
      ageGroup: params.get("ageGroup") || "all",
      sizeGroup: params.get("sizeGroup") || "all",
      color: params.get("color") || "all",
      publicStatus: params.get("publicStatus") || "all",
      sort: "recent",
      limit: 1,
    });
    return Response.json({ count: result.total }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "조건에 맞는 친구 수를 계산하지 못했어요." }, { status: 503 });
  }
}

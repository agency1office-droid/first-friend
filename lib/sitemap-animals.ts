import { getSupabaseServerClient } from "./supabase/server";

export async function sitemapAnimals() {
  const client = getSupabaseServerClient();
  const rows: { id: string; updated_at: string }[] = [];
  let after: string | undefined;
  // Keyset pages avoid the REST default 1,000-row cap and unstable offsets.
  for (;;) {
    let query = client.from("visible_public_animals").select("id,updated_at").eq("active", true).order("id").limit(1000);
    if (after) query = query.gt("id", after);
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
    after = data[data.length - 1].id;
  }
  return rows;
}

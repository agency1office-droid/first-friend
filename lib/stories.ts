import { stories as fallbackStories } from "./data";
import { getSupabaseServerClient } from "./supabase/server";

export type PublicStory = { id: string; postId?: number; category: string; title: string; body: string; author: string; image: string; reactions: number; shares:number; views:number; popularity:number; createdAt?: string };
const categoryLabel: Record<string, string> = { adoption: "입양 일기", neighborhood: "동네 친구", memory: "오늘의 추억", rescue: "보호 이야기" };

export async function getStories(): Promise<PublicStory[]> {
  const fallback=()=>fallbackStories.map((story) => ({ ...story, id: `story-${story.id}`,shares:0,views:0,popularity:story.reactions*5 }));
  if (typeof process !== "undefined" && process.release?.name === "node") return fallback();
  try {
    const supabase = getSupabaseServerClient();
    const [{ data: rows, error }, { data: reactionRows }] = await Promise.all([
      supabase.from("posts").select("*").eq("hidden", false).order("created_at", { ascending: false }).limit(30),
      supabase.from("post_reactions").select("post_id"),
    ]);
    if (error) throw error;
    const counts = new Map<string, number>();
    for (const row of reactionRows || []) counts.set(String(row.post_id), (counts.get(String(row.post_id)) || 0) + 1);
    const published = (rows || []).map((row) => {const id=Number(row.id), reactions=counts.get(String(row.id))||0,ageDays=Math.max(0,(Date.now()-new Date(row.created_at).getTime())/86400000),recency=Math.max(0,30-ageDays);return { id: `post-${row.id}`, postId: id, category: categoryLabel[row.category] || row.category, title: row.title, body: row.body, author: "퍼스트 프렌드 이웃", image: row.image_key ? `/media/${row.image_key}` : fallbackStories[id % fallbackStories.length].image, reactions,shares:Number(row.shares||0),views:Number(row.views||0),popularity:reactions*5+Number(row.shares||0)*3+Number(row.views||0)*.05+recency,createdAt: row.created_at }});
    return [...published, ...fallback()];
  } catch { return fallback(); }
}

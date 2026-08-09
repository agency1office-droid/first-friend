import { count, desc, eq } from "drizzle-orm";
import { postReactions, posts } from "../db/schema";
import { stories as fallbackStories } from "./data";

export type PublicStory = { id: string; postId?: number; category: string; title: string; body: string; author: string; image: string; reactions: number; shares:number; views:number; popularity:number; createdAt?: string };
const categoryLabel: Record<string, string> = { adoption: "입양 일기", neighborhood: "동네 친구", memory: "오늘의 추억", rescue: "보호 이야기" };

export async function getStories(): Promise<PublicStory[]> {
  const fallback=()=>fallbackStories.map((story) => ({ ...story, id: `story-${story.id}`,shares:0,views:0,popularity:story.reactions*5 }));
  if (typeof process !== "undefined" && process.release?.name === "node") return fallback();
  try {
    const { getDb } = await import("../db");
    const db = getDb();
    const [rows, reactionRows] = await Promise.all([
      db.select().from(posts).where(eq(posts.hidden, false)).orderBy(desc(posts.createdAt)).limit(30),
      db.select({ postId: postReactions.postId, value: count() }).from(postReactions).groupBy(postReactions.postId),
    ]);
    const counts = new Map(reactionRows.map((row) => [row.postId, row.value]));
    const published = rows.map((row) => {const reactions=counts.get(row.id)||0,ageDays=Math.max(0,(Date.now()-new Date(row.createdAt).getTime())/86400000),recency=Math.max(0,30-ageDays);return { id: `post-${row.id}`, postId: row.id, category: categoryLabel[row.category] || row.category, title: row.title, body: row.body, author: "퍼스트 프렌드 이웃", image: row.imageKey ? `/media/${row.imageKey}` : fallbackStories[row.id % fallbackStories.length].image, reactions,shares:row.shares,views:row.views,popularity:reactions*5+row.shares*3+row.views*.05+recency,createdAt: row.createdAt }});
    return [...published, ...fallback()];
  } catch { return fallback(); }
}

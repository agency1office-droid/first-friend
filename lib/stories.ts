import { count, desc, eq } from "drizzle-orm";
import { postReactions, posts } from "../db/schema";
import { stories as fallbackStories } from "./data";

export type PublicStory = { id: string; postId?: number; category: string; title: string; body: string; author: string; image: string; reactions: number; createdAt?: string };
const categoryLabel: Record<string, string> = { adoption: "입양 일기", neighborhood: "동네 친구", memory: "오늘의 추억", rescue: "보호 이야기" };

export async function getStories(): Promise<PublicStory[]> {
  if (typeof process !== "undefined" && process.release?.name === "node") return fallbackStories.map((story) => ({ ...story, id: `story-${story.id}` }));
  try {
    const { getDb } = await import("../db");
    const db = getDb();
    const [rows, reactionRows] = await Promise.all([
      db.select().from(posts).where(eq(posts.hidden, false)).orderBy(desc(posts.createdAt)).limit(30),
      db.select({ postId: postReactions.postId, value: count() }).from(postReactions).groupBy(postReactions.postId),
    ]);
    const counts = new Map(reactionRows.map((row) => [row.postId, row.value]));
    const published = rows.map((row) => ({ id: `post-${row.id}`, postId: row.id, category: categoryLabel[row.category] || row.category, title: row.title, body: row.body, author: "퍼스트 프렌드 이웃", image: row.imageKey ? `/media/${row.imageKey}` : fallbackStories[row.id % fallbackStories.length].image, reactions: counts.get(row.id) || 0, createdAt: row.createdAt }));
    return [...published, ...fallbackStories.map((story) => ({ ...story, id: `story-${story.id}` }))];
  } catch { return fallbackStories.map((story) => ({ ...story, id: `story-${story.id}` })); }
}

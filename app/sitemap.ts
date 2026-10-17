import type { MetadataRoute } from "next";
import { getAnimals } from "../lib/public-data";
import { getStories } from "../lib/stories";
import { sitemapAnimals } from "../lib/sitemap-animals";

const base = "https://www.firstfriend.me";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [publicAnimals, recentAnimals, stories] = await Promise.all([sitemapAnimals(), getAnimals(100), getStories()]);
  const animals = [...new Map([...publicAnimals.map(a => ({ id: a.id, updated: a.updated_at })), ...recentAnimals.map(a => ({ id: a.id, updated: a.updated }))].map(a => [a.id, a])).values()];
  const staticRoutes = [
    "",
    "/find",
    "/find/draw",
    "/find/photo",
    "/find/conditions",
    "/find/worldcup",
    "/drawings",
    "/questions",
    "/volunteer",
    "/readiness",
    "/quiz/adoption-prep",
    "/prepare",
    "/encyclopedia",
    "/guide",
    "/stories",
    "/lost-found",
    "/shelters",
    "/shelters/map",
    "/tnr",
    "/support",
    "/about",
    "/terms",
    "/privacy",
    "/contact",
  ];
  return [
    ...staticRoutes.map((url) => ({
      url: `${base}${url}`,
      changeFrequency: "weekly" as const,
      priority: url === "" ? 1 : 0.7,
    })),
    ...animals.map((a) => ({
      url: `${base}/friends/${a.id}`,
      lastModified: a.updated,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...stories.map((s) => ({
      url: `${base}/stories/${s.id}`,
      lastModified: s.createdAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}

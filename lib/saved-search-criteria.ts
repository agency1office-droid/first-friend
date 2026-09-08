const textFields = ["species", "breed", "coat", "age", "gender", "region", "query"] as const;
export type SavedSearchCriteria = Partial<Record<typeof textFields[number], string>> & { tags?: string[] };

export function isSavedSearchCriteria(value: unknown): value is SavedSearchCriteria {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return textFields.every(key => row[key] === undefined || (typeof row[key] === "string" && row[key].length <= 500))
    && (row.tags === undefined || (Array.isArray(row.tags) && row.tags.length <= 50 && row.tags.every(tag => typeof tag === "string" && tag.length <= 100)));
}

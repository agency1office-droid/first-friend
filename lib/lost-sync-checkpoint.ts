export type LostSyncCheckpoint = { syncId: string; startDate: string; endDate: string; nextPage: number; count: number; total: number; startedAt: string; updatedAt: string; failures: number; error?: string };

// Expiry is tied to the original run, never extended by retries or errors.
export function readLostSyncCheckpoint(status: string | undefined, message: string, now = Date.now()): LostSyncCheckpoint | null {
  try {
    const value = JSON.parse(message) as LostSyncCheckpoint;
    const age = now - Date.parse(value.startedAt);
    if (status === "complete" || status === "partial" || !value.syncId || !/^\d{8}$/.test(value.startDate) || !/^\d{8}$/.test(value.endDate)
      || !Number.isFinite(age) || age < 0 || age >= 7 * 86400000
      || !Number.isInteger(value.nextPage) || value.nextPage < 1 || value.nextPage > 200
      || !Number.isInteger(value.failures) || value.failures < 0 || value.failures >= 3
      || !Number.isFinite(value.count) || value.count < 0 || !Number.isFinite(value.total) || value.total < 0) return null;
    return value;
  } catch { return null; }
}

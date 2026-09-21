const KEY = 'ff-pending-result-cards-v1';
type Pending = { id: string; endpoint: '/api/quiz-completions' | '/api/result-cards'; body: Record<string, unknown> };
function read(): Pending[] {
  try { const value = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(value) ? value.filter(item => item && typeof item.id === 'string' && ['/api/quiz-completions', '/api/result-cards'].includes(item.endpoint) && item.body) : []; } catch { return []; }
}
export function rememberPending(result: Pending) {
  try { localStorage.setItem(KEY, JSON.stringify([...read().filter(item => item.id !== result.id), result])); return true; } catch { return false; }
}
export function forgetPending(id: string) {
  try { localStorage.setItem(KEY, JSON.stringify(read().filter(item => item.id !== id))); } catch { /* retry is idempotent */ }
}
let syncing: Promise<void> | null = null;
export function syncPendingResults() {
  if (syncing) return syncing;
  syncing = (async () => {
    for (const item of read()) {
      const response = await fetch(item.endpoint, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(item.body) });
      if (response.status === 401) break;
      if (response.ok) { forgetPending(item.id); window.dispatchEvent(new Event('ff-quiz-completion-updated')); }
      else if (response.status >= 500) break;
    }
  })().catch(() => { /* retained for the next focus or visit */ }).finally(() => { syncing = null; });
  return syncing;
}
export async function saveWorldcupResult(runId: string, animalId: string, completedAt: string) {
  const body = { runId, animalId, completedAt };
  try {
    const response = await fetch('/api/result-cards', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (response.status === 401) return rememberPending({ id: runId, endpoint: '/api/result-cards', body }) ? 'login' : 'error';
    if (!response.ok) return 'error';
    forgetPending(runId); window.dispatchEvent(new Event('ff-quiz-completion-updated')); return 'saved';
  } catch { return 'error'; }
}

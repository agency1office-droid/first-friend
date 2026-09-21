"use client";
import { useEffect } from 'react';
import { syncPendingResults } from '../../lib/pending-results';
export function PendingResultsSync() {
  useEffect(() => {
    void syncPendingResults();
    const sync = () => { void syncPendingResults(); };
    window.addEventListener('focus', sync); window.addEventListener('online', sync);
    return () => { window.removeEventListener('focus', sync); window.removeEventListener('online', sync); };
  }, []);
  return null;
}

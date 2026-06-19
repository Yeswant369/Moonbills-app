import { PendingSale } from './types';

const QUEUE_KEY = 'cherrys_pending_sales';

/** Add a failed sale to the local retry queue */
export function queueSale(sale: PendingSale): void {
  if (typeof window === 'undefined') return;
  const queue = getPendingSales();
  // Avoid duplicates by localId
  if (!queue.find((s) => s.localId === sale.localId)) {
    queue.push(sale);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }
}

/** Read all pending (unsynced) sales from localStorage */
export function getPendingSales(): PendingSale[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as PendingSale[]) : [];
  } catch {
    return [];
  }
}

/** Remove a successfully synced sale from the queue */
export function removeSale(localId: string): void {
  if (typeof window === 'undefined') return;
  const queue = getPendingSales().filter((s) => s.localId !== localId);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/** Clear the entire retry queue */
export function clearQueue(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(QUEUE_KEY);
}

/** Count of pending sales */
export function pendingSalesCount(): number {
  return getPendingSales().length;
}

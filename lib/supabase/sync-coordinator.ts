export type SyncStatus = 'idle' | 'syncing' | 'error';

/**
 * Serializes cloud writes for one channel (cart, or wishlist) so overlapping
 * mutations can never race: a fast "quantity 1→2→3→4" burst used to start a
 * separate `reconcileCloudX` call per change, and whichever request the
 * network happened to finish LAST decided what ended up in the cloud —
 * React's effect-cleanup `cancelled` flag stops a stale response from
 * updating local state, but it can't un-send a request already in flight.
 *
 * The fix is a tiny state machine, not a queue of every intermediate value:
 * `update()` only ever records the latest snapshot and a dirty flag. A
 * single loop drains it — at most one `reconcile()` in flight at a time,
 * and each pass always reconciles whatever is truly latest, so a burst of
 * rapid changes collapses into (usually) one request instead of N, and the
 * cloud can never end up holding a value older than what the customer last
 * did. On failure the loop stops (no hammering) but stays dirty, so the
 * next `retry()` — after a real network recovery, not on a fixed timer —
 * sends the current latest state, never the stale snapshot that failed.
 *
 * `reset()` bumps an epoch counter so a write already in flight when an
 * account transition happens (sign-out, or a different account signing in)
 * is discarded on arrival instead of landing under the wrong account —
 * cheaper and simpler than trying to cancel an in-flight Supabase request.
 */
export function createSyncCoordinator<T>(options: {
  reconcile: (snapshot: T) => Promise<boolean>;
  onStatusChange: (status: SyncStatus) => void;
}) {
  let latest: T | undefined;
  let hasLatest = false;
  let dirty = false;
  let running = false;
  let epoch = 0;

  async function runLoop(loopEpoch: number) {
    running = true;
    while (dirty) {
      if (loopEpoch !== epoch) {
        // Superseded by a reset() while looping (e.g. mid-await below) —
        // abandon silently. Whatever epoch is current now owns status
        // reporting; this stale loop must not touch it.
        running = false;
        return;
      }
      dirty = false;
      options.onStatusChange('syncing');
      const snapshot = latest as T;
      const ok = await options.reconcile(snapshot);
      if (loopEpoch !== epoch) {
        running = false;
        return;
      }
      if (!ok) {
        // Keep the fact that latest state still needs syncing, but stop —
        // an explicit retry (focus, mutation) decides when to try again,
        // never a tight automatic loop against a server that just failed.
        dirty = true;
        running = false;
        options.onStatusChange('error');
        return;
      }
    }
    running = false;
    options.onStatusChange('idle');
  }

  return {
    /** Record a new snapshot as the thing that must end up in the cloud. */
    update(next: T) {
      latest = next;
      hasLatest = true;
      dirty = true;
      if (!running) runLoop(epoch);
    },
    /** Re-attempt with whatever is currently latest — never a stale one. */
    retry() {
      if (running || !hasLatest) return;
      if (dirty) runLoop(epoch);
    },
    /**
     * Call on any account transition (sign-out, or a new account's merge
     * starting). Discards pending/in-flight work under the OLD identity —
     * `running` is cleared here too so a subsequent `update()` under the
     * new epoch can start its own loop immediately rather than being
     * blocked by a flag a now-abandoned loop will never get to clear.
     */
    reset() {
      epoch++;
      dirty = false;
      hasLatest = false;
      latest = undefined;
      running = false;
    },
    isRunning() {
      return running;
    },
    isDirty() {
      return dirty;
    },
  };
}

/**
 * AsyncLock
 * 
 * In-memory concurrency locking utility to prevent race conditions across:
 * 1. Customer logical quota reservations (preventing over-subscription)
 * 2. Storage pool capacity checks
 * 3. Storage account reservations
 * 
 * Ensures concurrent chunk/file upload requests are queued and processed
 * with transactional consistency without exceeding limits.
 */

class AsyncLock {
  private locks: Map<string, Promise<void>> = new Map();

  /**
   * Executes a task under a named lock key.
   * If another operation holds the lock for this key, subsequent operations wait in queue.
   */
  async withLock<T>(key: string, task: () => Promise<T>): Promise<T> {
    const currentLock = this.locks.get(key) || Promise.resolve();

    let releaseLock: () => void = () => {};
    const nextLock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    // Update lock pointer
    this.locks.set(key, currentLock.then(() => nextLock));

    await currentLock;

    try {
      return await task();
    } finally {
      releaseLock();
      // Clean up map entry if this was the last queued lock
      if (this.locks.get(key) === nextLock) {
        this.locks.delete(key);
      }
    }
  }

  /**
   * Acquire multiple locks sequentially in sorted order to prevent deadlocks.
   */
  async withMultipleLocks<T>(keys: string[], task: () => Promise<T>): Promise<T> {
    const sortedKeys = Array.from(new Set(keys)).sort();
    
    const acquireRecursive = async (index: number): Promise<T> => {
      if (index >= sortedKeys.length) {
        return task();
      }
      return this.withLock(sortedKeys[index], () => acquireRecursive(index + 1));
    };

    return acquireRecursive(0);
  }
}

export const asyncLock = new AsyncLock();

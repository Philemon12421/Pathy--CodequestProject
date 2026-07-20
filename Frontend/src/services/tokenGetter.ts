/**
 * Lazy token getter — breaks the circular dependency between api.ts and useStore.ts.
 * api.ts imports this file; useStore.ts does NOT import this file.
 * The actual useStore import is deferred to call-time via require().
 */
export function getToken(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const useStore = require('../store/useStore').default;
    return useStore.getState().token ?? null;
  } catch {
    return null;
  }
}

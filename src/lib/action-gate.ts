/** Synchronous guard: React rendering must not decide whether an action is in flight. */
export function createActionGate() {
  let pending = false;
  return {
    acquire() {
      if (pending) return false;
      pending = true;
      return true;
    },
    release() { pending = false; },
  };
}
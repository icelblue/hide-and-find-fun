// ============================================================
// errors.ts — Normalització d'errors per a blocs catch
// ============================================================
// TypeScript tipa el paràmetre de catch com `unknown`. Aquest
// helper el converteix a Error de forma segura, permetent
// accedir a .message i .stack sense `any`.
// ============================================================

export function asError(e: unknown): Error {
  if (e instanceof Error) return e;
  if (typeof e === "string") return new Error(e);
  try {
    return new Error(JSON.stringify(e));
  } catch {
    return new Error(String(e));
  }
}

// ============================================================
// auth-errors.ts — Traducció d'errors d'autenticació al català
// ============================================================
// Supabase Auth retorna missatges tècnics en anglès. Aquest helper
// els tradueix a missatges clars i accionables per l'usuari.
// ============================================================

/**
 * Tradueix un error de Supabase Auth a un missatge en català
 * comprensible per l'usuari final.
 */
export function translateAuthError(err: unknown): string {
  const raw = (err instanceof Error ? err.message : String(err ?? "")).toLowerCase();

  // Email / password incorrectes
  if (raw.includes("invalid login credentials") || raw.includes("invalid_credentials")) {
    return "Email o contrasenya incorrectes. Si encara no tens compte, registra't a sota.";
  }

  // Email no confirmat
  if (raw.includes("email not confirmed")) {
    return "Has de confirmar el teu email abans d'entrar. Revisa la safata d'entrada (i el correu brossa).";
  }

  // Usuari ja existent
  if (raw.includes("user already registered") || raw.includes("already been registered") || raw.includes("user_already_exists")) {
    return "Aquest email ja està registrat. Prova de fer login o recupera la contrasenya.";
  }

  // Password febla
  if (raw.includes("password should be at least") || raw.includes("password is too short") || raw.includes("weak_password")) {
    return "La contrasenya ha de tenir com a mínim 6 caràcters.";
  }

  // Password compromesa (HIBP)
  if (raw.includes("pwned") || raw.includes("compromised")) {
    return "Aquesta contrasenya ha aparegut en filtracions conegudes. Tria'n una altra més segura.";
  }

  // Email invàlid
  if (raw.includes("invalid email") || raw.includes("invalid format") || raw.includes("email_address_invalid")) {
    return "L'email no té un format vàlid. Revisa'l.";
  }

  // Rate limit
  if (raw.includes("rate limit") || raw.includes("too many requests") || raw.includes("over_email_send_rate_limit")) {
    return "Massa intents en poc temps. Espera uns minuts i torna-ho a provar.";
  }

  // Captcha
  if (raw.includes("captcha")) {
    return "Verificació anti-bot fallida. Recarrega la pàgina i torna-ho a provar.";
  }

  // Signup desactivat
  if (raw.includes("signup") && raw.includes("disabled")) {
    return "El registre està temporalment desactivat. Torna més tard.";
  }

  // Network
  if (raw.includes("failed to fetch") || raw.includes("networkerror") || raw.includes("network request failed")) {
    return "Error de connexió. Revisa la connexió a internet i torna-ho a provar.";
  }

  // Genèric: si el missatge original és curt i en anglès, el deixem amb prefix
  const originalMsg = err instanceof Error ? err.message : String(err ?? "");
  if (originalMsg && originalMsg.length < 120) {
    return `Error: ${originalMsg}`;
  }
  return "Hi ha hagut un error inesperat. Torna-ho a provar.";
}

/**
 * Validació local del formulari abans d'enviar a Supabase.
 * Retorna missatge d'error en català, o null si tot OK.
 */
export function validateAuthForm(opts: {
  email: string;
  password: string;
  displayName?: string;
  isSignup: boolean;
}): string | null {
  const email = opts.email.trim();
  const password = opts.password;

  if (!email) return "Introdueix el teu email.";
  // Validació regex simple (Supabase ja valida després)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "L'email no té un format vàlid.";
  }
  if (!password) return "Introdueix la contrasenya.";
  if (password.length < 6) return "La contrasenya ha de tenir com a mínim 6 caràcters.";

  if (opts.isSignup) {
    const name = (opts.displayName ?? "").trim();
    if (!name) return "Introdueix un nom de jugador.";
    if (name.length < 2) return "El nom de jugador ha de tenir com a mínim 2 caràcters.";
    if (name.length > 30) return "El nom de jugador no pot superar els 30 caràcters.";
  }

  return null;
}

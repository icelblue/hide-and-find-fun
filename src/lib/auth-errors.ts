// ============================================================
// auth-errors.ts — Traducció d'errors d'autenticació al català
// ============================================================
// Supabase Auth retorna missatges tècnics en anglès. Aquest helper
// els tradueix a missatges clars i accionables per l'usuari.
// ============================================================

/**
 * Converteix un error de Supabase Auth en una CLAU i18n
 * (authErrors.*) que el component tradueix amb t().
 */
export function translateAuthError(err: unknown): string {
  const raw = (err instanceof Error ? err.message : String(err ?? "")).toLowerCase();

  // Email / password incorrectes
  if (raw.includes("invalid login credentials") || raw.includes("invalid_credentials")) {
    return "authErrors.email_o_contrasenya_incorrec";
  }

  // Email no confirmat
  if (raw.includes("email not confirmed")) {
    return "authErrors.has_de_confirmar_el_teu_emai";
  }

  // Usuari ja existent
  if (raw.includes("user already registered") || raw.includes("already been registered") || raw.includes("user_already_exists")) {
    return "authErrors.aquest_email_ja_esta_registr";
  }

  // Password febla
  if (raw.includes("password should be at least") || raw.includes("password is too short") || raw.includes("weak_password")) {
    return "authErrors.la_contrasenya_ha_de_tenir_c";
  }

  // Password compromesa (HIBP)
  if (raw.includes("pwned") || raw.includes("compromised")) {
    return "authErrors.aquesta_contrasenya_ha_apare";
  }

  // Email invàlid
  if (raw.includes("invalid email") || raw.includes("invalid format") || raw.includes("email_address_invalid")) {
    return "authErrors.l_email_no_te_un_format_vali";
  }

  // Rate limit
  if (raw.includes("rate limit") || raw.includes("too many requests") || raw.includes("over_email_send_rate_limit")) {
    return "authErrors.massa_intents_en_poc_temps_e";
  }

  // Captcha
  if (raw.includes("captcha")) {
    return "authErrors.verificacio_anti_bot_fallida";
  }

  // Signup desactivat
  if (raw.includes("signup") && raw.includes("disabled")) {
    return "authErrors.el_registre_esta_temporalmen";
  }

  // Network
  if (raw.includes("failed to fetch") || raw.includes("networkerror") || raw.includes("network request failed")) {
    return "authErrors.error_de_connexio_revisa_la";
  }

  // Genèric: si el missatge original és curt i en anglès, el deixem amb prefix
  const originalMsg = err instanceof Error ? err.message : String(err ?? "");
  if (originalMsg && originalMsg.length < 120) {
    return `Error: ${originalMsg}`;
  }
  return "authErrors.hi_ha_hagut_un_error_inesper";
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

  if (!email) return "authErrors.introdueix_el_teu_email";
  // Validació regex simple (Supabase ja valida després)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "authErrors.l_email_no_te_un_format_vali_x";
  }
  if (!password) return "authErrors.introdueix_la_contrasenya";
  if (password.length < 6) return "authErrors.la_contrasenya_ha_de_tenir_c";

  if (opts.isSignup) {
    const name = (opts.displayName ?? "").trim();
    if (!name) return "authErrors.introdueix_un_nom_de_jugador";
    if (name.length < 2) return "authErrors.el_nom_de_jugador_ha_de_teni";
    if (name.length > 30) return "authErrors.el_nom_de_jugador_no_pot_sup";
  }

  return null;
}

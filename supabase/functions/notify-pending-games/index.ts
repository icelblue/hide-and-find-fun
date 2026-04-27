// ============================================================
// notify-pending-games — Recordatori diari per a partides pendents
// ============================================================
// Es crida per cron 1 cop al dia. Per cada partida en estat
// 'playing' o 'hiding' on no s'ha mogut res en >24h, envia
// una notificació push als jugadors implicats que tenen la PWA
// instal·lada (registrats a push_subscriptions).
//
// Anti-spam: tag "pending-game-{user_id}-{YYYY-MM-DD}" — el SW
// ja desduplica per tag, així només arriba 1 notificació al dia
// per usuari encara que tingui múltiples partides pendents.
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STALE_HOURS = 24;       // partides "pendents" si fa >24h sense moviment
const MAX_GAMES_LISTED = 2;   // al missatge de notificació

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Cercar partides actives sense moviment >24h
    const cutoff = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000).toISOString();
    const { data: staleGames, error: gErr } = await supabaseAdmin
      .from("games")
      .select("id, status, updated_at")
      .in("status", ["playing", "hiding"])
      .eq("is_story", false)
      .lt("updated_at", cutoff);

    if (gErr) throw gErr;

    if (!staleGames || staleGames.length === 0) {
      return new Response(JSON.stringify({ status: "ok", checked: 0, notified: 0, message: "No stale games" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const gameIds = staleGames.map(g => g.id);

    // 2. Obtenir jugadors d'aquestes partides
    const { data: players } = await supabaseAdmin
      .from("game_players")
      .select("user_id, game_id")
      .in("game_id", gameIds);

    if (!players || players.length === 0) {
      return new Response(JSON.stringify({ status: "ok", checked: staleGames.length, notified: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Filtrar només usuaris amb subscripció push
    const userIds = [...new Set(players.map(p => p.user_id))];
    const { data: subs } = await supabaseAdmin
      .from("push_subscriptions")
      .select("user_id")
      .in("user_id", userIds);

    const subscribedUsers = new Set((subs ?? []).map(s => s.user_id));

    // 4. Obtenir noms dels jugadors per al missatge
    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", userIds);
    const nameMap = new Map((profs ?? []).map(p => [p.user_id, p.display_name ?? "Algú"]));

    // 5. Per cada usuari subscrit, comptar les seves partides pendents i identificar rivals
    const userPending = new Map<string, { gameCount: number; rivalNames: string[] }>();
    for (const p of players) {
      if (!subscribedUsers.has(p.user_id)) continue;
      // Trobar el rival (l'altre jugador d'aquesta partida)
      const rival = players.find(pp => pp.game_id === p.game_id && pp.user_id !== p.user_id);
      const rivalName = rival ? (nameMap.get(rival.user_id) ?? "Algú") : "Algú";
      const entry = userPending.get(p.user_id) ?? { gameCount: 0, rivalNames: [] };
      entry.gameCount += 1;
      if (!entry.rivalNames.includes(rivalName)) entry.rivalNames.push(rivalName);
      userPending.set(p.user_id, entry);
    }

    if (userPending.size === 0) {
      return new Response(JSON.stringify({ status: "ok", checked: staleGames.length, notified: 0, message: "No subscribed users with pending games" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. Enviar push (1 per usuari) via send-push function
    const today = new Date().toISOString().slice(0, 10);
    let notifiedCount = 0;
    let failed = 0;

    for (const [uid, info] of userPending.entries()) {
      const rivals = info.rivalNames.slice(0, MAX_GAMES_LISTED).join(", ");
      const extra = info.rivalNames.length > MAX_GAMES_LISTED ? ` i ${info.rivalNames.length - MAX_GAMES_LISTED} més` : "";
      const title = info.gameCount === 1
        ? `🎮 Partida pendent amb ${rivals}`
        : `🎮 Tens ${info.gameCount} partides pendents`;
      const body = info.gameCount === 1
        ? `Fa més de ${STALE_HOURS}h que ${rivals} espera el teu torn!`
        : `Et toca jugar amb ${rivals}${extra}.`;

      try {
        const resp = await fetch(`${Deno.env.get("SUPABASE_URL")!}/functions/v1/send-push`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
          },
          body: JSON.stringify({
            user_ids: [uid],
            title,
            body,
            url: "/",
            tag: `pending-game-${uid}-${today}`,
          }),
        });
        if (resp.ok) {
          notifiedCount += 1;
        } else {
          failed += 1;
        }
      } catch {
        failed += 1;
      }
    }

    return new Response(JSON.stringify({
      status: "ok",
      checked: staleGames.length,
      eligible_users: userPending.size,
      notified: notifiedCount,
      failed,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

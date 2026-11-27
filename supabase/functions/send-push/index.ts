import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Web Push utilities (RFC 8291 / RFC 8188)
// We use the web-push npm package via esm.sh
import webpush from "https://esm.sh/web-push@3.6.7";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const VAPID_PUBLIC_KEY =
      "BGyv-wkUJ0c4iuBX4IsYhtK8FKsI_1bBrTQK56zg1G9qvHpbKGnYJeQofi1eXp6ezex7KvJA7qppiPdn068SMPY";
    const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
    const VAPID_SUBJECT = "mailto:maricel11alsina@gmail.com";

    if (!VAPID_PRIVATE_KEY) {
      throw new Error("VAPID_PRIVATE_KEY not configured");
    }

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const json = (status: number, payload: unknown) =>
      new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // --- Autenticació del cridador ---
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!bearer) return json(401, { error: "unauthorized" });
    const isService = bearer === serviceKey;
    let callerId: string | null = null;
    if (!isService) {
      const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData, error: userErr } = await userClient.auth.getUser(bearer);
      if (userErr || !userData?.user) return json(401, { error: "unauthorized" });
      callerId = userData.user.id;
    }

    const raw = await req.json();
    const { icon, tag } = raw ?? {};
    let { user_ids, title, body, url } = raw ?? {};

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: "user_ids array required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: "title and body required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client to read all subscriptions
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (typeof title !== "string" || typeof body !== "string") return json(400, { error: "invalid payload" });
    title = title.slice(0, 80);
    body = body.slice(0, 200);
    url = typeof url === "string" && url.startsWith("/") && !url.startsWith("//") ? url.slice(0, 200) : "/";
    user_ids = (user_ids as unknown[]).filter((u): u is string => typeof u === "string").slice(0, 10);

    // Un jugador només pot notificar rivals amb qui comparteix una partida
    if (!isService && callerId) {
      const { data: myGames } = await supabaseAdmin.from("game_players").select("game_id").eq("user_id", callerId);
      const { data: myCreated } = await supabaseAdmin.from("games").select("id, invited_user_id").eq("created_by", callerId);
      const gameIds = [...new Set([...(myGames ?? []).map((g) => g.game_id), ...(myCreated ?? []).map((g) => g.id)])];
      const allowed = new Set<string>((myCreated ?? []).map((g) => g.invited_user_id).filter(Boolean) as string[]);
      if (gameIds.length > 0) {
        const { data: mates } = await supabaseAdmin.from("game_players").select("user_id").in("game_id", gameIds);
        (mates ?? []).forEach((m) => allowed.add(m.user_id));
      }
      allowed.delete(callerId);
      user_ids = (user_ids as string[]).filter((u) => allowed.has(u));
      if (user_ids.length === 0) return json(403, { error: "forbidden" });
    }

    // Get all subscriptions for the target users
    const { data: subscriptions, error: fetchError } = await supabaseAdmin
      .from("push_subscriptions")
      .select("*")
      .in("user_id", user_ids);

    if (fetchError) {
      throw fetchError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: "No subscriptions found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: icon || "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      url,
      tag: tag || "deduction-duel",
    });

    let sent = 0;
    let failed = 0;
    const expiredEndpoints: string[] = [];

    for (const sub of subscriptions) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth_key,
        },
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
        sent++;
      } catch (err) {
        failed++;
        // 404 or 410 means subscription expired — clean up
        if (err.statusCode === 404 || err.statusCode === 410) {
          expiredEndpoints.push(sub.endpoint);
        }
        console.error(`Push failed for ${sub.endpoint}:`, (err instanceof Error ? err.message : String(err)));
      }
    }

    // Clean up expired subscriptions
    if (expiredEndpoints.length > 0) {
      await supabaseAdmin
        .from("push_subscriptions")
        .delete()
        .in("endpoint", expiredEndpoints);
    }

    return new Response(
      JSON.stringify({ sent, failed, cleaned: expiredEndpoints.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-push error:", error);
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

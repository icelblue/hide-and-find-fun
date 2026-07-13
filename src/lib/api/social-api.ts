// ============================================================
// Ítems socials i inventari personal
import { supabase } from "@/integrations/supabase/client";
import { tt } from "@/i18n/translate-data";
// ============================================================
// ============================================
// SOCIAL ITEMS
// ============================================

export type SocialItemType = "banana" | "smoke_bomb" | "shield" | "message" | "espia" | "swap" | "robar_tornavis" | "robar_llanterna" | "barricada" | "trampa";

/**
 * Social item catalog. `nameKey`/`descKey` are i18n keys — translate at render with t().
 * `name`/`desc` keep CA fallback for places that build toast messages without i18n context.
 */
export const SOCIAL_ITEMS = [
  { type: "banana" as const, icon: "🍌", nameKey: "game.socialItems.banana.name", descKey: "game.socialItems.banana.desc", name: "Plàtan", desc: "Bloqueja 1 posició del rival" },
  { type: "smoke_bomb" as const, icon: "💣", nameKey: "game.socialItems.smoke_bomb.name", descKey: "game.socialItems.smoke_bomb.desc", name: "Bomba de fum", desc: "Mou el teu objecte a altra posició" },
  { type: "shield" as const, icon: "🛡️", nameKey: "game.socialItems.shield.name", descKey: "game.socialItems.shield.desc", name: "Escut", desc: "Bloqueja el pròxim atac (1 ús)" },
  { type: "swap" as const, icon: "🔄", nameKey: "game.socialItems.swap.name", descKey: "game.socialItems.swap.desc", name: "Intercanvi", desc: "Intercanvia la teva sala amb la del rival" },
  { type: "espia" as const, icon: "🕵️", nameKey: "game.socialItems.espia.name", descKey: "game.socialItems.espia.desc", name: "Espia", desc: "Descobreix on és el rival ara" },
  { type: "barricada" as const, icon: "🚧", nameKey: "game.socialItems.barricada.name", descKey: "game.socialItems.barricada.desc", name: "Barricada", desc: "Bloqueja un camí al rival. Pot forçar pagant +1🪙 (peatge únic) — 2/dia", multiUse: true },
  { type: "trampa" as const, icon: "🪤", nameKey: "game.socialItems.trampa.name", descKey: "game.socialItems.trampa.desc", name: "Trampa", desc: "Col·loca trampa en un moble (-1🪙 al rival si mira) — 2/dia", multiUse: true },
  { type: "message" as const, icon: "💡", nameKey: "game.socialItems.message.name", descKey: "game.socialItems.message.desc", name: "Pista personalitzada", desc: "Envia una pista o farol al rival" },
  { type: "robar_tornavis" as const, icon: "🔧", nameKey: "game.socialItems.robar_tornavis.name", descKey: "game.socialItems.robar_tornavis.desc", name: "Robar tornavís", desc: "Roba 1 tornavís al rival" },
  { type: "robar_llanterna" as const, icon: "🔦", nameKey: "game.socialItems.robar_llanterna.name", descKey: "game.socialItems.robar_llanterna.desc", name: "Robar llanterna", desc: "Roba 1 llanterna al rival" },
] as const;

/**
 * Costos socials ofensius (Wave B). Ítems defensius (shield, message, smoke_bomb,
 * robar_llanterna) = gratis. Sincronitzat amb RPC `consume_social_cost`.
 */
export const SOCIAL_COSTS: Record<SocialItemType, number> = {
  banana: 0.5,
  barricada: 0.5,
  trampa: 0.5,
  espia: 0.5,
  robar_tornavis: 0.5,
  swap: 1.0,
  shield: 0,
  message: 0,
  smoke_bomb: 0,
  robar_llanterna: 0,
};

export async function sendSocialItem(
  gameId: string,
  fromPlayerId: string,
  toPlayerId: string,
  itemType: SocialItemType,
  messageText?: string,
  extraData?: { scenarioFrom?: string; scenarioTo?: string; itemId?: string },
) {
  const { data: fromPlayer } = await supabase
    .from("game_players")
    .select("social_item_used_today, id, tokens_last_reset, smoke_bomb_used, special_data")
    .eq("game_id", gameId)
    .eq("user_id", fromPlayerId)
    .single();
  if (!fromPlayer) throw new Error(tt("game.errors.playerNotFound"));

  const today = new Date().toISOString().split("T")[0];
  const isBarricadaOrTrampa = itemType === "barricada" || itemType === "trampa";

  // Barricada/trampa have their own 2x/day limit checked in the RPC
  if (!isBarricadaOrTrampa && fromPlayer.tokens_last_reset === today && fromPlayer.social_item_used_today) {
    throw new Error(tt("game.errors.socialItemUsedToday"));
  }

  // Use safe RPC to read opponent data (SELECT restricted to own rows)
  const { data: safePlayers } = await supabase.rpc("get_safe_game_players", { _game_id: gameId });
  const toPlayer = ((safePlayers as Record<string, unknown>[]) ?? []).find((p) => p.user_id === toPlayerId) ?? null;

  const blocked = !!(toPlayer?.shield_active && (itemType === "banana" || itemType === "swap" || itemType === "robar_tornavis" || itemType === "barricada"));

  const actualToPlayer = itemType === "espia" ? fromPlayerId : toPlayerId;

  let espiaResult: string | null = null;

  // Wave B: deduct social cost BEFORE any action (RPC handles validation + reset)
  const cost = SOCIAL_COSTS[itemType] ?? 0;
  if (cost > 0 && !blocked) {
    const { error: costErr } = await supabase.rpc("consume_social_cost", {
      _game_id: gameId, _cost: cost,
    });
    if (costErr) throw new Error(costErr.message);
  }

  // Execute the action FIRST, before marking as used (so if it fails, the user can retry)
  if (blocked) {
    await supabase.from("game_players").update({ shield_active: false }).eq("id", toPlayer!.id);
  } else {
    if (itemType === "shield") {
      await supabase.from("game_players").update({ shield_active: true }).eq("id", fromPlayer.id);
    } else if (itemType === "smoke_bomb") {
      const { data: bombResult, error: bombErr } = await supabase.rpc("execute_smoke_bomb", { _game_id: gameId });
      if (bombErr) throw new Error(bombErr.message);
      supabase.functions.invoke("send-push", {
        body: {
          user_ids: [toPlayerId],
          title: "💨 Bomba de fum",
          body: "El rival ha usat una bomba de fum! Ha mogut el seu objecte!",
          url: `/game/${gameId}`,
          tag: `social-${gameId}`,
        },
      }).catch(() => {});
      return { blocked: false, espiaResult: null, smokeBombResult: bombResult as Record<string, unknown> };
    } else if (itemType === "swap") {
      const { error: swapErr } = await supabase.rpc("execute_swap", { _game_id: gameId });
      if (swapErr) throw new Error(swapErr.message);
    } else if (itemType === "espia") {
      // Trail: últims escenaris on s'ha mogut el rival (incloent l'actual)
      const { data: rivalMoves } = await supabase
        .from("game_moves")
        .select("target_scenario_id, created_at")
        .eq("game_id", gameId)
        .eq("player_id", toPlayerId)
        .eq("action", "move")
        .not("target_scenario_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(8);

      const seen = new Set<string>();
      const trailIds: string[] = [];
      const currentId = toPlayer?.current_scenario_id;
      if (currentId) { trailIds.push(currentId); seen.add(currentId); }
      for (const m of rivalMoves ?? []) {
        const sid = m.target_scenario_id as string | null;
        if (!sid || seen.has(sid)) continue;
        seen.add(sid);
        trailIds.push(sid);
        if (trailIds.length >= 3) break;
      }

      if (trailIds.length === 0) {
        espiaResult = "🤷 El rival encara no s'ha mogut!";
      } else {
        const { data: scenarios } = await supabase
          .from("scenarios")
          .select("id, name, icon")
          .in("id", trailIds);
        const byId = new Map((scenarios ?? []).map((s) => [s.id, `${s.icon} ${s.name}`]));
        const labels = trailIds.map(id => byId.get(id) ?? "📍").filter(Boolean);
        // [actual, anterior, anterior-1] separats per fletxa cap enrere
        espiaResult = labels.join(" ← ");
      }
    } else if (itemType === "robar_tornavis") {
      const { error: robarErr } = await supabase.rpc("execute_robar_tornavis", { _game_id: gameId });
      if (robarErr) throw new Error(robarErr.message);
    } else if (itemType === "robar_llanterna") {
      const { error: robarErr } = await supabase.rpc("execute_robar_llanterna", { _game_id: gameId });
      if (robarErr) throw new Error(robarErr.message);
      // RPC ja insereix a game_social_items, no marquem social_item_used_today (és gratis)
      return { blocked: false, espiaResult: null };
    } else if (itemType === "barricada") {
      if (!extraData?.scenarioFrom || !extraData?.scenarioTo) throw new Error(tt("game.errors.mustSelectPath"));
      const { data: barResult, error: barErr } = await supabase.rpc("execute_barricada", {
        _game_id: gameId, _scenario_from: extraData.scenarioFrom, _scenario_to: extraData.scenarioTo,
      });
      if (barErr) throw new Error(barErr.message);
      if (barResult?.blocked) {
        return { blocked: true, espiaResult: null };
      }
      supabase.functions.invoke("send-push", {
        body: {
          user_ids: [toPlayerId],
          title: "🚧 Barricada!",
          body: "El rival ha barricadat un camí! Costa +1🪙 per forçar el pas.",
          url: `/game/${gameId}`, tag: `social-${gameId}`,
        },
      }).catch(() => {});
      return { blocked: false, espiaResult: null, barricadaResult: barResult as Record<string, unknown> };
    } else if (itemType === "trampa") {
      if (!extraData?.itemId) throw new Error("Has de seleccionar un moble!");
      const { data: trapResult, error: trapErr } = await supabase.rpc("execute_trampa", {
        _game_id: gameId, _item_id: extraData.itemId,
      });
      if (trapErr) throw new Error(trapErr.message);
      supabase.functions.invoke("send-push", {
        body: {
          user_ids: [toPlayerId],
          title: "🪤 Trampa!",
          body: "El rival ha col·locat una trampa en algun moble...",
          url: `/game/${gameId}`, tag: `social-${gameId}`,
        },
      }).catch(() => {});
      return { blocked: false, espiaResult: null, trampaResult: trapResult as Record<string, unknown> };
    }
  }

  // Mark as used AFTER successful action (barricada/trampa use their own counter via RPC)
  if (!isBarricadaOrTrampa) {
    await supabase.from("game_players").update({ social_item_used_today: true }).eq("id", fromPlayer.id);
  }

  await supabase.from("game_social_items").insert({
    game_id: gameId,
    from_player_id: fromPlayerId,
    to_player_id: actualToPlayer,
    item_type: itemType,
    message_text: messageText,
    blocked_by_shield: blocked,
  });

  // Send push notification for social items (fire & forget)
  if (itemType !== "espia" && itemType !== "shield" && toPlayerId !== fromPlayerId) {
    const itemLabels: Record<string, string> = {
      banana: "🍌 Plàtan", smoke_bomb: "💨 Bomba de fum",
      message: "💬 Missatge", swap: "🔄 Intercanvi", robar_tornavis: "🔧 Robatori",
      barricada: "🚧 Barricada", trampa: "🪤 Trampa",
    };
    supabase.functions.invoke("send-push", {
      body: {
        user_ids: [toPlayerId],
        title: blocked ? "🛡️ Escut activat!" : (itemLabels[itemType] ?? "📦 Ítem social"),
        body: blocked
          ? "Un ítem social ha estat bloquejat pel teu escort!"
          : `Has rebut ${itemLabels[itemType] ?? "un ítem social"}${messageText ? `: ${messageText}` : ""}`,
        url: `/game/${gameId}`,
        tag: `social-${gameId}`,
      },
    }).catch(() => {});
  }

  return { blocked, espiaResult };
}

export async function getUnprocessedSocialItems(gameId: string, playerId: string) {
  const { data, error } = await supabase
    .from("game_social_items")
    .select("*")
    .eq("game_id", gameId)
    .eq("to_player_id", playerId)
    .eq("processed", false)
    .eq("blocked_by_shield", false)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function markSocialItemProcessed(itemId: string) {
  await supabase.from("game_social_items").update({ processed: true }).eq("id", itemId);
}

// ============================================
// INVENTORY
// ============================================

export async function getPlayerInventory(userId: string) {
  const { data, error } = await supabase
    .from("player_inventory")
    .select("*")
    .eq("user_id", userId)
    .is("gifted_to", null)
    .order("collected_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function giftInventoryItem(itemId: string, toUserId: string) {
  const { error } = await supabase
    .from("player_inventory")
    .update({ gifted_to: toUserId, gifted_at: new Date().toISOString() })
    .eq("id", itemId);
  if (error) throw error;
}

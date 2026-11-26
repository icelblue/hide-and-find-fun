import { test, expect } from "@playwright/test";

const hostState = process.env.PVP_HOST_STATE_PATH;
const guestState = process.env.PVP_GUEST_STATE_PATH;

// Supply two temporary users' storage-state files; never commit sessions or credentials.
test("recovered PvP: hide, safe actions, realtime result and readback", async ({ browser }) => {
  test.skip(!hostState || !guestState, "Two temporary authenticated players are required");
  if (!hostState || !guestState) return;
  const hostContext = await browser.newContext({ baseURL: "http://localhost:8080", storageState: hostState, viewport: { width: 390, height: 844 } });
  const guestContext = await browser.newContext({ baseURL: "http://localhost:8080", storageState: guestState, viewport: { width: 390, height: 844 } });
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();
  const errors: string[] = [];
  host.on("pageerror", e => errors.push(e.message));
  guest.on("pageerror", e => errors.push(e.message));
  try {
    await host.goto("/");
    await host.getByRole("button", { name: /Crear partida/ }).click();
    await expect(host.getByText("Què amagues?", { exact: true })).toBeVisible();
    const gameUrl = host.url();
    const code = (await host.locator("main").innerText()).match(/\b[A-Z0-9]{6}\b/)?.[0];
    if (!code) throw new Error("Game code missing");
    for (const name of ["Clau", "Cuina", "Taula", "Sobre"]) await host.getByText(name, { exact: true }).click();
    await expect(host.getByText("Objecte amagat!", { exact: true })).toBeVisible();
    await guest.goto("/");
    await guest.getByPlaceholder("Ex: A3B7K2").fill(code);
    await guest.getByRole("button", { name: "Entrar", exact: true }).click();
    for (const name of ["Moneda", "Cuina", "Taula", "Sota"]) await guest.getByText(name, { exact: true }).click();
    await expect(host.getByText("Ubicació", { exact: true })).toBeVisible();
    await expect(guest.getByText("Ubicació", { exact: true })).toBeVisible();

    const state = await host.evaluate(`(async () => {
      const {supabase} = await import('/src/integrations/supabase/client.ts');
      const id = location.pathname.split('/').pop();
      const [p,s,c,safe] = await Promise.all([
        supabase.from('game_players').select('id,user_id,current_scenario_id,tokens_remaining').eq('game_id',id).single(),
        supabase.from('scenarios').select('id,name'),
        supabase.from('scenario_connections').select('scenario_a,scenario_b'),
        supabase.rpc('get_safe_game_players',{_game_id:id})
      ]);
      const attempts = [];
      attempts.push((await supabase.from('game_players').update({tokens_remaining:999}).eq('id',p.data.id)).error?.message);
      attempts.push((await supabase.from('game_players').update({tools:{llanterna:999}}).eq('id',p.data.id)).error?.message);
      attempts.push((await supabase.from('games').update({winner_id:p.data.user_id,status:'finished'}).eq('id',id)).error?.message);
      attempts.push((await supabase.rpc('execute_game_move',{_game_id:id,_action:'look',_is_story:true})).error?.message);
      attempts.push((await supabase.rpc('execute_game_move',{_game_id:id,_action:'confirm',_is_story:false})).error?.message);
      const after = await supabase.from('game_players').select('tokens_remaining').eq('id',p.data.id).single();
      const ratings = await supabase.from('profiles').select('user_id,elo').in('user_id',safe.data.map(p => p.user_id));
      return {player:p.data,scenarios:s.data,connections:c.data,attempts,after:after.data,safe:safe.data,ratings:ratings.data};
    })()`) as {
      player: { id: string; user_id: string; current_scenario_id: string; tokens_remaining: number };
      scenarios: { id: string; name: string }[];
      connections: { scenario_a: string; scenario_b: string }[];
      attempts: (string | undefined)[];
      after: { tokens_remaining: number };
      safe: { user_id: string; hidden_item_id?: string | null; hidden_object_id?: string | null }[];
      ratings: { user_id: string; elo: number }[];
    };
    expect(state.player.tokens_remaining).toBe(5);
    expect(state.after.tokens_remaining).toBe(5);
    expect(state.attempts).toHaveLength(5);
    for (const error of state.attempts) expect(error).toBeTruthy();
    const rival = state.safe.find(p => p.user_id !== state.player.user_id);
    expect(rival).toBeDefined();
    expect(rival?.hidden_item_id ?? null).toBeNull();
    expect(rival?.hidden_object_id ?? null).toBeNull();
    const target = state.scenarios.find(s => s.name === "Cuina")?.id;
    if (!target) throw new Error("Kitchen missing");
    const queue = [{ id: state.player.current_scenario_id, route: [] as string[] }];
    const seen = new Set([state.player.current_scenario_id]);
    let route: string[] | undefined;
    for (const node of queue) {
      if (node.id === target) { route = node.route; break; }
      for (const connection of state.connections) {
        const next = connection.scenario_a === node.id ? connection.scenario_b : connection.scenario_b === node.id ? connection.scenario_a : undefined;
        if (next && !seen.has(next)) { seen.add(next); queue.push({ id: next, route: [...node.route, next] }); }
      }
    }
    if (!route) throw new Error("Kitchen unreachable");
    for (const id of route) {
      const name = state.scenarios.find(s => s.id === id)?.name;
      if (!name) throw new Error("Scenario missing");
      const door = host.getByRole("button").filter({ has: host.getByText(name, { exact: true }) });
      await door.click();
      await expect(door).toHaveCount(0);
    }
    // A similar furniture hint is not a win, and the observation must persist.
    await host.getByRole("button", { name: /Cadira.*accions/i }).click();
    const [observation] = await Promise.all([
      host.waitForResponse(response => response.url().includes("/rpc/execute_game_move") && response.request().postDataJSON()?._action === "look"),
      host.getByRole("button", { name: "Sobre Cadira", exact: true }).click(),
    ]);
    expect(observation.ok()).toBe(true);
    expect((await observation.json()).found_object).toBe(false);
    await expect(host.getByRole("button", { name: "Sobre Cadira", exact: true })).toBeDisabled();
    await expect(host.getByText("Victòria!", { exact: true })).toHaveCount(0);
    await host.reload();
    await host.getByRole("button", { name: /Cadira.*accions/i }).click();
    await expect(host.getByRole("button", { name: "Sobre Cadira", exact: true })).toBeDisabled();
    await host.getByRole("button", { name: /Taula.*accions/i }).click();
    await host.getByRole("button", { name: "Sota Taula", exact: true }).click();
    await expect(host.getByText("Victòria!", { exact: true })).toBeVisible();
    // Same guest page, no reload: proves the result reaches the rival live.
    await expect(guest.getByText("Derrota...", { exact: true })).toBeVisible();
    await host.goto(gameUrl);
    await expect(host.getByText("Victòria!", { exact: true })).toBeVisible();
    // The winner is told which rival object was found (guest hid Moneda), also after reload.
    await expect(host.getByLabel("Objecte trobat").getByText("Moneda", { exact: true })).toBeVisible();

    const histories = await host.evaluate(`(async () => {
      const {supabase} = await import('/src/integrations/supabase/client.ts');
      const id = location.pathname.split('/').pop();
      const rows = await supabase.from('player_match_results').select('*').eq('game_id',id);
      const changes = [];
      changes.push((await supabase.from('player_match_results').update({elo_after:9999}).eq('game_id',id)).error?.message);
      changes.push((await supabase.from('player_match_results').delete().eq('game_id',id)).error?.message);
      const after = await supabase.from('player_match_results').select('*').eq('game_id',id);
      const ratings = await supabase.from('profiles').select('user_id,elo').in('user_id',rows.data.map(r => r.user_id));
      const profileHistory = await supabase.rpc('get_player_match_history',{_user_id:rows.data[0].user_id});
      return {rows:rows.data,after:after.data,ratings:ratings.data,changes,profileHistory:profileHistory.data};
    })()`) as {
      rows: { user_id: string; elo_before: number; elo_after: number; elo_change: number; result: string; game_code: string }[];
      after: { user_id: string; elo_before: number; elo_after: number; elo_change: number; result: string; game_code: string }[];
      ratings: { user_id: string; elo: number }[];
      changes: (string | undefined)[];
      profileHistory: { matches: { game_code: string }[] };
    };
    expect(histories.rows).toHaveLength(2);
    for (const row of histories.rows) {
      expect(row.elo_before).toBe(state.ratings.find(r => r.user_id === row.user_id)?.elo);
      expect(row.elo_after).toBe(histories.ratings.find(r => r.user_id === row.user_id)?.elo);
      expect(row.elo_change).toBe(row.elo_after - row.elo_before);
      expect(row.result).toBe(row.user_id === state.player.user_id ? "win" : "loss");
    }
    expect(histories.after).toEqual(histories.rows);
    for (const error of histories.changes) expect(error).toBeTruthy();
    expect(histories.profileHistory.matches.some(m => m.game_code === code)).toBe(true);
    await host.goto("/profile");
    await expect(host.getByRole("region", { name: "Partides recents" }).getByText(code, { exact: true })).toBeVisible();
    const rivalId = state.safe.find(p => p.user_id !== state.player.user_id)?.user_id;
    if (!rivalId) throw new Error("Rival missing");
    await host.goto(`/player/${rivalId}`);
    await expect(host.getByRole("region", { name: "Partides recents" }).getByText(code, { exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    await hostContext.close();
    await guestContext.close();
  }
});
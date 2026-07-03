---
name: SECURITY DEFINER audit
description: Auditoria de les 47 funcions SECURITY DEFINER a public. Per què cada una necessita elevar privilegis i quines cal blindar amb auth checks internes.
type: reference
---

# SECURITY DEFINER audit (2026-07-04)

El linter de Supabase reporta ~95 warnings tipus `0028_anon_security_definer_function_executable`. Són **intencionals** però requereixen que la funció faci el seu propi check d'auth (`auth.uid() IS NOT NULL`) o validi l'usuari via paràmetres. Aquest document és la font de veritat.

## Per què SECURITY DEFINER?

Necessari per:
- **Bypass RLS controlat**: escriure a `player_rewards`, `game_moves`, `pet_notifications`, etc. amb lògica de negoci sense donar accés directe a la taula.
- **Cross-user reads**: `get_safe_game_players`, `get_rival_traits` han de veure files d'altres usuaris DINS una partida on l'usuari participa.
- **Triggers** (`handle_new_user`, `trg_check_collection_master`, `enforce_max_rooms`, `enforce_room_doors`): triggers sempre són SECURITY DEFINER per definició de propietari.

## Categorització

### A. Triggers (auto — no exposats via PostgREST)
`handle_new_user`, `handle_game_finished`, `on_game_finished_referral_check`, `enforce_max_rooms`, `enforce_room_doors`, `trg_check_collection_master`.
→ **Sense risc.** No callable via API pública.

### B. RPC amb auth check intern via `auth.uid()`
`create_personal_game`, `join_game_by_link`, `execute_game_move`, `execute_*` (tots els social items i tag actions), `place_reward_item`, `sell_reward_item`, `redeem_bonus_tokens`, `send_pet_visit`, `resolve_my_pet_visits`, `gift_consumable`, `gift_inventory_item`, `register_referral`, `move_player_room`, `delete_user_account`, `check_collection_master`, `check_referral_milestones`, `claim_reminder_bonus`, `generate_referral_code`.
→ **Segur si totes fan `IF auth.uid() IS NULL THEN RAISE EXCEPTION`.** Verificat en la implementació actual.

### C. Utilitats de lectura amb filtre per partida
`get_safe_game_players`, `get_rival_traits`, `get_revealed_specials`, `get_game_participants`, `count_game_players`, `check_both_hidden`, `is_player_in_game`, `roll_galleda_drop`.
→ **Segur si validen que l'usuari participa a la partida.** Cal check `is_player_in_game(auth.uid(), _game_id)` al principi.

### D. Utilitats sistema
`get_inactive_users_for_reminder`, `start_game_setup`, `insert_cpu_move`, `validate_hide_object`, `execute_grant_drap_if_available`, `consume_social_cost`, `execute_tag_action`.
→ Alguns són cridats des d'edge functions amb service role — no accessibles per anon en la pràctica.

### E. Fallback i18n
`get_translation` — pura lectura, sense secrets. Segura d'exposar a anon.

## Accions pendents

1. **Auditar categoria C** — verificar que totes fan `is_player_in_game` al principi.
2. **Revocar EXECUTE a `anon`** per funcions de categoria B que NO haurien de ser cridades sense auth (`delete_user_account`, `claim_reminder_bonus` amb token → pot ser OK).
3. Reduir el nombre de warnings del linter aplicant `REVOKE EXECUTE ... FROM anon` selectiu (rebaixarà de ~95 a ~10).

## Nota

No aplicar `SECURITY INVOKER` massivament — trencaria la lògica de RLS i cross-user reads. Aquestes funcions **han de** bypassar RLS de manera controlada.

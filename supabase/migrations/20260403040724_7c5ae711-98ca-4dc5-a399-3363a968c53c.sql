
CREATE OR REPLACE FUNCTION public.place_reward_item(_player_reward_id uuid, _scenario_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  _reward reward_items%ROWTYPE;
  _pr player_rewards%ROWTYPE;
  _max_order INTEGER;
  _current_count INTEGER;
  _max_items INTEGER;
BEGIN
  SELECT * INTO _pr FROM player_rewards WHERE id = _player_reward_id AND user_id = auth.uid() AND status = 'owned';
  IF NOT FOUND THEN RAISE EXCEPTION 'Recompensa no trobada';
  END IF;

  SELECT * INTO _reward FROM reward_items WHERE id = _pr.reward_item_id;
  IF _reward.placed_in_scenario_id IS NOT NULL THEN RAISE EXCEPTION 'Aquest moble ja està col·locat a un escenari';
  END IF;

  -- Check max_items limit
  SELECT s.max_items, COUNT(i.id)
  INTO _max_items, _current_count
  FROM scenarios s
  LEFT JOIN items i ON i.scenario_id = s.id
  WHERE s.id = _scenario_id
  GROUP BY s.max_items;

  IF _current_count >= _max_items THEN
    RAISE EXCEPTION 'Aquest escenari ja té el màxim de mobles (%)' , _max_items;
  END IF;

  SELECT COALESCE(MAX(display_order), 0) INTO _max_order FROM items WHERE scenario_id = _scenario_id;

  INSERT INTO items (name, icon, scenario_id, display_order) VALUES (_reward.name, _reward.icon, _scenario_id, _max_order + 1);
  UPDATE reward_items SET placed_in_scenario_id = _scenario_id, placed_by = auth.uid(), placed_at = now() WHERE id = _reward.id;
  UPDATE player_rewards SET status = 'placed' WHERE id = _player_reward_id;
END;
$$;

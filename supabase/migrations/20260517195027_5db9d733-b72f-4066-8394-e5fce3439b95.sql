
-- v6 — Mons nous + Social entre mascotes (chapter max=8)

-- 1) Tres mons nous
INSERT INTO public.story_worlds (id, name, icon, description, start_node_id, chapters, display_order, unlock_rule)
VALUES
  ('beach',   'Platja',  '🏖️', 'Sorra calenta i mar blau. Hi ha qui parla de tresors sota les ones.',
    'beach_start',  ARRAY[3,4]::int[], 5, '{"level":4}'::jsonb),
  ('volcano', 'Volcà',   '🌋', 'Un lloc on el sol crema des de sota. Només els valents s''hi acosten.',
    'volcano_start',ARRAY[6,7]::int[], 6, '{"recipes":3,"level":6}'::jsonb),
  ('dreams',  'Somnis',  '🌌', 'Un món només accessible mentre la mascota descansa profundament.',
    'dreams_start', ARRAY[8]::int[],   7, '{"level":8,"bond":70}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  unlock_rule = EXCLUDED.unlock_rule,
  display_order = EXCLUDED.display_order;

-- 2) Nodes (tots ≤ chapter 8)
INSERT INTO public.story_nodes (id, chapter, title, narrative, is_ending, ending_type) VALUES
  ('beach_start', 3, 'Arribada a la platja',
    '{pet} sent la sorra calenta sota les potes. El mar fa olor de sal i hi ha una petxina brillant a la vora.',
    false, NULL),
  ('beach_shell', 3, 'La petxina que canta',
    'La petxina vibra. Si l''acostes a l''orella sents una melodia antiga. Sembla guiar-te cap a algun lloc.',
    false, NULL),
  ('beach_cave', 4, 'Cova oculta',
    'Seguint la melodia, {pet} troba una cova darrere d''una roca. Hi ha algú dins?',
    false, NULL),
  ('beach_end_treasure', 4, 'El tresor del mar',
    'Dins la cova brilla un cofre amb petxines i una nota: "per a qui escolti".',
    true, 'good'),
  ('beach_end_storm', 4, 'Tempesta sobtada',
    'Una tempesta arriba sense avís. {pet} s''ha de refugiar fins l''endemà.',
    true, 'neutral'),

  ('volcano_start', 6, 'Camí del volcà',
    'L''aire crema. {pet} avança per un camí de roca negra. Un guardià de pedra bloqueja el pas.',
    false, NULL),
  ('volcano_trial', 6, 'La prova del coratge',
    'El guardià parla: "Demostra el teu valor o torna enrere". Tens dues opcions.',
    false, NULL),
  ('volcano_end_hero', 7, 'Forjat al foc',
    '{pet} ha passat la prova. La calor ja no la fa por: ha esdevingut una llegenda.',
    true, 'good'),
  ('volcano_end_burn', 7, 'Massa a prop del foc',
    'Una espurna escapa i {pet} es retira amb una cicatriu però viva.',
    true, 'neutral'),

  ('dreams_start', 8, 'Entrada als Somnis',
    'Mentre {pet} dorm profundament, es desperta en un món de núvols i estrelles flotants.',
    false, NULL),
  ('dreams_choice', 8, 'Les tres portes',
    'Tres portes flotants apareixen: una de plata, una d''or, una de fusta vella.',
    false, NULL),
  ('dreams_end_silver', 8, 'La porta de plata',
    '{pet} desperta amb una claredat nova als ulls. Ha entès alguna cosa profunda.',
    true, 'good'),
  ('dreams_end_wood', 8, 'La porta de fusta',
    'La porta porta a un record càlid de la infància. {pet} desperta amb un somriure.',
    true, 'good')
ON CONFLICT (id) DO NOTHING;

-- 3) Choices
INSERT INTO public.story_choices (node_id, choice_order, label, next_node_id, reward_type, reward_value, state_delta, requires_skill) VALUES
  ('beach_start', 1, 'Recollir la petxina i escoltar', 'beach_shell',
    'item', '{"item_id":"shell","name":"Petxina del mar","icon":"🐚"}'::jsonb, '{"bond":5,"fear":-5}'::jsonb, NULL),
  ('beach_start', 2, 'Caminar fins a la roca lluny', 'beach_shell',
    'xp', '{"xp":30}'::jsonb, '{"sleep":10}'::jsonb, NULL),
  ('beach_start', 3, 'Olorar el rastre amb cura', 'beach_cave',
    'xp', '{"xp":50}'::jsonb, '{"bond":5}'::jsonb, 'smell'),

  ('beach_shell', 1, 'Seguir la melodia', 'beach_cave',
    'item', '{"item_id":"melody_stone","name":"Pedra melòdica","icon":"🎵"}'::jsonb, '{"bond":10}'::jsonb, NULL),
  ('beach_shell', 2, 'Ignorar i banyar-se', 'beach_end_storm',
    'consumable', '{"consumable":"Aigua"}'::jsonb, '{"hunger":-10,"sleep":-5}'::jsonb, NULL),

  ('beach_cave', 1, 'Entrar amb coratge', 'beach_end_treasure',
    'accessory', '{"accessory":"Corona de petxines","icon":"👑"}'::jsonb, '{"bond":15,"fear":-20}'::jsonb, 'courage'),
  ('beach_cave', 2, 'Entrar amb cautela', 'beach_end_treasure',
    'item', '{"item_id":"sea_pearl","name":"Perla marina","icon":"🦪"}'::jsonb, '{"bond":10}'::jsonb, NULL),
  ('beach_cave', 3, 'Marxar', 'beach_end_storm',
    'xp', '{"xp":20}'::jsonb, '{"fear":10}'::jsonb, NULL),

  ('volcano_start', 1, 'Enfrontar-se al guardià', 'volcano_trial',
    'xp', '{"xp":40}'::jsonb, '{"fear":15,"bond":5}'::jsonb, NULL),
  ('volcano_start', 2, 'Cercar un camí lateral', 'volcano_trial',
    'item', '{"item_id":"volcano_rock","name":"Roca volcànica","icon":"🪨"}'::jsonb, '{"sleep":15}'::jsonb, NULL),
  ('volcano_start', 3, 'Forçar el pas amb força bruta', 'volcano_trial',
    'xp', '{"xp":60}'::jsonb, '{"fear":-10}'::jsonb, 'strength'),

  ('volcano_trial', 1, 'Saltar la prova del foc', 'volcano_end_hero',
    'accessory', '{"accessory":"Mantell de flames","icon":"🔥"}'::jsonb, '{"bond":20,"fear":-30}'::jsonb, 'courage'),
  ('volcano_trial', 2, 'Esquivar amb astúcia', 'volcano_end_burn',
    'item', '{"item_id":"ember","name":"Brasa eterna","icon":"✨"}'::jsonb, '{"fear":20}'::jsonb, NULL),

  ('dreams_start', 1, 'Caminar entre núvols', 'dreams_choice',
    'item', '{"item_id":"star_dust","name":"Pols d''estrella","icon":"💫"}'::jsonb, '{"sleep":-20,"bond":5}'::jsonb, NULL),
  ('dreams_start', 2, 'Volar amb les estrelles', 'dreams_choice',
    'xp', '{"xp":80}'::jsonb, '{"bond":15}'::jsonb, 'empathy'),

  ('dreams_choice', 1, 'Porta de plata (saviesa)', 'dreams_end_silver',
    'accessory', '{"accessory":"Diadema de plata","icon":"🌙"}'::jsonb, '{"bond":15}'::jsonb, NULL),
  ('dreams_choice', 2, 'Porta d''or (poder)', 'dreams_end_silver',
    'consumable', '{"consumable":"Vacuna"}'::jsonb, '{"fear":-20}'::jsonb, NULL),
  ('dreams_choice', 3, 'Porta de fusta (records)', 'dreams_end_wood',
    'item', '{"item_id":"dream_diary","name":"Diari de somnis","icon":"📖"}'::jsonb, '{"bond":25}'::jsonb, NULL)
ON CONFLICT DO NOTHING;

-- 4) Recepta nova
INSERT INTO public.story_recipes (id, name, icon, description, requires_items, result_item_id, result_item_name, result_item_icon)
VALUES
  ('amulet_seafire', 'Amulet de mar i foc', '🔱',
    'Combina petxina del mar amb roca volcànica per a un amulet protector.',
    '["shell","volcano_rock"]'::jsonb,
    'amulet_seafire', 'Amulet mar-foc', '🔱')
ON CONFLICT (id) DO NOTHING;

-- 5) Visites entre mascotes
CREATE TABLE IF NOT EXISTS public.pet_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_user_id uuid NOT NULL,
  host_user_id uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  resolved_at timestamptz,
  outcome text CHECK (outcome IN ('friends','neutral','enemies')),
  visitor_delta jsonb DEFAULT '{}'::jsonb,
  host_delta jsonb DEFAULT '{}'::jsonb,
  seen_by_host boolean NOT NULL DEFAULT false,
  seen_by_visitor boolean NOT NULL DEFAULT false,
  CHECK (visitor_user_id <> host_user_id)
);
CREATE INDEX IF NOT EXISTS idx_pet_visits_host ON public.pet_visits(host_user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_pet_visits_visitor ON public.pet_visits(visitor_user_id, started_at DESC);

ALTER TABLE public.pet_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own visits" ON public.pet_visits
  FOR SELECT TO authenticated
  USING (visitor_user_id = auth.uid() OR host_user_id = auth.uid());
CREATE POLICY "Mark visits seen" ON public.pet_visits
  FOR UPDATE TO authenticated
  USING (visitor_user_id = auth.uid() OR host_user_id = auth.uid());

-- 6) Relacions
CREATE TABLE IF NOT EXISTS public.pet_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL,
  user_b uuid NOT NULL,
  status text NOT NULL DEFAULT 'neutral' CHECK (status IN ('friends','neutral','enemies')),
  score smallint NOT NULL DEFAULT 0,
  interactions_count int NOT NULL DEFAULT 0,
  last_interaction_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_a, user_b),
  CHECK (user_a < user_b)
);
CREATE INDEX IF NOT EXISTS idx_pet_rel_a ON public.pet_relationships(user_a);
CREATE INDEX IF NOT EXISTS idx_pet_rel_b ON public.pet_relationships(user_b);

ALTER TABLE public.pet_relationships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Relationships viewable" ON public.pet_relationships
  FOR SELECT TO authenticated USING (true);

-- 7) RPC send_pet_visit
CREATE OR REPLACE FUNCTION public.send_pet_visit(_host_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _visitor_id uuid := auth.uid();
  _last_visit timestamptz;
  _host_pet record;
  _visitor_pet record;
BEGIN
  IF _visitor_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _visitor_id = _host_user_id THEN RAISE EXCEPTION 'No pots enviar la mascota a casa teva!'; END IF;

  SELECT * INTO _visitor_pet FROM player_pets WHERE user_id = _visitor_id;
  IF _visitor_pet IS NULL THEN RAISE EXCEPTION 'No tens cap mascota'; END IF;
  IF _visitor_pet.xp >= COALESCE(_visitor_pet.max_xp, 5000) THEN RAISE EXCEPTION 'La teva mascota està morta'; END IF;

  SELECT * INTO _host_pet FROM player_pets WHERE user_id = _host_user_id;
  IF _host_pet IS NULL THEN RAISE EXCEPTION 'L''altre jugador no té mascota'; END IF;

  SELECT MAX(started_at) INTO _last_visit
  FROM pet_visits
  WHERE visitor_user_id = _visitor_id AND host_user_id = _host_user_id;
  IF _last_visit IS NOT NULL AND _last_visit > (now() - interval '4 hours') THEN
    RAISE EXCEPTION 'Espera % min abans de tornar a enviar-la',
      ROUND(EXTRACT(EPOCH FROM (_last_visit + interval '4 hours' - now())) / 60);
  END IF;

  INSERT INTO pet_visits (visitor_user_id, host_user_id) VALUES (_visitor_id, _host_user_id);
  RETURN jsonb_build_object('success', true, 'ends_in_minutes', 30);
END;
$$;

-- 8) RPC resolve_my_pet_visits
CREATE OR REPLACE FUNCTION public.resolve_my_pet_visits()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _v record;
  _visitor_bond smallint;
  _host_bond smallint;
  _compat smallint;
  _outcome text;
  _vdelta jsonb;
  _hdelta jsonb;
  _score_change smallint;
  _user_a uuid;
  _user_b uuid;
  _resolved_count int := 0;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  FOR _v IN
    SELECT * FROM pet_visits
    WHERE (visitor_user_id = _user_id OR host_user_id = _user_id)
      AND resolved_at IS NULL
      AND ends_at <= now()
    ORDER BY ends_at
    LIMIT 20
  LOOP
    SELECT bond INTO _visitor_bond FROM pet_state WHERE user_id = _v.visitor_user_id;
    SELECT bond INTO _host_bond FROM pet_state WHERE user_id = _v.host_user_id;
    _visitor_bond := COALESCE(_visitor_bond, 40);
    _host_bond := COALESCE(_host_bond, 40);

    _compat := ((_visitor_bond + _host_bond) / 2) + (floor(random() * 41)::int - 20);

    IF _compat >= 60 THEN
      _outcome := 'friends';
      _vdelta := '{"bond":10,"fear":-5}'::jsonb;
      _hdelta := '{"bond":10,"fear":-5}'::jsonb;
      _score_change := 2;
    ELSIF _compat >= 30 THEN
      _outcome := 'neutral';
      _vdelta := '{"bond":3}'::jsonb;
      _hdelta := '{"bond":3}'::jsonb;
      _score_change := 0;
    ELSE
      _outcome := 'enemies';
      _vdelta := '{"bond":-5,"fear":10}'::jsonb;
      _hdelta := '{"bond":-5,"fear":10}'::jsonb;
      _score_change := -2;
    END IF;

    UPDATE pet_state SET
      bond = LEAST(100, GREATEST(0, bond + COALESCE((_vdelta->>'bond')::int, 0))),
      fear = LEAST(100, GREATEST(0, fear + COALESCE((_vdelta->>'fear')::int, 0))),
      updated_at = now()
    WHERE user_id = _v.visitor_user_id;

    UPDATE pet_state SET
      bond = LEAST(100, GREATEST(0, bond + COALESCE((_hdelta->>'bond')::int, 0))),
      fear = LEAST(100, GREATEST(0, fear + COALESCE((_hdelta->>'fear')::int, 0))),
      updated_at = now()
    WHERE user_id = _v.host_user_id;

    IF _v.visitor_user_id::text < _v.host_user_id::text THEN
      _user_a := _v.visitor_user_id; _user_b := _v.host_user_id;
    ELSE
      _user_a := _v.host_user_id; _user_b := _v.visitor_user_id;
    END IF;

    INSERT INTO pet_relationships (user_a, user_b, status, score, interactions_count, last_interaction_at)
    VALUES (_user_a, _user_b, _outcome, _score_change, 1, now())
    ON CONFLICT (user_a, user_b) DO UPDATE SET
      score = pet_relationships.score + _score_change,
      interactions_count = pet_relationships.interactions_count + 1,
      last_interaction_at = now(),
      status = CASE
        WHEN pet_relationships.score + _score_change >= 3 THEN 'friends'
        WHEN pet_relationships.score + _score_change <= -3 THEN 'enemies'
        ELSE 'neutral'
      END;

    UPDATE pet_visits SET
      resolved_at = now(),
      outcome = _outcome,
      visitor_delta = _vdelta,
      host_delta = _hdelta
    WHERE id = _v.id;

    _resolved_count := _resolved_count + 1;
  END LOOP;

  RETURN jsonb_build_object('resolved', _resolved_count);
END;
$$;

-- 9) RPC gift_inventory_item
CREATE OR REPLACE FUNCTION public.gift_inventory_item(_to_user_id uuid, _item_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _from_id uuid := auth.uid();
  _row record;
BEGIN
  IF _from_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _from_id = _to_user_id THEN RAISE EXCEPTION 'No pots regalar-te a tu mateix!'; END IF;
  IF NOT EXISTS (SELECT 1 FROM player_pets WHERE user_id = _to_user_id) THEN
    RAISE EXCEPTION 'L''altre jugador no té mascota';
  END IF;

  SELECT id, item_id, item_name, item_icon INTO _row
  FROM story_inventory
  WHERE user_id = _from_id AND item_id = _item_id
  ORDER BY obtained_at
  LIMIT 1;
  IF _row.id IS NULL THEN RAISE EXCEPTION 'No tens aquest objecte!'; END IF;

  DELETE FROM story_inventory WHERE id = _row.id;
  INSERT INTO story_inventory (user_id, item_id, item_name, item_icon)
  VALUES (_to_user_id, _row.item_id, _row.item_name, _row.item_icon);

  RETURN jsonb_build_object('success', true, 'item_name', _row.item_name, 'item_icon', _row.item_icon);
END;
$$;

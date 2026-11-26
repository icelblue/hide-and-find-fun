CREATE TABLE public.daily_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_order integer NOT NULL UNIQUE,
  question text NOT NULL,
  options jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.daily_questions TO authenticated;
GRANT ALL ON public.daily_questions TO service_role;
ALTER TABLE public.daily_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read questions" ON public.daily_questions FOR SELECT TO authenticated USING (active);

CREATE TABLE public.daily_question_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  question_id uuid NOT NULL REFERENCES public.daily_questions(id),
  answer_date date NOT NULL,
  answer text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, answer_date)
);
GRANT SELECT ON public.daily_question_answers TO authenticated;
GRANT ALL ON public.daily_question_answers TO service_role;
ALTER TABLE public.daily_question_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own answers" ON public.daily_question_answers FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Today's question rotates through active questions by Madrid calendar day.
CREATE OR REPLACE FUNCTION public.get_daily_question()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _today date := (now() AT TIME ZONE 'Europe/Madrid')::date; _n int; _q record; _ans text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT count(*) INTO _n FROM daily_questions WHERE active;
  IF _n = 0 THEN RETURN NULL; END IF;
  SELECT id, question, options INTO _q FROM daily_questions WHERE active
    ORDER BY display_order OFFSET ((_today - date '2026-01-01') % _n) LIMIT 1;
  SELECT answer INTO _ans FROM daily_question_answers WHERE user_id = auth.uid() AND answer_date = _today;
  RETURN jsonb_build_object('id', _q.id, 'question', _q.question, 'options', _q.options, 'date', _today, 'answered', _ans IS NOT NULL, 'my_answer', _ans);
END $$;

-- One answer per player per day; the answer and the +1 bonus token are saved together.
CREATE OR REPLACE FUNCTION public.answer_daily_question(_question_id uuid, _answer text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _today date := (now() AT TIME ZONE 'Europe/Madrid')::date; _q jsonb; _clean text := btrim(coalesce(_answer, ''));
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  _q := public.get_daily_question();
  IF _q IS NULL OR (_q->>'id')::uuid <> _question_id THEN RAISE EXCEPTION 'Aquesta no és la pregunta d''avui'; END IF;
  IF (_q->>'answered')::boolean THEN RAISE EXCEPTION 'Ja has respost la pregunta d''avui'; END IF;
  IF length(_clean) < 1 OR length(_clean) > 300 THEN RAISE EXCEPTION 'Resposta no vàlida'; END IF;
  IF jsonb_typeof(_q->'options') = 'array' AND NOT (_q->'options') ? _clean THEN RAISE EXCEPTION 'Tria una de les opcions'; END IF;
  INSERT INTO daily_question_answers(user_id, question_id, answer_date, answer) VALUES (auth.uid(), _question_id, _today, _clean);
  UPDATE profiles SET bonus_tokens = bonus_tokens + 1 WHERE user_id = auth.uid();
  RETURN jsonb_build_object('ok', true, 'bonus', 1);
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'Ja has respost la pregunta d''avui';
END $$;

-- Best single match so far: largest recorded Elo gain in one win.
CREATE OR REPLACE FUNCTION public.get_featured_player()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object('user_id', r.user_id, 'display_name', p.display_name, 'elo', p.elo, 'league', p.league,
    'elo_change', r.elo_change, 'game_code', r.game_code, 'finished_at', r.finished_at, 'opponent_name', op.display_name)
  FROM player_match_results r
  JOIN profiles p ON p.user_id = r.user_id
  LEFT JOIN profiles op ON op.user_id = r.opponent_id
  WHERE r.result = 'win' AND r.elo_change IS NOT NULL AND auth.uid() IS NOT NULL
  ORDER BY r.elo_change DESC, r.finished_at ASC LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_daily_question() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.answer_daily_question(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_featured_player() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_daily_question() TO authenticated;
GRANT EXECUTE ON FUNCTION public.answer_daily_question(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_featured_player() TO authenticated;
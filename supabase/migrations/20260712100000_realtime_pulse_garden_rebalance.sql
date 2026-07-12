-- ============================================================
-- Fluïdesa multijugador + reequilibri del jardí
-- ============================================================

-- =========================================================
-- 1. PULSE REALTIME PER MOVIMENTS
-- Problema: game_players i game_moves són FORA de la publicació
-- realtime (decisió de seguretat correcta: filtrarien dades
-- ocultes). Però `games` només s'actualitza a l'inici i al final
-- de la partida → durant el joc, el rival NO rep cap event quan
-- et mous, i la seva pantalla queda desactualitzada fins que ell
-- mateix actua ("lag" percebut).
--
-- Fix: cada moviment fa un toc a games.updated_at. La fila de
-- `games` no conté cap dada oculta, així que és segur emetre-la;
-- el client ja té un reload amb debounce de 300ms que refresca
-- l'estat del rival per la via segura.
-- =========================================================
CREATE OR REPLACE FUNCTION public.pulse_game_on_move()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE games SET updated_at = now() WHERE id = NEW.game_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_pulse_game_on_move ON public.game_moves;
CREATE TRIGGER trg_pulse_game_on_move
  AFTER INSERT ON public.game_moves
  FOR EACH ROW EXECUTE FUNCTION public.pulse_game_on_move();

-- =========================================================
-- 2. REEQUILIBRI DEL JARDÍ
-- Problema detectat a l'auditoria d'economia: amb els valors
-- inicials (🥕1 / 🍅2 / 🍓4), un jardí de 4 parcel·les amb
-- maduixes donava 16🪙/dia amb un sol login — 7 vegades més que
-- jugar una partida (EV ≈ 2,2🪙). Com que les monedes es poden
-- convertir 1:1 en tokens de partida, cultivar dominava jugar.
--
-- Nous valors (meitat): el jardí segueix sent un bon complement
-- (fins a 8🪙/dia si es cuida molt) però jugar torna a ser la via
-- principal de progrés.
-- =========================================================
UPDATE public.garden_catalog SET yield_coins = 0.5 WHERE id = 'pastanaga';
UPDATE public.garden_catalog SET yield_coins = 1.0 WHERE id = 'tomaquet';
UPDATE public.garden_catalog SET yield_coins = 2.0 WHERE id = 'maduixa';

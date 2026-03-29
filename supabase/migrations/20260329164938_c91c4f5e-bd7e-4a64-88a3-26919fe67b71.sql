
-- Item characteristics: 2 clues written by the hider, revealed progressively to rival
ALTER TABLE public.game_players ADD COLUMN hidden_clue_1 text;
ALTER TABLE public.game_players ADD COLUMN hidden_clue_2 text;

-- Object size for position restrictions (1=petit, 2=mitjà, 3=gran)
ALTER TABLE public.objects ADD COLUMN size smallint NOT NULL DEFAULT 2;

-- Furniture inner capacity for "dins" restriction (1=petit, 2=mitjà, 3=gran)
ALTER TABLE public.items ADD COLUMN inner_capacity smallint NOT NULL DEFAULT 2;

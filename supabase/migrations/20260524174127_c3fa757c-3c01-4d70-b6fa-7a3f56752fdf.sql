
-- FASE 4: Casa Abandonada + Fira del Poble
-- ===== WORLDS =====
INSERT INTO story_worlds (id, name, icon, description, start_node_id, unlock_rule, display_order, chapters) VALUES
('haunted', 'Casa Abandonada', '🏚️', 'Una mansió oblidada plena d''ecos i ombres. La por hi viu, però també secrets antics.', 'haunted_start', '{"level": 5}'::jsonb, 8, ARRAY[5,6]::smallint[]),
('fair', 'Fira del Poble', '🎪', 'Llums, música i sorpreses. Una nit de festa on cada parada amaga una aventura.', 'fair_start', '{"bond": 50}'::jsonb, 9, ARRAY[4,5]::smallint[])
ON CONFLICT (id) DO NOTHING;

-- ===== HAUNTED HOUSE NODES =====
INSERT INTO story_nodes (id, title, narrative, chapter) VALUES
('haunted_start', 'Davant la porta', 'La casa s''alça davant {pet} com un esquelet de fusta. La porta cruix sola. Una ombra mira des d''una finestra del primer pis.', 5),
('haunted_hall', 'Entrada polsosa', 'A dins, els retrats giren els ulls. {pet} sent passes a sobre del sostre. Tres camins: l''escala que puja, una porta cap al soterrani, i una biblioteca a l''esquerra.', 5),
('haunted_attic', 'Les golfes', 'Una llum espelmesca tremola entre joguines trencades. Una nina mira fixament {pet} i somriu lentament.', 5),
('haunted_cellar', 'El soterrani', 'Olor de moho. {pet} veu un cofre tancat amb una cadena rovellada i un mirall enorme cobert amb un llençol.', 5),
('haunted_library', 'Biblioteca antiga', 'Milers de llibres. Un d''ells flota i passa pàgines tot sol. Una veu suau diu: "Has vingut a jugar?"', 5),
('haunted_mirror', 'El mirall sense reflex', 'Quan {pet} mira al mirall, el seu reflex no hi és. Una mà petita pintada a la pols diu: "Surt-me d''aquí".', 6),
('haunted_ghost_child', 'L''infant fantasma', 'Una nena translúcida està asseguda al terra plorant. "Em vaig perdre fa cent anys. Em portaràs a casa?"', 6),
('haunted_courtyard', 'Pati interior', 'Un jardí salvatge sota la lluna. Una font esculpida amb forma de gàrgola. Si la toques, riu.', 6)
ON CONFLICT (id) DO NOTHING;

-- HAUNTED ENDINGS
INSERT INTO story_nodes (id, title, narrative, chapter, is_ending, ending_type) VALUES
('ending_haunted_friend', 'Amic per sempre', '{pet} ha alliberat l''ànima de la nena. Ara, cada nit, una llumeta blava acompanya {pet} quan dorm. Mai més tindrà por de la foscor.', 6, true, 'good'),
('ending_haunted_treasure', 'El tresor amagat', '{pet} ha obert el cofre del soterrani. Or, joies i un mapa cap a noves aventures. La casa va caure en silenci, agraïda.', 6, true, 'good'),
('ending_haunted_lost', 'Atrapat pel mirall', '{pet} ha mirat massa estona al mirall. Ara forma part del reflex, observant els nous visitants. (Has trobat un final secret.)', 6, true, 'bad')
ON CONFLICT (id) DO NOTHING;

-- HAUNTED CHOICES
INSERT INTO story_choices (node_id, choice_order, label, next_node_id, requires_traits, trait_reward_multiplier, state_delta, reward_type, reward_value) VALUES
-- haunted_start
('haunted_start', 1, 'Empènyer la porta i entrar', 'haunted_hall', NULL, '{"brave": 1.3}'::jsonb, '{"fear": 10}'::jsonb, NULL, NULL),
('haunted_start', 2, 'Cridar abans d''entrar (valent)', 'haunted_hall', '{"brave": 6}'::jsonb, '{"brave": 1.5}'::jsonb, '{"bond": 5, "fear": -5}'::jsonb, NULL, NULL),
('haunted_start', 3, 'Marxar i tornar de dia', 'ending_haunted_lost', '{"calm": 7}'::jsonb, NULL, '{"fear": -10}'::jsonb, NULL, NULL),
-- haunted_hall
('haunted_hall', 1, 'Pujar a les golfes', 'haunted_attic', NULL, '{"curious": 1.3}'::jsonb, '{"fear": 5}'::jsonb, NULL, NULL),
('haunted_hall', 2, 'Baixar al soterrani', 'haunted_cellar', '{"brave": 5}'::jsonb, '{"brave": 1.4}'::jsonb, '{"fear": 8}'::jsonb, NULL, NULL),
('haunted_hall', 3, 'Entrar a la biblioteca', 'haunted_library', '{"curious": 6}'::jsonb, '{"curious": 1.5}'::jsonb, NULL, NULL, NULL),
-- haunted_attic
('haunted_attic', 1, 'Acariciar la nina', 'haunted_ghost_child', '{"calm": 6}'::jsonb, '{"calm": 1.4}'::jsonb, '{"bond": 8}'::jsonb, 'item', '{"id": "nina_antiga", "name": "Nina antiga", "icon": "🪆"}'::jsonb),
('haunted_attic', 2, 'Fugir corrents', 'haunted_hall', NULL, NULL, '{"fear": 15}'::jsonb, NULL, NULL),
('haunted_attic', 3, 'Mossegar la nina (gluton)', 'haunted_courtyard', '{"gluttonous": 7}'::jsonb, '{"gluttonous": 1.6}'::jsonb, '{"bond": -3, "fear": -5}'::jsonb, NULL, NULL),
-- haunted_cellar
('haunted_cellar', 1, 'Trencar la cadena del cofre', 'ending_haunted_treasure', '{"brave": 7}'::jsonb, '{"brave": 1.5}'::jsonb, '{"bond": 10}'::jsonb, 'item', '{"id": "tresor_antic", "name": "Tresor antic", "icon": "💰"}'::jsonb),
('haunted_cellar', 2, 'Treure el llençol del mirall', 'haunted_mirror', '{"curious": 7}'::jsonb, '{"curious": 1.5}'::jsonb, '{"fear": 10}'::jsonb, NULL, NULL),
('haunted_cellar', 3, 'Tornar a l''entrada', 'haunted_hall', NULL, NULL, NULL, NULL, NULL),
-- haunted_library
('haunted_library', 1, 'Llegir el llibre flotant', 'haunted_ghost_child', '{"curious": 6}'::jsonb, '{"curious": 1.4}'::jsonb, NULL, 'item', '{"id": "llibre_encantat", "name": "Llibre encantat", "icon": "📖"}'::jsonb),
('haunted_library', 2, 'Respondre a la veu: "Sí, vinc a jugar"', 'haunted_ghost_child', '{"loyal": 6}'::jsonb, '{"loyal": 1.5}'::jsonb, '{"bond": 10, "fear": 5}'::jsonb, NULL, NULL),
('haunted_library', 3, 'Quedar-se quiet i escoltar', 'haunted_courtyard', '{"calm": 7}'::jsonb, '{"calm": 1.4}'::jsonb, '{"fear": -5}'::jsonb, NULL, NULL),
-- haunted_mirror
('haunted_mirror', 1, 'Tocar el mirall amb la pota', 'ending_haunted_lost', NULL, NULL, '{"fear": 20}'::jsonb, NULL, NULL),
('haunted_mirror', 2, 'Trencar el mirall (valent)', 'haunted_ghost_child', '{"brave": 8}'::jsonb, '{"brave": 1.6}'::jsonb, '{"bond": 5, "fear": -10}'::jsonb, NULL, NULL),
('haunted_mirror', 3, 'Apartar la mirada i marxar', 'haunted_hall', '{"calm": 6}'::jsonb, '{"calm": 1.3}'::jsonb, NULL, NULL, NULL),
-- haunted_ghost_child
('haunted_ghost_child', 1, 'Portar-la cap a la sortida', 'ending_haunted_friend', '{"loyal": 7}'::jsonb, '{"loyal": 1.6, "calm": 1.3}'::jsonb, '{"bond": 20, "fear": -15}'::jsonb, 'item', '{"id": "amulet_fantasma", "name": "Amulet fantasmal", "icon": "👻"}'::jsonb),
('haunted_ghost_child', 2, 'Jugar amb ella una estona', 'haunted_courtyard', '{"curious": 6}'::jsonb, '{"curious": 1.3}'::jsonb, '{"bond": 8}'::jsonb, NULL, NULL),
('haunted_ghost_child', 3, 'Bordar/Bufar fort', 'haunted_hall', '{"brave": 5}'::jsonb, NULL, '{"fear": -5, "bond": -5}'::jsonb, NULL, NULL),
-- haunted_courtyard
('haunted_courtyard', 1, 'Tocar la gàrgola de la font', 'ending_haunted_friend', '{"brave": 6, "curious": 6}'::jsonb, '{"brave": 1.4, "curious": 1.4}'::jsonb, '{"bond": 15, "fear": -10}'::jsonb, NULL, NULL),
('haunted_courtyard', 2, 'Beure aigua de la font', 'ending_haunted_treasure', '{"gluttonous": 6}'::jsonb, '{"gluttonous": 1.5}'::jsonb, '{"hunger": -15}'::jsonb, NULL, NULL),
('haunted_courtyard', 3, 'Estirar-se sota la lluna', 'ending_haunted_friend', '{"calm": 8}'::jsonb, '{"calm": 1.6}'::jsonb, '{"sleep": -10, "fear": -15}'::jsonb, NULL, NULL);

-- ===== FAIR NODES =====
INSERT INTO story_nodes (id, title, narrative, chapter) VALUES
('fair_start', 'Llums de festa', 'Música, riures i olor de sucre cremat. {pet} entra a la fira. Davant seu: la tómbola, una carpa de mag i una parada de dolços.', 4),
('fair_tombola', 'La tómbola', 'Un home amb bigoti gira un bombo gegant. "Un tiquet, un premi segur!" {pet} pot intentar-ho... o investigar si fa trampes.', 4),
('fair_magician', 'Carpa del mag', 'Cortines vermelles. Un mag amb capa fa desaparèixer un conill. Et mira: "Vols ser el meu assistent?"', 4),
('fair_sweets', 'Parada de dolços', 'Una muntanya de cotó de sucre, caramels i pomes confitades. {pet} comença a salivar.', 4),
('fair_rides', 'Atraccions', 'Una nòria gegant, cotxets de xoc i un cavallets que giren. Les llums es reflecteixen als ulls de {pet}.', 5),
('fair_contest', 'Concurs de mascotes', 'Un cartell crida: "Concurs de la millor mascota! Premi: una corona daurada!" Hi ha cinc participants més.', 5),
('fair_stage', 'L''escenari', 'Un grup toca música animada. La gent balla. Algú deixa caure una pilota brillant.', 5),
('fair_backstage', 'Darrere l''escenari', 'Cordes, baguls i una caixa que es mou sola. {pet} sent un gemec dèbil. Algú demana ajuda.', 5)
ON CONFLICT (id) DO NOTHING;

-- FAIR ENDINGS
INSERT INTO story_nodes (id, title, narrative, chapter, is_ending, ending_type) VALUES
('ending_fair_champion', 'Campió de la fira', '{pet} ha guanyat el concurs! La corona daurada brilla al seu cap. Una foto sortirà al diari del poble.', 5, true, 'good'),
('ending_fair_glutton', 'El més golafre', '{pet} ha menjat tot el que ha pogut. Panxa rodona, somriure infinit. Els venedors aplaudeixen amb llàgrimes.', 5, true, 'good'),
('ending_fair_hero', 'Heroi inesperat', '{pet} ha rescatat el conill perdut del mag i ha salvat la nit. Tota la fira el corona heroi del poble.', 5, true, 'good'),
('ending_fair_expelled', 'Expulsat de la fira', '{pet} ha fet massa entremaliadures. Els guàrdies l''acompanyen fora amb cara de pomes agres.', 5, true, 'neutral')
ON CONFLICT (id) DO NOTHING;

-- FAIR CHOICES
INSERT INTO story_choices (node_id, choice_order, label, next_node_id, requires_traits, trait_reward_multiplier, state_delta, reward_type, reward_value) VALUES
-- fair_start
('fair_start', 1, 'Anar a la tómbola', 'fair_tombola', NULL, '{"curious": 1.2}'::jsonb, NULL, NULL, NULL),
('fair_start', 2, 'Entrar a la carpa del mag', 'fair_magician', '{"brave": 5}'::jsonb, '{"brave": 1.3}'::jsonb, NULL, NULL, NULL),
('fair_start', 3, 'Anar als dolços', 'fair_sweets', '{"gluttonous": 6}'::jsonb, '{"gluttonous": 1.5}'::jsonb, NULL, NULL, NULL),
('fair_start', 4, 'Explorar les atraccions', 'fair_rides', '{"curious": 6}'::jsonb, '{"curious": 1.4}'::jsonb, NULL, NULL, NULL),
-- fair_tombola
('fair_tombola', 1, 'Comprar un tiquet i provar sort', 'fair_contest', NULL, '{"curious": 1.2}'::jsonb, '{"bond": 3}'::jsonb, 'item', '{"id": "premi_tombola", "name": "Premi de tómbola", "icon": "🎁"}'::jsonb),
('fair_tombola', 2, 'Olorar el bombo (sospitós)', 'ending_fair_expelled', '{"curious": 7, "brave": 5}'::jsonb, '{"curious": 1.5}'::jsonb, '{"bond": -5}'::jsonb, NULL, NULL),
('fair_tombola', 3, 'Marxar cap a l''escenari', 'fair_stage', '{"calm": 6}'::jsonb, NULL, NULL, NULL, NULL),
-- fair_magician
('fair_magician', 1, 'Acceptar i pujar a l''escenari', 'fair_stage', '{"brave": 6, "loyal": 5}'::jsonb, '{"brave": 1.5, "loyal": 1.3}'::jsonb, '{"bond": 10}'::jsonb, 'item', '{"id": "barret_mag", "name": "Barret de mag", "icon": "🎩"}'::jsonb),
('fair_magician', 2, 'Anar darrere de l''escenari a investigar', 'fair_backstage', '{"curious": 7}'::jsonb, '{"curious": 1.6}'::jsonb, NULL, NULL, NULL),
('fair_magician', 3, 'Sortir corrents espantat', 'fair_start', NULL, NULL, '{"fear": 10}'::jsonb, NULL, NULL),
-- fair_sweets
('fair_sweets', 1, 'Menjar cotó de sucre fins a rebentar', 'ending_fair_glutton', '{"gluttonous": 7}'::jsonb, '{"gluttonous": 1.6}'::jsonb, '{"hunger": -30, "bond": 5}'::jsonb, 'item', '{"id": "coto_sucre", "name": "Cotó de sucre", "icon": "🍭"}'::jsonb),
('fair_sweets', 2, 'Robar una poma confitada', 'ending_fair_expelled', '{"brave": 6}'::jsonb, '{"brave": 1.3}'::jsonb, '{"hunger": -15, "bond": -10}'::jsonb, NULL, NULL),
('fair_sweets', 3, 'Comprar un caramel i compartir-lo', 'fair_contest', '{"loyal": 6, "calm": 5}'::jsonb, '{"loyal": 1.5}'::jsonb, '{"bond": 15}'::jsonb, NULL, NULL),
-- fair_rides
('fair_rides', 1, 'Pujar a la nòria', 'fair_stage', '{"calm": 6}'::jsonb, '{"calm": 1.4}'::jsonb, '{"bond": 8}'::jsonb, NULL, NULL),
('fair_rides', 2, 'Cotxets de xoc (caos)', 'fair_contest', '{"brave": 7}'::jsonb, '{"brave": 1.5}'::jsonb, '{"fear": -5, "bond": 5}'::jsonb, NULL, NULL),
('fair_rides', 3, 'Cavallets tranquils', 'fair_sweets', '{"calm": 7}'::jsonb, '{"calm": 1.3}'::jsonb, '{"sleep": -5}'::jsonb, NULL, NULL),
-- fair_contest
('fair_contest', 1, 'Posar el millor somriure i desfilar', 'ending_fair_champion', '{"loyal": 7, "calm": 6}'::jsonb, '{"loyal": 1.6, "calm": 1.4}'::jsonb, '{"bond": 25}'::jsonb, 'item', '{"id": "corona_fira", "name": "Corona de la fira", "icon": "👑"}'::jsonb),
('fair_contest', 2, 'Fer un truc valent i acrobàtic', 'ending_fair_champion', '{"brave": 8}'::jsonb, '{"brave": 1.7}'::jsonb, '{"bond": 20, "fear": -10}'::jsonb, NULL, NULL),
('fair_contest', 3, 'Sabotejar els rivals', 'ending_fair_expelled', '{"gluttonous": 7}'::jsonb, NULL, '{"bond": -15}'::jsonb, NULL, NULL),
('fair_contest', 4, 'No participar, mirar l''escenari', 'fair_stage', NULL, NULL, NULL, NULL, NULL),
-- fair_stage
('fair_stage', 1, 'Atrapar la pilota brillant', 'fair_backstage', '{"curious": 6}'::jsonb, '{"curious": 1.4}'::jsonb, NULL, 'item', '{"id": "pilota_brillant", "name": "Pilota brillant", "icon": "✨"}'::jsonb),
('fair_stage', 2, 'Pujar a ballar amb la gent', 'ending_fair_champion', '{"loyal": 7}'::jsonb, '{"loyal": 1.5}'::jsonb, '{"bond": 15}'::jsonb, NULL, NULL),
('fair_stage', 3, 'Estirar-se a escoltar la música', 'ending_fair_glutton', '{"calm": 8}'::jsonb, '{"calm": 1.6}'::jsonb, '{"sleep": -15, "bond": 10}'::jsonb, NULL, NULL),
-- fair_backstage
('fair_backstage', 1, 'Obrir el bagul i alliberar el conill', 'ending_fair_hero', '{"brave": 6, "loyal": 7}'::jsonb, '{"brave": 1.5, "loyal": 1.6}'::jsonb, '{"bond": 25}'::jsonb, 'item', '{"id": "medalla_heroi", "name": "Medalla d''heroi", "icon": "🏅"}'::jsonb),
('fair_backstage', 2, 'Avisar el mag', 'ending_fair_hero', '{"loyal": 8}'::jsonb, '{"loyal": 1.7}'::jsonb, '{"bond": 15}'::jsonb, NULL, NULL),
('fair_backstage', 3, 'Menjar-se el conill (😱)', 'ending_fair_expelled', '{"gluttonous": 9}'::jsonb, NULL, '{"bond": -25, "hunger": -20}'::jsonb, NULL, NULL);

-- ===== NEW REWARD ITEMS =====
INSERT INTO reward_items (name, icon, rarity, sell_value) VALUES
('Nina antiga', '🪆', 'rare', 8),
('Tresor antic', '💰', 'epic', 25),
('Llibre encantat', '📖', 'rare', 10),
('Amulet fantasmal', '👻', 'epic', 20),
('Premi de tómbola', '🎁', 'common', 3),
('Barret de mag', '🎩', 'rare', 12),
('Cotó de sucre', '🍭', 'common', 2),
('Corona de la fira', '👑', 'legendary', 40),
('Pilota brillant', '✨', 'common', 4),
('Medalla d''heroi', '🏅', 'epic', 30)
ON CONFLICT DO NOTHING;

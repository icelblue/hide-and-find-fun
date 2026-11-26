# Historial de partides i Elo als perfils

- Perfil propi: pestanyes Partides, Col·lecció, Social i Compte.
- Perfil de rivals: Partides, Col·lecció i Social.
- Historial compartit amb rival, resultat, codi, data i Elo abans/després, quan està registrat.
- Filtres de 7 dies, 30 dies i totes les partides; paginació de 20 resultats.
- Balanç, guanys i pèrdues calculats sobre tots els resultats registrats del període, no només la pàgina visible.
- Les partides anteriors no s’han reescrit ni s’han estimat canvis d’Elo. Les dades inexistents es mostren explícitament com a no registrades.

## Registre i seguretat

`player_match_results` registra el valor real abans i després de la finalització, dins la mateixa transacció del gestor existent. Els perfils es bloquegen per ordre estable per evitar inconsistències entre partides simultànies. Els càlculs d’Elo, les recompenses i les lligues anteriors es mantenen.

La consulta de perfil retorna únicament resums de partides acabades; no retorna objectes, posicions amagades, eines o tokens de partida. Requereix una sessió identificada. Els clients només poden llegir l’historial: no poden inserir-lo, modificar-lo ni eliminar-lo. Les dades de resultat no s’esborren si s’esborra una partida; el perfil propi elimina els seus registres en eliminar el compte, i els rivals resolen el nom d’un perfil eliminat com Anònim.

## Verificació

- 476/476 proves unitàries correctes.
- E2E amb dos jugadors: partida completa, coincidència del registre amb l’Elo real de cada perfil, victòria/derrota, persistència i lectura als perfils propi i públic.
- Modificació i eliminació de resultats des del client rebutjades; les cinc proteccions PvP existents continuen passant.
- Perfil real amb 88 partides acabades: filtres, segona pàgina i totes les pestanyes comprovades a 390×710 i 1280×900.
- Cap desbordament horitzontal ni error de pàgina en les comprovacions dels dos perfils.
- Un primer intent d’E2E recarregava abans de la resposta de l’observació; la prova ara espera la confirmació del servidor abans de comprovar persistència.
- Sense publicació automàtica.
# Proves de partides reals — 26 de novembre de 2026

## Cobertura

- Jugador temporal autenticat; pantalla mòbil de 390 × 710.
- ZXRSNQ: entrada en 1,40 s, objecte amagat, inici de cerca i persistència després de recarregar; moviment Habitació → Balcó, llanterna, observació i apagar la llum registrats.
- ESLR8W: entrada en 0,87 s, objecte amagat, inici de cerca i persistència; moviment Menjador → Cuina, observació amb pista, apagar/encendre la llum i tokens confirmats (3,8 després de gastar 0,5 + 0,3 + 0,2 + 0,2).
- Ítem social plàtan enviat pel rival rebut i mostrat.
- AF8CZZ reservada a un rival concret: no s’ha entrat ni modificat la reserva.
- Sense desbordament horitzontal en les dues pantalles de joc.

## Error reproduït i corregit

La consulta d’historial utilitzava relacions de catàleg que ja no existeixen. Resposta PGRST200; la pantalla tractava l’error com un historial buit i deixava repetir observacions pagades.

Ara es carrega l’historial del jugador sense relacions implícites; les dades visibles dels catàlegs es resolen separadament. S’ha aplicat als dos carregadors existents, sense restaurar claus foranes incompatibles ni canviar dades de jugadors.

Verificació real a ESLR8W: historial de quatre accions visible, «Sobre Nevera» desactivat i marcat com vist, també després de recarregar. Cap resposta HTTP d’error ni error de pàgina en aquesta verificació.

## Regressions i límits

- 458/458 proves unitàries correctes, incloent quatre regressions noves de l’historial.
- Última comprovació de compilació: correcta.
- Les partides reals continuen en curs: aquesta ronda no verifica victòria/derrota ni notificacions push externes. La verificació de victòria/derrota amb dos jugadors correspon a l’auditoria anterior de recuperació.
- No s’han gastat tokens del compte del creador, ni modificat les seves posicions amagades, ni forçat resultats.
- Les participacions del jugador temporal es mantenen mentre les partides referenciïn el compte; no s’han eliminat partides reals per netejar la prova.
- Canvis no publicats automàticament.
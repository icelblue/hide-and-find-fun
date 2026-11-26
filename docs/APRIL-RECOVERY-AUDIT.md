# Recuperació i auditoria — 26 de novembre de 2026

## Base recuperada
- Pantalles d’abril: `dc6061b` (26/04/2026, 21:22 UTC).
- Punt anterior a la recuperació: `b7ac4e3`.
- No s’han restaurat ni esborrat les dades dels jugadors. No s’ha publicat.
- Excepcions: accés actual, recuperació de càrrega de pàgines, limitació d’informes d’error, integració Cloud i adaptadors actuals; Mode Història actual conservat perquè `story_progress` i `create_story_game` ja no existeixen.
- Espai Personal no s’exposa en aquesta recuperació. Recursos i mòduls posteriors es conserven sense fer neteja destructiva.

## Errors corregits i comprovats
- Es carregava una partida inaccessible indefinidament: ara hi ha error amb reintent i retorn al lobby.
- Les subscripcions es recreaven quan canviaven els mobles: referència estable al gestor d’esdeveniments.
- Una subscripció a `game_players`, taula no publicada per protegir amagatalls, impedia rebre resultats: només s’escolten `games` i ítems socials.
- Amagar no actualitzava immediatament l’estat local: confirmació local després de guardar al servidor.
- Arrencar dues vegades donava error quan el servidor ja havia iniciat la cerca: arrencada idempotent.
- Tokens: inici i dia següent unificats a 5; la pantalla retorna el saldo confirmat, no 4.
- Accions simultànies: barrera síncrona compartida per evitar doble enviament abans del següent renderitzat.
- La versió antiga mostrava `__custom__` sense el formulari posterior: retirat de la selecció d’abril.
- La configuració E2E depenia d’un paquet inexistent: configuració estàndard amb el navegador ja disponible.

## Seguretat del PvP comprovada
La prova autenticada intenta regalar-se 999 tokens, regalar-se eines, imposar una victòria, saltar costos amb el paràmetre Història i confirmar gratuïtament. El servidor rebutja els cinc intents i el saldo continua sent 5. També comprova que no retorni els identificadors de l’amagatall rival durant la partida.

Validacions afegides al servidor: partida activa, participant, límit de set dies, sala actual/portes per a partides normals, serialització de moviments, límit de dos jugadors, invitació correcta, dades confirmades immutables i resultats gestionats pel servidor. Les funcions privilegiades legítimes continuen operatives.

No s’ha retirat RLS, publicat `game_players`, reexecutat migracions antigues ni recreat el progrés Història retirat. Això trencaria la confidencialitat o la compatibilitat.

## Resultats
- 454/454 proves unitàries passen.
- 1/1 E2E autenticat de PvP passa: dos comptes temporals, crear → entrar → amagar tots dos → moure per portes → observar → victòria/derrota en directe → resultat llegit en tornar-hi; cinc intents de manipulació rebutjats.
- 3/3 comprovacions E2E d’accés/rutes passen.
- Demo completada al navegador fins a victòria.
- Lobby, perfil i introducció del Mode Història comprovats a 390×844 i 1280×1800, sense desbordament horitzontal ni errors de pàgina.
- Partida inexistent comprovada: mostra error finit, no espera infinita.
- Validació automàtica: últim resultat `build OK`.

## Límits de l’auditoria
- No és una certificació de tota l’economia, de totes les recompenses ni de totes les funcions socials.
- La regla de set dies s’ha revisat en la neteja i aplicat al moviment; no s’ha deixat transcórrer una partida real durant set dies ni provat el límit temporal contra una partida autenticada caducada.
- El CPU/Història del 26 d’abril no s’ha declarat verificat: depenia d’unes operacions retirades. Es conserva el Mode Història compatible i només se n’ha comprovat la introducció, no una aventura sencera.
- No s’han verificat tots els navegadors ni totes les condicions de xarxa.

## Repetir les proves
`bunx vitest run`

Per al PvP, proporcionar dos fitxers de sessió temporals mitjançant `PVP_HOST_STATE_PATH` i `PVP_GUEST_STATE_PATH` i executar `bunx playwright test tests/e2e/recovered-pvp.spec.ts`. Sense sessions, la prova s’omet explícitament. No guardar credencials al repositori.

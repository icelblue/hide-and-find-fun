# Proves de qualitat — 26 de novembre de 2026

## Resultat verificat

- Quatre partides PvP completes amb dos jugadors temporals: **BBSB6X, PUJ3GH, USMZEN i XGUW3Q**.
- Creació des del lobby, entrada amb codi i amagatall dels dos jugadors mitjançant la pantalla real.
- Desplaçaments per portes connectades i cerques des de la ubicació actual.
- Cadira diferent de la taula amagada: pista inferior a 4 i cap victòria falsa.
- Taula correcta però posició incorrecta: nivell **4**, `hint_noisy = false`, `found_object = false` en les quatre partides.
- Cost real de moure **0,5** i observar **0,3**, comprovat contra els tokens persistits.
- Observacions desactivades després de fer-les i també després de recarregar.
- A XGUW3Q, apagar i encendre el llum des de la pantalla: peticions correctes, canvi visible i cost conjunt **0,4**.
- Posició exacta: victòria del cercador i derrota del rival sense recarregar la pantalla del rival.
- En tornar a la partida, la victòria es conserva i mostra **Moneda**, l'objecte amagat pel rival.
- Dos resultats per partida, Elo inicial/final coherent amb els perfils i historial llegible al perfil propi i al públic.
- Set intents de manipulació per partida rebutjats: tokens, eines, resultat, acció d'història al PvP, confirmació no suportada i modificació/esborrat de l'historial d'Elo.
- Cap excepció de pantalla capturada durant els quatre fluxos PvP.

## Altres comprovacions

- **482/482 proves unitàries**, distribuïdes en 27 fitxers.
- **3/3 proves smoke**: accés, redirecció sense sessió i pàgina inexistent.
- Demostració jugada fins a guanyar a Cuina, Biblioteca i Garatge, tant a **390 × 710** com a **1280 × 900**: sis fluxos correctes.
- Lobby i demostracions sense desbordament horitzontal ni excepcions de pantalla; captures revisades de lobby mòbil, victòria PvP i demostració d'escriptori.
- Últim registre de compilació disponible: `build OK`.

## Canvis conservats

La prova `tests/e2e/recovered-pvp.spec.ts` incorpora regressions per a pistes veraces, separació entre moble i posició, costos persistits i canvis de llum. Les sessions i captures només són temporals, fora del repositori.

## Límits

- No s'ha modificat cap partida d'un jugador real ni s'ha forçat cap resultat.
- S'han creat dos comptes temporals: les sessions anteriors no eren disponibles al sandbox actual.
- Aquesta passada no verifica tota la història, tots els objectes socials, l'ús de cada eina ni la llanterna al jardí amb una eina obtinguda naturalment.
- No s'ha esperat set dies reals, travessat el canvi de dia ni mesurat rendiment amb moltes persones simultànies.
- La mostra confirma els casos de pistes anteriors, però no mesura estadísticament el percentatge de soroll aleatori.
- No s'ha publicat l'app; s'han provat la pantalla local i el servei Cloud compartit.

## Reproducció

Amb dues sessions temporals vàlides indicades a `PVP_HOST_STATE_PATH` i `PVP_GUEST_STATE_PATH`, executar `bunx playwright test tests/e2e/recovered-pvp.spec.ts`. Sense aquestes sessions, la prova s'omet explícitament. No desar credencials al repositori.
# Pistes de HQ345X — 26 de novembre de 2026

## Regla

Una pista de proximitat o de moble semblant no confirma que sigui el moble correcte. Una pista imprecisa no confirma ni habitació ni moble. La victòria només depèn de trobar l’objecte a la posició exacta.

## Causa comprovada

El servidor retorna cinc nivells (0–4), però la pantalla recuperada d’abril tractava qualsevol nivell superior a 1 com «moble correcte». HQ345X acumula onze observacions amb aquesta falsa confirmació, amb nivells 2–4 i un moble diferent del que corresponia. El soroll del 20% pot elevar una pista de semblança de 3 a 4; la pantalla també ignorava `hint_noisy`.

La comparació de victòria del servidor és correcta: moble i posició exactes, no nivell de pista. No s’ha alterat l’amagatall ni revelat al jugador.

## Revisió de tots els llocs afectats

| Lloc llegit | Estat i actuació |
| --- | --- |
| `execute_game_move` desplegat | Correcte: cinc nivells, avís de soroll i victòria per coincidència exacta. Sense canvis. |
| `tokens-api.ts` | Ometia l’avís de soroll. Ara preserva `hintNoisy` i manté `foundObject` independent. |
| `GamePage.tsx`, avisos d’observació | Incorrectes per als nivells 1–4. Ara utilitzen una classificació compartida de cinc nivells; les pistes imprecises no afirmen coincidències. |
| `GamePage.tsx`, historial en curs | Només tenia icones per a tres nivells. Ara mostra les cinc i adverteix que la proximitat no confirma victòria. No reescriu moviments. |
| `GameFinishedPhase.tsx`, registre final | Mostrava un trofeu per nivell 3. Ara les icones són de proximitat; només `found_object` mostra que l’objecte s’ha trobat. |
| `HelpButton.tsx`, ajuda compartida | Explicava tres nivells. Corregit a cinc amb avís de soroll. |
| Traduccions `ca.json` i `en.json`, ajuda de proximitat | Ja descriuen cinc nivells i el 20% de soroll. Sense canvis. |
| `useSearchFlowState` i carregadors de partides | Emmagatzemen estat i historial; no converteixen proximitat en victòria. Sense canvis. |
| Demo, `tryPosition` i `StepSearch` | Independents: només l’amagatall exacte dona èxit; els altres intents es mostren buits. Sense canvis. |
| Mode Història actual, `handleChoose` i branca de puzle | Independent del PvP; no interpreta els nivells de proximitat. Sense canvis. |
| `insert_cpu_move` desplegat | Registra nivell i resultat separats, no declara victòria des del nivell. Sense crides en el codi actual. Sense canvis ni permisos nous. |
| Funcions en segon pla | Cerca de referències a `hint_level` i `hint_noisy` a les funcions del projecte: cap altre productor/consumidor identificat. Sense canvis. |

## Validació

- 471/471 proves unitàries; tretze regressions noves de classificació i propagació del soroll.
- E2E autenticat amb dos jugadors temporals: amagar, entrar, investigar un moble semblant sense guanyar, bloqueig de la posició observada després de recarregar, trobar la posició exacta, victòria i derrota en directe, i victòria conservada en tornar a entrar.
- Les cinc comprovacions de seguretat del mateix E2E continuen rebutjant les manipulacions.
- HQ345X comprovat amb el compte afectat a 390 × 710: ajuda i historial carreguen sense error ni desbordament. No s’han fet noves accions pagades en aquesta partida.
- Compilació correcta.

## Dades preservades

Cap canvi a tokens gastats, amagatalls, resultats, partides finalitzades, permisos o configuració. Les pistes històriques no tenen l’avís de soroll emmagatzemat: no es reclassifiquen com confirmacions certes ni s’inventa aquesta dada. No s’ha publicat automàticament.
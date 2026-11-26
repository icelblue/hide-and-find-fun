# Recuperació del 26 d’abril de 2026

- [x] Aprovar la recuperació amb conservació de dades i les excepcions de seguretat.
- [x] Auditar compatibilitat del codi d’abril amb Cloud actual.
- [x] Restaurar la versió dc6061b de manera segura.
- [x] Corregir errors i executar proves de regressió.
- [x] Verificar partides autenticades de principi a fi i fluïdesa mòbil/escriptori.
- [x] Resumir resultats i desar la recuperació sense publicar automàticament.

Límits documentats a docs/APRIL-RECOVERY-AUDIT.md: CPU antic incompatible, caducitat sense espera real de set dies i auditoria no exhaustiva de l’economia. No publicat.

## Proves de les partides creades per icelblue

- [x] Entrar a ZXRSNQ i ESLR8W, amagar i comprovar inici i persistència.
- [x] Verificar moviments, observacions, llanterna i canvis de llum.
- [x] Corregir l’historial sense relacions de catàleg i verificar observacions ja fetes.
- [x] Resumir proves i límits sense alterar la partida privada AF8CZZ.

Resultats a docs/USER-GAMES-AUDIT.md. AF8CZZ reservada a un altre rival; no s’ha saltat la restricció. Les dues partides obertes s’han deixat en curs, sense forçar-ne el resultat.

## Pistes incorrectes a HQ345X

- [x] Identificar si falla la victòria o la interpretació de les pistes.
- [x] Interpretar els cinc nivells i l’avís de pista imprecisa sense falses confirmacions.
- [x] Provar la correcció amb el compte afectat i executar regressions.
- [x] Desar els resultats sense modificar tokens gastats, posicions amagades ni partides finalitzades.

Auditoria transversal a docs/HQ345X-HINT-AUDIT.md: 471 proves unitàries i partida E2E completa correcta; cap canvi a les dades de HQ345X.

## Perfils amb partides recents i Elo

- [x] Registrar l’Elo real abans/després de noves partides sense modificar resultats anteriors.
- [x] Mostrar historial compartit al perfil propi i al d’altres jugadors.
- [x] Organitzar els dos perfils en pestanyes, conservant les funcions existents.
- [x] Verificar historial, permisos i registre d’una partida completa a mòbil i escriptori.

476 proves unitàries correctes i E2E complet amb registre real abans/després, lectura als dos perfils i intents de manipulació rebutjats. Les partides antigues es mostren amb Elo desconegut, sense reconstruccions ni canvis als resultats.

## Objecte trobat en guanyar

- [x] Mostrar a la victòria quin objecte havia amagat el rival (cas ZXRSNQ), també després de recarregar.

# Recuperar el joc del 26 d’abril de 2026 i estabilitzar-lo

## Versió localitzada
La darrera versió guardada del **26 d’abril de 2026, a les 21:22 UTC**, és `dc6061b` («Netejat partides antigues»). Serà la base de la recuperació.

**Encara no s’ha restaurat res.** Entre aquesta versió i l’actual hi ha canvis en 320 fitxers: no és segur substituir-ho tot sense comprovar la compatibilitat.

## Què recuperar
- Recuperar les pantalles, l’aspecte i les funcionalitats que existien al final d’aquell dia.
- Les incorporacions posteriors, incloses les millores pixel art i les ampliacions d’Espai Personal, no es mantindran per defecte: tornem a la base d’abril.
- Conservar les correccions posteriors estrictament necessàries per a seguretat, accés i compatibilitat amb les dades actuals, documentant les excepcions.

## Protegir les dades
- Conservar comptes, inventaris, progressos i partides; no esborrar ni reinicialitzar dades.
- **Recuperar el codi no recupera la base de dades d’abril.** Aquesta continuarà en l’estat actual; caldrà comprovar que les operacions antigues encara funcionen.
- No executar migracions antigues ni retirar proteccions actuals. Qualsevol incompatibilitat es resoldrà amb el canvi mínim segur.
- Conservar el punt de retorn actual a l’historial. No publicar fins que les proves de la versió recuperada hagin passat.

## Ordre de treball
1. Comparar la versió d’abril amb el sistema actual: accés, creació de partides, objectes, moviments, recompenses i permisos.
2. Restaurar el codi d’abril de manera selectiva, sense tocar configuració gestionada ni l’historial de migracions.
3. Executar les proves de la versió recuperada i afegir regressions per als errors trobats.
4. Provar al navegador, amb sessió iniciada i dades reals de prova: crear una partida, entrar amb rival, triar escenari i objecte, amagar amb tots dos jugadors, buscar, rebre actualitzacions i verificar el resultat. Provar també una partida contra CPU i la demo.
5. Auditar tokens, doble clic, desconnexió/reentrada, caducitat de set dies i accés a dades alienes. Separar explícitament les comprovacions reals de les simulades.
6. Verificar en mòbil de 390 px i escriptori: errors visibles, imatges, espera infinita, peticions repetides i resposta dels controls; corregir els colls d’ampolla observats.
7. Entregar un resum dels errors corregits, les proves passades i qualsevol comprovació pendent. Si una prova necessita un segon compte o accés no disponible, indicar el bloqueig: no declarar-la superada.

## Criteri de finalització
No donar el joc per funcional només perquè carreguin les pàgines o passi la demo. La partida autenticada ha d’arribar al resultat i aquest s’ha de llegir de nou a la pantalla; sense errors de compilació ni errors bloquejants en els fluxos provats.

## Detalls tècnics
- Base: commit `dc6061b`; aplicar restauració de fitxers, sense reescriure l’historial Git.
- Mantenir integració Cloud i fitxers generats actuals; adaptar només les crides incompatibles després de revisar les funcions vigents.
- Preservar migracions aplicades i recursos encara necessaris. No fer neteja massiva d’assets o dependències durant la recuperació.
- Desar les correccions i els tests en un nou commit perquè la recuperació sigui reversible.

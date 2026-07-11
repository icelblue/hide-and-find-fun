// ============================================================
// object-sprites.ts — Mapping d'objectes amagables a sprites pixel art
// ============================================================
// Cobertura completa de la taula `objects` (30 objectes reals + 1 custom).
// Fallback: emoji original si no hi ha match.
// ============================================================

import { url as sprAnell } from "@/assets/objects/spr-obj-anell.png.asset.json";
import { url as sprBolaNeu } from "@/assets/objects/spr-obj-bola-neu.png.asset.json";
import { url as sprBoto } from "@/assets/objects/spr-obj-boto.png.asset.json";
import { url as sprCalces } from "@/assets/objects/spr-obj-calces.png.asset.json";
import { url as sprCarta } from "@/assets/objects/spr-obj-carta.png.asset.json";
import { url as sprClau } from "@/assets/objects/spr-obj-clau.png.asset.json";
import { url as sprCorVidre } from "@/assets/objects/spr-obj-cor-vidre.png.asset.json";
import { url as sprCullera } from "@/assets/objects/spr-obj-cullera.png.asset.json";
import { url as sprCustom } from "@/assets/objects/spr-obj-custom.png.asset.json";
import { url as sprDau } from "@/assets/objects/spr-obj-dau.png.asset.json";
import { url as sprFoto } from "@/assets/objects/spr-obj-foto.png.asset.json";
import { url as sprGel } from "@/assets/objects/spr-obj-gel.png.asset.json";
import { url as sprJoguina } from "@/assets/objects/spr-obj-joguina.png.asset.json";
import { url as sprLlapis } from "@/assets/objects/spr-obj-llapis.png.asset.json";
import { url as sprLlibre } from "@/assets/objects/spr-obj-llibre.png.asset.json";
import { url as sprMitjo } from "@/assets/objects/spr-obj-mitjo.png.asset.json";
import { url as sprMitjoPudent } from "@/assets/objects/spr-obj-mitjo-pudent.png.asset.json";
import { url as sprMocador } from "@/assets/objects/spr-obj-mocador.png.asset.json";
import { url as sprMoneda } from "@/assets/objects/spr-obj-moneda.png.asset.json";
import { url as sprNasPallasso } from "@/assets/objects/spr-obj-nas-pallasso.png.asset.json";
import { url as sprPastis } from "@/assets/objects/spr-obj-pastis.png.asset.json";
import { url as sprPetard } from "@/assets/objects/spr-obj-petard.png.asset.json";
import { url as sprPilota } from "@/assets/objects/spr-obj-pilota.png.asset.json";
import { url as sprPinta } from "@/assets/objects/spr-obj-pinta.png.asset.json";
import { url as sprPlatanPodrit } from "@/assets/objects/spr-obj-platan-podrit.png.asset.json";
import { url as sprRatoliPc } from "@/assets/objects/spr-obj-ratoli-pc.png.asset.json";
import { url as sprRellotge } from "@/assets/objects/spr-obj-rellotge.png.asset.json";
import { url as sprRosa } from "@/assets/objects/spr-obj-rosa.png.asset.json";
import { url as sprSabatilla } from "@/assets/objects/spr-obj-sabatilla.png.asset.json";
import { url as sprXapa } from "@/assets/objects/spr-obj-xapa.png.asset.json";
import { url as sprXiulet } from "@/assets/objects/spr-obj-xiulet.png.asset.json";

// Nom exacte a la BD → sprite URL
export const OBJECT_SPRITES: Record<string, string> = {
  "Anell": sprAnell,
  "Bola de Neu": sprBolaNeu,
  "Botó": sprBoto,
  "Calces": sprCalces,
  "Carta": sprCarta,
  "Clau": sprClau,
  "cor de vidre (joia)": sprCorVidre,
  "Cullera": sprCullera,
  "Dau": sprDau,
  "Foto": sprFoto,
  "Gel": sprGel,
  "Joguina": sprJoguina,
  "Llapis": sprLlapis,
  "Llibre": sprLlibre,
  "Mitjó": sprMitjo,
  "Mitjó pudent": sprMitjoPudent,
  "Mocador": sprMocador,
  "Moneda": sprMoneda,
  "Nas de pallasso": sprNasPallasso,
  "Pastís d'aniversari": sprPastis,
  "Petard": sprPetard,
  "Pilota": sprPilota,
  "Pinta": sprPinta,
  "Plàtan podrit": sprPlatanPodrit,
  "ratolí de pc": sprRatoliPc,
  "Rellotge": sprRellotge,
  "Rosa": sprRosa,
  "Sabatilla": sprSabatilla,
  "Xapa": sprXapa,
  "Xiulet": sprXiulet,
  "__custom__": sprCustom,
};

/** Retorna la URL del sprite per un objecte per nom, o null si no hi ha match. */
export function getObjectSprite(name?: string | null): string | null {
  if (!name) return null;
  return OBJECT_SPRITES[name] ?? null;
}

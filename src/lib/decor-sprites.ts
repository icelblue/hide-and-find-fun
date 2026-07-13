// ============================================================
// decor-sprites.ts — Sprites del jardí, paret i decoració ambient
// ============================================================
// Substitueixen els emojis directes que quedaven al joc:
// - Jardí: fases de creixement i collites (abans 🌱🌿🥕🍅🍓)
// - Paret: finestres, quadres, rellotges... (abans 🪟🖼️🕰️🪞)
// - Ambient: detallets del terra per tema (abans 🧸🍎💧...)
// Fallback: si un emoji no té sprite mapejat, es mostra l'emoji.
// ============================================================
import { url as gardenSprout } from "@/assets/room/spr-garden-sprout.png.asset.json";
import { url as gardenGrowing } from "@/assets/room/spr-garden-growing.png.asset.json";
import { url as gardenCarrot } from "@/assets/room/spr-garden-carrot.png.asset.json";
import { url as gardenTomato } from "@/assets/room/spr-garden-tomato.png.asset.json";
import { url as gardenStrawberry } from "@/assets/room/spr-garden-strawberry.png.asset.json";

import { url as wallWindow } from "@/assets/room/bg-wall-window.png.asset.json";
import { url as wallPicture } from "@/assets/room/bg-wall-picture.png.asset.json";
import { url as wallClock } from "@/assets/room/bg-wall-clock.png.asset.json";
import { url as wallMirror } from "@/assets/room/bg-wall-mirror.png.asset.json";
import { url as wallSun } from "@/assets/room/bg-wall-sun.png.asset.json";
import { url as wallBird } from "@/assets/room/bg-wall-bird.png.asset.json";
import { url as wallMoon } from "@/assets/room/bg-wall-moon.png.asset.json";

import { url as decorTeddy } from "@/assets/room/spr-decor-teddy.png.asset.json";
import { url as decorBooks } from "@/assets/room/spr-decor-books.png.asset.json";
import { url as decorCandle } from "@/assets/room/spr-decor-candle.png.asset.json";
import { url as decorApple } from "@/assets/room/spr-decor-apple.png.asset.json";
import { url as decorSpoon } from "@/assets/room/spr-decor-spoon.png.asset.json";
import { url as decorSalt } from "@/assets/room/spr-decor-salt.png.asset.json";
import { url as decorDrop } from "@/assets/room/spr-decor-drop.png.asset.json";
import { url as decorSoap } from "@/assets/room/spr-decor-soap.png.asset.json";
import { url as decorPlate } from "@/assets/room/spr-decor-plate.png.asset.json";
import { url as decorWine } from "@/assets/room/spr-decor-wine.png.asset.json";
import { url as decorClip } from "@/assets/room/spr-decor-clip.png.asset.json";
import { url as decorPin } from "@/assets/room/spr-decor-pin.png.asset.json";
import { url as decorBulb } from "@/assets/room/spr-decor-bulb.png.asset.json";
import { url as decorFlower } from "@/assets/room/spr-decor-flower.png.asset.json";
import { url as decorMushroom } from "@/assets/room/spr-decor-mushroom-s.png.asset.json";
import { url as decorButterfly } from "@/assets/room/spr-decor-butterfly.png.asset.json";
import { url as decorCloud } from "@/assets/room/spr-decor-cloud.png.asset.json";
import { url as decorLeaf } from "@/assets/room/spr-decor-leaf.png.asset.json";
import { url as decorKey } from "@/assets/room/spr-decor-key.png.asset.json";
import { url as decorCoat } from "@/assets/room/spr-decor-coat.png.asset.json";
import { url as decorShoe } from "@/assets/room/spr-decor-shoe.png.asset.json";
import { url as decorTvS } from "@/assets/room/spr-decor-tv-s.png.asset.json";
import { url as decorCouchS } from "@/assets/room/spr-decor-couch-s.png.asset.json";

/** Jardí: sprite per fase i tipus de planta. */
export function gardenSpriteFor(stage: "seed" | "growing" | "ready", plantType: string): string {
  if (stage === "seed") return gardenSprout;
  if (stage === "growing") return gardenGrowing;
  const ready: Record<string, string> = {
    pastanaga: gardenCarrot,
    tomaquet: gardenTomato,
    maduixa: gardenStrawberry,
  };
  return ready[plantType] ?? gardenGrowing;
}

/** Paret: emoji → sprite (fallback: undefined → es mostra l'emoji). */
export const WALL_SPRITES: Record<string, string> = {
  "🪟": wallWindow,
  "🖼️": wallPicture,
  "🕰️": wallClock,
  "🪞": wallMirror,
  "🌤️": wallSun,
  "🕊️": wallBird,
  "🌙": wallMoon,
};

/** Ambient: emoji de tema → sprite (fallback: undefined → emoji). */
export const AMBIENT_SPRITES: Record<string, string> = {
  "🧸": decorTeddy, "📚": decorBooks, "🕯️": decorCandle,
  "🍎": decorApple, "🥄": decorSpoon, "🧂": decorSalt,
  "💧": decorDrop, "🧼": decorSoap, "🫧": decorSoap,
  "🍽️": decorPlate, "🍷": decorWine,
  "📎": decorClip, "📌": decorPin, "💡": decorBulb,
  "🌼": decorFlower, "🍄": decorMushroom, "🦋": decorButterfly,
  "☁️": decorCloud, "🌿": decorLeaf, "🌱": decorLeaf,
  "🗝️": decorKey, "🧥": decorCoat, "👞": decorShoe,
  "📺": decorTvS, "🛋️": decorCouchS,
};

// ============================================================
// ObjectIcon — Renderitza sprite pixel art d'un objecte amagable
// amb fallback a emoji si no hi ha sprite mapejat.
// ============================================================
import { getObjectSprite } from "@/lib/object-sprites";

interface Props {
  /** Nom de l'objecte (clau primària per buscar el sprite) */
  name?: string | null;
  /** Emoji fallback (o custom_icon del jugador) */
  emoji?: string | null;
  /** Mida en px del sprite. Emoji usarà el text-size del pare. */
  size?: number;
  className?: string;
  alt?: string;
}

export default function ObjectIcon({ name, emoji, size = 48, className = "", alt = "" }: Props) {
  const sprite = getObjectSprite(name);
  if (sprite) {
    return (
      <img
        src={sprite}
        alt={alt || name || ""}
        width={size}
        height={size}
        loading="lazy"
        className={`inline-block object-contain ${className}`}
        style={{ imageRendering: "pixelated", width: size, height: size }}
      />
    );
  }
  return <span className={className} aria-hidden={!alt}>{emoji ?? "⭐"}</span>;
}

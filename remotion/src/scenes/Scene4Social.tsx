import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Orbitron";
import { loadFont as loadBody } from "@remotion/google-fonts/SpaceGrotesk";

const { fontFamily: titleFont } = loadFont("normal", { weights: ["700"], subsets: ["latin"] });
const { fontFamily: bodyFont } = loadBody("normal", { weights: ["500", "600"], subsets: ["latin"] });

export const Scene4Social = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const items = [
    { emoji: "🍌", name: "Plàtan", desc: "Bloqueja rival", delay: 10 },
    { emoji: "💣", name: "Bomba de fum", desc: "Mou objecte!", delay: 22 },
    { emoji: "🛡️", name: "Escut", desc: "Protecció", delay: 34 },
    { emoji: "🔄", name: "Intercanvi", desc: "Swap posicions", delay: 46 },
    { emoji: "🕵️", name: "Espia", desc: "Localitza rival", delay: 58 },
  ];

  const titleS = spring({ frame, fps, config: { damping: 15 } });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 60 }}>
      {/* Title */}
      <div
        style={{
          fontFamily: titleFont,
          fontSize: 44,
          fontWeight: 700,
          color: "hsl(265, 90%, 70%)",
          textAlign: "center",
          transform: `scale(${titleS})`,
          marginBottom: 50,
          textShadow: "0 0 25px hsla(265, 90%, 65%, 0.5)",
        }}
      >
        ⚡ ÍTEMS SOCIALS
      </div>

      {/* Items grid */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center", maxWidth: 900 }}>
        {items.map((item, i) => {
          const s = spring({ frame: frame - item.delay, fps, config: { damping: 10, stiffness: 180 } });
          const scale = interpolate(s, [0, 1], [0, 1]);
          const rotation = interpolate(s, [0, 0.5, 1], [-15, 5, 0]);

          return (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                background: "hsla(230, 12%, 16%, 0.9)",
                borderRadius: 24,
                padding: "24px 20px",
                width: 180,
                transform: `scale(${scale}) rotate(${rotation}deg)`,
                border: "1px solid hsla(265, 60%, 50%, 0.3)",
              }}
            >
              <span style={{ fontSize: 52, marginBottom: 8 }}>{item.emoji}</span>
              <span style={{ fontFamily: bodyFont, fontSize: 22, fontWeight: 600, color: "white" }}>
                {item.name}
              </span>
              <span style={{ fontFamily: bodyFont, fontSize: 16, color: "hsla(220, 10%, 60%, 0.9)", marginTop: 4 }}>
                {item.desc}
              </span>
            </div>
          );
        })}
      </div>

      {/* Fun label */}
      <div
        style={{
          fontFamily: bodyFont,
          fontSize: 26,
          color: "hsl(30, 100%, 58%)",
          marginTop: 50,
          opacity: interpolate(frame, [65, 80], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          transform: `scale(${interpolate(frame, [65, 80], [0.8, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })})`,
        }}
      >
        1 ítem per dia · Estratègia pura! 🧠
      </div>
    </AbsoluteFill>
  );
};

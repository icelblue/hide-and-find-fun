import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Orbitron";
import { loadFont as loadBody } from "@remotion/google-fonts/SpaceGrotesk";

const { fontFamily: titleFont } = loadFont("normal", { weights: ["700"], subsets: ["latin"] });
const { fontFamily: bodyFont } = loadBody("normal", { weights: ["500", "600"], subsets: ["latin"] });

export const Scene3Search = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleScale = spring({ frame, fps, config: { damping: 15, stiffness: 150 } });

  const hints = [
    { emoji: "❄️", label: "Fred", desc: "Habitació incorrecta", color: "hsl(200, 80%, 60%)", delay: 20 },
    { emoji: "🌡️", label: "Calent", desc: "Bona sala, mal moble", color: "hsl(30, 90%, 55%)", delay: 35 },
    { emoji: "🔥", label: "Molt calent!", desc: "Moble correcte!", color: "hsl(0, 80%, 55%)", delay: 50 },
  ];

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 60 }}>
      {/* Title */}
      <div
        style={{
          fontFamily: titleFont,
          fontSize: 48,
          fontWeight: 700,
          color: "hsl(175, 70%, 50%)",
          textAlign: "center",
          transform: `scale(${titleScale})`,
          marginBottom: 50,
          textShadow: "0 0 30px hsla(175, 70%, 50%, 0.4)",
        }}
      >
        🔍 BUSCA I DEDUEIX
      </div>

      {/* Token cost */}
      <div
        style={{
          fontFamily: bodyFont,
          fontSize: 30,
          color: "hsla(220, 15%, 85%, 0.9)",
          textAlign: "center",
          marginBottom: 40,
          opacity: interpolate(frame, [10, 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        5 🪙 tokens al dia · Administra'ls bé!
      </div>

      {/* Hint cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%" }}>
        {hints.map((hint, i) => {
          const s = spring({ frame: frame - hint.delay, fps, config: { damping: 12 } });
          const scale = interpolate(s, [0, 1], [0.5, 1]);
          const op = interpolate(s, [0, 1], [0, 1]);

          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
                background: "hsla(230, 12%, 14%, 0.9)",
                borderRadius: 20,
                padding: "20px 28px",
                transform: `scale(${scale})`,
                opacity: op,
                borderLeft: `5px solid ${hint.color}`,
              }}
            >
              <span style={{ fontSize: 52 }}>{hint.emoji}</span>
              <div>
                <div style={{ fontFamily: bodyFont, fontSize: 30, fontWeight: 600, color: hint.color }}>
                  {hint.label}
                </div>
                <div style={{ fontFamily: bodyFont, fontSize: 24, color: "hsla(220, 10%, 70%, 0.9)" }}>
                  {hint.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Magnifying glass animation */}
      <div
        style={{
          position: "absolute",
          bottom: 180,
          fontSize: 80,
          transform: `translateX(${Math.sin(frame * 0.08) * 100}px) rotate(${Math.sin(frame * 0.06) * 10}deg)`,
          opacity: interpolate(frame, [60, 75], [0, 0.6], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        🔎
      </div>
    </AbsoluteFill>
  );
};

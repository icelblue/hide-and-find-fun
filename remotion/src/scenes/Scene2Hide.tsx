import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Sequence } from "remotion";
import { loadFont } from "@remotion/google-fonts/Orbitron";
import { loadFont as loadBody } from "@remotion/google-fonts/SpaceGrotesk";

const { fontFamily: titleFont } = loadFont("normal", { weights: ["700"], subsets: ["latin"] });
const { fontFamily: bodyFont } = loadBody("normal", { weights: ["500", "600"], subsets: ["latin"] });

export const Scene2Hide = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleX = interpolate(
    spring({ frame, fps, config: { damping: 20, stiffness: 200 } }),
    [0, 1], [-400, 0]
  );

  const steps = [
    { emoji: "🏠", text: "Tria escenari", delay: 15 },
    { emoji: "🪑", text: "Tria moble", delay: 30 },
    { emoji: "📍", text: "Sobre / Sota / Dins", delay: 45 },
    { emoji: "✅", text: "Amaga l'objecte!", delay: 60 },
  ];

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 60 }}>
      {/* Phase label */}
      <div
        style={{
          fontFamily: titleFont,
          fontSize: 52,
          fontWeight: 700,
          color: "hsl(30, 100%, 58%)",
          textAlign: "center",
          transform: `translateX(${titleX}px)`,
          marginBottom: 50,
          textShadow: "0 0 30px hsla(30, 100%, 58%, 0.4)",
        }}
      >
        🫣 FASE D'AMAGAR
      </div>

      {/* Steps */}
      <div style={{ display: "flex", flexDirection: "column", gap: 30, width: "100%" }}>
        {steps.map((step, i) => {
          const s = spring({ frame: frame - step.delay, fps, config: { damping: 15 } });
          const x = interpolate(s, [0, 1], [300, 0]);
          const op = interpolate(s, [0, 1], [0, 1]);

          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 24,
                background: "hsla(230, 12%, 18%, 0.8)",
                borderRadius: 20,
                padding: "24px 32px",
                transform: `translateX(${x}px)`,
                opacity: op,
                border: "1px solid hsla(265, 90%, 65%, 0.3)",
              }}
            >
              <span style={{ fontSize: 56 }}>{step.emoji}</span>
              <span
                style={{
                  fontFamily: bodyFont,
                  fontSize: 34,
                  fontWeight: 600,
                  color: "white",
                }}
              >
                {step.text}
              </span>
            </div>
          );
        })}
      </div>

      {/* Arrow connector */}
      <Sequence from={70}>
        <div
          style={{
            position: "absolute",
            bottom: 200,
            fontFamily: bodyFont,
            fontSize: 28,
            color: "hsla(175, 70%, 50%, 0.8)",
            opacity: interpolate(frame - 70, [0, 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        >
          Tots dos amagueu alhora! ⚡
        </div>
      </Sequence>
    </AbsoluteFill>
  );
};

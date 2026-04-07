import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Orbitron";
import { loadFont as loadBody } from "@remotion/google-fonts/SpaceGrotesk";

const { fontFamily: titleFont } = loadFont("normal", { weights: ["700", "900"], subsets: ["latin"] });
const { fontFamily: bodyFont } = loadBody("normal", { weights: ["500", "600", "700"], subsets: ["latin"] });

export const Scene5CTA = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleS = spring({ frame, fps, config: { damping: 10, stiffness: 120 } });
  const badgeS = spring({ frame: frame - 25, fps, config: { damping: 12 } });
  const featuresOp = interpolate(frame, [35, 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const pulse = 1 + Math.sin(frame * 0.12) * 0.05;

  const features = [
    "🏆 Elo + Lligues competitives",
    "🐾 Mode Història amb mascota",
    "🎁 Mobles col·leccionables",
    "⚡ Ítems socials estratègics",
  ];

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 60 }}>
      {/* Big glow */}
      <div
        style={{
          position: "absolute",
          width: 800,
          height: 800,
          borderRadius: "50%",
          background: "radial-gradient(circle, hsla(265, 90%, 65%, 0.3) 0%, transparent 60%)",
          top: "40%",
          left: "50%",
          transform: `translate(-50%, -50%) scale(${pulse})`,
        }}
      />

      {/* Title */}
      <div
        style={{
          fontFamily: titleFont,
          fontSize: 72,
          fontWeight: 900,
          color: "white",
          textAlign: "center",
          transform: `scale(${titleS})`,
          textShadow: "0 0 50px hsla(265, 90%, 65%, 0.5)",
          lineHeight: 1.15,
        }}
      >
        JUGA
        <br />
        <span style={{ color: "hsl(175, 70%, 50%)" }}>ARA!</span>
      </div>

      {/* URL badge */}
      <div
        style={{
          fontFamily: bodyFont,
          fontSize: 30,
          fontWeight: 700,
          color: "hsl(30, 100%, 58%)",
          background: "hsla(230, 12%, 14%, 0.9)",
          borderRadius: 16,
          padding: "16px 36px",
          marginTop: 40,
          transform: `scale(${badgeS * pulse})`,
          border: "2px solid hsl(30, 100%, 58%)",
          textShadow: "0 0 15px hsla(30, 100%, 58%, 0.4)",
        }}
      >
        deductionduel.lovable.app
      </div>

      {/* Features */}
      <div
        style={{
          marginTop: 60,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          opacity: featuresOp,
        }}
      >
        {features.map((f, i) => {
          const delay = 40 + i * 10;
          const fOp = interpolate(frame, [delay, delay + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const fX = interpolate(frame, [delay, delay + 15], [-60, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

          return (
            <div
              key={i}
              style={{
                fontFamily: bodyFont,
                fontSize: 26,
                color: "hsla(220, 15%, 88%, 0.9)",
                opacity: fOp,
                transform: `translateX(${fX}px)`,
              }}
            >
              {f}
            </div>
          );
        })}
      </div>

      {/* Bottom emoji wave */}
      <div
        style={{
          position: "absolute",
          bottom: 120,
          fontSize: 50,
          display: "flex",
          gap: 20,
        }}
      >
        {["🕵️", "🔍", "🧩", "🏆", "🐾"].map((e, i) => (
          <span
            key={i}
            style={{
              transform: `translateY(${Math.sin(frame * 0.1 + i * 1.2) * 15}px)`,
              display: "inline-block",
            }}
          >
            {e}
          </span>
        ))}
      </div>
    </AbsoluteFill>
  );
};

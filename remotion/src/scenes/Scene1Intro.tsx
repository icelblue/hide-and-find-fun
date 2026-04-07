import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Orbitron";
import { loadFont as loadBody } from "@remotion/google-fonts/SpaceGrotesk";

const { fontFamily: titleFont } = loadFont("normal", { weights: ["700", "900"], subsets: ["latin"] });
const { fontFamily: bodyFont } = loadBody("normal", { weights: ["500", "600"], subsets: ["latin"] });

export const Scene1Intro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleScale = spring({ frame, fps, config: { damping: 12, stiffness: 150 } });
  const subtitleY = interpolate(
    spring({ frame: frame - 20, fps, config: { damping: 15 } }),
    [0, 1], [80, 0]
  );
  const subtitleOp = interpolate(frame, [20, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const emojiScale = spring({ frame: frame - 35, fps, config: { damping: 8 } });
  
  const tagOp = interpolate(frame, [50, 65], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tagY = interpolate(frame, [50, 65], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Pulsing glow
  const glowIntensity = 0.4 + Math.sin(frame * 0.1) * 0.2;

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {/* Central glow */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, hsla(265, 90%, 65%, ${glowIntensity}) 0%, transparent 70%)`,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />

      {/* Title */}
      <div
        style={{
          fontFamily: titleFont,
          fontSize: 90,
          fontWeight: 900,
          color: "white",
          textAlign: "center",
          transform: `scale(${titleScale})`,
          textShadow: "0 0 40px hsla(265, 90%, 65%, 0.6)",
          lineHeight: 1.1,
        }}
      >
        DEDUCTION
        <br />
        <span style={{ color: "hsl(175, 70%, 50%)" }}>DUEL</span>
      </div>

      {/* Subtitle */}
      <div
        style={{
          fontFamily: bodyFont,
          fontSize: 38,
          fontWeight: 500,
          color: "hsla(220, 15%, 85%, 0.9)",
          textAlign: "center",
          marginTop: 30,
          transform: `translateY(${subtitleY}px)`,
          opacity: subtitleOp,
        }}
      >
        Amaga. Busca. Dedueix. 🧩
      </div>

      {/* Big emoji */}
      <div
        style={{
          fontSize: 120,
          marginTop: 40,
          transform: `scale(${emojiScale}) rotate(${Math.sin(frame * 0.05) * 5}deg)`,
        }}
      >
        🕵️
      </div>

      {/* Tag */}
      <div
        style={{
          fontFamily: bodyFont,
          fontSize: 28,
          fontWeight: 600,
          color: "hsl(30, 100%, 58%)",
          marginTop: 50,
          opacity: tagOp,
          transform: `translateY(${tagY}px)`,
          letterSpacing: 3,
          textTransform: "uppercase",
        }}
      >
        Joc PvP de Puzzle
      </div>
    </AbsoluteFill>
  );
};

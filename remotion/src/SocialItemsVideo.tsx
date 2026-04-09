import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Sequence } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { loadFont } from "@remotion/google-fonts/Orbitron";
import { loadFont as loadBody } from "@remotion/google-fonts/SpaceGrotesk";

const { fontFamily: titleFont } = loadFont("normal", { weights: ["700", "900"], subsets: ["latin"] });
const { fontFamily: bodyFont } = loadBody("normal", { weights: ["500", "600", "700"], subsets: ["latin"] });

// ── Scene 1: Hook — "Et penses que estàs sol?" ──
const SceneHook = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleScale = spring({ frame, fps, config: { damping: 12, stiffness: 180 } });
  const shake = frame > 20 && frame < 35 ? Math.sin(frame * 2.5) * 4 : 0;
  const bananaEntry = spring({ frame: frame - 30, fps, config: { damping: 8 } });
  const bananaRotation = interpolate(bananaEntry, [0, 1], [-90, 15]);
  const bgPulse = interpolate(frame, [30, 45], [0, 0.15], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {/* Red flash on banana impact */}
      <AbsoluteFill style={{ background: `hsla(0, 80%, 50%, ${bgPulse})` }} />

      <div style={{ textAlign: "center", transform: `translateX(${shake}px)` }}>
        <div style={{
          fontFamily: titleFont, fontSize: 58, fontWeight: 900, color: "white",
          transform: `scale(${titleScale})`, lineHeight: 1.2,
          textShadow: "0 0 40px hsla(0, 0%, 100%, 0.3)",
        }}>
          ET PENSES QUE{"\n"}ESTÀS SOL? 🤔
        </div>

        <div style={{
          fontSize: 140, marginTop: 60,
          transform: `scale(${bananaEntry}) rotate(${bananaRotation}deg)`,
          filter: `drop-shadow(0 0 30px hsla(50, 100%, 50%, 0.6))`,
        }}>
          🍌
        </div>

        <div style={{
          fontFamily: bodyFont, fontSize: 32, color: "hsl(50, 100%, 65%)",
          marginTop: 30, fontWeight: 700,
          opacity: interpolate(frame, [40, 55], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          transform: `translateY(${interpolate(frame, [40, 55], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
        }}>
          💥 PLÀTAN REBUT!
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Scene 2: Phone mockup showing banana block ──
const SceneBananaEffect = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const phoneScale = spring({ frame, fps, config: { damping: 15 } });
  const blockedOpacity = interpolate(frame, [25, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const blockedScale = spring({ frame: frame - 25, fps, config: { damping: 8 } });
  const drift = Math.sin(frame * 0.04) * 6;

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {/* Phone mockup */}
      <div style={{
        transform: `scale(${phoneScale * 0.85}) translateY(${drift}px)`,
        width: 380, borderRadius: 32,
        background: "hsla(230, 15%, 12%, 0.95)",
        border: "3px solid hsla(50, 60%, 40%, 0.4)",
        padding: 20, boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
      }}>
        {/* Status bar */}
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: bodyFont, fontSize: 14, color: "hsla(220, 10%, 60%, 0.8)", marginBottom: 16 }}>
          <span>🎮 Partida activa</span>
          <span>🪙 3/5</span>
        </div>

        {/* Scenario grid */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { name: "🍳 Cuina", blocked: true },
            { name: "📚 Biblioteca", blocked: false },
            { name: "🔧 Garatge", blocked: false },
          ].map((s, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 12,
              background: s.blocked ? "hsla(0, 60%, 20%, 0.6)" : "hsla(220, 15%, 18%, 0.8)",
              borderRadius: 16, padding: "14px 16px",
              border: s.blocked ? "2px solid hsla(0, 70%, 45%, 0.5)" : "1px solid hsla(220, 15%, 25%, 0.5)",
              opacity: interpolate(frame, [5 + i * 6, 15 + i * 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              transform: `translateX(${interpolate(frame, [5 + i * 6, 15 + i * 6], [-40, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
            }}>
              <span style={{ fontSize: 28 }}>{s.name}</span>
              {s.blocked && (
                <span style={{
                  marginLeft: "auto", fontSize: 20,
                  opacity: blockedOpacity,
                  transform: `scale(${blockedScale})`,
                }}>
                  🍌🚫
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Notification toast */}
        <div style={{
          marginTop: 20, background: "hsla(50, 80%, 20%, 0.8)",
          borderRadius: 14, padding: "12px 16px",
          border: "1px solid hsla(50, 60%, 40%, 0.4)",
          opacity: blockedOpacity,
          transform: `translateY(${interpolate(frame, [25, 40], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
        }}>
          <div style={{ fontFamily: bodyFont, fontSize: 16, color: "hsl(50, 100%, 70%)", fontWeight: 600 }}>
            ⚠️ El rival t'ha llançat un plàtan!
          </div>
          <div style={{ fontFamily: bodyFont, fontSize: 13, color: "hsla(50, 40%, 60%, 0.8)", marginTop: 4 }}>
            Cuina bloquejada fins demà
          </div>
        </div>
      </div>

      {/* Label */}
      <div style={{
        fontFamily: titleFont, fontSize: 28, fontWeight: 700,
        color: "hsl(50, 100%, 65%)", marginTop: 40, textAlign: "center",
        opacity: interpolate(frame, [50, 65], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        textShadow: "0 0 20px hsla(50, 100%, 50%, 0.4)",
      }}>
        POSICIÓ BLOQUEJADA 🔒
      </div>
    </AbsoluteFill>
  );
};

// ── Scene 3: All items showcase — rapid fire ──
const SceneItemShowcase = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const items = [
    { emoji: "🍌", name: "PLÀTAN", desc: "Bloqueja rival", color: "hsl(50, 100%, 65%)", delay: 0 },
    { emoji: "💣", name: "BOMBA", desc: "Mou objecte!", color: "hsl(0, 80%, 60%)", delay: 12 },
    { emoji: "🛡️", name: "ESCUT", desc: "Protecció total", color: "hsl(200, 80%, 60%)", delay: 24 },
    { emoji: "🔄", name: "SWAP", desc: "Canvia sales", color: "hsl(130, 70%, 55%)", delay: 36 },
    { emoji: "🕵️", name: "ESPIA", desc: "Localitza rival", color: "hsl(265, 80%, 65%)", delay: 48 },
    { emoji: "💡", name: "MISSATGE", desc: "Pista o farol", color: "hsl(30, 100%, 58%)", delay: 60 },
    { emoji: "🔧", name: "ROBAR", desc: "Roba tornavís", color: "hsl(175, 70%, 50%)", delay: 72 },
  ];

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 40 }}>
      <div style={{
        fontFamily: titleFont, fontSize: 38, fontWeight: 900, color: "white",
        textAlign: "center", marginBottom: 40,
        opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        textShadow: "0 0 30px hsla(265, 80%, 60%, 0.4)",
      }}>
        ⚡ 7 ÍTEMS SOCIALS
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 500 }}>
        {items.map((item, i) => {
          const s = spring({ frame: frame - item.delay, fps, config: { damping: 12, stiffness: 200 } });
          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 16,
              background: "hsla(230, 12%, 14%, 0.9)",
              borderRadius: 20, padding: "14px 20px",
              border: `1px solid ${item.color}40`,
              transform: `translateX(${interpolate(s, [0, 1], [i % 2 === 0 ? -300 : 300, 0])}px) scale(${interpolate(s, [0, 1], [0.8, 1])})`,
              opacity: interpolate(s, [0, 0.3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            }}>
              <span style={{ fontSize: 44 }}>{item.emoji}</span>
              <div>
                <div style={{ fontFamily: titleFont, fontSize: 20, fontWeight: 700, color: item.color }}>{item.name}</div>
                <div style={{ fontFamily: bodyFont, fontSize: 15, color: "hsla(220, 10%, 65%, 0.9)" }}>{item.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Daily limit badge */}
      <div style={{
        fontFamily: bodyFont, fontSize: 24, fontWeight: 700,
        color: "hsl(30, 100%, 58%)", marginTop: 35,
        opacity: interpolate(frame, [85, 100], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        transform: `scale(${interpolate(frame, [85, 100], [0.7, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })})`,
      }}>
        1 ÍTEM / DIA · ESTRATÈGIA PURA 🧠
      </div>
    </AbsoluteFill>
  );
};

// ── Scene 4: Drama — Shield blocks banana ──
const SceneShieldBlock = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bananaFly = interpolate(frame, [0, 25], [400, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bananaRot = interpolate(frame, [0, 25], [180, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const impactFlash = frame >= 25 && frame < 35;
  const shieldPulse = spring({ frame: frame - 25, fps, config: { damping: 6 } });
  const shieldGlow = interpolate(shieldPulse, [0, 1], [0, 1]);
  const bananaDeflect = frame >= 25
    ? interpolate(frame, [25, 50], [0, -500], { extrapolateRight: "clamp" })
    : 0;
  const bananaDeflectRot = frame >= 25
    ? interpolate(frame, [25, 50], [0, -360], { extrapolateRight: "clamp" })
    : 0;
  const textOp = interpolate(frame, [35, 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {impactFlash && (
        <AbsoluteFill style={{ background: "hsla(200, 90%, 60%, 0.25)" }} />
      )}

      {/* Shield */}
      <div style={{
        fontSize: 200,
        filter: `drop-shadow(0 0 ${40 * shieldGlow}px hsla(200, 90%, 60%, ${0.6 * shieldGlow}))`,
        transform: `scale(${1 + shieldPulse * 0.15})`,
      }}>
        🛡️
      </div>

      {/* Banana flying in then deflecting */}
      <div style={{
        position: "absolute",
        fontSize: 100,
        transform: `translateX(${frame < 25 ? bananaFly : bananaDeflect}px) rotate(${frame < 25 ? bananaRot : bananaDeflectRot}deg)`,
        opacity: frame >= 50 ? 0 : 1,
      }}>
        🍌
      </div>

      {/* BLOCKED text */}
      <div style={{
        position: "absolute", bottom: 350,
        fontFamily: titleFont, fontSize: 52, fontWeight: 900,
        color: "hsl(200, 90%, 65%)", textAlign: "center",
        opacity: textOp,
        textShadow: "0 0 30px hsla(200, 90%, 60%, 0.5)",
        transform: `scale(${interpolate(frame, [35, 50], [0.5, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })})`,
      }}>
        BLOQUEJAT! 💪
      </div>

      <div style={{
        position: "absolute", bottom: 290,
        fontFamily: bodyFont, fontSize: 24, color: "hsla(200, 60%, 70%, 0.9)",
        textAlign: "center", opacity: textOp,
      }}>
        L'escut et protegeix
      </div>
    </AbsoluteFill>
  );
};

// ── Scene 5: CTA ──
const SceneCTA = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleS = spring({ frame, fps, config: { damping: 12 } });
  const subtitleOp = interpolate(frame, [20, 35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pulse = Math.sin(frame * 0.15) * 0.05 + 1;

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          fontFamily: titleFont, fontSize: 52, fontWeight: 900, color: "white",
          transform: `scale(${titleS * pulse})`, lineHeight: 1.3,
          textShadow: "0 0 40px hsla(265, 80%, 60%, 0.4)",
        }}>
          DEDUCTION{"\n"}DUEL ⚔️
        </div>

        <div style={{
          fontFamily: bodyFont, fontSize: 28, color: "hsl(30, 100%, 58%)",
          marginTop: 30, fontWeight: 700, opacity: subtitleOp,
        }}>
          Amaga. Busca. Saboteja.
        </div>

        <div style={{
          fontFamily: bodyFont, fontSize: 22, color: "hsla(220, 10%, 70%, 0.8)",
          marginTop: 16, opacity: subtitleOp,
        }}>
          Disponible ara · Juga gratis
        </div>

        {/* Floating items */}
        {["🍌", "💣", "🛡️", "🔄", "🕵️"].map((e, i) => {
          const angle = (i / 5) * Math.PI * 2 + frame * 0.02;
          const radius = 220;
          return (
            <div key={i} style={{
              position: "absolute",
              left: 540 + Math.cos(angle) * radius - 25,
              top: 960 + Math.sin(angle) * radius * 0.6 + 200,
              fontSize: 50,
              opacity: 0.4,
              transform: `rotate(${Math.sin(frame * 0.03 + i) * 20}deg)`,
            }}>
              {e}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ── Background ──
const AnimatedBG = () => {
  const frame = useCurrentFrame();
  const hue = interpolate(frame, [0, 600], [0, 80]);
  return (
    <AbsoluteFill style={{
      background: `linear-gradient(
        ${140 + frame * 0.1}deg,
        hsl(${245 + hue}, 55%, 7%),
        hsl(${260 + hue}, 50%, 12%),
        hsl(${230 + hue}, 60%, 8%)
      )`,
    }} />
  );
};

const Particles = () => {
  const frame = useCurrentFrame();
  const ps = [
    { e: "🍌", x: 80, y: 300, s: 0.7 },
    { e: "💣", x: 950, y: 700, s: 1.1 },
    { e: "🛡️", x: 150, y: 1500, s: 0.5 },
    { e: "🔄", x: 900, y: 1200, s: 0.9 },
    { e: "🕵️", x: 500, y: 900, s: 0.8 },
  ];
  return (
    <AbsoluteFill style={{ opacity: 0.08 }}>
      {ps.map((p, i) => (
        <div key={i} style={{
          position: "absolute", left: p.x,
          top: p.y + Math.sin(frame * 0.025 * p.s) * 50,
          fontSize: 36, transform: `rotate(${Math.sin(frame * 0.02 + i) * 20}deg)`,
        }}>{p.e}</div>
      ))}
    </AbsoluteFill>
  );
};

// ── Main composition ──
export const SocialItemsVideo = () => (
  <AbsoluteFill>
    <AnimatedBG />
    <Particles />
    <TransitionSeries>
      {/* Hook: 3s */}
      <TransitionSeries.Sequence durationInFrames={90}>
        <SceneHook />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={slide({ direction: "from-bottom" })}
        timing={springTiming({ config: { damping: 200 }, durationInFrames: 15 })}
      />
      {/* Banana effect: 3s */}
      <TransitionSeries.Sequence durationInFrames={95}>
        <SceneBananaEffect />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={springTiming({ config: { damping: 200 }, durationInFrames: 15 })}
      />
      {/* All items: 4s */}
      <TransitionSeries.Sequence durationInFrames={120}>
        <SceneItemShowcase />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={slide({ direction: "from-right" })}
        timing={springTiming({ config: { damping: 200 }, durationInFrames: 15 })}
      />
      {/* Shield drama: 3s */}
      <TransitionSeries.Sequence durationInFrames={85}>
        <SceneShieldBlock />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={springTiming({ config: { damping: 200 }, durationInFrames: 15 })}
      />
      {/* CTA: 3s */}
      <TransitionSeries.Sequence durationInFrames={90}>
        <SceneCTA />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  </AbsoluteFill>
);

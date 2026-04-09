import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Sequence } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { loadFont } from "@remotion/google-fonts/Orbitron";
import { loadFont as loadBody } from "@remotion/google-fonts/SpaceGrotesk";

const { fontFamily: titleFont } = loadFont("normal", { weights: ["700", "900"], subsets: ["latin"] });
const { fontFamily: bodyFont } = loadBody("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] });

// ── Shared UI styling (matches the real app dark theme) ──
const appBg = "hsl(240, 10%, 8%)";
const cardBg = "hsla(240, 8%, 14%, 0.85)";
const cardBorder = "hsla(240, 8%, 25%, 0.5)";
const mutedText = "hsla(220, 10%, 55%, 1)";
const primaryColor = "hsl(265, 90%, 65%)";
const accentColor = "hsl(30, 100%, 58%)";
const destructive = "hsl(0, 72%, 51%)";

// ── Cursor component ──
const Cursor = ({ x, y, visible }: { x: number; y: number; visible: boolean }) => (
  <div style={{
    position: "absolute", left: x, top: y, width: 28, height: 28,
    borderRadius: "50%", background: "hsla(265, 90%, 70%, 0.5)",
    border: "2px solid hsla(265, 90%, 80%, 0.8)",
    boxShadow: "0 0 20px hsla(265, 90%, 65%, 0.4)",
    opacity: visible ? 1 : 0, pointerEvents: "none" as const, zIndex: 100,
    transform: "translate(-50%, -50%)",
  }} />
);

// ── Click ripple effect ──
const ClickRipple = ({ x, y, frame, clickFrame }: { x: number; y: number; frame: number; clickFrame: number }) => {
  const elapsed = frame - clickFrame;
  if (elapsed < 0 || elapsed > 20) return null;
  const scale = interpolate(elapsed, [0, 20], [0.3, 2.5]);
  const opacity = interpolate(elapsed, [0, 20], [0.6, 0]);
  return (
    <div style={{
      position: "absolute", left: x, top: y, width: 40, height: 40,
      borderRadius: "50%", border: "2px solid hsla(265, 90%, 70%, 0.6)",
      transform: `translate(-50%, -50%) scale(${scale})`, opacity, zIndex: 99,
    }} />
  );
};

// ── Caption bar at top (TikTok style) ──
const Caption = ({ text, frame, showFrom }: { text: string; frame: number; showFrom: number }) => {
  const op = interpolate(frame, [showFrom, showFrom + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{
      position: "absolute", top: 80, left: 0, right: 0, textAlign: "center", zIndex: 90,
      opacity: op,
    }}>
      <span style={{
        fontFamily: titleFont, fontSize: 28, fontWeight: 700, color: "white",
        background: "hsla(0, 0%, 0%, 0.6)", padding: "8px 24px", borderRadius: 16,
        textShadow: "0 2px 8px rgba(0,0,0,0.5)",
      }}>
        {text}
      </span>
    </div>
  );
};

// ════════════════════════════════════════════
// SCENE 1: Gameplay screen — Jugador veu la partida
// ════════════════════════════════════════════
const Scene1GameplayView = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Cursor moves to "Usar ítem social" button
  const cursorX = interpolate(frame, [20, 50], [540, 540], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cursorY = interpolate(frame, [20, 50], [400, 1340], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const clickFrame = 55;

  const screenScale = spring({ frame, fps, config: { damping: 20 } });

  return (
    <AbsoluteFill style={{ background: appBg }}>
      <div style={{ transform: `scale(${screenScale})`, width: "100%", height: "100%" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "60px 40px 20px" }}>
          <span style={{ fontFamily: bodyFont, fontSize: 18, color: mutedText }}>← Lobby</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: bodyFont, fontSize: 16, color: "white", fontWeight: 600 }}>3.5🪙</span>
            <span style={{ fontFamily: bodyFont, fontSize: 14, color: mutedText }}>Dia 3/7</span>
          </div>
        </div>

        {/* Current scenario card */}
        <div style={{ margin: "10px 40px", padding: "20px 24px", background: cardBg, borderRadius: 20, border: `1px solid ${cardBorder}` }}>
          <div style={{ fontFamily: bodyFont, fontSize: 14, color: mutedText, marginBottom: 8 }}>📍 Escenari actual</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 36 }}>🍳</span>
            <div>
              <div style={{ fontFamily: bodyFont, fontSize: 22, color: "white", fontWeight: 600 }}>Cuina</div>
              <div style={{ fontFamily: bodyFont, fontSize: 13, color: mutedText }}>6 mobles disponibles</div>
            </div>
          </div>
        </div>

        {/* Items grid */}
        <div style={{ margin: "16px 40px", display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { icon: "🍳", name: "Fogons", tags: "🔥 calent" },
            { icon: "🧊", name: "Nevera", tags: "❄️ fred" },
            { icon: "🗄️", name: "Armari", tags: "" },
          ].map((item, i) => {
            const itemOp = interpolate(frame, [5 + i * 5, 15 + i * 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 14, padding: "16px 20px",
                background: cardBg, borderRadius: 16, border: `1px solid ${cardBorder}`,
                opacity: itemOp,
              }}>
                <span style={{ fontSize: 30 }}>{item.icon}</span>
                <div>
                  <div style={{ fontFamily: bodyFont, fontSize: 18, color: "white", fontWeight: 500 }}>{item.name}</div>
                  {item.tags && <div style={{ fontFamily: bodyFont, fontSize: 12, color: mutedText }}>{item.tags}</div>}
                </div>
                <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                  {["sobre", "sota", "dins"].map((pos, j) => (
                    <div key={j} style={{
                      padding: "4px 10px", borderRadius: 10, background: "hsla(240, 8%, 20%, 0.8)",
                      fontFamily: bodyFont, fontSize: 11, color: mutedText,
                    }}>{pos}</div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Social items button */}
        <div style={{ margin: "30px 40px" }}>
          <div style={{
            padding: "16px 0", textAlign: "center", borderRadius: 14,
            border: `1px solid ${primaryColor}50`, background: "hsla(265, 30%, 15%, 0.5)",
            fontFamily: bodyFont, fontSize: 18, color: primaryColor, fontWeight: 600,
          }}>
            ⚡ Usar ítem social (1/dia)
          </div>
        </div>

        {/* Connected scenarios */}
        <div style={{ margin: "10px 40px" }}>
          <div style={{ fontFamily: bodyFont, fontSize: 14, color: mutedText, marginBottom: 10 }}>🗺️ Moure's a:</div>
          <div style={{ display: "flex", gap: 10 }}>
            {[{ icon: "📚", name: "Biblioteca" }, { icon: "🔧", name: "Garatge" }].map((s, i) => (
              <div key={i} style={{
                flex: 1, padding: "14px", textAlign: "center", borderRadius: 14,
                background: cardBg, border: `1px solid ${cardBorder}`,
              }}>
                <span style={{ fontSize: 28 }}>{s.icon}</span>
                <div style={{ fontFamily: bodyFont, fontSize: 14, color: "white", marginTop: 4 }}>{s.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Caption text="ESTÀS JUGANT..." frame={frame} showFrom={5} />
      <Cursor x={cursorX} y={cursorY} visible={frame > 20 && frame < 60} />
      <ClickRipple x={540} y={1340} frame={frame} clickFrame={clickFrame} />
    </AbsoluteFill>
  );
};

// ════════════════════════════════════════════
// SCENE 2: Panel d'ítems socials s'obre — Jugador clica plàtan
// ════════════════════════════════════════════
const Scene2SocialPanel = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Panel slides in
  const panelY = interpolate(frame, [0, 15], [200, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const panelOp = interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Cursor moves to banana
  const cursorX = interpolate(frame, [25, 50], [300, 220], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cursorY = interpolate(frame, [25, 50], [900, 1060], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const clickFrame = 55;

  // Banana highlight on hover
  const bananaGlow = interpolate(frame, [45, 55], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const socialItems = [
    { icon: "🍌", name: "Plàtan", highlight: true },
    { icon: "💣", name: "Bomba fum" },
    { icon: "🛡️", name: "Escut" },
    { icon: "🔄", name: "Intercanvi" },
    { icon: "🕵️", name: "Espia" },
    { icon: "🔧", name: "Robar" },
  ];

  return (
    <AbsoluteFill style={{ background: appBg }}>
      {/* Simplified game header */}
      <div style={{ padding: "60px 40px 20px", display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontFamily: bodyFont, fontSize: 18, color: mutedText }}>← Lobby</span>
        <span style={{ fontFamily: bodyFont, fontSize: 16, color: "white", fontWeight: 600 }}>3.5🪙</span>
      </div>

      {/* Current scenario small */}
      <div style={{ margin: "10px 40px", padding: "14px 20px", background: cardBg, borderRadius: 16, border: `1px solid ${cardBorder}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 28 }}>🍳</span>
          <span style={{ fontFamily: bodyFont, fontSize: 18, color: "white", fontWeight: 600 }}>Cuina</span>
        </div>
      </div>

      {/* Dimmed items behind */}
      <div style={{ margin: "16px 40px", opacity: 0.3 }}>
        {["🍳 Fogons", "🧊 Nevera", "🗄️ Armari"].map((item, i) => (
          <div key={i} style={{
            padding: "14px 20px", background: cardBg, borderRadius: 14,
            border: `1px solid ${cardBorder}`, marginBottom: 8,
            fontFamily: bodyFont, fontSize: 16, color: "white",
          }}>{item}</div>
        ))}
      </div>

      {/* Social button (pressed state) */}
      <div style={{ margin: "16px 40px" }}>
        <div style={{
          padding: "14px 0", textAlign: "center", borderRadius: 14,
          border: `1px solid ${primaryColor}`, background: "hsla(265, 40%, 20%, 0.7)",
          fontFamily: bodyFont, fontSize: 17, color: "white", fontWeight: 600,
        }}>
          ⚡ Usar ítem social (1/dia)
        </div>
      </div>

      {/* Social items grid */}
      <div style={{
        margin: "8px 40px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12,
        transform: `translateY(${panelY}px)`, opacity: panelOp,
      }}>
        {socialItems.map((item, i) => {
          const isHighlighted = item.highlight && frame > 45;
          return (
            <div key={i} style={{
              padding: "18px 12px", textAlign: "center", borderRadius: 16,
              background: isHighlighted ? "hsla(50, 50%, 15%, 0.9)" : cardBg,
              border: `1px solid ${isHighlighted ? "hsla(50, 80%, 50%, 0.6)" : cardBorder}`,
              boxShadow: isHighlighted ? `0 0 20px hsla(50, 80%, 50%, ${bananaGlow * 0.3})` : "none",
              transform: `scale(${isHighlighted ? 1.05 : 1})`,
            }}>
              <span style={{ fontSize: 38, display: "block", marginBottom: 6 }}>{item.icon}</span>
              <span style={{ fontFamily: bodyFont, fontSize: 13, color: "white", fontWeight: 600 }}>{item.name}</span>
            </div>
          );
        })}
      </div>

      {/* Message input */}
      <div style={{
        margin: "12px 40px", display: "flex", gap: 8, alignItems: "center",
        padding: "10px 16px", background: cardBg, borderRadius: 16,
        border: `1px solid ${cardBorder}`, opacity: panelOp,
      }}>
        <span style={{ fontSize: 22 }}>💡</span>
        <span style={{ fontFamily: bodyFont, fontSize: 14, color: mutedText, flex: 1 }}>Pista o farol pel rival...</span>
        <div style={{
          padding: "6px 14px", borderRadius: 10, background: primaryColor,
          fontFamily: bodyFont, fontSize: 13, color: "white", fontWeight: 600, opacity: 0.4,
        }}>Enviar</div>
      </div>

      <Caption text="OBRE EL PANEL D'ÍTEMS ⚡" frame={frame} showFrom={0} />
      <Cursor x={cursorX} y={cursorY} visible={frame > 25 && frame < 60} />
      <ClickRipple x={220} y={1060} frame={frame} clickFrame={clickFrame} />
    </AbsoluteFill>
  );
};

// ════════════════════════════════════════════
// SCENE 3: Toast "Plàtan enviat!" + confirmació
// ════════════════════════════════════════════
const Scene3BananaSent = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Toast slides in from top
  const toastY = interpolate(frame, [0, 12], [-80, 60], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const toastOp = interpolate(frame, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Button changes to "used"
  const btnChange = interpolate(frame, [15, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Big emoji celebration
  const bigEmoji = spring({ frame: frame - 5, fps, config: { damping: 8 } });

  return (
    <AbsoluteFill style={{ background: appBg }}>
      {/* Toast notification */}
      <div style={{
        position: "absolute", top: toastY, left: 40, right: 40,
        padding: "14px 20px", borderRadius: 14, opacity: toastOp,
        background: "hsla(145, 50%, 15%, 0.95)", border: "1px solid hsla(145, 60%, 40%, 0.4)",
        display: "flex", alignItems: "center", gap: 12, zIndex: 50,
      }}>
        <span style={{ fontSize: 22 }}>🍌</span>
        <span style={{ fontFamily: bodyFont, fontSize: 16, color: "hsl(145, 70%, 65%)", fontWeight: 600 }}>
          Plàtan enviat!
        </span>
      </div>

      {/* Game screen behind */}
      <div style={{ padding: "140px 40px 20px" }}>
        {/* Scenario */}
        <div style={{ padding: "14px 20px", background: cardBg, borderRadius: 16, border: `1px solid ${cardBorder}`, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 28 }}>🍳</span>
            <span style={{ fontFamily: bodyFont, fontSize: 18, color: "white", fontWeight: 600 }}>Cuina</span>
          </div>
        </div>

        {/* Items */}
        {["🍳 Fogons", "🧊 Nevera", "🗄️ Armari"].map((item, i) => (
          <div key={i} style={{
            padding: "14px 20px", background: cardBg, borderRadius: 14,
            border: `1px solid ${cardBorder}`, marginBottom: 8,
            fontFamily: bodyFont, fontSize: 16, color: "white",
          }}>{item}</div>
        ))}

        {/* Button changed */}
        <div style={{ marginTop: 20 }}>
          <div style={{
            padding: "14px 0", textAlign: "center", borderRadius: 14,
            border: `1px solid ${cardBorder}`,
            background: interpolate(btnChange, [0, 1], [0, 1]) > 0.5 ? "hsla(240, 8%, 18%, 0.5)" : "hsla(265, 40%, 20%, 0.7)",
            fontFamily: bodyFont, fontSize: 17, color: btnChange > 0.5 ? mutedText : "white", fontWeight: 600,
          }}>
            {btnChange > 0.5 ? "⏳ Ítem social usat avui" : "⚡ Usar ítem social (1/dia)"}
          </div>
        </div>
      </div>

      {/* Big celebration emoji */}
      <div style={{
        position: "absolute", left: "50%", top: "40%",
        transform: `translate(-50%, -50%) scale(${bigEmoji})`,
        fontSize: 120, opacity: interpolate(frame, [5, 15, 40, 55], [0, 0.9, 0.9, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        filter: "drop-shadow(0 0 30px hsla(50, 100%, 50%, 0.5))",
      }}>
        🍌
      </div>

      <Caption text="✅ PLÀTAN ENVIAT AL RIVAL!" frame={frame} showFrom={5} />
    </AbsoluteFill>
  );
};

// ════════════════════════════════════════════
// SCENE 4: Pantalla del RIVAL — rep el plàtan
// ════════════════════════════════════════════
const Scene4RivalReceives = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Screen shake effect
  const shakeX = frame > 10 && frame < 30 ? Math.sin(frame * 3) * 6 : 0;
  const shakeY = frame > 10 && frame < 30 ? Math.cos(frame * 2.5) * 4 : 0;

  // Banana blocked spot appears
  const blockedOp = interpolate(frame, [15, 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const blockedPulse = Math.sin(frame * 0.2) * 0.03 + 1;

  // Warning text
  const warnOp = interpolate(frame, [20, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Label "PANTALLA DEL RIVAL"
  const labelOp = interpolate(frame, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: appBg }}>
      {/* "Rival's screen" label */}
      <div style={{
        position: "absolute", top: 50, left: 0, right: 0, textAlign: "center", zIndex: 80,
        opacity: labelOp,
      }}>
        <span style={{
          fontFamily: titleFont, fontSize: 20, fontWeight: 700, color: destructive,
          background: "hsla(0, 0%, 0%, 0.7)", padding: "8px 20px", borderRadius: 12,
          border: "1px solid hsla(0, 60%, 50%, 0.4)",
        }}>
          👤 PANTALLA DEL RIVAL
        </span>
      </div>

      <div style={{ transform: `translate(${shakeX}px, ${shakeY}px)` }}>
        {/* Header */}
        <div style={{ padding: "100px 40px 20px", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontFamily: bodyFont, fontSize: 18, color: mutedText }}>← Lobby</span>
          <span style={{ fontFamily: bodyFont, fontSize: 16, color: "white", fontWeight: 600 }}>4.0🪙</span>
        </div>

        {/* Scenario */}
        <div style={{ margin: "10px 40px", padding: "14px 20px", background: cardBg, borderRadius: 16, border: `1px solid ${cardBorder}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 28 }}>📚</span>
            <span style={{ fontFamily: bodyFont, fontSize: 18, color: "white", fontWeight: 600 }}>Biblioteca</span>
          </div>
        </div>

        {/* Items with banana blocked spot */}
        <div style={{ margin: "16px 40px" }}>
          <div style={{ fontFamily: bodyFont, fontSize: 14, color: mutedText, marginBottom: 10 }}>🪑 Mobles:</div>

          {[
            { icon: "📖", name: "Prestatgeria", blocked: false },
            { icon: "🪑", name: "Escriptori", blocked: true },
            { icon: "🛋️", name: "Sofà lectura", blocked: false },
          ].map((item, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 14, padding: "16px 20px",
              background: item.blocked ? `hsla(0, 40%, 12%, ${blockedOp * 0.8})` : cardBg,
              borderRadius: 14, border: `1px solid ${item.blocked ? `hsla(0, 60%, 40%, ${blockedOp * 0.5})` : cardBorder}`,
              marginBottom: 10, transform: item.blocked ? `scale(${blockedPulse})` : "none",
            }}>
              <span style={{ fontSize: 28 }}>{item.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: bodyFont, fontSize: 17, color: "white", fontWeight: 500 }}>{item.name}</div>
                {item.blocked && (
                  <div style={{
                    fontFamily: bodyFont, fontSize: 12, color: destructive, marginTop: 3,
                    opacity: blockedOp,
                  }}>
                    🍌 Posició "sota" bloquejada!
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {["sobre", "sota", "dins"].map((pos, j) => (
                  <div key={j} style={{
                    padding: "4px 10px", borderRadius: 10,
                    background: item.blocked && pos === "sota"
                      ? `hsla(0, 60%, 25%, ${blockedOp})`
                      : "hsla(240, 8%, 20%, 0.8)",
                    fontFamily: bodyFont, fontSize: 11,
                    color: item.blocked && pos === "sota" ? destructive : mutedText,
                    textDecoration: item.blocked && pos === "sota" ? "line-through" : "none",
                  }}>{pos}</div>
                ))}
              </div>
            </div>
          ))}

          {/* Warning banner */}
          <div style={{
            marginTop: 12, padding: "12px 18px", borderRadius: 14,
            background: "hsla(50, 60%, 12%, 0.9)", border: "1px solid hsla(50, 70%, 40%, 0.4)",
            opacity: warnOp,
          }}>
            <div style={{ fontFamily: bodyFont, fontSize: 14, color: "hsl(50, 90%, 65%)", fontWeight: 600 }}>
              🍌 Una posició està bloquejada!
            </div>
            <div style={{ fontFamily: bodyFont, fontSize: 12, color: mutedText, marginTop: 3 }}>
              Fes una altra acció per desbloquejar-la.
            </div>
          </div>
        </div>
      </div>

      <Caption text="💥 EL RIVAL REP EL PLÀTAN!" frame={frame} showFrom={10} />
    </AbsoluteFill>
  );
};

// ════════════════════════════════════════════
// SCENE 5: Tots els ítems (recap ràpid)
// ════════════════════════════════════════════
const Scene5AllItems = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const items = [
    { icon: "🍌", name: "Plàtan", desc: "Bloqueja una posició del rival", color: "hsl(50, 100%, 65%)" },
    { icon: "💣", name: "Bomba de fum", desc: "Mou l'objecte a un altre escenari", color: "hsl(0, 80%, 60%)" },
    { icon: "🛡️", name: "Escut", desc: "Protegeix del pròxim atac", color: "hsl(200, 80%, 60%)" },
    { icon: "🔄", name: "Intercanvi", desc: "Canvia escenaris amb el rival", color: "hsl(130, 70%, 55%)" },
    { icon: "🕵️", name: "Espia", desc: "Descobreix on és el rival ara", color: "hsl(265, 80%, 65%)" },
    { icon: "💡", name: "Missatge", desc: "Envia pista (o farol!) al rival", color: "hsl(30, 100%, 58%)" },
    { icon: "🔧", name: "Robar tornavís", desc: "Roba una eina al rival", color: "hsl(175, 70%, 50%)" },
  ];

  return (
    <AbsoluteFill style={{ background: appBg, justifyContent: "center", alignItems: "center", padding: 40 }}>
      <div style={{
        fontFamily: titleFont, fontSize: 34, fontWeight: 900, color: "white",
        textAlign: "center", marginBottom: 30,
        opacity: interpolate(frame, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
      }}>
        ⚡ 7 ÍTEMS SOCIALS
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 900 }}>
        {items.map((item, i) => {
          const delay = i * 8;
          const s = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 200 } });
          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 16,
              padding: "14px 24px", background: cardBg, borderRadius: 16,
              border: `1px solid ${item.color}30`,
              transform: `translateX(${interpolate(s, [0, 1], [i % 2 === 0 ? -400 : 400, 0])}px)`,
              opacity: interpolate(s, [0, 0.3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            }}>
              <span style={{ fontSize: 40, minWidth: 50, textAlign: "center" }}>{item.icon}</span>
              <div>
                <div style={{ fontFamily: bodyFont, fontSize: 20, fontWeight: 700, color: item.color }}>{item.name}</div>
                <div style={{ fontFamily: bodyFont, fontSize: 14, color: mutedText }}>{item.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{
        fontFamily: bodyFont, fontSize: 22, fontWeight: 700,
        color: accentColor, marginTop: 30, textAlign: "center",
        opacity: interpolate(frame, [70, 85], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
      }}>
        1 ÍTEM / DIA · ESTRATÈGIA PURA 🧠
      </div>
    </AbsoluteFill>
  );
};

// ════════════════════════════════════════════
// SCENE 6: CTA final
// ════════════════════════════════════════════
const Scene6CTA = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleS = spring({ frame, fps, config: { damping: 12 } });
  const subtitleOp = interpolate(frame, [15, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pulse = Math.sin(frame * 0.12) * 0.04 + 1;

  return (
    <AbsoluteFill style={{ background: appBg, justifyContent: "center", alignItems: "center" }}>
      {/* Glow */}
      <div style={{
        position: "absolute", width: 500, height: 500, borderRadius: "50%",
        background: "radial-gradient(circle, hsla(265, 80%, 50%, 0.15), transparent 70%)",
      }} />

      <div style={{ textAlign: "center", zIndex: 10 }}>
        <div style={{
          fontFamily: titleFont, fontSize: 56, fontWeight: 900, color: "white",
          transform: `scale(${titleS * pulse})`, lineHeight: 1.25,
          textShadow: "0 0 40px hsla(265, 80%, 60%, 0.3)",
        }}>
          DEDUCTION{"\n"}DUEL ⚔️
        </div>

        <div style={{
          fontFamily: bodyFont, fontSize: 30, color: accentColor, fontWeight: 700,
          marginTop: 30, opacity: subtitleOp,
        }}>
          Amaga. Busca. Saboteja.
        </div>

        <div style={{
          fontFamily: bodyFont, fontSize: 20, color: mutedText,
          marginTop: 14, opacity: subtitleOp,
        }}>
          deductionduel.lovable.app
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ════════════════════════════════════════════
// MAIN COMPOSITION
// ════════════════════════════════════════════
export const SocialItemsVideoV2 = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill>
      {/* Subtle animated bg */}
      <AbsoluteFill style={{
        background: `linear-gradient(${140 + frame * 0.05}deg, hsl(240, 10%, 6%), hsl(250, 12%, 10%), hsl(235, 10%, 7%))`,
      }} />

      <TransitionSeries>
        {/* Scene 1: Gameplay view (3.5s) */}
        <TransitionSeries.Sequence durationInFrames={105}>
          <Scene1GameplayView />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 12 })}
        />

        {/* Scene 2: Social panel + click banana (3.5s) */}
        <TransitionSeries.Sequence durationInFrames={105}>
          <Scene2SocialPanel />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 12 })}
        />

        {/* Scene 3: Banana sent confirmation (2.5s) */}
        <TransitionSeries.Sequence durationInFrames={75}>
          <Scene3BananaSent />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 15 })}
        />

        {/* Scene 4: Rival receives (4s) */}
        <TransitionSeries.Sequence durationInFrames={120}>
          <Scene4RivalReceives />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 12 })}
        />

        {/* Scene 5: All items recap (4s) */}
        <TransitionSeries.Sequence durationInFrames={120}>
          <Scene5AllItems />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 12 })}
        />

        {/* Scene 6: CTA (3s) */}
        <TransitionSeries.Sequence durationInFrames={90}>
          <Scene6CTA />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

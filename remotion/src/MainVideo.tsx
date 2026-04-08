import { AbsoluteFill, useCurrentFrame, interpolate, Img, staticFile, Sequence, spring, useVideoConfig } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { Scene1Intro } from "./scenes/Scene1Intro";
import { Scene2Hide } from "./scenes/Scene2Hide";
import { Scene3Search } from "./scenes/Scene3Search";
import { Scene4Social } from "./scenes/Scene4Social";
import { Scene5CTA } from "./scenes/Scene5CTA";

const ScreenshotScene = ({ src, label, labelColor }: { src: string; label: string; labelColor: string }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const phoneScale = spring({ frame, fps, config: { damping: 15, stiffness: 120 } });
  const labelOp = interpolate(frame, [15, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const labelY = interpolate(frame, [15, 30], [40, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const drift = Math.sin(frame * 0.04) * 8;

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {/* Phone mockup */}
      <div
        style={{
          transform: `scale(${phoneScale}) translateY(${drift}px)`,
          borderRadius: 40,
          overflow: "hidden",
          boxShadow: "0 30px 80px rgba(0,0,0,0.6), 0 0 60px hsla(265, 90%, 65%, 0.2)",
          border: "4px solid hsla(220, 15%, 30%, 0.6)",
          width: 780,
          height: 1560,
        }}
      >
        <Img src={staticFile(`screenshots/${src}`)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>

      {/* Label */}
      <div
        style={{
          position: "absolute",
          bottom: 100,
          fontFamily: "Orbitron, sans-serif",
          fontSize: 36,
          fontWeight: 700,
          color: labelColor,
          textAlign: "center",
          opacity: labelOp,
          transform: `translateY(${labelY}px)`,
          textShadow: `0 0 30px ${labelColor}80`,
          letterSpacing: 2,
        }}
      >
        {label}
      </div>
    </AbsoluteFill>
  );
};

export const MainVideo = () => {
  const frame = useCurrentFrame();

  const hueShift = interpolate(frame, [0, 900], [0, 120]);

  return (
    <AbsoluteFill>
      {/* Persistent animated background */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(
            ${135 + interpolate(frame, [0, 900], [0, 90])}deg,
            hsl(${250 + hueShift}, 60%, 8%),
            hsl(${270 + hueShift}, 50%, 14%),
            hsl(${230 + hueShift}, 55%, 10%)
          )`,
        }}
      />

      {/* Floating particles */}
      <FloatingParticles frame={frame} />

      {/* Scenes: 30s total */}
      <TransitionSeries>
        {/* Scene 1: Logo + title intro (3.5s) */}
        <TransitionSeries.Sequence durationInFrames={105}>
          <Scene1Intro />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={wipe({ direction: "from-bottom" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })}
        />

        {/* Screenshot: Lobby (2.5s) */}
        <TransitionSeries.Sequence durationInFrames={75}>
          <ScreenshotScene src="screenshot-1-lobby.png" label="🎮 LOBBY" labelColor="hsl(175, 70%, 50%)" />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 15 })}
        />

        {/* Scene 2: Hide phase explained (3s) */}
        <TransitionSeries.Sequence durationInFrames={95}>
          <Scene2Hide />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })}
        />

        {/* Screenshot: Gameplay search (2.5s) */}
        <TransitionSeries.Sequence durationInFrames={75}>
          <ScreenshotScene src="screenshot-2-gameplay-search.png" label="🔍 BUSCA" labelColor="hsl(30, 100%, 58%)" />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={wipe({ direction: "from-left" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 15 })}
        />

        {/* Scene 3: Hint system (3s) */}
        <TransitionSeries.Sequence durationInFrames={90}>
          <Scene3Search />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 15 })}
        />

        {/* Screenshot: Investigate positions (2.5s) */}
        <TransitionSeries.Sequence durationInFrames={75}>
          <ScreenshotScene src="screenshot-3-investigate.png" label="👀 INVESTIGA" labelColor="hsl(265, 90%, 70%)" />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-bottom" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })}
        />

        {/* Scene 4: Social items (3s) */}
        <TransitionSeries.Sequence durationInFrames={95}>
          <Scene4Social />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={wipe({ direction: "from-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 15 })}
        />

        {/* Screenshot: Profile + Vitrina (2.5s) */}
        <TransitionSeries.Sequence durationInFrames={75}>
          <ScreenshotScene src="screenshot-4-profile-vitrina.png" label="🏆 COL·LECCIONA" labelColor="hsl(175, 70%, 50%)" />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 15 })}
        />

        {/* Screenshot: Story mode (2.5s) */}
        <TransitionSeries.Sequence durationInFrames={75}>
          <ScreenshotScene src="screenshot-5-story-mode.png" label="🐾 MODE HISTÒRIA" labelColor="hsl(30, 100%, 58%)" />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-bottom" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })}
        />

        {/* Scene 5: CTA (4s) */}
        <TransitionSeries.Sequence durationInFrames={120}>
          <Scene5CTA />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

const FloatingParticles = ({ frame }: { frame: number }) => {
  const particles = [
    { emoji: "🔍", x: 80, y: 200, speed: 0.8, size: 40 },
    { emoji: "🪙", x: 900, y: 600, speed: 1.2, size: 35 },
    { emoji: "🎯", x: 150, y: 1400, speed: 0.6, size: 38 },
    { emoji: "🏆", x: 950, y: 1100, speed: 1.0, size: 42 },
    { emoji: "🫣", x: 500, y: 800, speed: 0.9, size: 30 },
    { emoji: "🐾", x: 800, y: 300, speed: 0.7, size: 36 },
    { emoji: "🧩", x: 200, y: 1000, speed: 1.1, size: 34 },
  ];

  return (
    <AbsoluteFill style={{ opacity: 0.12 }}>
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: p.x,
            top: p.y + Math.sin(frame * 0.03 * p.speed) * 40,
            fontSize: p.size,
            transform: `rotate(${Math.sin(frame * 0.02 + i) * 15}deg)`,
          }}
        >
          {p.emoji}
        </div>
      ))}
    </AbsoluteFill>
  );
};
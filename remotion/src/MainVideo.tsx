import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { Scene1Intro } from "./scenes/Scene1Intro";
import { Scene2Hide } from "./scenes/Scene2Hide";
import { Scene3Search } from "./scenes/Scene3Search";
import { Scene4Social } from "./scenes/Scene4Social";
import { Scene5CTA } from "./scenes/Scene5CTA";

export const MainVideo = () => {
  const frame = useCurrentFrame();

  // Animated gradient background
  const hueShift = interpolate(frame, [0, 450], [0, 60]);

  return (
    <AbsoluteFill>
      {/* Persistent animated background */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(
            ${135 + interpolate(frame, [0, 450], [0, 45])}deg,
            hsl(${250 + hueShift}, 60%, 8%),
            hsl(${270 + hueShift}, 50%, 14%),
            hsl(${230 + hueShift}, 55%, 10%)
          )`,
        }}
      />

      {/* Floating particles */}
      <FloatingParticles frame={frame} />

      {/* Scenes */}
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={100}>
          <Scene1Intro />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 15 })}
        />
        <TransitionSeries.Sequence durationInFrames={95}>
          <Scene2Hide />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-bottom" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 15 })}
        />
        <TransitionSeries.Sequence durationInFrames={90}>
          <Scene3Search />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 15 })}
        />
        <TransitionSeries.Sequence durationInFrames={95}>
          <Scene4Social />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 15 })}
        />
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
  ];

  return (
    <AbsoluteFill style={{ opacity: 0.15 }}>
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

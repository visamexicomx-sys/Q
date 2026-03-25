import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  AbsoluteFill,
} from "remotion";

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleScale = spring({ frame, fps, config: { damping: 200 } });
  const subtitleOpacity = interpolate(frame, [20, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const lineWidth = interpolate(frame, [10, 35], [0, 300], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Decorative corner accents */}
      <div
        style={{
          position: "absolute",
          top: 40,
          left: 40,
          width: 80,
          height: 80,
          borderTop: "4px solid #e94560",
          borderLeft: "4px solid #e94560",
          opacity: interpolate(frame, [5, 20], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 40,
          right: 40,
          width: 80,
          height: 80,
          borderBottom: "4px solid #e94560",
          borderRight: "4px solid #e94560",
          opacity: interpolate(frame, [5, 20], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      />

      <div style={{ textAlign: "center", transform: `scale(${titleScale})` }}>
        {/* Logo / Icon */}
        <div
          style={{
            fontSize: 64,
            marginBottom: 20,
          }}
        >
          🏠
        </div>

        <h1
          style={{
            fontFamily: "Arial, Helvetica, sans-serif",
            fontSize: 72,
            fontWeight: 900,
            color: "#ffffff",
            margin: 0,
            letterSpacing: -2,
            textTransform: "uppercase",
          }}
        >
          Nano Banana
        </h1>

        {/* Accent line */}
        <div
          style={{
            width: lineWidth,
            height: 4,
            background: "linear-gradient(90deg, #e94560, #f5a623)",
            margin: "16px auto",
            borderRadius: 2,
          }}
        />

        <p
          style={{
            fontFamily: "Arial, Helvetica, sans-serif",
            fontSize: 28,
            color: "#e94560",
            margin: 0,
            opacity: subtitleOpacity,
            fontWeight: 600,
            letterSpacing: 6,
            textTransform: "uppercase",
          }}
        >
          House Remodeling
        </p>

        <p
          style={{
            fontFamily: "Arial, Helvetica, sans-serif",
            fontSize: 20,
            color: "rgba(255,255,255,0.6)",
            marginTop: 24,
            opacity: interpolate(frame, [35, 55], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            letterSpacing: 2,
          }}
        >
          Transform Your Space. Elevate Your Life.
        </p>
      </div>
    </AbsoluteFill>
  );
};

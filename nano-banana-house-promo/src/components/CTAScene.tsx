import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  AbsoluteFill,
} from "remotion";

export const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const mainSpring = spring({ frame, fps, config: { damping: 200 } });
  const buttonPulse = interpolate(
    Math.sin(frame * 0.15),
    [-1, 1],
    [0.95, 1.05]
  );
  const phoneOpacity = interpolate(frame, [30, 50], [0, 1], {
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
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(233,69,96,0.15) 0%, transparent 70%)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />

      <div style={{ textAlign: "center", zIndex: 1 }}>
        <h2
          style={{
            fontFamily: "Arial, Helvetica, sans-serif",
            fontSize: 52,
            color: "#fff",
            fontWeight: 900,
            margin: 0,
            textTransform: "uppercase",
            letterSpacing: 2,
            transform: `translateY(${interpolate(mainSpring, [0, 1], [40, 0])}px)`,
            opacity: mainSpring,
          }}
        >
          Ready to Transform
        </h2>
        <h2
          style={{
            fontFamily: "Arial, Helvetica, sans-serif",
            fontSize: 52,
            color: "#e94560",
            fontWeight: 900,
            margin: "4px 0 0",
            textTransform: "uppercase",
            letterSpacing: 2,
            transform: `translateY(${interpolate(mainSpring, [0, 1], [40, 0])}px)`,
            opacity: mainSpring,
          }}
        >
          Your Home?
        </h2>

        {/* CTA Button */}
        <div
          style={{
            marginTop: 40,
            transform: `scale(${buttonPulse})`,
            opacity: interpolate(frame, [15, 30], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          <div
            style={{
              display: "inline-block",
              background: "linear-gradient(135deg, #e94560, #f5a623)",
              padding: "18px 60px",
              borderRadius: 50,
              fontFamily: "Arial, Helvetica, sans-serif",
              fontSize: 24,
              color: "#fff",
              fontWeight: 800,
              letterSpacing: 3,
              textTransform: "uppercase",
              boxShadow: "0 8px 30px rgba(233,69,96,0.4)",
            }}
          >
            Get Free Quote
          </div>
        </div>

        {/* Contact info */}
        <div style={{ marginTop: 36, opacity: phoneOpacity }}>
          <p
            style={{
              fontFamily: "Arial, Helvetica, sans-serif",
              fontSize: 22,
              color: "rgba(255,255,255,0.8)",
              margin: "0 0 8px",
            }}
          >
            📞 (555) 123-4567
          </p>
          <p
            style={{
              fontFamily: "Arial, Helvetica, sans-serif",
              fontSize: 18,
              color: "rgba(255,255,255,0.5)",
              margin: 0,
            }}
          >
            www.nanobanana-remodel.com
          </p>
        </div>

        {/* Nano Banana branding */}
        <p
          style={{
            fontFamily: "Arial, Helvetica, sans-serif",
            fontSize: 14,
            color: "rgba(255,255,255,0.3)",
            marginTop: 40,
            letterSpacing: 4,
            textTransform: "uppercase",
            opacity: interpolate(frame, [45, 60], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          Nano Banana © 2026
        </p>
      </div>
    </AbsoluteFill>
  );
};

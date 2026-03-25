import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  AbsoluteFill,
} from "remotion";

export const BeforeAfterScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const revealProgress = interpolate(frame, [15, 75], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const labelOpacity = spring({ frame, fps, delay: 5, config: { damping: 200 } });

  return (
    <AbsoluteFill
      style={{
        background: "#111",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Section title */}
      <div
        style={{
          position: "absolute",
          top: 40,
          width: "100%",
          textAlign: "center",
          zIndex: 10,
        }}
      >
        <h2
          style={{
            fontFamily: "Arial, Helvetica, sans-serif",
            fontSize: 36,
            color: "#fff",
            fontWeight: 800,
            letterSpacing: 4,
            textTransform: "uppercase",
            opacity: labelOpacity,
          }}
        >
          The Transformation
        </h2>
      </div>

      {/* Before / After split */}
      <div
        style={{
          width: 900,
          height: 550,
          position: "relative",
          overflow: "hidden",
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        {/* "Before" side - dull colors */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, #8d8d8d 0%, #5a5a5a 40%, #3d3d3d 100%)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 80, marginBottom: 12 }}>🏚️</div>
            <p
              style={{
                fontFamily: "Arial, Helvetica, sans-serif",
                fontSize: 24,
                color: "#ccc",
                fontWeight: 600,
              }}
            >
              Outdated Kitchen • Worn Floors • Old Paint
            </p>
          </div>
        </div>

        {/* "After" side - vibrant */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, #f5a623 0%, #e94560 40%, #c23760 100%)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            clipPath: `inset(0 ${100 - revealProgress}% 0 0)`,
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 80, marginBottom: 12 }}>🏡</div>
            <p
              style={{
                fontFamily: "Arial, Helvetica, sans-serif",
                fontSize: 24,
                color: "#fff",
                fontWeight: 600,
              }}
            >
              Modern Kitchen • Hardwood • Fresh Design
            </p>
          </div>
        </div>

        {/* Divider line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${revealProgress}%`,
            width: 4,
            background: "#fff",
            zIndex: 5,
            boxShadow: "0 0 20px rgba(255,255,255,0.5)",
          }}
        />
      </div>

      {/* Labels */}
      <div
        style={{
          position: "absolute",
          bottom: 50,
          width: 900,
          display: "flex",
          justifyContent: "space-between",
          opacity: labelOpacity,
        }}
      >
        <span
          style={{
            fontFamily: "Arial, Helvetica, sans-serif",
            fontSize: 22,
            color: "#888",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 3,
          }}
        >
          Before
        </span>
        <span
          style={{
            fontFamily: "Arial, Helvetica, sans-serif",
            fontSize: 22,
            color: "#e94560",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 3,
          }}
        >
          After
        </span>
      </div>
    </AbsoluteFill>
  );
};

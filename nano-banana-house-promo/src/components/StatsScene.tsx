import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  AbsoluteFill,
} from "remotion";

const stats = [
  { value: "500+", label: "Projects Completed" },
  { value: "98%", label: "Client Satisfaction" },
  { value: "15+", label: "Years Experience" },
  { value: "4.9★", label: "Average Rating" },
];

export const StatsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #e94560 0%, #c23760 50%, #0f3460 100%)",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <h2
        style={{
          fontFamily: "Arial, Helvetica, sans-serif",
          fontSize: 40,
          color: "#fff",
          fontWeight: 900,
          textAlign: "center",
          textTransform: "uppercase",
          letterSpacing: 4,
          marginBottom: 50,
          opacity: spring({ frame, fps, config: { damping: 200 } }),
        }}
      >
        Why Choose Us
      </h2>

      <div
        style={{
          display: "flex",
          gap: 48,
          justifyContent: "center",
        }}
      >
        {stats.map((stat, i) => {
          const delay = 8 + i * 10;
          const entrance = spring({ frame, fps, delay, config: { damping: 200 } });

          return (
            <div
              key={stat.label}
              style={{
                textAlign: "center",
                transform: `scale(${entrance})`,
              }}
            >
              <div
                style={{
                  fontFamily: "Arial, Helvetica, sans-serif",
                  fontSize: 56,
                  fontWeight: 900,
                  color: "#fff",
                  lineHeight: 1,
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontFamily: "Arial, Helvetica, sans-serif",
                  fontSize: 16,
                  color: "rgba(255,255,255,0.8)",
                  marginTop: 12,
                  fontWeight: 600,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                }}
              >
                {stat.label}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

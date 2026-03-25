import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  AbsoluteFill,
} from "remotion";

const services = [
  { icon: "🔨", name: "Kitchen Remodel", desc: "Custom cabinets & countertops" },
  { icon: "🛁", name: "Bathroom Renovation", desc: "Luxury upgrades & tiling" },
  { icon: "🎨", name: "Interior Design", desc: "Full color & style consultation" },
  { icon: "🪵", name: "Flooring", desc: "Hardwood, tile & modern vinyl" },
  { icon: "💡", name: "Electrical & Lighting", desc: "Smart home integration" },
  { icon: "🏗️", name: "Structural Work", desc: "Extensions & open floor plans" },
];

export const ServicesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleEntrance = spring({ frame, fps, config: { damping: 200 } });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, #0f3460 0%, #1a1a2e 100%)",
        padding: 60,
      }}
    >
      <h2
        style={{
          fontFamily: "Arial, Helvetica, sans-serif",
          fontSize: 44,
          color: "#fff",
          fontWeight: 900,
          textAlign: "center",
          textTransform: "uppercase",
          letterSpacing: 4,
          marginBottom: 40,
          transform: `translateY(${interpolate(titleEntrance, [0, 1], [30, 0])}px)`,
          opacity: titleEntrance,
        }}
      >
        Our Services
      </h2>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 24,
          maxWidth: 900,
          margin: "0 auto",
        }}
      >
        {services.map((service, i) => {
          const delay = 10 + i * 8;
          const cardSpring = spring({
            frame,
            fps,
            delay,
            config: { damping: 200 },
          });

          return (
            <div
              key={service.name}
              style={{
                width: 260,
                background: "rgba(255,255,255,0.06)",
                borderRadius: 16,
                padding: 28,
                textAlign: "center",
                border: "1px solid rgba(255,255,255,0.1)",
                transform: `translateY(${interpolate(cardSpring, [0, 1], [40, 0])}px)`,
                opacity: cardSpring,
              }}
            >
              <div style={{ fontSize: 44, marginBottom: 12 }}>{service.icon}</div>
              <h3
                style={{
                  fontFamily: "Arial, Helvetica, sans-serif",
                  fontSize: 20,
                  color: "#f5a623",
                  fontWeight: 700,
                  margin: "0 0 8px",
                }}
              >
                {service.name}
              </h3>
              <p
                style={{
                  fontFamily: "Arial, Helvetica, sans-serif",
                  fontSize: 14,
                  color: "rgba(255,255,255,0.6)",
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                {service.desc}
              </p>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

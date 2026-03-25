import {
  interpolate,
  AbsoluteFill,
} from "remotion";

/**
 * Static promotional image (Still) for Nano Banana House Remodeling.
 * Render with: npx remotion still HouseRemodelStill out/house-promo.png
 */
export const HouseRemodelStill: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        justifyContent: "center",
        alignItems: "center",
        padding: 60,
      }}
    >
      {/* Corner accents */}
      <div
        style={{
          position: "absolute",
          top: 40,
          left: 40,
          width: 100,
          height: 100,
          borderTop: "5px solid #e94560",
          borderLeft: "5px solid #e94560",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 40,
          right: 40,
          width: 100,
          height: 100,
          borderBottom: "5px solid #e94560",
          borderRight: "5px solid #e94560",
        }}
      />

      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(233,69,96,0.12) 0%, transparent 70%)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />

      <div style={{ textAlign: "center", zIndex: 1 }}>
        <div style={{ fontSize: 72, marginBottom: 16 }}>🏠</div>

        <h1
          style={{
            fontFamily: "Arial, Helvetica, sans-serif",
            fontSize: 80,
            fontWeight: 900,
            color: "#ffffff",
            margin: 0,
            letterSpacing: -2,
            textTransform: "uppercase",
          }}
        >
          Nano Banana
        </h1>

        {/* Gradient accent line */}
        <div
          style={{
            width: 350,
            height: 5,
            background: "linear-gradient(90deg, #e94560, #f5a623)",
            margin: "20px auto",
            borderRadius: 3,
          }}
        />

        <p
          style={{
            fontFamily: "Arial, Helvetica, sans-serif",
            fontSize: 32,
            color: "#e94560",
            margin: 0,
            fontWeight: 600,
            letterSpacing: 8,
            textTransform: "uppercase",
          }}
        >
          House Remodeling
        </p>

        <p
          style={{
            fontFamily: "Arial, Helvetica, sans-serif",
            fontSize: 22,
            color: "rgba(255,255,255,0.5)",
            marginTop: 28,
            letterSpacing: 3,
          }}
        >
          Transform Your Space. Elevate Your Life.
        </p>

        {/* Services row */}
        <div
          style={{
            display: "flex",
            gap: 36,
            justifyContent: "center",
            marginTop: 48,
          }}
        >
          {["🔨 Kitchen", "🛁 Bathroom", "🎨 Design", "🪵 Flooring", "💡 Electrical"].map(
            (s) => (
              <span
                key={s}
                style={{
                  fontFamily: "Arial, Helvetica, sans-serif",
                  fontSize: 16,
                  color: "rgba(255,255,255,0.6)",
                  background: "rgba(255,255,255,0.06)",
                  padding: "10px 20px",
                  borderRadius: 30,
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {s}
              </span>
            )
          )}
        </div>

        {/* CTA */}
        <div style={{ marginTop: 48 }}>
          <div
            style={{
              display: "inline-block",
              background: "linear-gradient(135deg, #e94560, #f5a623)",
              padding: "16px 56px",
              borderRadius: 50,
              fontFamily: "Arial, Helvetica, sans-serif",
              fontSize: 22,
              color: "#fff",
              fontWeight: 800,
              letterSpacing: 3,
              textTransform: "uppercase",
              boxShadow: "0 8px 30px rgba(233,69,96,0.35)",
            }}
          >
            Get Free Quote
          </div>
        </div>

        <p
          style={{
            fontFamily: "Arial, Helvetica, sans-serif",
            fontSize: 18,
            color: "rgba(255,255,255,0.6)",
            marginTop: 24,
          }}
        >
          📞 (555) 123-4567 &nbsp;|&nbsp; www.nanobanana-remodel.com
        </p>
      </div>
    </AbsoluteFill>
  );
};

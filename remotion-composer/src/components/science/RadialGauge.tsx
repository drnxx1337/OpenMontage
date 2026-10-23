import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export interface RadialGaugeProps {
  title?: string;
  subtitle?: string;
  value: number;
  min?: number;
  max?: number;
  unit?: string;
  accentColor?: string;
  textColor?: string;
  backgroundColor?: string;
  cardBackgroundColor?: string;
  fontFamily?: string;
}

export const RadialGauge: React.FC<RadialGaugeProps> = ({
  title,
  subtitle,
  value = 50,
  min = 0,
  max = 100,
  unit = "",
  accentColor = "#38BDF8",
  textColor = "#F8FAFC",
  backgroundColor = "transparent",
  cardBackgroundColor = "rgba(15, 23, 42, 0.75)",
  fontFamily = "Inter, system-ui, sans-serif",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance spring
  const entrance = spring({
    frame,
    fps,
    config: { damping: 16, stiffness: 90 },
  });

  // Needle / progress spring
  const progressSpring = spring({
    frame: frame - 10,
    fps,
    config: { damping: 18, stiffness: 60, mass: 1 },
  });

  const clampedVal = Math.min(Math.max(value, min), max);
  const normalizedValue = max > min ? (clampedVal - min) / (max - min) : 0.5;

  // Arc geometry
  // 240 degree gauge: from -210 deg to +30 deg (or 150 to 390)
  const radius = 160;
  const cx = 220;
  const cy = 220;
  const strokeWidth = 24;

  // Circumference of 240 deg arc: (240 / 360) * 2 * PI * r
  const arcLength = (240 / 360) * 2 * Math.PI * radius;
  const currentArc = interpolate(progressSpring, [0, 1], [0, arcLength * normalizedValue]);

  // Current counter value animation
  const currentDisplayVal = interpolate(
    progressSpring,
    [0, 1],
    [min, clampedVal],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const formattedDisplay =
    Math.abs(clampedVal) >= 100 || Number.isInteger(clampedVal)
      ? Math.round(currentDisplayVal).toLocaleString("en-US")
      : currentDisplayVal.toFixed(1);

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily,
        color: textColor,
      }}
    >
      <div
        style={{
          background: cardBackgroundColor,
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: 28,
          padding: "48px 64px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6)",
          opacity: entrance,
          transform: `scale(${interpolate(entrance, [0, 1], [0.92, 1])})`,
          maxWidth: 720,
          width: "100%",
        }}
      >
        {/* Title */}
        {title && (
          <h2
            style={{
              fontSize: 36,
              fontWeight: 800,
              margin: "0 0 8px 0",
              textAlign: "center",
              letterSpacing: "-0.01em",
            }}
          >
            {title}
          </h2>
        )}

        {/* Subtitle */}
        {subtitle && (
          <p
            style={{
              fontSize: 18,
              fontWeight: 500,
              color: "rgba(248, 250, 252, 0.65)",
              margin: "0 0 24px 0",
              textAlign: "center",
            }}
          >
            {subtitle}
          </p>
        )}

        {/* Gauge SVG Container */}
        <div style={{ position: "relative", width: 440, height: 320 }}>
          <svg
            width="440"
            height="360"
            viewBox="0 0 440 360"
            style={{ overflow: "visible" }}
          >
            {/* Background Arc Track */}
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth={strokeWidth}
              strokeDasharray={`${arcLength} 9999`}
              strokeLinecap="round"
              transform={`rotate(150 ${cx} ${cy})`}
            />

            {/* Active Colored Arc */}
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={accentColor}
              strokeWidth={strokeWidth}
              strokeDasharray={`${currentArc} 9999`}
              strokeLinecap="round"
              transform={`rotate(150 ${cx} ${cy})`}
              style={{
                filter: `drop-shadow(0 0 10px ${accentColor}66)`,
              }}
            />
          </svg>

          {/* Central Digital Readout */}
          <div
            style={{
              position: "absolute",
              top: 110,
              left: 0,
              right: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                fontSize: 64,
                fontWeight: 900,
                letterSpacing: "-0.03em",
                color: textColor,
                lineHeight: 1,
              }}
            >
              {formattedDisplay}
            </div>
            {unit && (
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 600,
                  color: accentColor,
                  marginTop: 6,
                  letterSpacing: "0.05em",
                }}
              >
                {unit}
              </div>
            )}
          </div>

          {/* Scale range labels */}
          <div
            style={{
              position: "absolute",
              bottom: 20,
              left: 40,
              fontSize: 16,
              fontWeight: 600,
              color: "rgba(248, 250, 252, 0.4)",
            }}
          >
            {min}
          </div>
          <div
            style={{
              position: "absolute",
              bottom: 20,
              right: 40,
              fontSize: 16,
              fontWeight: 600,
              color: "rgba(248, 250, 252, 0.4)",
            }}
          >
            {max}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

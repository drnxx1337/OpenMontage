import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export interface ProcessStep {
  label: string;
  detail?: string;
  value?: string | number;
  highlight?: boolean;
}

export interface ProcessFlowProps {
  title?: string;
  subtitle?: string;
  steps: ProcessStep[];
  activeStepIndex?: number;
  accentColor?: string;
  textColor?: string;
  backgroundColor?: string;
  cardBackgroundColor?: string;
  fontFamily?: string;
}

export const ProcessFlow: React.FC<ProcessFlowProps> = ({
  title,
  subtitle,
  steps = [],
  activeStepIndex,
  accentColor = "#38BDF8",
  textColor = "#F8FAFC",
  backgroundColor = "transparent",
  cardBackgroundColor = "rgba(15, 23, 42, 0.75)",
  fontFamily = "Inter, system-ui, sans-serif",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Clamp steps between 1 and 6 for clean layout
  const displaySteps = steps.slice(0, 6);

  // Phase 1: Header appearance
  const headerOpacity = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 100 },
  });
  const headerSlide = interpolate(headerOpacity, [0, 1], [-20, 0]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 80px",
        fontFamily,
        color: textColor,
      }}
    >
      {/* Title & Subtitle Header */}
      {(title || subtitle) && (
        <div
          style={{
            textAlign: "center",
            marginBottom: 48,
            opacity: headerOpacity,
            transform: `translateY(${headerSlide}px)`,
          }}
        >
          {title && (
            <h2
              style={{
                fontSize: 48,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                margin: 0,
                color: textColor,
              }}
            >
              {title}
            </h2>
          )}
          {subtitle && (
            <p
              style={{
                fontSize: 24,
                fontWeight: 500,
                color: "rgba(248, 250, 252, 0.7)",
                marginTop: 8,
                marginBottom: 0,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* Process Flow Cards Container */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "stretch",
          justifyContent: "center",
          gap: 16,
          width: "100%",
          maxWidth: 1600,
        }}
      >
        {displaySteps.map((step, idx) => {
          // Staggered reveal for each step
          const stepDelay = 8 + idx * 7;
          const stepEntrance = spring({
            frame: frame - stepDelay,
            fps,
            config: { damping: 14, stiffness: 90 },
          });

          const isHighlighted =
            step.highlight ??
            (activeStepIndex !== undefined ? activeStepIndex === idx : false);

          const stepSlideY = interpolate(stepEntrance, [0, 1], [30, 0]);
          const stepOpacity = interpolate(stepEntrance, [0, 1], [0, 1]);

          // Connector line between steps
          const isLast = idx === displaySteps.length - 1;
          const arrowDelay = stepDelay + 4;
          const arrowDraw = spring({
            frame: frame - arrowDelay,
            fps,
            config: { damping: 16, stiffness: 100 },
          });

          return (
            <React.Fragment key={idx}>
              {/* Step Card */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  background: isHighlighted
                    ? `linear-gradient(145deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95))`
                    : cardBackgroundColor,
                  borderRadius: 20,
                  border: isHighlighted
                    ? `2px solid ${accentColor}`
                    : "1px solid rgba(255, 255, 255, 0.1)",
                  boxShadow: isHighlighted
                    ? `0 12px 36px -6px ${accentColor}40`
                    : "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
                  padding: "28px 24px",
                  opacity: stepOpacity,
                  transform: `translateY(${stepSlideY}px)`,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Step Index Badge */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 16,
                  }}
                >
                  <span
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: isHighlighted ? accentColor : "rgba(255, 255, 255, 0.5)",
                      backgroundColor: isHighlighted
                        ? `${accentColor}20`
                        : "rgba(255, 255, 255, 0.06)",
                      padding: "4px 10px",
                      borderRadius: 8,
                      letterSpacing: "0.05em",
                    }}
                  >
                    KROK {idx + 1}
                  </span>
                  {step.value !== undefined && (
                    <span
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: accentColor,
                      }}
                    >
                      {step.value}
                    </span>
                  )}
                </div>

                {/* Step Label */}
                <h3
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    margin: "0 0 10px 0",
                    color: textColor,
                    lineHeight: 1.25,
                  }}
                >
                  {step.label}
                </h3>

                {/* Step Detail */}
                {step.detail && (
                  <p
                    style={{
                      fontSize: 16,
                      fontWeight: 400,
                      color: "rgba(248, 250, 252, 0.75)",
                      margin: 0,
                      lineHeight: 1.45,
                    }}
                  >
                    {step.detail}
                  </p>
                )}
              </div>

              {/* Connecting Vector Arrow */}
              {!isLast && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: arrowDraw,
                    transform: `scale(${arrowDraw})`,
                  }}
                >
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={accentColor}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

import React from "react";
import {
  AbsoluteFill,
  Composition,
  registerRoot,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { resolveTokens, fitText, cameraTransform } from "../../shotkit";

type Semantics = "outer_radius" | "thickness";

type Datum = {
  label: string;
  value: number;
  unit: string;
  semantics: Semantics;
};

type Fact = {
  claim: string;
  source: string;
};

type Theme = {
  backgroundColor: string;
  textColor: string;
  mutedTextColor: string;
  accentColor: string;
  primaryColor: string;
};

type ShotProps = {
  copy: {
    kicker: string;
    headline: string;
    caption: string;
  };
  data: Datum[];
  facts: Fact[];
  theme: Theme;
  durationInFrames?: number;
};

const DEFAULT_PROPS: ShotProps = {
  copy: {
    kicker: "CROSS-SECTION",
    headline: "WHAT IS UNDER YOUR FEET",
    caption:
      "Radii are measured from the centre. The crust is about 35 km thick, too thin to see at this scale.",
  },
  data: [
    {
      label: "INNER CORE",
      value: 1220.0,
      unit: "km",
      semantics: "outer_radius",
    },
    {
      label: "OUTER CORE",
      value: 3480.0,
      unit: "km",
      semantics: "outer_radius",
    },
    {
      label: "MANTLE",
      value: 6371.0,
      unit: "km",
      semantics: "outer_radius",
    },
    {
      label: "CRUST",
      value: 35.0,
      unit: "km",
      semantics: "thickness",
    },
  ],
  facts: [
    {
      claim: "Earth radius is 6,371 km",
      source: "NASA Earth Fact Sheet",
    },
    {
      claim: "Mantle thickness is about 2,891 km (6,371 - 3,480)",
      source: "derived from the radii",
    },
    {
      claim: "Crust thickness is 5-70 km, about 35 km on average",
      source: "USGS",
    },
  ],
  theme: {
    backgroundColor: "#0B1020",
    textColor: "#F3EEE3",
    mutedTextColor: "#9AA3B2",
    accentColor: "#FFC21A",
    primaryColor: "#3D7BFF",
  },
  durationInFrames: 120,
};

const calculateMetadata = ({ props }: { props: ShotProps }) => ({
  durationInFrames: Math.max(1, props.durationInFrames ?? 120),
});

const group = (value: number) => {
  const rounded = Math.round(value).toString();
  return rounded.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const MANTLE_COLOR = "#2C4670";

const Shot: React.FC<ShotProps> = (props) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  const tokens = resolveTokens(props.theme, width, height);

  const portrait = height > width;
  const unitScale = Math.min(width, height);
  const pad = Math.round(unitScale * (portrait ? 0.055 : 0.065));

  const outerRadii = props.data
    .filter((datum) => datum.semantics === "outer_radius")
    .slice()
    .sort((a, b) => a.value - b.value);

  const crustDatum = props.data.find(
    (datum) => datum.semantics === "thickness",
  );

  const innerCore = (outerRadii[0] ?? props.data[0])!;
  const outerCore = (outerRadii[1] ?? props.data[0])!;
  const surface = (outerRadii[outerRadii.length - 1] ?? props.data[0])!;

  const surfaceRadius = Math.max(1, surface.value);
  const crustThickness = crustDatum ? Math.max(0, crustDatum.value) : 0;
  const mantleOuterValue = Math.max(0, surfaceRadius - crustThickness);
  const mantleThickness = Math.max(0, surfaceRadius - outerCore.value);

  const R = Math.round(
    portrait
      ? Math.min(width * 0.34, height * 0.18)
      : Math.min(width * 0.185, height * 0.32),
  );

  const topY = portrait ? pad + 180 : pad + 112;
  const cx = portrait ? Math.round(width / 2) : pad + R;
  const cy = topY + R;
  const axisY = cy + R + (portrait ? 46 : 42);

  const progress =
    durationInFrames <= 1 ? 0 : clamp01(frame / (durationInFrames - 1));
  const cam = cameraTransform("push", progress);

  const intro = clamp01((frame - 3) / 16);
  const captionIn = clamp01((frame - 18) / 16);

  const headline = fitText(props.copy.headline, {
    maxWidth: width - pad * 2,
    fontFamily: tokens.fontFamily,
    maxFontSize: portrait ? unitScale * 0.09 : unitScale * 0.05,
  });

  const kickerSize = Math.max(12, Math.round(unitScale * 0.0135));
  const captionSize = Math.max(14, Math.round(unitScale * 0.019));
  const legendSize = Math.max(14, Math.round(unitScale * 0.0185));
  const rowH = Math.max(46, Math.round(unitScale * 0.058));
  const tickSize = Math.max(12, Math.round(unitScale * 0.0155));

  const layerRows: Datum[] = [
    ...outerRadii,
    ...(crustDatum ? [crustDatum] : []),
  ];

  const layerColors = layerRows.map((datum, index) => {
    if (datum.semantics === "thickness") return tokens.muted;
    if (index === 0) return tokens.accent;
    if (index === 1) return tokens.primary;
    return MANTLE_COLOR;
  });

  const rInner = (innerCore.value / surfaceRadius) * R;
  const rOuter = (outerCore.value / surfaceRadius) * R;
  const rMantle = (mantleOuterValue / surfaceRadius) * R;

  const ticks = [
    { value: 0, label: "0" },
    { value: innerCore.value, label: group(innerCore.value) },
    { value: outerCore.value, label: group(outerCore.value) },
    { value: surfaceRadius, label: group(surfaceRadius) },
  ];

  const axisWidth = R + 80;
  const axisLeft = cx - 40;
  const axisBase = 30;
  const axisOrigin = 40;

  const legendTotal = layerRows.length * rowH;
  const legendWidth = portrait
    ? width - pad * 2
    : Math.max(320, width - (cx + R) - pad * 2);
  const legendLeft = portrait ? pad : cx + R + Math.round(pad * 1.1);
  const legendTop = portrait
    ? Math.round(axisY + (height - pad - axisY) * 0.35)
    : Math.round(cy - legendTotal / 2);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: tokens.bg,
        color: tokens.text,
        fontFamily: tokens.fontFamily,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: pad,
          top: pad,
          width: width - pad * 2,
          opacity: intro,
          transform: `translateY(${(1 - intro) * 16}px)`,
        }}
      >
        <div
          style={{
            color: tokens.accent,
            fontSize: kickerSize,
            fontWeight: 600,
            letterSpacing: Math.max(2, kickerSize * 0.18),
          }}
        >
          {props.copy.kicker}
        </div>
        <div
          style={{
            marginTop: Math.round(kickerSize * 0.7),
            fontFamily: tokens.fontFamily,
            fontSize: headline.fontSize,
            fontWeight: 800,
            lineHeight: 0.96,
            letterSpacing: -0.5,
            color: tokens.text,
            whiteSpace: "nowrap",
          }}
        >
          {props.copy.headline}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width,
          height,
          transform: cam,
          transformOrigin: `${cx}px ${cy}px`,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: cx - R,
            top: cy - R,
            width: R * 2,
            height: R * 2,
          }}
        >
          <svg width={R * 2} height={R * 2} viewBox={`0 0 ${R * 2} ${R * 2}`}>
            <circle cx={R} cy={R} r={rMantle} fill={MANTLE_COLOR} />
            <circle
              cx={R}
              cy={R}
              r={rOuter}
              fill={tokens.primary}
              stroke={tokens.bg}
              strokeWidth={1}
            />
            <circle
              cx={R}
              cy={R}
              r={rInner}
              fill={tokens.accent}
              stroke={tokens.bg}
              strokeWidth={1}
            />
            <circle
              cx={R}
              cy={R}
              r={R - 0.5}
              fill="none"
              stroke={tokens.muted}
              strokeWidth={1}
              opacity={0.85}
            />
          </svg>
        </div>

        <div
          style={{
            position: "absolute",
            left: axisLeft,
            top: axisY - axisBase,
            width: axisWidth,
            height: 86,
            overflow: "visible",
          }}
        >
          <svg
            width={axisWidth}
            height={86}
            viewBox={`0 0 ${axisWidth} 86`}
            style={{ overflow: "visible" }}
          >
            <line
              x1={axisOrigin}
              y1={axisBase}
              x2={axisOrigin + R}
              y2={axisBase}
              stroke={tokens.muted}
              strokeWidth={1.5}
            />

            {ticks.map((tick, index) => {
              const x = axisOrigin + (tick.value / surfaceRadius) * R;
              return (
                <g key={`tick-${index}`}>
                  <line
                    x1={x}
                    y1={axisBase - 5}
                    x2={x}
                    y2={axisBase + 5}
                    stroke={tokens.muted}
                    strokeWidth={1.5}
                  />
                  <text
                    x={x}
                    y={axisBase + 22}
                    fill={tokens.muted}
                    fontSize={tickSize}
                    fontFamily={tokens.fontFamily}
                    textAnchor="middle"
                  >
                    {tick.label}
                  </text>
                </g>
              );
            })}

            {mantleThickness > 0 ? (
              <g>
                <line
                  x1={axisOrigin + (outerCore.value / surfaceRadius) * R}
                  y1={axisBase - 14}
                  x2={axisOrigin + R}
                  y2={axisBase - 14}
                  stroke={tokens.text}
                  strokeWidth={1.2}
                />
                <line
                  x1={axisOrigin + (outerCore.value / surfaceRadius) * R}
                  y1={axisBase - 19}
                  x2={axisOrigin + (outerCore.value / surfaceRadius) * R}
                  y2={axisBase - 9}
                  stroke={tokens.text}
                  strokeWidth={1.2}
                />
                <line
                  x1={axisOrigin + R}
                  y1={axisBase - 19}
                  x2={axisOrigin + R}
                  y2={axisBase - 9}
                  stroke={tokens.text}
                  strokeWidth={1.2}
                />
                <text
                  x={
                    axisOrigin +
                    ((outerCore.value + surfaceRadius) / (surfaceRadius * 2)) *
                      R
                  }
                  y={axisBase - 23}
                  fill={tokens.text}
                  fontSize={tickSize}
                  fontFamily={tokens.fontFamily}
                  textAnchor="middle"
                >
                  {group(mantleThickness)} {surface.unit}
                </text>
              </g>
            ) : null}
          </svg>
        </div>

        <div
          style={{
            position: "absolute",
            left: cx + progress * R - 5,
            top: axisY - 5,
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: tokens.text,
            boxShadow: `0 0 14px ${tokens.text}`,
          }}
        />
      </div>

      <div
        style={{
          position: "absolute",
          left: legendLeft,
          top: legendTop,
          width: legendWidth,
        }}
      >
        {layerRows.map((datum, index) => {
          const rowIn = clamp01((frame - (10 + index * 4)) / 16);
          const color = layerColors[index];
          const isCrust = datum.semantics === "thickness";

          return (
            <div
              key={`${datum.label}-${index}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: Math.round(legendSize * 0.8),
                height: rowH,
                opacity: rowIn,
                transform: `translateX(${(1 - rowIn) * 14}px)`,
              }}
            >
              <div
                style={{
                  width: 14,
                  height: isCrust ? 1 : 14,
                  backgroundColor: color,
                  borderRadius: isCrust ? 0 : 3,
                  flexShrink: 0,
                }}
              />
              <div
                style={{
                  flex: 1,
                  fontFamily: tokens.fontFamily,
                  fontSize: legendSize,
                  fontWeight: 650,
                  letterSpacing: Math.max(1, legendSize * 0.08),
                  color: tokens.text,
                }}
              >
                {datum.label}
              </div>
              <div
                style={{
                  fontFamily: tokens.fontFamily,
                  fontSize: legendSize,
                  color: tokens.muted,
                  fontVariantNumeric: "tabular-nums",
                  whiteSpace: "nowrap",
                }}
              >
                {group(datum.value)} {datum.unit}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: "absolute",
          left: pad,
          bottom: pad,
          width: portrait ? width - pad * 2 : Math.round(width * 0.56),
          fontFamily: tokens.fontFamily,
          fontSize: captionSize,
          lineHeight: 1.45,
          color: tokens.muted,
          opacity: captionIn,
        }}
      >
        {props.copy.caption}
      </div>
    </AbsoluteFill>
  );
};

const Root: React.FC = () => (
  <>
    <Composition
      id="Shot169"
      component={Shot}
      durationInFrames={120}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={DEFAULT_PROPS}
      calculateMetadata={calculateMetadata}
    />
    <Composition
      id="Shot916"
      component={Shot}
      durationInFrames={120}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={DEFAULT_PROPS}
      calculateMetadata={calculateMetadata}
    />
  </>
);

registerRoot(Root);

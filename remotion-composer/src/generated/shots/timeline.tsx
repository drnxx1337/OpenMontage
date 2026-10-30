import React from "react";
import {
  AbsoluteFill,
  CalculateMetadataFunction,
  Composition,
  interpolate,
  registerRoot,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";
import {
  Axis,
  Stage,
  cameraTransform,
  enter,
  fitText,
  resolveTokens,
  scaleLinear,
} from "../../shotkit";
import type { Theme } from "../../shotkit";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "700"],
  subsets: ["latin", "latin-ext"],
});

export type Datum = { label: string; value: number; unit?: string };

export type ShotProps = {
  copy: { kicker?: string; headline: string; caption?: string };
  data: Datum[];
  theme: Theme;
  durationInFrames?: number;
};

// English number grouping: the kit's pl-PL formatter would print 2 017 and 2,3.
const formatEn = (value: number, digits = 0): string =>
  Number.isFinite(value)
    ? value.toLocaleString("en-US", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })
    : "0";

const DEFAULT_PROPS: ShotProps = {
  copy: {
    kicker: "TIMELINE",
    headline: "THIRTEEN YEARS IN THE RINGS",
    caption:
      "Launch, flybys, orbit insertion and the finale. Every point is one event.",
  },
  data: [
    { label: "LAUNCH", value: 1997, unit: "" },
    { label: "JUPITER FLYBY", value: 2000, unit: "" },
    { label: "ORBIT INSERTION", value: 2004, unit: "" },
    { label: "GRAND FINALE", value: 2017, unit: "" },
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

// Years read as labels, not magnitudes: no thousands separator.
const yearText = (value: number): string => String(Math.round(value));

export const Shot: React.FC<ShotProps> = ({ copy, data, theme }) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const tokens = resolveTokens(theme, width, height);
  const vertical = height > width;
  const pad = Math.max(tokens.safe, width * 0.05);

  const events = data.filter((datum) => Number.isFinite(datum.value));
  const values = events.map((datum) => datum.value);
  const minValue = values.length ? Math.min(...values) : 1997;
  const maxValue = values.length ? Math.max(...values) : 2017;
  const spanValue = Math.max(1, maxValue - minValue);

  // One linear scale for ticks AND events: both ends are the data ends.
  const domain: [number, number] = [minValue, maxValue];
  const tickCount = 6;
  const tickStep = spanValue / (tickCount - 1);
  const ticks = Array.from({ length: tickCount }, (_, index) => Math.round(minValue + tickStep * index));

  const startX = pad + width * 0.1;
  const endX = width - pad - width * 0.1;
  const axisY = height * 0.6;
  const axisX = width * 0.33;
  const topY = height * 0.3;
  const bottomY = height * 0.86;
  const xOf = scaleLinear(domain, [startX, endX]);
  const yOf = scaleLinear(domain, [topY, bottomY]);
  const at = (value: number): number => (vertical ? yOf(value) : xOf(value));

  const bandFrom = events.length >= 3 ? events[2].value : null;
  const bandTo = events.length ? events[events.length - 1].value : null;
  const hasBand = bandFrom !== null && bandTo !== null && bandTo > bandFrom;

  const tickFont = Math.max(14, Math.round(tokens.type.label * 1.15));

  const progress = interpolate(frame, [0, Math.max(1, durationInFrames - 1)], [0, 1], {
    extrapolateRight: "clamp",
  });
  const playAt = at(domain[0] + (domain[1] - domain[0]) * progress);

  const headerIn = enter(frame, fps, { delay: 0, duration: 20 });
  const axisIn = enter(frame, fps, { delay: 2, duration: 22 });
  const bandIn = enter(frame, fps, { delay: 10, duration: 24 });
  const captionIn = enter(frame, fps, { delay: 24, duration: 20 });
  const eventIn = (index: number): number => enter(frame, fps, { delay: 6 + index * 4, duration: 22 });

  const headlineSize = vertical
    ? Math.round(Math.min(width * 0.085, height * 0.055))
    : Math.round(Math.min(width * 0.05, height * 0.09));
  const nameSize = vertical ? Math.max(22, width * 0.026) : Math.max(21, width * 0.0135);
  const yearSize = vertical ? Math.max(26, width * 0.031) : Math.max(26, width * 0.0185);

  // Width budget per label, bounded by the next event on the same side.
  const slotFor = (index: number): number => {
    const here = at(events[index].value);
    let nearest = Number.POSITIVE_INFINITY;
    events.forEach((other, otherIndex) => {
      if (otherIndex !== index && otherIndex % 2 === index % 2) {
        nearest = Math.min(nearest, Math.abs(at(other.value) - here));
      }
    });
    const cap = vertical ? width * 0.56 : width * 0.2;
    return Math.max(150, Math.min(cap, Number.isFinite(nearest) ? nearest * 0.9 : cap));
  };

  const [ax1, ay1, ax2, ay2] = vertical
    ? [axisX, topY, axisX, bottomY]
    : [startX, axisY, endX, axisY];

  return (
    <Stage theme={theme} width={width} height={height}>
      <AbsoluteFill style={cameraTransform(frame, durationInFrames, "push", 0.02)}>
        <div
          style={{
            position: "absolute",
            left: vertical ? 0 : pad,
            right: vertical ? 0 : undefined,
            top: vertical ? height * 0.05 : pad * 0.85,
            textAlign: vertical ? "center" : "left",
            fontSize: Math.max(16, width * 0.013),
            letterSpacing: width * 0.004,
            fontWeight: 700,
            color: tokens.accent,
            opacity: headerIn,
          }}
        >
          {copy.kicker ?? ""}
        </div>

        <div
          style={{
            position: "absolute",
            left: vertical ? width * 0.08 : pad,
            width: vertical ? width * 0.84 : width * 0.46,
            top: vertical ? height * 0.09 : pad * 1.45,
            textAlign: vertical ? "center" : "left",
            fontSize: headlineSize,
            lineHeight: 1.04,
            fontWeight: 700,
            letterSpacing: -headlineSize * 0.02,
            color: tokens.text,
            opacity: headerIn,
            transform: `translateY(${(1 - headerIn) * 22}px)`,
            textWrap: "balance",
          }}
        >
          {copy.headline}
        </div>

        <svg width={width} height={height} style={{ position: "absolute", left: 0, top: 0 }}>
          {hasBand && bandFrom !== null && bandTo !== null ? (
            <g opacity={bandIn}>
              {vertical ? (
                <rect
                  x={width * 0.235}
                  y={yOf(bandFrom)}
                  width={width - pad - width * 0.235}
                  height={yOf(bandTo) - yOf(bandFrom)}
                  fill={tokens.accent}
                  fillOpacity={0.15}
                />
              ) : (
                <rect
                  x={xOf(bandFrom)}
                  y={axisY - 58}
                  width={xOf(bandTo) - xOf(bandFrom)}
                  height={116}
                  fill={tokens.accent}
                  fillOpacity={0.15}
                />
              )}
            </g>
          ) : null}

          <g opacity={axisIn}>
            <line x1={ax1} y1={ay1} x2={ax2} y2={ay2} stroke={tokens.muted} strokeWidth={1.4} />
            <Axis
              x1={ax1}
              y1={ay1}
              x2={ax2}
              y2={ay2}
              color={tokens.muted}
              ticks={ticks}
              fontSize={tickFont}
            />
            {ticks.map((tick) => (
              <text
                key={`tick-${tick}`}
                x={vertical ? axisX - 26 : xOf(tick)}
                y={vertical ? yOf(tick) : axisY + tickFont + 12}
                textAnchor={vertical ? "end" : "middle"}
                dominantBaseline={vertical ? "middle" : "auto"}
                fill={tokens.text}
                fillOpacity={0.75}
                fontSize={tickFont}
              >
                {yearText(tick)}
              </text>
            ))}
          </g>

          {events.map((event, index) => {
            const markerX = vertical ? axisX : at(event.value);
            const markerY = vertical ? at(event.value) : axisY;
            return (
              <g key={`marker-${index}`} opacity={eventIn(index)}>
                <line x1={markerX - 11} y1={markerY} x2={markerX + 11} y2={markerY} stroke={tokens.accent} strokeWidth={2} />
                <line x1={markerX} y1={markerY - 11} x2={markerX} y2={markerY + 11} stroke={tokens.accent} strokeWidth={2} />
                <circle cx={markerX} cy={markerY} r={8} fill={tokens.bg} stroke={tokens.accent} strokeWidth={2} />
                <circle cx={markerX} cy={markerY} r={2.8} fill={tokens.accent} />
              </g>
            );
          })}

          {/* Playhead: thin rule with an arrow head, never a second marker. */}
          <g opacity={0.85}>
            {vertical ? (
              <>
                <line x1={axisX - 56} y1={playAt} x2={width - pad} y2={playAt} stroke={tokens.primary} strokeWidth={1.5} />
                <polygon
                  points={`${axisX - 56},${playAt - 8} ${axisX - 56},${playAt + 8} ${axisX - 45},${playAt}`}
                  fill={tokens.primary}
                />
              </>
            ) : (
              <>
                <line x1={playAt} y1={axisY - 86} x2={playAt} y2={axisY + 86} stroke={tokens.primary} strokeWidth={1.5} />
                <polygon
                  points={`${playAt - 8},${axisY - 86} ${playAt + 8},${axisY - 86} ${playAt},${axisY - 75}`}
                  fill={tokens.primary}
                />
              </>
            )}
          </g>
        </svg>

        {hasBand && !vertical && bandTo !== null && bandFrom !== null ? (
          <div
            style={{
              position: "absolute",
              left: xOf(bandTo) - 240,
              width: 240,
              top: axisY - 88,
              textAlign: "right",
              fontSize: Math.max(15, width * 0.0098),
              letterSpacing: 2.2,
              fontWeight: 700,
              color: tokens.accent,
              opacity: bandIn,
            }}
          >
            {formatEn(bandTo - bandFrom)} YEARS
          </div>
        ) : null}

        {events.map((event, index) => {
          const p = at(event.value);
          const slot = slotFor(index);
          const name = fitText(event.label, {
            maxWidth: slot - 12,
            maxFontSize: nameSize,
            minFontSize: 13,
            fontFamily,
            fontWeight: 400,
            letterSpacing: 0.8,
          });
          const above = index % 2 === 0;
          const box: React.CSSProperties = vertical
            ? { left: axisX + 46, width: width - pad - axisX - 46, top: p, transform: "translateY(-50%)" }
            : above
              ? { left: p - slot / 2, width: slot, bottom: height - (axisY - 92), textAlign: "center" }
              : { left: p - slot / 2, width: slot, top: axisY + 92, textAlign: "center" };

          return (
            <div key={`label-${index}`} style={{ position: "absolute", ...box, opacity: eventIn(index) }}>
              <div style={{ fontSize: yearSize, fontWeight: 700, color: tokens.accent, lineHeight: 1 }}>
                {yearText(event.value)}
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: name.fontSize,
                  fontWeight: 400,
                  letterSpacing: 0.8,
                  color: tokens.text,
                  lineHeight: 1.15,
                }}
              >
                {event.label}
              </div>
            </div>
          );
        })}

        <div
          style={{
            position: "absolute",
            left: pad,
            top: height * 0.9,
            width: vertical ? width - pad * 2 : width * 0.44,
            opacity: captionIn,
          }}
        >
          <div style={{ width: Math.max(44, width * 0.026), height: 3, backgroundColor: tokens.accent, marginBottom: 13 }} />
          <div style={{ fontSize: Math.max(16, width * 0.0112), lineHeight: 1.4, color: tokens.text, opacity: 0.8 }}>
            {copy.caption ?? ""}
          </div>
        </div>
      </AbsoluteFill>
    </Stage>
  );
};

const calculateMetadata: CalculateMetadataFunction<ShotProps> = ({ props }) => ({
  durationInFrames: Math.max(1, props.durationInFrames ?? 120),
});

const Root: React.FC = () => (
  <>
    <Composition
      id="Shot169"
      component={Shot}
      fps={30}
      width={1920}
      height={1080}
      durationInFrames={120}
      defaultProps={DEFAULT_PROPS}
      calculateMetadata={calculateMetadata}
    />
    <Composition
      id="Shot916"
      component={Shot}
      fps={30}
      width={1080}
      height={1920}
      durationInFrames={120}
      defaultProps={DEFAULT_PROPS}
      calculateMetadata={calculateMetadata}
    />
  </>
);

registerRoot(Root);

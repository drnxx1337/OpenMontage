import React from "react";
import {
  AbsoluteFill,
  CalculateMetadataFunction,
  Composition,
  registerRoot,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadSpaceGrotesk } from "../../lib/localFonts";
import {
  Axis,
  Stage,
  cameraTransform,
  enter,
  fitText,
  resolveTokens,
} from "../../shotkit";
import type { Theme } from "../../shotkit";

const { fontFamily } = loadSpaceGrotesk(["400", "700"]);

export type Datum = { label: string; value: number; unit?: string };

export type ShotProps = {
  copy: { kicker?: string; headline: string; caption?: string };
  data: Datum[];
  theme: Theme;
  durationInFrames?: number;
};

// English number grouping: 1,220 / 3,480, never the kit's pl-PL spacing and comma.
const formatEn = (value: number, digits = 0): string =>
  Number.isFinite(value)
    ? value.toLocaleString("en-US", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })
    : "0";

const DEFAULT_PROPS: ShotProps = {
  copy: {
    kicker: "CROSS-SECTION",
    headline: "WHAT IS UNDER YOUR FEET",
    caption: "Radii are measured from the centre.",
  },
  data: [
    { label: "INNER CORE", value: 1220, unit: "km" },
    { label: "OUTER CORE", value: 3480, unit: "km" },
    { label: "MANTLE + CRUST", value: 6371, unit: "km" },
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

const polar = (cx: number, cy: number, r: number, deg: number): [number, number] => {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
};

// Sweep is clockwise in screen space (0deg = right, 90deg = down).
const wedgePath = (cx: number, cy: number, r: number, startDeg: number, endDeg: number): string => {
  const [sx, sy] = polar(cx, cy, r, startDeg);
  const [ex, ey] = polar(cx, cy, r, endDeg);
  const sweep = ((endDeg - startDeg) % 360 + 360) % 360;
  return `M ${cx} ${cy} L ${sx} ${sy} A ${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${ex} ${ey} Z`;
};

type Ring = {
  datum: Datum;
  rank: number;
  color: string;
  fillOpacity: number;
  targetY: number;
  rowY: number;
};

export const Shot: React.FC<ShotProps> = ({ copy, data, theme }) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const tokens = resolveTokens(theme, width, height);
  const vertical = height > width;
  const pad = Math.max(tokens.safe, width * 0.048);

  const layers = [...data]
    .filter((datum) => Number.isFinite(datum.value) && datum.value > 0)
    .sort((a, b) => a.value - b.value);
  const maxDepth = layers.length ? layers[layers.length - 1].value : 6371;

  // Portrait keeps the same left-label / right-cut geometry as 16:9.
  const cx = vertical ? width * 0.5 : width * 0.46;
  const cy = vertical ? height * 0.5 : height * 0.62;
  const R = vertical
    ? Math.min(width * 0.32, height * 0.18)
    : Math.min(height * 0.287, width * 0.19);
  const unitScale = R / maxDepth;
  const labelsX = cx - 96;

  const headlineSize = vertical
    ? Math.round(Math.min(width * 0.098, height * 0.062))
    : Math.round(Math.min(width * 0.045, height * 0.085));

  // One palette indexed by distance from the centre; rings, leaders and values
  // all read their colour from here.
  const paint = (rank: number): { color: string; fillOpacity: number } => {
    if (rank === 0) {
      return { color: tokens.accent, fillOpacity: 0.92 };
    }
    return rank === 1
      ? { color: tokens.primary, fillOpacity: 0.52 }
      : { color: tokens.muted, fillOpacity: 0.55 };
  };

  // Outermost first: larger discs paint before the cores on top of them.
  const rings: Ring[] = layers
    .map((datum, rank) => {
      const inner = rank > 0 ? layers[rank - 1].value : 0;
      return {
        datum,
        rank,
        ...paint(rank),
        targetY: cy - ((inner + datum.value) / 2) * unitScale,
        rowY: 0,
      };
    })
    .reverse();

  const minGap = Math.max(66, height * 0.072);
  let lastRow = Number.NEGATIVE_INFINITY;
  rings.forEach((ring) => {
    ring.rowY = Math.max(ring.targetY, lastRow + minGap);
    lastRow = ring.rowY;
  });

  const grow = enter(frame, fps, { delay: 4, duration: 26 });
  const detailIn = enter(frame, fps, { delay: 16, duration: 24 });
  const axisIn = enter(frame, fps, { delay: 10, duration: 24 });
  const headerIn = enter(frame, fps, { delay: 0, duration: 20 });
  const captionIn = enter(frame, fps, { delay: 26, duration: 20 });

  // Radius ticks, not depth: 0 at the centre, the outer boundary at the surface.
  const ticks = [0, ...layers.map((datum) => datum.value)];
  const axisFont = Math.max(13, Math.round(tokens.type.label * 1.1));
  const axisX = vertical ? width - pad - 91 : width * 0.8;
  const surfaceY = cy - R;
  // Right half in both aspects: a 270deg cutaway reads as a black mask in portrait.
  const wedgeStart = -90;
  const wedgeScale = 0.9 + 0.1 * grow;

  return (
    <Stage theme={theme} width={width} height={height}>
      <AbsoluteFill style={cameraTransform(frame, durationInFrames, "push", 0.045)}>
        <div
          style={{
            position: "absolute",
            left: pad,
            top: vertical ? height * 0.048 : pad * 0.85,
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
            left: pad,
            top: vertical ? height * 0.085 : pad * 1.45,
            width: vertical ? width - pad * 2 : width * 0.4,
            fontSize: headlineSize,
            lineHeight: 1.05,
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
          <g
            transform={`translate(${cx} ${cy}) scale(${wedgeScale}) translate(${-cx} ${-cy})`}
            opacity={0.72 + 0.28 * grow}
          >
            {rings.map((ring) => (
              <path
                key={`layer-${ring.rank}`}
                d={wedgePath(cx, cy, ring.datum.value * unitScale, wedgeStart, 90)}
                fill={ring.color}
                fillOpacity={ring.fillOpacity}
              />
            ))}
            {rings.map((ring) => (
              <path
                key={`ring-${ring.rank}`}
                d={wedgePath(cx, cy, ring.datum.value * unitScale, wedgeStart, 90)}
                fill="none"
                stroke={tokens.muted}
                strokeOpacity={0.45}
                strokeWidth={1.4}
              />
            ))}
          </g>

          {/* A slow wave from the core: keeps the frame alive without inventing a new layout. */}
          {[0, 1].map((offset) => {
            const t = ((frame / fps + offset * 0.6) % 1.2) / 1.2;
            return (
              <path
                key={`pulse-${offset}`}
                d={wedgePath(cx, cy, Math.max(1, t * R), wedgeStart, 90)}
                fill={tokens.accent}
                fillOpacity={0.1 * (1 - t)}
                stroke={tokens.accent}
                strokeOpacity={0.55 * (1 - t)}
                strokeWidth={2.5}
                strokeDasharray="5 9"
              />
            );
          })}

          {vertical ? null : (
            <line x1={cx} y1={cy - R} x2={cx} y2={cy + R} stroke={tokens.muted} strokeOpacity={0.5} strokeWidth={1.4} />
          )}

          <line x1={cx} y1={cy} x2={axisX} y2={cy} stroke={tokens.muted} strokeOpacity={0.3} strokeDasharray="4 7" strokeWidth={1.2} />

          <g opacity={detailIn}>
            {rings.map((ring) => (
              <g key={`leader-${ring.rank}`}>
                <path
                  d={`M ${labelsX} ${ring.rowY} L ${cx - 26} ${ring.rowY} L ${cx} ${ring.targetY}`}
                  fill="none"
                  stroke={ring.color}
                  strokeOpacity={0.75}
                  strokeWidth={1.4}
                />
                <circle cx={cx} cy={ring.targetY} r={3.2} fill={ring.color} />
              </g>
            ))}
            <line x1={cx - 10} y1={cy} x2={cx + 10} y2={cy} stroke={tokens.accent} strokeWidth={1.5} />
            <line x1={cx} y1={cy - 10} x2={cx} y2={cy + 10} stroke={tokens.accent} strokeWidth={1.5} />
            <circle cx={cx} cy={cy} r={2.4} fill={tokens.accent} />
          </g>
          <g opacity={axisIn * 0.75}>
            {ticks.map((tick) => (
              <text
                key={`axis-label-${tick}`}
                x={axisX + 32}
                y={cy - (tick / maxDepth) * R}
                textAnchor="start"
                dominantBaseline="middle"
                fill={tokens.text}
                fontSize={axisFont}
              >
                {formatEn(tick)}
              </text>
            ))}
          </g>
        </svg>

        {rings.map((ring) => {
          const label = fitText(ring.datum.label, {
            maxWidth: labelsX - pad,
            maxFontSize: Math.max(16, width * 0.0105),
            minFontSize: 12,
            fontFamily,
            fontWeight: 700,
            letterSpacing: 1.4,
          });
          const lower = ring.rank === 0 ? 0 : layers[ring.rank - 1]?.value ?? 0;
          const unit = ring.datum.unit ? ` ${ring.datum.unit}` : "";
          const value = `${formatEn(lower)}–${formatEn(ring.datum.value)}${unit}`;
          return (
            <div
              key={`label-${ring.rank}`}
              style={{
                position: "absolute",
                left: pad,
                width: labelsX - pad,
                top: ring.rowY,
                transform: "translateY(-50%)",
                textAlign: "right",
                opacity: detailIn,
              }}
            >
              <div style={{ fontSize: label.fontSize, fontWeight: 700, letterSpacing: 1.4, color: tokens.text, opacity: 0.78, lineHeight: 1.2 }}>
                {ring.datum.label}
              </div>
              <div style={{ marginTop: 4, fontSize: Math.max(20, width * 0.015), fontWeight: 700, color: tokens.text, lineHeight: 1.1, whiteSpace: "nowrap" }}>
                {value}
              </div>
            </div>
          );
        })}

        <div style={{ position: "absolute", left: 0, top: 0, width, height, opacity: axisIn * 0.75 }}>
          <Axis
            x1={axisX}
            y1={cy}
            x2={axisX}
            y2={surfaceY}
            color={tokens.muted}
            ticks={ticks}
            fontSize={axisFont}
          />
        </div>
        <div
          style={{
            position: "absolute",
            left: vertical ? undefined : axisX,
            right: vertical ? pad : undefined,
            top: surfaceY - axisFont * 2.6,
            whiteSpace: "nowrap",
            fontSize: Math.max(11, Math.round(axisFont * 0.86)),
            letterSpacing: 1.8,
            fontWeight: 700,
            color: tokens.accent,
            opacity: axisIn,
          }}
        >
          RADIUS FROM CENTRE (km)
        </div>

        <div
          style={{
            position: "absolute",
            left: pad,
            top: vertical ? height * 0.845 : height * 0.845,
            maxWidth: vertical ? width - pad * 2 : width * 0.34,
            opacity: captionIn,
          }}
        >
          <div style={{ width: Math.max(44, width * 0.026), height: 3, backgroundColor: tokens.accent, marginBottom: 13 }} />
          <div style={{ fontSize: Math.max(17, width * 0.0115), lineHeight: 1.4, color: tokens.text, opacity: 0.8 }}>
            {copy.caption ?? ""}
          </div>
          {/* The crust has no ring of its own: at this scale it is thinner than the outline. */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: Math.max(8, width * 0.005),
              marginTop: Math.max(12, height * 0.014),
              whiteSpace: "nowrap",
              fontSize: Math.max(10, width * 0.0072),
              letterSpacing: 1.6,
              fontWeight: 700,
              color: tokens.accent,
            }}
          >
            <span
              style={{
                width: Math.max(16, width * 0.011),
                height: 2,
                backgroundColor: tokens.accent,
                opacity: 0.7,
              }}
            />
            CRUST ~35 KM - TOO THIN TO SEE AT THIS SCALE
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

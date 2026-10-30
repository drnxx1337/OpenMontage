import React from "react";
import {
  AbsoluteFill,
  CalculateMetadataFunction,
  Composition,
  Img,
  registerRoot,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";
import {
  MeasureLine,
  Stage,
  cameraTransform,
  enter,
  fitText,
  ratioOf,
  resolveTokens,
} from "../../shotkit";
import type { Theme, Tokens } from "../../shotkit";

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

// English number grouping: 29,000 / 2.3, never the kit's pl-PL spacing and comma.
const formatEn = (value: number, digits = 0): string =>
  Number.isFinite(value)
    ? value.toLocaleString("en-US", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })
    : "0";

const DEFAULT_PROPS: ShotProps = {
  copy: {
    kicker: "TRUE SCALE",
    headline: "THE HEXAGON DOES NOT FIT INSIDE EARTH",
    caption:
      "Saturn's polar hexagon is wider than Earth's diameter. Both figures are shown at the same scale.",
  },
  data: [
    { label: "HEXAGON", value: 29000, unit: "km" },
    { label: "EARTH", value: 12742, unit: "km" },
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

// Flat-top hexagon. The kit has no shape primitive, so the plate lives here.
const HexPlate: React.FC<{ size: number; accent: string; bg: string }> = ({
  size,
  accent,
  bg,
}) => {
  const points = "1,0 0.5,0.866 -0.5,0.866 -1,0 -0.5,-0.866 0.5,-0.866";

  return (
    <svg width={size} height={size} viewBox="-1 -1 2 2" style={{ display: "block" }}>
      <defs>
        <radialGradient id="kitHexShade" cx="34%" cy="26%" r="82%">
          <stop offset="0%" stopColor={accent} stopOpacity={0.5} />
          <stop offset="58%" stopColor={accent} stopOpacity={0} />
          <stop offset="100%" stopColor={bg} stopOpacity={0.72} />
        </radialGradient>
      </defs>
      <polygon points={points} fill={accent} fillOpacity={0.94} stroke={accent} strokeWidth={0.012} />
      <polygon points={points} fill="url(#kitHexShade)" />
    </svg>
  );
};

const ScaleObject: React.FC<{
  datum: Datum;
  diameter: number;
  accent: string;
  opacity: number;
  lift: number;
  tokens: Tokens;
  image?: string;
  hex?: boolean;
}> = ({ datum, diameter, accent, opacity, lift, tokens, image, hex }) => {
  const value = `${formatEn(datum.value)}${datum.unit ? ` ${datum.unit}` : ""}`;
  const labelMax = Math.max(16, Math.min(40, diameter * 0.082));
  const valueMax = Math.max(16, Math.min(30, diameter * 0.056));
  const label = fitText(datum.label, {
    maxWidth: diameter * 1.4,
    maxFontSize: labelMax,
    minFontSize: 12,
    fontFamily,
    fontWeight: 700,
    letterSpacing: labelMax * 0.05,
  });
  const measure = fitText(value, {
    maxWidth: diameter * 1.06,
    maxFontSize: valueMax,
    minFontSize: 11,
    fontFamily,
    fontWeight: 400,
    letterSpacing: valueMax * 0.02,
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: Math.max(8, diameter * 0.02),
        opacity,
        transform: `translateY(${(1 - opacity) * lift}px)`,
      }}
    >
      {hex ? (
        <HexPlate size={diameter} accent={accent} bg={tokens.bg} />
      ) : (
        <div
          style={{
            position: "relative",
            width: diameter,
            height: diameter,
            borderRadius: "50%",
            overflow: "hidden",
            backgroundColor: tokens.bg,
            boxShadow: `0 ${diameter * 0.035}px ${diameter * 0.1}px rgba(0,0,0,0.45)`,
          }}
        >
          {image ? (
            <>
              <Img
                src={staticFile(image)}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transform: "scale(1.06)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundColor: tokens.primary,
                  opacity: 0.3,
                  mixBlendMode: "soft-light",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: `radial-gradient(70% 70% at 68% 22%, transparent 40%, ${tokens.bg} 130%)`,
                }}
              />
            </>
          ) : null}
        </div>
      )}
      <div
        style={{
          fontSize: label.fontSize,
          fontWeight: 700,
          letterSpacing: label.fontSize * 0.05,
          color: tokens.text,
          whiteSpace: "nowrap",
        }}
      >
        {datum.label}
      </div>
      <MeasureLine
        width={diameter}
        color={tokens.muted}
        label={value}
        fontSize={measure.fontSize}
      />
    </div>
  );
};

export const Shot: React.FC<ShotProps> = ({ copy, data, theme }) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const tokens = resolveTokens(theme, width, height);
  const vertical = height > width;

  const big = data[0] ?? { label: "", value: 1 };
  const small = data[1] ?? { label: "", value: 1 };
  const ratio = Math.max(1.01, ratioOf(big.value, small.value));

  const pad = vertical ? width * 0.075 : width * 0.055;
  const headerH = vertical ? height * 0.28 : height * 0.36;
  const footerH = vertical ? height * 0.14 : height * 0.13;
  const footerBottom = vertical ? height * 0.075 : height * 0.05;
  const bandH = height - headerH - footerH - footerBottom;
  const gap = vertical ? height * 0.04 : width * 0.06;
  const topPad = vertical ? height * 0.1 : pad * 0.8;

  const labelBlock = 1.27;
  const spanW = vertical ? width * 0.82 : width * 0.66;
  const byWidth = (spanW - gap) / (1 + 1 / ratio);
  const byHeight = vertical
    ? (bandH * 0.96 - gap) / (labelBlock * (1 + 1 / ratio))
    : (bandH * 0.96) / labelBlock;
  const bigDiameter = Math.max(
    48,
    Math.min(byWidth, byHeight, vertical ? width * 0.62 : height * 0.4),
  );
  const smallDiameter = bigDiameter / ratio;

  const headIn = enter(frame, fps, { delay: 2, duration: 22 });
  const kickerIn = enter(frame, fps, { delay: 0, duration: 18 });
  const bigIn = enter(frame, fps, { delay: 8, duration: 28 });
  const smallIn = enter(frame, fps, { delay: 15, duration: 28 });
  const captionIn = enter(frame, fps, { delay: 30, duration: 22 });

  const headlineBase = Math.round(
    Math.min(vertical ? width * 0.098 : width * 0.055, height * 0.105),
  );
  // Long copy shrinks instead of running into the object band.
  const headlineSize =
    copy.headline.length > 34
      ? Math.round(headlineBase * Math.max(0.68, 34 / copy.headline.length))
      : headlineBase;

  return (
    <Stage theme={theme} width={width} height={height}>
      <AbsoluteFill style={cameraTransform(frame, durationInFrames, "push", 0.03)}>
        <div
          style={{
            position: "absolute",
            left: pad,
            top: topPad,
            fontSize: Math.max(17, width * 0.013),
            letterSpacing: width * 0.004,
            fontWeight: 700,
            color: tokens.accent,
            opacity: kickerIn,
          }}
        >
          {copy.kicker ?? ""}
        </div>

        <div
          style={{
            position: "absolute",
            left: pad,
            top: vertical ? height * 0.145 : pad * 1.55,
            width: vertical ? width - pad * 2 : width * 0.52,
            fontSize: headlineSize,
            lineHeight: 1.02,
            fontWeight: 700,
            letterSpacing: -headlineSize * 0.02,
            color: tokens.text,
            opacity: headIn,
            transform: `translateY(${(1 - headIn) * 26}px)`,
            textWrap: "balance",
          }}
        >
          {copy.headline}
        </div>

        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: headerH,
            height: bandH,
            display: "flex",
            flexDirection: vertical ? "column" : "row",
            alignItems: "center",
            justifyContent: "center",
            gap,
          }}
        >
          <ScaleObject
            datum={big}
            diameter={bigDiameter}
            accent={tokens.accent}
            opacity={bigIn}
            lift={26}
            hex
            tokens={tokens}
          />
          <ScaleObject
            datum={small}
            diameter={smallDiameter}
            accent={tokens.primary}
            opacity={smallIn}
            lift={22}
            image="earth-photo.png"
            tokens={tokens}
          />
        </div>

        <div
          style={{
            position: "absolute",
            left: pad,
            right: pad,
            bottom: footerBottom,
            height: footerH,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: pad,
            opacity: captionIn,
          }}
        >
          <div style={{ maxWidth: vertical ? width * 0.56 : width * 0.52 }}>
            <div
              style={{
                width: Math.max(48, width * 0.03),
                height: 3,
                backgroundColor: tokens.accent,
                marginBottom: 14,
              }}
            />
            <div
              style={{
                fontSize: Math.max(18, width * 0.0115),
                lineHeight: 1.35,
                color: tokens.text,
                opacity: 0.82,
              }}
            >
              {copy.caption ?? ""}
            </div>
          </div>
          <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
            <div
              style={{
                fontSize: Math.max(36, width * 0.036),
                fontWeight: 700,
                color: tokens.accent,
                lineHeight: 1,
              }}
            >
              {formatEn(ratio, 1)}×
            </div>
            <div
              style={{
                marginTop: 10,
                fontSize: Math.max(13, width * 0.009),
                letterSpacing: width * 0.0018,
                color: tokens.muted,
              }}
            >
              DIAGONAL / DIAMETER
            </div>
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

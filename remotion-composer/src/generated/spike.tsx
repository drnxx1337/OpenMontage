import React from "react";
import {
  AbsoluteFill,
  CalculateMetadataFunction,
  Composition,
  Img,
  interpolate,
  registerRoot,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "700"],
  subsets: ["latin", "latin-ext"],
});

type Datum = { label: string; value: number; unit?: string };

type Theme = {
  backgroundColor: string;
  textColor: string;
  mutedTextColor: string;
  accentColor: string;
  primaryColor: string;
};

export type ShotProps = {
  copy: { kicker?: string; headline: string; caption?: string };
  data: Datum[];
  theme: Theme;
  durationInFrames?: number;
};

const DEFAULT_PROPS: ShotProps = {
  copy: {
    kicker: "SKALA RZECZYWISTA",
    headline: "HEKSAGON NIE MIEŚCI SIĘ W ZIEMI",
    caption:
      "Sześciokąt na biegunie Saturna jest szerszy niż średnica Ziemi. Obie figury w tej samej skali.",
  },
  data: [
    { label: "HEKSAGON", value: 29000, unit: "km" },
    { label: "ZIEMIA", value: 12742, unit: "km" },
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

const fmt = (value: number) =>
  value.toLocaleString("pl-PL").replace(/\u00a0/g, " ");

const clampedSpring = (
  frame: number,
  fps: number,
  delay: number,
  durationInFrames = 24,
) =>
  0.6 +
  0.4 *
    spring({
      frame: Math.max(0, frame - delay),
      fps,
      config: { damping: 200 },
      durationInFrames,
    });

const HexPlate: React.FC<{ size: number; accent: string }> = ({
  size,
  accent,
}) => (
  <svg width={size} height={size} viewBox="-1 -1 2 2">
    <defs>
      <radialGradient id="hexFill" cx="35%" cy="28%" r="72%">
        <stop offset="0%" stopColor="#FDE68A" />
        <stop offset="52%" stopColor={accent} />
        <stop offset="100%" stopColor="#7C2D12" />
      </radialGradient>
    </defs>
    <polygon
      points="1,0 0.5,0.866 -0.5,0.866 -1,0 -0.5,-0.866 0.5,-0.866"
      fill="url(#hexFill)"
      stroke={accent}
      strokeWidth={0.012}
    />
  </svg>
);

const MeasureLine: React.FC<{
  width: number;
  color: string;
  label: string;
  fontSize: number;
}> = ({ width, color, label, fontSize }) => (
  <div
    style={{
      width,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 7,
    }}
  >
    <div
      style={{
        position: "relative",
        width: "100%",
        height: 1,
        backgroundColor: color,
        opacity: 0.5,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: -5,
          width: 1,
          height: 11,
          backgroundColor: color,
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 0,
          top: -5,
          width: 1,
          height: 11,
          backgroundColor: color,
        }}
      />
    </div>
    <div style={{ fontSize, color, letterSpacing: fontSize * 0.02 }}>
      {label}
    </div>
  </div>
);

const ScaleObject: React.FC<{
  datum: Datum;
  diameter: number;
  accent: string;
  opacity: number;
  lift: number;
  image?: string;
  hex?: boolean;
  textColor: string;
  mutedColor: string;
}> = ({
  datum,
  diameter,
  accent,
  opacity,
  lift,
  image,
  hex,
  textColor,
  mutedColor,
}) => {
  const labelSize = Math.max(18, Math.min(40, diameter * 0.082));
  const valueSize = Math.max(16, Math.min(30, diameter * 0.056));
  const value = `${fmt(datum.value)} ${datum.unit ?? ""}`.trim();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: Math.max(8, diameter * 0.02),
        opacity,
        transform: `translateY(${(1 - opacity) * lift}px) scale(${0.94 + opacity * 0.06})`,
      }}
    >
      {hex ? (
        <HexPlate size={diameter} accent={accent} />
      ) : (
        <div
          style={{
            position: "relative",
            width: diameter,
            height: diameter,
            borderRadius: "50%",
            overflow: "hidden",
            background: "#020617",
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
                  background:
                    "linear-gradient(160deg, rgba(61,123,255,0.32), rgba(2,6,23,0.5))",
                }}
              />
            </>
          ) : null}
        </div>
      )}
      <div
        style={{
          fontSize: labelSize,
          fontWeight: 700,
          letterSpacing: labelSize * 0.05,
          color: textColor,
        }}
      >
        {datum.label}
      </div>
      <MeasureLine
        width={diameter}
        color={mutedColor}
        label={value}
        fontSize={valueSize}
      />
    </div>
  );
};

const Shot: React.FC<ShotProps> = ({ copy, data, theme }) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const vertical = height > width;

  const big = data[0] ?? { label: "", value: 1 };
  const small = data[1] ?? { label: "", value: 1 };
  const ratio = small.value > 0 ? big.value / small.value : 1;

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

  const camera = interpolate(frame, [0, durationInFrames], [1, 1.035], {
    extrapolateRight: "clamp",
  });
  const headIn = clampedSpring(frame, fps, 2, 22);
  const kickerIn = clampedSpring(frame, fps, 0, 18);
  const bigIn = clampedSpring(frame, fps, 8, 28);
  const smallIn = clampedSpring(frame, fps, 15, 28);
  const captionIn = clampedSpring(frame, fps, 30, 22);

  const headlineSize = Math.round(
    Math.min(vertical ? width * 0.098 : width * 0.055, height * 0.105),
  );

  return (
    <AbsoluteFill
      style={{ backgroundColor: theme.backgroundColor, fontFamily }}
    >
      <AbsoluteFill
        style={{
          transform: `scale(${camera})`,
          background: `radial-gradient(120% 90% at 20% 0%, ${theme.primaryColor}22 0%, transparent 55%), radial-gradient(90% 70% at 85% 100%, ${theme.accentColor}14 0%, transparent 60%)`,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: pad,
            top: topPad,
            fontSize: Math.max(17, width * 0.013),
            letterSpacing: width * 0.004,
            fontWeight: 700,
            color: theme.accentColor,
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
            color: theme.textColor,
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
            accent={theme.accentColor}
            opacity={bigIn}
            lift={26}
            hex
            textColor={theme.textColor}
            mutedColor={theme.mutedTextColor}
          />
          <ScaleObject
            datum={small}
            diameter={smallDiameter}
            accent={theme.primaryColor}
            opacity={smallIn}
            lift={22}
            image="earth-photo.png"
            textColor={theme.textColor}
            mutedColor={theme.mutedTextColor}
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
                backgroundColor: theme.accentColor,
                marginBottom: 14,
              }}
            />
            <div
              style={{
                fontSize: Math.max(18, width * 0.0115),
                lineHeight: 1.35,
                color: theme.textColor,
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
                color: theme.accentColor,
                lineHeight: 1,
              }}
            >
              {ratio.toLocaleString("pl-PL", {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}
              ×
            </div>
            <div
              style={{
                marginTop: 10,
                fontSize: Math.max(13, width * 0.009),
                letterSpacing: width * 0.0018,
                color: theme.mutedTextColor,
              }}
            >
              PRZEKĄTNA / ŚREDNICA
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
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

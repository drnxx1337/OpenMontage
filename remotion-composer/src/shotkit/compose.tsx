import React from "react";
import { AbsoluteFill } from "remotion";
import type { Theme } from "./tokens";

export type StageProps = {
  theme: Theme;
  width: number;
  height: number;
  children: React.ReactNode;
  grain?: boolean;
  vignette?: boolean;
};

// Fixed pattern, no randomness: determinism over a real film grain.
const GRAIN = [
  "repeating-linear-gradient(0deg, rgba(255,255,255,0.045) 0px, rgba(255,255,255,0.045) 1px, transparent 1px, transparent 3px)",
  "repeating-linear-gradient(90deg, rgba(0,0,0,0.05) 0px, rgba(0,0,0,0.05) 1px, transparent 1px, transparent 4px)",
].join(", ");

const VIGNETTE =
  "radial-gradient(115% 95% at 50% 46%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.5) 100%)";

const glow = (
  width: number,
  height: number,
  primary: string,
  accent: string,
): string => {
  const w = Number.isFinite(width) && width > 0 ? width : 1920;
  const h = Number.isFinite(height) && height > 0 ? height : 1080;
  const near = `at ${Math.round(w * 0.18)}px ${Math.round(h * 0.08)}px`;
  const far = `at ${Math.round(w * 0.88)}px ${Math.round(h * 0.96)}px`;
  return [
    `radial-gradient(${Math.round(w * 0.8)}px ${Math.round(h * 0.6)}px ${near}, ${primary}26 0%, transparent 62%)`,
    `radial-gradient(${Math.round(w * 0.7)}px ${Math.round(h * 0.55)}px ${far}, ${accent}1f 0%, transparent 66%)`,
  ].join(", ");
};

export const Stage: React.FC<StageProps> = ({
  theme,
  width,
  height,
  children,
  grain = true,
  vignette = true,
}) => (
  <AbsoluteFill
    style={{
      backgroundColor: theme.backgroundColor,
      fontFamily: theme.headingFont ?? "Space Grotesk",
      color: theme.textColor,
    }}
  >
    <AbsoluteFill
      style={{
        background: glow(width, height, theme.primaryColor, theme.accentColor),
      }}
    />
    <AbsoluteFill>{children}</AbsoluteFill>
    {grain ? (
      <AbsoluteFill
        style={{ backgroundImage: GRAIN, opacity: 0.6, mixBlendMode: "soft-light" }}
      />
    ) : null}
    {vignette ? <AbsoluteFill style={{ backgroundImage: VIGNETTE }} /> : null}
  </AbsoluteFill>
);

export type LayerProps = {
  children: React.ReactNode;
  style?: React.CSSProperties;
};

export const Layer: React.FC<LayerProps> = ({ children, style }) => (
  <AbsoluteFill style={style}>{children}</AbsoluteFill>
);

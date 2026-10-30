export type Theme = {
  backgroundColor: string;
  textColor: string;
  mutedTextColor: string;
  accentColor: string;
  primaryColor: string;
  headingFont?: string;
  bodyFont?: string;
};

export type Tokens = {
  bg: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  primary: string;
  fontFamily: string;
  safe: number;
  grid: number;
  type: { kicker: number; body: number; label: number };
};

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

const parseHex = (value: string): [number, number, number] | null => {
  if (!HEX.test(value)) {
    return null;
  }
  const raw = value.slice(1);
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((char) => char + char)
          .join("")
      : raw;
  const int = Number.parseInt(full, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
};

const mix = (from: string, to: string, ratio: number): string | null => {
  const a = parseHex(from);
  const b = parseHex(to);
  if (!a || !b) {
    return null;
  }
  const channel = (index: number): number =>
    Math.round(a[index] + (b[index] - a[index]) * ratio);
  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`;
};

const shortSide = (width: number, height: number): number => {
  const w = Number.isFinite(width) && width > 0 ? width : 1920;
  const h = Number.isFinite(height) && height > 0 ? height : 1080;
  return Math.min(w, h);
};

export const resolveTokens = (
  theme: Theme,
  width: number,
  height: number,
): Tokens => {
  const short = shortSide(width, height);
  const size = (ratio: number): number => Math.max(14, Math.round(short * ratio));

  return {
    bg: theme.backgroundColor,
    // `surface` has no theme slot: lift the background toward the text color.
    surface: mix(theme.backgroundColor, theme.textColor, 0.07) ?? theme.backgroundColor,
    text: theme.textColor,
    muted: theme.mutedTextColor,
    accent: theme.accentColor,
    primary: theme.primaryColor,
    fontFamily: theme.headingFont ?? "Space Grotesk",
    safe: Math.round(short * 0.055),
    grid: Math.round(short / 24),
    type: {
      kicker: size(0.018),
      body: size(0.022),
      label: size(0.015),
    },
  };
};

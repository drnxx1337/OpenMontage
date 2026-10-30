export type FitTextOptions = {
  maxWidth: number;
  maxFontSize: number;
  minFontSize?: number;
  fontFamily: string;
  fontWeight?: number;
  letterSpacing?: number;
};

export type FitTextResult = { fontSize: number; width: number };

const CACHE_LIMIT = 4096;
const cache = new Map<string, number>();
let context: CanvasRenderingContext2D | null = null;

const getContext = (): CanvasRenderingContext2D | null => {
  if (context) {
    return context;
  }
  if (typeof document === "undefined") {
    return null;
  }
  context = document.createElement("canvas").getContext("2d");
  return context;
};

const pxOf = (font: string): number => {
  const match = /(\d+(?:\.\d+)?)px/.exec(font);
  const size = match ? Number.parseFloat(match[1]) : 16;
  return Number.isFinite(size) && size > 0 ? size : 16;
};

const round2 = (value: number): number =>
  Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;

// Canvas measurement needs a DOM; during metadata calculation it does not exist.
const fallbackWidth = (text: string, font: string): number =>
  text.length * 0.55 * pxOf(font);

export const measureTextWidth = (text: string, font: string): number => {
  const key = `${font}\n${text}`;
  const cached = cache.get(key);
  if (cached !== undefined) {
    return cached;
  }

  let width = fallbackWidth(text, font);
  const ctx = getContext();
  if (ctx) {
    ctx.font = font;
    const measured = ctx.measureText(text).width;
    if (Number.isFinite(measured)) {
      width = measured;
    }
  }

  if (cache.size >= CACHE_LIMIT) {
    cache.clear();
  }
  cache.set(key, width);
  return width;
};

export const fitText = (
  text: string,
  opts: FitTextOptions,
): FitTextResult => {
  const {
    maxWidth,
    maxFontSize,
    fontFamily,
    fontWeight = 700,
    letterSpacing = 0,
  } = opts;
  const minSize = Math.max(1, opts.minFontSize ?? 14);
  const maxSize =
    Number.isFinite(maxFontSize) && maxFontSize > minSize
      ? maxFontSize
      : minSize;
  const limit = Number.isFinite(maxWidth) ? maxWidth : Number.POSITIVE_INFINITY;

  const widthAt = (size: number): number => {
    const font = `${fontWeight} ${size}px ${fontFamily}`;
    const measured = measureTextWidth(text, font) + letterSpacing * text.length;
    return Number.isFinite(measured) ? measured : 0;
  };

  if (widthAt(maxSize) <= limit) {
    return { fontSize: round2(maxSize), width: round2(widthAt(maxSize)) };
  }
  if (widthAt(minSize) > limit) {
    return { fontSize: round2(minSize), width: round2(widthAt(minSize)) };
  }

  let lo = minSize;
  let hi = maxSize;
  while (hi - lo > 0.5) {
    const mid = (lo + hi) / 2;
    if (widthAt(mid) <= limit) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return { fontSize: round2(lo), width: round2(widthAt(lo)) };
};

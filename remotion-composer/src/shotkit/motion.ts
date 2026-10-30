import { spring } from "remotion";

export type EnterOptions = { delay?: number; duration?: number; floor?: number };

export const enter = (
  frame: number,
  fps: number,
  opts?: EnterOptions,
): number => {
  const delay = opts?.delay ?? 0;
  const duration = Math.max(1, opts?.duration ?? 24);
  const floor = Math.min(1, Math.max(0, opts?.floor ?? 0.6));
  const local = Math.max(0, frame - delay);
  const value = spring({
    frame: local,
    fps: fps > 0 ? fps : 30,
    config: { damping: 200 },
    durationInFrames: duration,
  });
  return floor + (1 - floor) * value;
};

export const exit = (
  frame: number,
  durationInFrames: number,
  opts?: { duration?: number },
): number => {
  if (!(durationInFrames > 0)) {
    return 0;
  }
  const duration = Math.max(1, opts?.duration ?? 12);
  const start = durationInFrames - duration;
  // Divide by duration - 1 so the last frame lands exactly on 0.
  const progress = (frame - start) / Math.max(1, duration - 1);
  if (progress <= 0) {
    return 1;
  }
  if (progress >= 1) {
    return 0;
  }
  return 1 - progress;
};

export const stagger = (index: number, frames = 4): number =>
  Number.isFinite(index) ? Math.max(0, index) * frames : 0;

const mulberry32 = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const seededNoise = (seed: number): ((t: number) => number) => {
  const lattice = (index: number): number =>
    mulberry32((Math.imul(seed, 374761393) + Math.imul(index, 668265263)) >>> 0)() *
      2 -
    1;

  return (t: number): number => {
    if (!Number.isFinite(t)) {
      return 0;
    }
    const base = Math.floor(t);
    const frac = t - base;
    const smooth = frac * frac * (3 - 2 * frac);
    return lattice(base) * (1 - smooth) + lattice(base + 1) * smooth;
  };
};

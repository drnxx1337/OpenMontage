import type { CSSProperties } from "react";

export type CameraKind = "push" | "pull" | "pan-left" | "pan-right" | "none";

const progressOf = (frame: number, durationInFrames: number): number => {
  if (!(durationInFrames > 1)) {
    return 0;
  }
  const raw = frame / (durationInFrames - 1);
  return Math.min(1, Math.max(0, Number.isFinite(raw) ? raw : 0));
};

const lerp = (from: number, to: number, t: number): number =>
  from + (to - from) * t;

export const cameraTransform = (
  frame: number,
  durationInFrames: number,
  kind: CameraKind,
  amount = 0.035,
): CSSProperties => {
  const t = progressOf(frame, durationInFrames);
  const depth = Number.isFinite(amount) ? Math.abs(amount) : 0.035;
  const shift = depth * 100;

  switch (kind) {
    case "push":
      return { transform: `scale(${lerp(1, 1 + depth, t).toFixed(5)})` };
    case "pull":
      return { transform: `scale(${lerp(1 + depth, 1, t).toFixed(5)})` };
    // Pan is symmetric around the frame center so the subject stays put mid-shot.
    case "pan-left":
      return { transform: `translateX(${lerp(shift, -shift, t).toFixed(3)}%)` };
    case "pan-right":
      return { transform: `translateX(${lerp(-shift, shift, t).toFixed(3)}%)` };
    default:
      return {};
  }
};

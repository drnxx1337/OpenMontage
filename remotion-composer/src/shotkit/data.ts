const finite = (value: number, fallback: number): number =>
  Number.isFinite(value) ? value : fallback;

export const scaleLinear = (
  domain: [number, number],
  range: [number, number],
): ((value: number) => number) => {
  const d0 = finite(domain[0], 0);
  const d1 = finite(domain[1], 1);
  const r0 = finite(range[0], 0);
  const r1 = finite(range[1], 1);
  const span = d1 - d0;
  if (span === 0) {
    return () => (r0 + r1) / 2;
  }
  return (value: number) => {
    const v = finite(value, d0);
    const t = (v - d0) / span;
    return r0 + (r1 - r0) * (Number.isFinite(t) ? t : 0);
  };
};

export const scaleLog = (
  domain: [number, number],
  range: [number, number],
): ((value: number) => number) => {
  const d0 = finite(domain[0], 0);
  const d1 = finite(domain[1], 0);
  if (d0 <= 0 || d1 <= 0 || d0 === d1) {
    return scaleLinear([d0, d1], range);
  }
  const l0 = Math.log10(d0);
  const l1 = Math.log10(d1);
  const r0 = finite(range[0], 0);
  const r1 = finite(range[1], 1);
  return (value: number) => {
    if (!(value > 0)) {
      return r0;
    }
    const t = (Math.log10(value) - l0) / (l1 - l0);
    return r0 + (r1 - r0) * t;
  };
};

// Geometric thresholds keep tick counts close to the requested count.
const niceStep = (raw: number): number => {
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const normalized = raw / magnitude;
  const factor =
    normalized < Math.SQRT2 ? 1 : normalized < Math.sqrt(10) ? 2 : normalized < Math.sqrt(50) ? 5 : 10;
  return factor * magnitude;
};

export const niceTicks = (min: number, max: number, count = 5): number[] => {
  const lo = Math.min(finite(min, 0), finite(max, 0));
  const hi = Math.max(finite(min, 0), finite(max, 0));
  if (lo === hi) {
    return [lo];
  }

  const target = Math.max(1, Math.floor(finite(count, 5)));
  const step = niceStep((hi - lo) / target);
  const start = Math.ceil(lo / step) * step;
  const ticks: number[] = [];
  const limit = Math.floor((hi - start) / step + 1e-9);

  for (let i = 0; i <= limit; i += 1) {
    const value = start + i * step;
    ticks.push(Math.abs(value) < step * 1e-9 ? 0 : Number(value.toFixed(10)));
  }
  return ticks;
};

export const formatPl = (value: number, digits = 0): string => {
  const safe = finite(value, 0);
  const places = Math.max(0, Math.min(6, Math.floor(finite(digits, 0))));
  const text = safe.toLocaleString("pl-PL", {
    minimumFractionDigits: places,
    maximumFractionDigits: places,
  });
  return text.replace(/[\u00a0\u202f]/g, " ");
};

export const ratioOf = (a: number, b: number): number => {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= 0) {
    return 1;
  }
  const ratio = a / b;
  return Number.isFinite(ratio) ? ratio : 1;
};

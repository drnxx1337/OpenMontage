import React from "react";

const OVERLAY: React.CSSProperties = {
  position: "absolute",
  left: 0,
  top: 0,
  width: "100%",
  height: "100%",
  overflow: "visible",
  pointerEvents: "none",
};

export const MeasureLine: React.FC<{
  width: number;
  color: string;
  label?: string;
  fontSize?: number;
  opacity?: number;
}> = ({ width, color, label, fontSize = 14, opacity = 1 }) => (
  <div
    style={{
      width,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: Math.max(4, Math.round(fontSize * 0.45)),
      opacity,
    }}
  >
    <div style={{ position: "relative", width: "100%", height: 1, backgroundColor: color, opacity: 0.75 }}>
      <div style={{ position: "absolute", left: 0, top: -4, width: 1, height: 9, backgroundColor: color }} />
      <div style={{ position: "absolute", right: 0, top: -4, width: 1, height: 9, backgroundColor: color }} />
    </div>
    {label ? (
      <div style={{ fontSize, color, letterSpacing: fontSize * 0.02, whiteSpace: "nowrap" }}>{label}</div>
    ) : null}
  </div>
);

// Ticks are placed by their value between the smallest and largest tick, so both
// data values and normalized 0..1 positions work without a domain prop.
export const Axis: React.FC<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  ticks?: number[];
  tickLabels?: string[];
  fontSize?: number;
}> = ({ x1, y1, x2, y2, color, ticks, tickLabels, fontSize = 14 }) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  const cap = Math.max(4, Math.round(fontSize * 0.4));
  const values = ticks ?? [];
  const lo = values.length ? Math.min(...values) : 0;
  const span = values.length ? Math.max(...values) - lo : 0;

  return (
    <svg style={OVERLAY}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={1.5} />
      {values.map((value, index) => {
        const t = values.length <= 1 ? 0.5 : span !== 0 ? (value - lo) / span : index / (values.length - 1);
        const cx = x1 + dx * t;
        const cy = y1 + dy * t;
        const label = tickLabels?.[index];
        return (
          <g key={`tick-${index}`}>
            <line x1={cx} y1={cy} x2={cx + nx * cap} y2={cy + ny * cap} stroke={color} strokeWidth={1.5} />
            {label ? (
              <text
                x={cx + nx * cap * 3}
                y={cy + ny * cap * 3}
                fill={color}
                fontSize={fontSize}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {label}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
};

export const Grid: React.FC<{
  width: number;
  height: number;
  columns?: number;
  rows?: number;
  color: string;
  opacity?: number;
}> = ({ width, height, columns = 12, rows = 8, color, opacity = 0.12 }) => {
  const cols = Math.max(1, Math.floor(columns));
  const rws = Math.max(1, Math.floor(rows));
  const verticals = Array.from({ length: cols + 1 }, (_, index) => (index * width) / cols);
  const horizontals = Array.from({ length: rws + 1 }, (_, index) => (index * height) / rws);

  return (
    <svg width={width} height={height} style={{ ...OVERLAY, opacity }}>
      {verticals.map((x, index) => (
        <line key={`v-${index}`} x1={x} y1={0} x2={x} y2={height} stroke={color} strokeWidth={1} />
      ))}
      {horizontals.map((y, index) => (
        <line key={`h-${index}`} x1={0} y1={y} x2={width} y2={y} stroke={color} strokeWidth={1} />
      ))}
    </svg>
  );
};

export const Bracket: React.FC<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  strokeWidth?: number;
}> = ({ x1, y1, x2, y2, color, strokeWidth = 1.5 }) => {
  const cap = Math.max(4, strokeWidth * 4);

  return (
    <svg style={OVERLAY}>
      <path
        d={`M ${x1} ${y1} L ${x1} ${y2} L ${x2} ${y2}`}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <line x1={x1 - cap} y1={y1} x2={x1 + cap} y2={y1} stroke={color} strokeWidth={strokeWidth} />
      <line x1={x2} y1={y2 - cap} x2={x2} y2={y2 + cap} stroke={color} strokeWidth={strokeWidth} />
    </svg>
  );
};

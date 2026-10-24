import React, { useMemo } from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { line, curveBasis } from "d3-shape";
import {
  BodySpec,
  CalloutSpec,
  Coordinate2D,
  FieldSpec,
  KineticSceneSpec,
} from "./types";

export interface ProceduralKineticSceneProps {
  spec: KineticSceneSpec;
  accentColor?: string;
  textColor?: string;
  backgroundColor?: string;
}

// Pseudo-random deterministic generator for starfields and particle offsets
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 9999.123) * 10000;
  return x - Math.floor(x);
}

export const ProceduralKineticScene: React.FC<ProceduralKineticSceneProps> = ({
  spec,
  accentColor = "#38BDF8",
  textColor = "#F8FAFC",
  backgroundColor = "#030712",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const t = frame / fps;

  // Scene center in screen pixels
  const cx = width / 2;
  const cy = height / 2;

  // Camera zoom & pan animation
  const cam = spec.camera;
  const zoomSpring = spring({
    frame,
    fps,
    config: { damping: 200, mass: 1 },
  });
  const zoomFactor = cam?.zoomFrom !== undefined && cam?.zoomTo !== undefined
    ? interpolate(zoomSpring, [0, 1], [cam.zoomFrom, cam.zoomTo])
    : 1.0;
  const camPanX = cam?.targetOffset ? cam.targetOffset.x * zoomSpring : 0;
  const camPanY = cam?.targetOffset ? cam.targetOffset.y * zoomSpring : 0;

  // Pre-generate deterministic stars
  const starCount = spec.environment?.starCount ?? 90;
  const stars = useMemo(() => {
    const list: Array<{ x: number; y: number; r: number; alpha: number; speed: number }> = [];
    for (let i = 0; i < starCount; i++) {
      list.push({
        x: pseudoRandom(i * 3 + 1) * width,
        y: pseudoRandom(i * 3 + 2) * height,
        r: 0.8 + pseudoRandom(i * 3 + 3) * 1.5,
        alpha: 0.3 + pseudoRandom(i * 7 + 4) * 0.7,
        speed: 0.5 + pseudoRandom(i * 11 + 5) * 1.5,
      });
    }
    return list;
  }, [starCount, width, height]);

  // Atmosphere & glow filter IDs
  const glowFilterId = "kinetic-glow-filter";
  const plasmaGradientId = "kinetic-plasma-grad";

  // --- RENDER ENVIRONMENT ---
  const renderEnvironment = () => {
    const env = spec.environment;
    const bg = spec.theme === "scientific_clean" ? "#0F172A" : backgroundColor;

    return (
      <g id="kinetic-environment">
        {/* Deep space base rectangle */}
        <rect width={width} height={height} fill={bg} />

        {/* Ambient Cosmic Nebula / Glow */}
        {env?.nebula?.enabled !== false && (
          <ellipse
            cx={cx + 80}
            cy={cy - 40}
            rx={width * 0.45}
            ry={height * 0.35}
            fill="url(#nebula-grad)"
            opacity={env?.nebula?.opacity ?? 0.28}
          />
        )}

        {/* Starfield with subtle twinkle */}
        {env?.starfield !== false && (
          <g id="starfield">
            {stars.map((s, idx) => {
              const twinkle = 0.5 + 0.5 * Math.sin(t * s.speed * 2.5 + idx);
              return (
                <circle
                  key={idx}
                  cx={s.x}
                  cy={s.y}
                  r={s.r}
                  fill="#FFFFFF"
                  opacity={s.alpha * twinkle}
                />
              );
            })}
          </g>
        )}

        {/* Blueprint / Cartesian / Polar Grid */}
        {env?.grid?.enabled && (
          <g id="reference-grid" opacity={env.grid.opacity ?? 0.15}>
            {env.grid.type === "polar" ? (
              <>
                {[120, 240, 380, 520, 680].map((radius, idx) => (
                  <circle
                    key={idx}
                    cx={cx}
                    cy={cy}
                    r={radius}
                    fill="none"
                    stroke={env.grid?.color ?? accentColor}
                    strokeDasharray="4 6"
                    strokeWidth={1}
                  />
                ))}
                <line x1={cx - 700} y1={cy} x2={cx + 700} y2={cy} stroke={env.grid?.color ?? accentColor} strokeWidth={1} strokeDasharray="3 5" />
                <line x1={cx} y1={cy - 500} x2={cx} y2={cy + 500} stroke={env.grid?.color ?? accentColor} strokeWidth={1} strokeDasharray="3 5" />
              </>
            ) : (
              <>
                {Array.from({ length: 15 }).map((_, idx) => {
                  const gx = idx * 140;
                  return (
                    <line key={`gx-${idx}`} x1={gx} y1={0} x2={gx} y2={height} stroke={env?.grid?.color ?? accentColor} strokeWidth={0.8} />
                  );
                })}
                {Array.from({ length: 9 }).map((_, idx) => {
                  const gy = idx * 140;
                  return (
                    <line key={`gy-${idx}`} x1={0} y1={gy} x2={width} y2={gy} stroke={env?.grid?.color ?? accentColor} strokeWidth={0.8} />
                  );
                })}
              </>
            )}
          </g>
        )}
      </g>
    );
  };

  // --- RENDER MAGNETIC FIELDS & SOLAR WIND ---
  const renderFields = (fields?: FieldSpec, bodies?: BodySpec[]) => {
    if (!fields || fields.type === "none") return null;

    const primaryBody = bodies?.[0];
    const bx = cx + (primaryBody?.position?.x ?? 0);
    const by = cy + (primaryBody?.position?.y ?? 0);
    const br = primaryBody?.radius ?? 120;
    const bodyTilt = (primaryBody?.tiltDeg ?? 23.5) * (Math.PI / 180);

    return (
      <g id="kinetic-fields">
        {/* 1. Solar Wind Particle Streams & Bow Shock Deflection */}
        {fields.solarWind?.enabled && (
          <g id="solar-wind">
            {/* Bow Shock Arc (Hyperbolic curved magnetopause) */}
            {(() => {
              const shockDist = fields.solarWind.bowShockRadius ?? br * 2.1;
              const shockCurve = fields.solarWind.deflectionCurvature ?? 1.5;
              const shockX = bx - shockDist;
              const bowArcGenerator = line<[number, number]>().curve(curveBasis);
              const bowPoints: [number, number][] = [
                [bx + 400, by - 520],
                [shockX + 100, by - 360],
                [shockX, by],
                [shockX + 100, by + 360],
                [bx + 400, by + 520],
              ];
              const pathD = bowArcGenerator(bowPoints) || "";

              return (
                <path
                  d={pathD}
                  fill="none"
                  stroke={fields.solarWind.color ?? "#F59E0B"}
                  strokeWidth={2.5}
                  strokeDasharray="6 4"
                  opacity={0.65}
                  filter={`url(#${glowFilterId})`}
                />
              );
            })()}

            {/* Inbound Solar Wind Particles Deflected Around Magnetosphere */}
            {Array.from({ length: fields.solarWind.particleCount ?? 35 }).map((_, pIdx) => {
              const pSpeed = (fields.solarWind?.speed ?? 1.0) * 450;
              const ySpread = ((pIdx / 35) - 0.5) * 880;
              const startX = -100;
              const cyclePos = (startX + t * pSpeed + pIdx * 90) % (width + 300);
              const curX = cyclePos - 100;

              // Deflection physics: particles bend away from Earth center when approaching bow shock
              const distToBody = Math.hypot(curX - bx, ySpread);
              const standoff = (fields.solarWind?.bowShockRadius ?? br * 2.1) + 20;
              let deflectedY = by + ySpread;
              if (curX > bx - standoff && curX < bx + standoff * 2) {
                const deflectionPower = Math.max(0, 1 - (distToBody / (standoff * 1.8)));
                deflectedY += Math.sign(ySpread || 1) * deflectionPower * 140;
              }

              return (
                <circle
                  key={`wind-${pIdx}`}
                  cx={curX}
                  cy={deflectedY}
                  r={2.2}
                  fill={fields.solarWind?.color ?? "#FBBF24"}
                  opacity={0.7}
                />
              );
            })}
          </g>
        )}

        {/* 2. Dipole Magnetic Field Lines */}
        {fields.dipole?.enabled && (
          <g id="magnetic-dipole" transform={`translate(${bx}, ${by}) rotate(${(primaryBody?.tiltDeg ?? 23.5) + (fields.dipole.poleTiltDeg ?? 11.5)})`}>
            {Array.from({ length: fields.dipole.loopsCount ?? 8 }).map((_, lIdx) => {
              const reach = (br * 1.4) + lIdx * 38;
              const pulse = fields.dipole?.pulsing ? 1 + 0.04 * Math.sin(t * 3 + lIdx) : 1;
              const rScaled = reach * pulse;

              // Dipole magnetic loop formula in polar/parametric form
              const dipoleGenerator = line<[number, number]>().curve(curveBasis);
              const steps = 18;
              const ptsRight: [number, number][] = [];
              const ptsLeft: [number, number][] = [];

              for (let s = 1; s < steps; s++) {
                const theta = (s / steps) * Math.PI;
                const r = rScaled * Math.sin(theta) * Math.sin(theta);
                const x = r * Math.sin(theta);
                const y = -r * Math.cos(theta);
                ptsRight.push([x, y]);
                ptsLeft.push([-x, y]);
              }

              const pathRight = dipoleGenerator(ptsRight) || "";
              const pathLeft = dipoleGenerator(ptsLeft) || "";

              return (
                <React.Fragment key={`dipole-loop-${lIdx}`}>
                  <path
                    d={pathRight}
                    fill="none"
                    stroke={fields.dipole?.color ?? accentColor}
                    strokeWidth={1.6}
                    opacity={0.55 - (lIdx * 0.04)}
                    strokeDasharray="8 4"
                  />
                  <path
                    d={pathLeft}
                    fill="none"
                    stroke={fields.dipole?.color ?? accentColor}
                    strokeWidth={1.6}
                    opacity={0.55 - (lIdx * 0.04)}
                    strokeDasharray="8 4"
                  />
                </React.Fragment>
              );
            })}
          </g>
        )}

        {/* 3. Force Vectors */}
        {fields.forceVectors?.map((vec) => (
          <g key={vec.id} id={`force-vector-${vec.id}`}>
            <line
              x1={cx + vec.from.x}
              y1={cy + vec.from.y}
              x2={cx + vec.to.x}
              y2={cy + vec.to.y}
              stroke={vec.color ?? "#EF4444"}
              strokeWidth={2.5}
              strokeDasharray={vec.dashed ? "6 4" : undefined}
              markerEnd="url(#arrow-head)"
            />
            <text
              x={cx + (vec.from.x + vec.to.x) / 2 + 10}
              y={cy + (vec.from.y + vec.to.y) / 2 - 10}
              fill={vec.color ?? "#EF4444"}
              fontSize={16}
              fontFamily="Space Grotesk, sans-serif"
              fontWeight={700}
            >
              {vec.label}
            </text>
          </g>
        ))}
      </g>
    );
  };

  // --- RENDER PLANETARY BODIES & CROSS-SECTIONS ---
  const renderBodies = (bodies?: BodySpec[]) => {
    if (!bodies || bodies.length === 0) return null;

    return (
      <g id="kinetic-bodies">
        {bodies.map((body) => {
          const bx = cx + (body.position?.x ?? 0);
          const by = cy + (body.position?.y ?? 0);
          const r = body.radius;
          const tilt = body.tiltDeg ?? 23.5;
          const spin = ((frame * (body.rotationSpeed ?? 1.0) * 1.5) % 360);

          return (
            <g key={body.id} id={`body-${body.id}`} transform={`translate(${bx}, ${by})`}>
              {/* Atmosphere Glow Outer Ring */}
              {body.atmosphereGlow !== false && (
                <circle
                  r={r * (body.glowRadiusMultiplier ?? 1.25)}
                  fill={body.atmosphereColor ?? body.primaryColor}
                  opacity={0.2}
                  filter={`url(#${glowFilterId})`}
                />
              )}

              {/* Tilted Axis of Rotation */}
              <g transform={`rotate(${tilt})`}>
                {/* North & South pole axis markers */}
                <line
                  x1={0}
                  y1={-r * 1.35}
                  x2={0}
                  y2={r * 1.35}
                  stroke="rgba(255, 255, 255, 0.45)"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                />
                <circle cx={0} cy={-r * 1.35} r={3} fill={accentColor} />
                <circle cx={0} cy={r * 1.35} r={3} fill={accentColor} />

                {/* Sphere Base with 3D Spherical Shading */}
                <circle
                  r={r}
                  fill={`url(#planet-shading-${body.id})`}
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth={1}
                />

                {/* Latitudinal Bands (Gas Giants / Jovian planets) */}
                {body.bands && body.bands.length > 0 && (
                  <g id={`bands-${body.id}`} clipPath={`url(#sphere-clip-${body.id})`}>
                    {body.bands.map((bandColor, bIdx) => {
                      const bandH = (r * 2) / body.bands!.length;
                      const bandY = -r + bIdx * bandH;
                      return (
                        <rect
                          key={bIdx}
                          x={-r * 1.2}
                          y={bandY}
                          width={r * 2.4}
                          height={bandH * 0.9}
                          fill={bandColor}
                          opacity={0.35}
                        />
                      );
                    })}
                  </g>
                )}

                {/* Planetary Rings (e.g. Saturn) */}
                {body.rings && (
                  <ellipse
                    rx={body.rings.outerRadius}
                    ry={body.rings.outerRadius * 0.28}
                    fill="none"
                    stroke={body.rings.color ?? "#E2E8F0"}
                    strokeWidth={body.rings.outerRadius - body.rings.innerRadius}
                    opacity={body.rings.opacity ?? 0.65}
                    transform={`rotate(${body.rings.tiltDeg})`}
                  />
                )}

                {/* Layered Cross-Section / Core Cutaway */}
                {body.cutaway?.enabled && (
                  <g id={`cutaway-${body.id}`}>
                    {/* Wedge path (default 90 deg quarter cutaway) */}
                    {body.cutaway.layers
                      .slice()
                      .sort((a, b) => b.depthRatio - a.depthRatio)
                      .map((layer, lIdx) => {
                        const layerR = r * layer.depthRatio;
                        return (
                          <g key={lIdx}>
                            {/* Wedge sector: Top-right quadrant */}
                            <path
                              d={`M 0 0 L 0 ${-layerR} A ${layerR} ${layerR} 0 0 1 ${layerR} 0 Z`}
                              fill={layer.color}
                              stroke="rgba(0,0,0,0.4)"
                              strokeWidth={1.5}
                            />
                            {/* Layer label if requested */}
                            {body.cutaway?.showLabels !== false && layer.label && (
                              <text
                                x={layerR * 0.55}
                                y={-layerR * 0.45}
                                fill="#FFFFFF"
                                fontSize={14}
                                fontWeight={700}
                                fontFamily="Space Grotesk, sans-serif"
                                textAnchor="middle"
                              >
                                {layer.label}
                              </text>
                            )}
                          </g>
                        );
                      })}

                    {/* Geodynamo Helical Magnetic Convection in Liquid Outer Core */}
                    {body.cutaway.dynamoEffect && (
                      <g id="dynamo-helices">
                        {Array.from({ length: 4 }).map((_, dIdx) => {
                          const coreR = r * 0.45;
                          const dAngle = (dIdx * Math.PI) / 2 + t * 2.5;
                          const dx = Math.cos(dAngle) * (coreR * 0.65);
                          const dy = Math.sin(dAngle) * (coreR * 0.65);
                          return (
                            <circle
                              key={`dynamo-${dIdx}`}
                              cx={dx}
                              cy={dy}
                              r={5}
                              fill="#FEF08A"
                              filter={`url(#${glowFilterId})`}
                              opacity={0.85}
                            />
                          );
                        })}
                      </g>
                    )}
                  </g>
                )}
              </g>
            </g>
          );
        })}
      </g>
    );
  };

  // --- RENDER HUD CALLOUTS & TELEMETRY ---
  const renderCallouts = (callouts?: CalloutSpec[], bodies?: BodySpec[]) => {
    if (!callouts || callouts.length === 0) return null;

    return (
      <g id="kinetic-callouts">
        {callouts.map((c, idx) => {
          // Resolve target coordinate (either Coordinate2D or body ID)
          let tx = cx;
          let ty = cy;
          if (typeof c.target === "string") {
            const b = bodies?.find((item) => item.id === c.target);
            tx = cx + (b?.position?.x ?? 0);
            ty = cy + (b?.position?.y ?? 0);
          } else if (c.target) {
            tx = cx + c.target.x;
            ty = cy + c.target.y;
          }

          // Text box position offset
          const ox = c.offset?.x ?? 180;
          const oy = c.offset?.y ?? -120;
          const boxX = tx + ox;
          const boxY = ty + oy;

          // Reveal animation
          const startFrame = c.revealFrame ?? idx * 15;
          const reveal = spring({
            frame: frame - startFrame,
            fps,
            config: { damping: 18, stiffness: 120 },
          });
          const opacity = interpolate(reveal, [0, 1], [0, 1]);
          const scale = interpolate(reveal, [0, 1], [0.85, 1]);

          const cColor = c.color ?? accentColor;

          return (
            <g
              key={c.id}
              id={`callout-${c.id}`}
              opacity={opacity}
              transform={`scale(${scale})`}
              style={{ transformOrigin: `${tx}px ${ty}px` }}
            >
              {/* Target pin on object */}
              <circle cx={tx} cy={ty} r={4} fill={cColor} />
              <circle cx={tx} cy={ty} r={8} fill="none" stroke={cColor} strokeWidth={1.5} opacity={0.6} />

              {/* Connecting line (Elbow or Straight) */}
              <polyline
                points={`${tx},${ty} ${tx + ox * 0.4},${ty + oy} ${boxX},${boxY}`}
                fill="none"
                stroke={cColor}
                strokeWidth={1.8}
                strokeDasharray="4 3"
              />

              {/* Telemetry Card Box */}
              <g transform={`translate(${boxX}, ${boxY - 45})`}>
                <rect
                  width={260}
                  height={80}
                  rx={8}
                  fill="rgba(15, 23, 42, 0.88)"
                  stroke={cColor}
                  strokeWidth={1.5}
                />
                <text
                  x={16}
                  y={26}
                  fill={textColor}
                  fontSize={14}
                  fontWeight={700}
                  fontFamily="Space Grotesk, sans-serif"
                  letterSpacing={1.2}
                >
                  {c.title.toUpperCase()}
                </text>
                {c.value && (
                  <text
                    x={16}
                    y={52}
                    fill={cColor}
                    fontSize={22}
                    fontWeight={800}
                    fontFamily="Space Grotesk, sans-serif"
                  >
                    {c.value} {c.unit ? <tspan fontSize={14} fill={textColor}>{c.unit}</tspan> : null}
                  </text>
                )}
                {c.subtext && (
                  <text
                    x={16}
                    y={70}
                    fill="rgba(248, 250, 252, 0.65)"
                    fontSize={11}
                    fontFamily="Space Grotesk, sans-serif"
                  >
                    {c.subtext}
                  </text>
                )}
              </g>
            </g>
          );
        })}
      </g>
    );
  };

  // --- RENDER SCALE RULER ---
  const renderScaleRuler = () => {
    if (!spec.scaleRuler?.enabled) return null;
    const ruler = spec.scaleRuler;
    const rx = ruler.position === "bottom-right" ? width - ruler.pixelLength - 100 : 100;
    const ry = height - 80;

    return (
      <g id="kinetic-scale-ruler" transform={`translate(${rx}, ${ry})`}>
        <line x1={0} y1={0} x2={ruler.pixelLength} y2={0} stroke={ruler.color ?? textColor} strokeWidth={2.5} />
        <line x1={0} y1={-6} x2={0} y2={6} stroke={ruler.color ?? textColor} strokeWidth={2.5} />
        <line x1={ruler.pixelLength} y1={-6} x2={ruler.pixelLength} y2={6} stroke={ruler.color ?? textColor} strokeWidth={2.5} />
        <text
          x={ruler.pixelLength / 2}
          y={-12}
          fill={ruler.color ?? textColor}
          fontSize={14}
          fontWeight={600}
          fontFamily="Space Grotesk, sans-serif"
          textAnchor="middle"
        >
          {ruler.label}
        </text>
      </g>
    );
  };

  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{
          width: "100%",
          height: "100%",
          transform: `scale(${zoomFactor}) translate(${camPanX}px, ${camPanY}px)`,
          transformOrigin: "center center",
        }}
      >
        <defs>
          {/* Nebula Radial Gradient */}
          <radialGradient id="nebula-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={accentColor} stopOpacity={0.35} />
            <stop offset="60%" stopColor="#6366F1" stopOpacity={0.12} />
            <stop offset="100%" stopColor="#0F172A" stopOpacity={0} />
          </radialGradient>

          {/* Planetary Shading Gradients for each body */}
          {spec.bodies?.map((b) => (
            <React.Fragment key={`defs-${b.id}`}>
              <radialGradient id={`planet-shading-${b.id}`} cx="35%" cy="30%" r="70%">
                <stop offset="0%" stopColor={b.accentColor ?? "#FFFFFF"} stopOpacity={0.9} />
                <stop offset="35%" stopColor={b.primaryColor} stopOpacity={1.0} />
                <stop offset="85%" stopColor="#090D16" stopOpacity={1.0} />
                <stop offset="100%" stopColor="#020408" stopOpacity={1.0} />
              </radialGradient>
              <clipPath id={`sphere-clip-${b.id}`}>
                <circle cx={0} cy={0} r={b.radius} />
              </clipPath>
            </React.Fragment>
          ))}

          {/* Glow filter */}
          <filter id={glowFilterId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={6} result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Arrow Head Marker for Vectors */}
          <marker id="arrow-head" markerWidth={8} markerHeight={8} refX={5} refY={3} orient="auto">
            <path d="M0,0 L0,6 L6,3 Z" fill={accentColor} />
          </marker>
        </defs>

        {/* Layer 1: Space & Environment */}
        {renderEnvironment()}

        {/* Layer 2: Magnetic Fields, Solar Wind & Vectors */}
        {renderFields(spec.fields, spec.bodies)}

        {/* Layer 3: Celestial Bodies & Cutaways */}
        {renderBodies(spec.bodies)}

        {/* Layer 4: HUD Callouts & Metrics */}
        {renderCallouts(spec.callouts, spec.bodies)}

        {/* Layer 5: Scale Ruler */}
        {renderScaleRuler()}
      </svg>

      {/* Title & Scientific Overlay Beat */}
      {(spec.title || spec.subtitle) && (
        <div
          style={{
            position: "absolute",
            top: 60,
            left: 80,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {spec.title && (
            <div
              style={{
                fontSize: 38,
                fontWeight: 800,
                color: textColor,
                fontFamily: "Space Grotesk, sans-serif",
                textTransform: "uppercase",
                letterSpacing: 2,
              }}
            >
              {spec.title}
            </div>
          )}
          {spec.subtitle && (
            <div
              style={{
                fontSize: 20,
                fontWeight: 500,
                color: accentColor,
                fontFamily: "Space Grotesk, sans-serif",
              }}
            >
              {spec.subtitle}
            </div>
          )}
        </div>
      )}
    </AbsoluteFill>
  );
};

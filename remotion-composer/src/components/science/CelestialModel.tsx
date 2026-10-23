import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

export interface SatelliteConfig {
  enabled: boolean;
  name?: string;
  distance?: number;
  orbitSpeed?: number;
  color?: string;
  size?: number;
}

export interface CelestialModelProps {
  bodyName?: string;
  baseRadius?: number;
  tiltAngle?: number;
  tiltMin?: number;
  tiltMax?: number;
  wobbleMode?: "none" | "chaotic" | "steady";
  spinSpeed?: number;
  primaryColor?: string;
  accentColor?: string;
  satellite?: SatelliteConfig;
  showAxes?: boolean;
  showGrid?: boolean;
  size?: number;
}

export const CelestialModel: React.FC<CelestialModelProps> = ({
  bodyName = "earth",
  baseRadius = 60,
  tiltAngle = 23.5,
  tiltMin = 0,
  tiltMax = 85,
  wobbleMode = "steady",
  spinSpeed = 1.0,
  primaryColor = "#38BDF8",
  accentColor = "#34D399",
  satellite,
  showAxes = true,
  showGrid = true,
  size = 250,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // Calculate axial tilt angle
  let currentTilt = tiltAngle;
  if (wobbleMode === "chaotic") {
    // Multi-harmonic chaotic oscillation simulating an unstable gyroscope
    const h1 = Math.sin(t * 2.7) * 30;
    const h2 = Math.sin(t * 5.1 + 1.2) * 20;
    const h3 = Math.cos(t * 1.9) * 12;
    const raw = 40 + h1 + h2 + h3;
    currentTilt = Math.max(tiltMin, Math.min(tiltMax, raw));
  } else if (wobbleMode === "steady") {
    // Gentle stable precession around steady tilt (e.g. 23.5 deg)
    currentTilt = tiltAngle + Math.sin(t * 1.2) * 0.6;
  }

  // Planet spin offset
  const spinOffset = (frame * spinSpeed * 1.8) % 140;

  // Orbiting satellite (Moon)
  const satEnabled = Boolean(satellite && satellite.enabled);
  const satDist = satellite?.distance ?? 105;
  const satSpeed = satellite?.orbitSpeed ?? 1.0;
  const satSize = satellite?.size ?? 12;
  const satColor = satellite?.color ?? "#E2E8F0";

  // Elliptical orbit angle
  const orbitAngle = satEnabled ? (t * satSpeed * 1.6) % (Math.PI * 2) : 0;
  const satX = Math.cos(orbitAngle) * satDist;
  const satY = Math.sin(orbitAngle) * (satDist * 0.38);
  const satIsBehind = Math.sin(orbitAngle) < 0;

  const planetGradientId = `planet-grad-${bodyName}-${wobbleMode}`;
  const atmosphereGlowId = `atmo-glow-${bodyName}-${wobbleMode}`;

  // Unique rendering of satellite
  const renderSatellite = () => {
    if (!satEnabled) return null;
    return (
      <g transform={`translate(${satX}, ${satY})`}>
        {/* Moon glow */}
        <circle r={satSize + 4} fill={satColor} opacity={0.2} />
        {/* Moon body */}
        <circle
          r={satSize}
          fill={satColor}
          stroke="rgba(0,0,0,0.4)"
          strokeWidth={1}
        />
        {/* Moon small crater detailing */}
        <circle cx={-satSize * 0.3} cy={-satSize * 0.2} r={satSize * 0.25} fill="rgba(0,0,0,0.18)" />
        <circle cx={satSize * 0.25} cy={satSize * 0.25} r={satSize * 0.2} fill="rgba(0,0,0,0.18)" />
        {/* Gravity tether to Earth */}
        <line
          x1={0}
          y1={0}
          x2={-satX}
          y2={-satY}
          stroke={accentColor}
          strokeDasharray="2,3"
          strokeWidth={1}
          opacity={0.35}
        />
      </g>
    );
  };

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="-110 -110 220 220"
        style={{ overflow: "visible" }}
      >
        <defs>
          {/* Planetary radial gradient */}
          <radialGradient
            id={planetGradientId}
            cx="35%"
            cy="35%"
            r="65%"
          >
            <stop offset="0%" stopColor={wobbleMode === "chaotic" ? "#C084FC" : "#67E8F9"} />
            <stop offset="45%" stopColor={wobbleMode === "chaotic" ? "#7C3AED" : "#0284C7"} />
            <stop offset="85%" stopColor={wobbleMode === "chaotic" ? "#3B0764" : "#0F172A"} />
            <stop offset="100%" stopColor="#020617" />
          </radialGradient>

          {/* Atmosphere outer glow */}
          <filter id={atmosphereGlowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Orbit ellipse (if satellite active) */}
        {satEnabled && (
          <ellipse
            cx={0}
            cy={0}
            rx={satDist}
            ry={satDist * 0.38}
            fill="none"
            stroke="rgba(255, 255, 255, 0.16)"
            strokeDasharray="4,4"
            strokeWidth={1.2}
          />
        )}

        {/* Render satellite behind planet if orbit is on far side */}
        {satIsBehind && renderSatellite()}

        {/* Vertical True-North reference line (faint dashed) */}
        {showAxes && (
          <line
            x1={0}
            y1={-baseRadius - 38}
            x2={0}
            y2={baseRadius + 38}
            stroke="rgba(255, 255, 255, 0.22)"
            strokeDasharray="3,3"
            strokeWidth={1}
          />
        )}

        {/* Wobble cone arc (shows chaos range when wobbling) */}
        {wobbleMode === "chaotic" && (
          <path
            d={`M 0 ${-baseRadius - 30} A ${baseRadius + 30} ${baseRadius + 30} 0 0 1 ${
              Math.sin((tiltMax * Math.PI) / 180) * (baseRadius + 30)
            } ${-Math.cos((tiltMax * Math.PI) / 180) * (baseRadius + 30)}`}
            fill="none"
            stroke={primaryColor}
            strokeWidth={1.5}
            strokeDasharray="2,3"
            opacity={0.6}
          />
        )}

        {/* Tilted Rotating Planet Group */}
        <g transform={`rotate(${currentTilt})`}>
          {/* Axis Line piercing through poles */}
          {showAxes && (
            <g>
              <line
                x1={0}
                y1={-baseRadius - 32}
                x2={0}
                y2={baseRadius + 32}
                stroke={wobbleMode === "chaotic" ? "#F43F5E" : accentColor}
                strokeWidth={2.4}
                strokeLinecap="round"
              />
              {/* North pole arrow tip */}
              <polygon
                points={`0,${-baseRadius - 38} -4,${-baseRadius - 28} 4,${-baseRadius - 28}`}
                fill={wobbleMode === "chaotic" ? "#F43F5E" : accentColor}
              />
              {/* South pole indicator */}
              <circle
                cx={0}
                cy={baseRadius + 32}
                r={2.5}
                fill={wobbleMode === "chaotic" ? "#F43F5E" : accentColor}
              />
            </g>
          )}

          {/* Planet Atmosphere Glow */}
          <circle
            cx={0}
            cy={0}
            r={baseRadius + 2}
            fill="none"
            stroke={primaryColor}
            strokeWidth={2}
            opacity={0.4}
            filter={`url(#${atmosphereGlowId})`}
          />

          {/* Planet Sphere */}
          <circle
            cx={0}
            cy={0}
            r={baseRadius}
            fill={`url(#${planetGradientId})`}
            stroke="rgba(255, 255, 255, 0.15)"
            strokeWidth={1.2}
          />

          {/* Latitude & Equator grid lines */}
          {showGrid && (
            <g opacity={0.35} stroke="rgba(255, 255, 255, 0.4)" strokeWidth={1} fill="none">
              {/* Equator */}
              <line x1={-baseRadius} y1={0} x2={baseRadius} y2={0} strokeWidth={1.4} stroke={primaryColor} />
              {/* Mid latitudes */}
              <ellipse cx={0} cy={-baseRadius * 0.45} rx={baseRadius * 0.88} ry={baseRadius * 0.18} />
              <ellipse cx={0} cy={baseRadius * 0.45} rx={baseRadius * 0.88} ry={baseRadius * 0.18} />
            </g>
          )}

          {/* Rotating surface features (continents / bands drifting) */}
          <g clipPath={`url(#planet-clip-${bodyName})`}>
            <clipPath id={`planet-clip-${bodyName}`}>
              <circle cx={0} cy={0} r={baseRadius - 1} />
            </clipPath>
            {/* Drifting curved bands representing continents / cloud swirls */}
            <g transform={`translate(${spinOffset - 70}, 0)`} opacity={0.3}>
              <path
                d={`M -40 -20 Q -10 -35 20 -15 Q 50 5 80 -10 Q 110 -25 140 -5 Q 170 15 200 0 L 200 30 Q 150 40 100 20 Q 50 10 0 25 Z`}
                fill={primaryColor}
              />
              <path
                d={`M -60 15 Q -20 5 20 20 Q 60 35 100 15 Q 140 0 180 20 L 180 40 Q 120 50 60 35 Q 0 20 -60 40 Z`}
                fill={accentColor}
              />
            </g>
          </g>
        </g>

        {/* Render satellite in front of planet when orbit is on near side */}
        {!satIsBehind && renderSatellite()}

        {/* Live angle readout badge */}
        <g transform="translate(0, 88)">
          <rect
            x={-34}
            y={-12}
            width={68}
            height={22}
            rx={11}
            fill="rgba(15, 23, 42, 0.85)"
            stroke={wobbleMode === "chaotic" ? "#F43F5E" : accentColor}
            strokeWidth={1}
          />
          <text
            x={0}
            y={3}
            textAnchor="middle"
            fill="#F8FAFC"
            fontSize={11}
            fontWeight="bold"
            fontFamily="monospace"
          >
            {`${Math.round(currentTilt * 10) / 10}°`}
          </text>
        </g>
      </svg>
    </div>
  );
};

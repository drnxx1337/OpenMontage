import React, { useMemo } from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import * as d3Geo from "d3-geo";
import * as topojson from "topojson-client";
import worldData from "world-atlas/countries-110m.json";

export interface GeoTimelinePoint {
  year: number;
  label?: string;
  count?: number;
  coordinates?: [number, number];
}

export interface GeoMapSceneProps {
  title?: string;
  region?: string;
  biome?: string;
  coordinates?: [number, number]; // [latitude, longitude]
  zoom?: number;
  species?: string;
  timeline?: GeoTimelinePoint[];
  rangePoints?: Array<any>;
  accentColor?: string;
  primaryColor?: string;
  textColor?: string;
  backgroundColor?: string;
  fontFamily?: string;
}

export const GeoMapScene: React.FC<GeoMapSceneProps> = ({
  title = "Zasięg Występowania",
  region = "Obszar Badawczy",
  biome = "Siedlisko Naturalne",
  coordinates = [45.5, 136.0],
  zoom = 3.5,
  species,
  timeline = [],
  rangePoints = [],
  accentColor = "#38BDF8",
  primaryColor = "#10B981",
  textColor = "#F8FAFC",
  backgroundColor = "transparent",
  fontFamily = "Inter, system-ui, sans-serif",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Normalize coordinates: [lat, lon] -> lon for X, lat for Y
  const lat = coordinates && coordinates.length >= 2 ? coordinates[0] : 45.0;
  const lon = coordinates && coordinates.length >= 2 ? coordinates[1] : 135.0;

  // Spring animation for smooth zoom-in
  const zoomSpring = spring({
    frame,
    fps,
    config: { damping: 22, stiffness: 70 },
    from: 0.75,
    to: 1.0,
  });

  const baseScale = 260 * Math.max(1.0, zoom) * zoomSpring;

  // Convert TopoJSON to GeoJSON features
  const countriesGeo = useMemo(() => {
    try {
      const atlas = worldData as any;
      if (atlas && atlas.objects && atlas.objects.countries) {
        return topojson.feature(atlas, atlas.objects.countries) as any;
      }
    } catch {
      // Fallback if topojson conversion fails
    }
    return { type: "FeatureCollection", features: [] };
  }, []);

  // Setup d3 projection centered on target coordinates
  const projection = useMemo(() => {
    return d3Geo
      .geoNaturalEarth1()
      .scale(baseScale)
      .center([0, 0])
      .rotate([-lon, -lat, 0])
      .translate([1050, 540]);
  }, [baseScale, lon, lat]);

  const pathGenerator = useMemo(() => {
    return d3Geo.geoPath().projection(projection);
  }, [projection]);

  // Projected target point [x, y]
  const targetPoint = useMemo(() => {
    return projection([lon, lat]) || [1050, 540];
  }, [projection, lon, lat]);

  // Continuous subtle pulse animation (period = 2.0s)
  const pulseLoop = (frame % (fps * 2)) / (fps * 2);
  const pulseRadius = interpolate(pulseLoop, [0, 1], [10, 75]);
  const pulseOpacity = interpolate(pulseLoop, [0, 0.7, 1], [0.85, 0.35, 0]);

  // Card reveal animation
  const cardSpring = spring({
    frame: frame - 6,
    fps,
    config: { damping: 18, stiffness: 90 },
  });
  const cardOpacity = interpolate(cardSpring, [0, 1], [0, 1]);
  const cardSlide = interpolate(cardSpring, [0, 1], [-25, 0]);

  // Secondary ambient slow drift
  const driftX = Math.sin(frame / (fps * 4)) * 8;
  const driftY = Math.cos(frame / (fps * 5)) * 6;

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        fontFamily,
        color: textColor,
        overflow: "hidden",
      }}
    >
      {/* SVG Map Layer */}
      <svg
        viewBox="0 0 1920 1080"
        style={{
          width: "100%",
          height: "100%",
          position: "absolute",
          inset: 0,
          transform: `translate(${driftX}px, ${driftY}px)`,
        }}
      >
        <defs>
          <filter id="geo-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="target-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.7" />
            <stop offset="60%" stopColor={accentColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Graticule grid lines for scientific cartography feel */}
        <g opacity={0.15}>
          {[-60, -30, 0, 30, 60].map((glat) => {
            const p = pathGenerator(d3Geo.geoGraticule().lines()[0] as any);
            return p ? (
              <path
                key={`g-${glat}`}
                d={p}
                fill="none"
                stroke={textColor}
                strokeWidth={1}
                strokeDasharray="4 6"
              />
            ) : null;
          })}
        </g>

        {/* Countries paths */}
        <g>
          {countriesGeo.features &&
            countriesGeo.features.map((feature: any, idx: number) => {
              const d = pathGenerator(feature);
              if (!d) return null;
              return (
                <path
                  key={`country-${idx}`}
                  d={d}
                  fill="rgba(30, 41, 59, 0.75)"
                  stroke="rgba(148, 163, 184, 0.35)"
                  strokeWidth={1.2}
                />
              );
            })}
        </g>

        {/* Target Habitat Radiating Halo */}
        <circle
          cx={targetPoint[0]}
          cy={targetPoint[1]}
          r={pulseRadius}
          fill="none"
          stroke={accentColor}
          strokeWidth={2.5}
          opacity={pulseOpacity}
        />
        <circle
          cx={targetPoint[0]}
          cy={targetPoint[1]}
          r={45}
          fill="url(#target-halo)"
        />

        {/* Central glowing coordinate dot */}
        <circle
          cx={targetPoint[0]}
          cy={targetPoint[1]}
          r={7}
          fill={accentColor}
          filter="url(#geo-glow)"
        />
        <circle
          cx={targetPoint[0]}
          cy={targetPoint[1]}
          r={3}
          fill="#FFFFFF"
        />

        {/* Range boundary simulation if points provided */}
        {rangePoints && rangePoints.length > 1 && (
          <polygon
            points={rangePoints
              .map((pt) => {
                const c = projection([pt.lon || pt[1] || lon, pt.lat || pt[0] || lat]);
                return c ? `${c[0]},${c[1]}` : "";
              })
              .filter(Boolean)
              .join(" ")}
            fill={accentColor}
            fillOpacity={0.18}
            stroke={accentColor}
            strokeWidth={2}
            strokeDasharray="6 4"
          />
        )}
      </svg>

      {/* Floating Glassmorphism Data HUD (Left Side) */}
      <div
        style={{
          position: "absolute",
          left: 80,
          top: 140,
          width: 520,
          background: "rgba(15, 23, 42, 0.82)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: 20,
          padding: "36px 40px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.65)",
          opacity: cardOpacity,
          transform: `translateY(${cardSlide}px)`,
        }}
      >
        {/* Category Pill */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 14px",
            borderRadius: 9999,
            background: `rgba(${accentColor === "#38BDF8" ? "56, 189, 248" : "16, 185, 129"}, 0.18)`,
            border: `1px solid ${accentColor}`,
            fontSize: 13,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: accentColor,
            marginBottom: 16,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: accentColor,
              boxShadow: `0 0 10px ${accentColor}`,
            }}
          />
          Biogeografia & Siedlisko
        </div>

        {/* Main Title */}
        <h2
          style={{
            margin: "0 0 10px 0",
            fontSize: 34,
            fontWeight: 800,
            color: textColor,
            lineHeight: 1.15,
          }}
        >
          {title}
        </h2>

        {/* Species Tag if available */}
        {species && (
          <div
            style={{
              fontSize: 18,
              fontStyle: "italic",
              color: accentColor,
              marginBottom: 18,
              opacity: 0.9,
            }}
          >
            {species}
          </div>
        )}

        {/* Region & Biome Info */}
        <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              paddingBottom: 10,
            }}
          >
            <span style={{ fontSize: 15, color: "rgba(226, 232, 240, 0.7)" }}>Region</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF" }}>{region}</span>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              paddingBottom: 10,
            }}
          >
            <span style={{ fontSize: 15, color: "rgba(226, 232, 240, 0.7)" }}>Biom</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: primaryColor }}>{biome}</span>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              paddingTop: 2,
            }}
          >
            <span style={{ fontSize: 15, color: "rgba(226, 232, 240, 0.7)" }}>Współrzędne</span>
            <span
              style={{
                fontSize: 15,
                fontFamily: "monospace",
                fontWeight: 600,
                color: accentColor,
              }}
            >
              {lat >= 0 ? `${lat.toFixed(2)}°N` : `${Math.abs(lat).toFixed(2)}°S`},{" "}
              {lon >= 0 ? `${lon.toFixed(2)}°E` : `${Math.abs(lon).toFixed(2)}°W`}
            </span>
          </div>
        </div>

        {/* Range Points Badges */}
        {rangePoints && rangePoints.length > 0 && (
          <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
            {rangePoints.map((pt: any, idx: number) => {
              const label = pt.label || pt.name || pt.region;
              if (!label) return null;
              return (
                <div
                  key={idx}
                  style={{
                    fontSize: 12,
                    padding: "4px 10px",
                    borderRadius: 6,
                    background: pt.highlight ? "rgba(56, 189, 248, 0.18)" : "rgba(255, 255, 255, 0.05)",
                    border: `1px solid ${pt.highlight ? accentColor : "rgba(255, 255, 255, 0.1)"}`,
                    color: pt.highlight ? accentColor : "#E2E8F0",
                  }}
                >
                  <span style={{ fontWeight: pt.highlight ? 700 : 500 }}>{label}</span>
                  {pt.detail ? <span style={{ opacity: 0.75 }}> · {pt.detail}</span> : null}
                </div>
              );
            })}
          </div>
        )}

        {/* Timeline badge if timeline data exists */}
        {timeline && timeline.length > 0 && (
          <div
            style={{
              marginTop: 22,
              padding: "12px 16px",
              background: "rgba(30, 41, 59, 0.6)",
              borderRadius: 12,
              border: "1px solid rgba(255, 255, 255, 0.06)",
              fontSize: 13,
              color: "#CBD5E1",
            }}
          >
            <span style={{ fontWeight: 700, color: accentColor }}>Ekspansja: </span>
            {timeline[0].year} → {timeline[timeline.length - 1].year} ({timeline[timeline.length - 1].label || "Obserwacja"})
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

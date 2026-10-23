import React from "react";
import { CelestialModel, SatelliteConfig } from "./CelestialModel";

export interface VisualModelConfig {
  archetype?: "celestial_axial_tilt" | "celestial_model" | "dynamic_balance" | "icon_physics";
  body?: string;
  wobble?: "none" | "chaotic" | "steady";
  tilt?: number;
  tilt_min?: number;
  tilt_max?: number;
  moon?: boolean;
  satellite?: SatelliteConfig;
  spin_speed?: number;
  primary_color?: string;
  accent_color?: string;
  // Dynamic balance archetype
  balance_ratio?: number; // -1 (left heavy) to +1 (right heavy)
  // Icon physics archetype
  icon_name?: string;
  physics?: "shake" | "pulse" | "spin" | "float";
}

export interface CognitiveVisualWidgetProps {
  config?: VisualModelConfig;
  defaultColor?: string;
  accentColor?: string;
  size?: number;
}

export const CognitiveVisualWidget: React.FC<CognitiveVisualWidgetProps> = ({
  config,
  defaultColor = "#38BDF8",
  accentColor = "#34D399",
  size = 250,
}) => {
  if (!config) return null;

  const arch = config.archetype || "celestial_axial_tilt";

  if (arch === "celestial_axial_tilt" || arch === "celestial_model") {
    const satConfig: SatelliteConfig | undefined = config.satellite
      ? config.satellite
      : config.moon
      ? { enabled: true, name: "moon", distance: 105, orbitSpeed: 1.0, size: 12, color: "#E2E8F0" }
      : undefined;

    return (
      <CelestialModel
        bodyName={config.body || "earth"}
        tiltAngle={config.tilt ?? 23.5}
        tiltMin={config.tilt_min ?? 0}
        tiltMax={config.tilt_max ?? 85}
        wobbleMode={config.wobble || "steady"}
        spinSpeed={config.spin_speed ?? 1.0}
        primaryColor={config.primary_color || defaultColor}
        accentColor={config.accent_color || accentColor}
        satellite={satConfig}
        size={size}
      />
    );
  }

  // Fallback / default celestial view if archetype matches celestial concepts
  return (
    <CelestialModel
      bodyName={config.body || "earth"}
      tiltAngle={config.tilt ?? 23.5}
      wobbleMode={config.wobble || "steady"}
      primaryColor={defaultColor}
      accentColor={accentColor}
      size={size}
    />
  );
};

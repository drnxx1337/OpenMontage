/**
 * Type definitions for the Agentic Kinetic Remotion Engine.
 * Universal declarative JSON contract for scientific & astronomical animations.
 */

export type EasingMode = "spring" | "smooth" | "linear";

export interface Coordinate2D {
  x: number;
  y: number;
}

export interface EnvironmentSpec {
  backgroundStyle?: "space" | "dark_nebula" | "deep_void" | "grid_blueprint" | "solar_plasma";
  starfield?: boolean;
  starCount?: number;
  nebula?: {
    enabled: boolean;
    colorPrimary?: string;
    colorSecondary?: string;
    opacity?: number;
  };
  grid?: {
    enabled: boolean;
    type?: "polar" | "cartesian" | "isometric";
    color?: string;
    opacity?: number;
    spacing?: number;
  };
}

export interface CutawayLayer {
  name: string;
  depthRatio: number; // 0.0 (center) to 1.0 (surface)
  color: string;
  label?: string;
  hatchPattern?: boolean;
  opacity?: number;
}

export interface BodyCutawaySpec {
  enabled: boolean;
  angleDeg?: number; // e.g. 90 (quarter wedge cut) or 180 (half section)
  layers: CutawayLayer[];
  dynamoEffect?: boolean; // animated dynamo convection loops in core
  showLabels?: boolean;
}

export interface PlanetaryRingsSpec {
  innerRadius: number;
  outerRadius: number;
  tiltDeg: number;
  color?: string;
  opacity?: number;
}

export interface BodySpec {
  id: string;
  name?: string;
  position?: Coordinate2D; // center offset relative to frame center (0, 0)
  radius: number;
  bodyType?: "terrestrial" | "gas_giant" | "star" | "black_hole" | "moon" | "core_cutaway";
  primaryColor: string;
  accentColor?: string;
  atmosphereColor?: string;
  atmosphereGlow?: boolean;
  glowRadiusMultiplier?: number;
  tiltDeg?: number; // axial tilt angle (e.g. 23.5 for Earth)
  rotationSpeed?: number; // spin rate multiplier (1.0 = normal)
  wobble?: "none" | "steady" | "chaotic";
  craters?: boolean;
  rings?: PlanetaryRingsSpec;
  bands?: string[]; // for gas giant latitudinal bands
  cutaway?: BodyCutawaySpec;
}

export interface DipoleFieldSpec {
  enabled: boolean;
  poleTiltDeg?: number; // angle of magnetic pole relative to rotation axis
  loopsCount?: number; // number of magnetic field loops
  intensity?: number; // size / reach of dipole loops
  color?: string;
  pulsing?: boolean;
}

export interface SolarWindSpec {
  enabled: boolean;
  direction?: "left_to_right" | "right_to_left" | "top_to_bottom";
  particleCount?: number;
  speed?: number;
  bowShockRadius?: number; // standoff distance of bow shock in px
  magnetopauseWidth?: number;
  deflectionCurvature?: number; // arc factor around magnetopause
  color?: string;
}

export interface ForceVectorSpec {
  id: string;
  from: Coordinate2D;
  to: Coordinate2D;
  label: string;
  color?: string;
  dashed?: boolean;
}

export interface FieldSpec {
  type?: "magnetic_dipole" | "solar_wind_interaction" | "gravitational_well" | "particle_stream" | "none";
  dipole?: DipoleFieldSpec;
  solarWind?: SolarWindSpec;
  forceVectors?: ForceVectorSpec[];
}

export interface CameraSpec {
  mode?: "static" | "zoom_in" | "zoom_out" | "pan_horizontal" | "orbital_drift";
  zoomFrom?: number;
  zoomTo?: number;
  targetOffset?: Coordinate2D;
  easing?: EasingMode;
}

export interface CalloutSpec {
  id: string;
  target: Coordinate2D | string; // coordinate or body ID
  title: string;
  value?: string;
  unit?: string;
  subtext?: string;
  offset?: Coordinate2D; // offset for text box from target
  lineType?: "elbow" | "straight" | "bracket";
  color?: string;
  revealFrame?: number; // frame index when callout animates in
}

export interface ScaleRulerSpec {
  enabled: boolean;
  label: string; // e.g. "10,000 km"
  pixelLength: number; // width in pixels
  position?: "bottom-left" | "bottom-right" | "top-right";
  color?: string;
}

export interface KineticSceneSpec {
  theme?: "cosmic_dark" | "scientific_clean" | "solar_fire" | "deep_void";
  title?: string;
  subtitle?: string;
  environment?: EnvironmentSpec;
  bodies?: BodySpec[];
  fields?: FieldSpec;
  camera?: CameraSpec;
  callouts?: CalloutSpec[];
  scaleRuler?: ScaleRulerSpec;
}

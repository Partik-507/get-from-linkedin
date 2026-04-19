/**
 * focusAnimationLibrary — overlay animations the user can layer onto
 * any focus theme. Pure CSS / canvas — no external assets.
 */

export type AnimationKey =
  | "none"
  | "snow"
  | "rain"
  | "blossom"
  | "leaves"
  | "fireflies"
  | "dust"
  | "aurora"
  | "stars"
  | "meteors"
  | "bubbles"
  | "smoke"
  | "embers"
  | "fog"
  | "lightning"
  | "candle"
  | "ocean-ripple"
  | "galaxy"
  | "neon-pulse"
  | "gradient-drift";

export interface AnimationDef {
  key: AnimationKey;
  label: string;
  emoji: string;
  /** Inline CSS gradient used as preview thumbnail */
  preview: string;
  /** Maps to SceneEngine overlay type when supported */
  overlayType?: string;
  intensity?: number;
}

export const FOCUS_ANIMATIONS: AnimationDef[] = [
  { key: "none",           label: "None",            emoji: "⬛", preview: "linear-gradient(135deg,#1a1a1a,#000)" },
  { key: "snow",           label: "Snow",            emoji: "❄️", preview: "linear-gradient(135deg,#cfd8dc,#37474f)", overlayType: "snow",            intensity: 0.55 },
  { key: "rain",           label: "Rain",            emoji: "🌧️", preview: "linear-gradient(135deg,#37474f,#0d1b2a)", overlayType: "rain",            intensity: 0.6 },
  { key: "blossom",        label: "Cherry Blossom",  emoji: "🌸", preview: "linear-gradient(135deg,#f8bbd0,#7a2d4a)", overlayType: "blossom",         intensity: 0.5 },
  { key: "leaves",         label: "Autumn Leaves",   emoji: "🍂", preview: "linear-gradient(135deg,#bf6a1f,#5a2c08)", overlayType: "leaves",          intensity: 0.5 },
  { key: "fireflies",      label: "Fireflies",       emoji: "✨", preview: "linear-gradient(135deg,#1a1f3a,#000)",   overlayType: "fireflies",       intensity: 0.4 },
  { key: "dust",           label: "Dust Motes",      emoji: "💫", preview: "linear-gradient(135deg,#3a2818,#0a0500)", overlayType: "dust",            intensity: 0.4 },
  { key: "aurora",         label: "Aurora",          emoji: "🌌", preview: "linear-gradient(135deg,#22c55e,#3b82f6)", overlayType: "gradient-drift", intensity: 0.6 },
  { key: "stars",          label: "Starfield",       emoji: "⭐", preview: "linear-gradient(135deg,#0d1b2a,#000)",   overlayType: "fireflies",       intensity: 0.6 },
  { key: "meteors",        label: "Meteor Shower",   emoji: "☄️", preview: "linear-gradient(135deg,#1a0a4a,#000)",   overlayType: "rain",            intensity: 0.2 },
  { key: "bubbles",        label: "Bubbles",         emoji: "🫧", preview: "linear-gradient(135deg,#a5d8e7,#1c5d7a)", overlayType: "fireflies",       intensity: 0.3 },
  { key: "smoke",          label: "Smoke",           emoji: "💨", preview: "linear-gradient(135deg,#616161,#1c1c1c)", overlayType: "gradient-drift", intensity: 0.4 },
  { key: "embers",         label: "Embers",          emoji: "🔥", preview: "linear-gradient(135deg,#ff6f00,#3e1b00)", overlayType: "candle",          intensity: 0.6 },
  { key: "fog",            label: "Fog Drift",       emoji: "🌫️", preview: "linear-gradient(135deg,#b0bec5,#37474f)", overlayType: "gradient-drift", intensity: 0.5 },
  { key: "lightning",      label: "Lightning",       emoji: "⚡", preview: "linear-gradient(135deg,#fff,#1a1a3a)",   overlayType: "glow",            intensity: 0.3 },
  { key: "candle",         label: "Candle Flicker",  emoji: "🕯️", preview: "linear-gradient(135deg,#ff8a00,#3e1b00)", overlayType: "candle",          intensity: 0.5 },
  { key: "ocean-ripple",   label: "Ocean Ripple",    emoji: "🌊", preview: "linear-gradient(135deg,#0a3d62,#053355)", overlayType: "gradient-drift", intensity: 0.4 },
  { key: "galaxy",         label: "Galaxy Spiral",   emoji: "🌀", preview: "linear-gradient(135deg,#4527a0,#1a0a4a)", overlayType: "gradient-drift", intensity: 0.5 },
  { key: "neon-pulse",     label: "Neon Pulse",      emoji: "💡", preview: "linear-gradient(135deg,#e91e63,#7a0a30)", overlayType: "glow",            intensity: 0.45 },
  { key: "gradient-drift", label: "Gradient Drift",  emoji: "🎨", preview: "linear-gradient(135deg,#a855f7,#3b82f6)", overlayType: "gradient-drift", intensity: 0.5 },
];

export const getAnimation = (k: AnimationKey) =>
  FOCUS_ANIMATIONS.find((a) => a.key === k) || FOCUS_ANIMATIONS[0];

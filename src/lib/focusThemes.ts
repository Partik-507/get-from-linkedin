/**
 * Focus Theme registry — each theme = static high-quality background image
 * + lightweight code-driven overlays (snow, rain, particles, glow, blossom,
 * leaves, fireflies, gradient drift, candle flicker) + ambient audio.
 *
 * Animations are pure code so the only network payload per theme is the
 * base image and audio file, both cached locally via focusAssetCache for
 * fully offline playback after first use.
 */

export type OverlayType =
  | "snow"
  | "rain"
  | "dust"
  | "glow"
  | "blossom"
  | "leaves"
  | "fireflies"
  | "gradient-drift"
  | "candle";

export interface OverlayConfig {
  type: OverlayType;
  intensity?: number;          // 0..1   particle density
  speed?: number;              // 0..2   motion multiplier
  color?: string;              // CSS color override (defaults per type)
}

export interface FocusTheme {
  id: string;
  name: string;
  description: string;
  emoji: string;
  baseImage: string;
  overlays: OverlayConfig[];
  audio?: { url: string; label: string };
  perfProfile: "low" | "medium" | "high";
  custom?: boolean;
}

// ── Built-in theme pack ────────────────────────────────────────────────────
// All base images are royalty-free Unsplash URLs (cached on first load).
export const FOCUS_THEMES: FocusTheme[] = [
  {
    id: "lofi-room",
    name: "Lo-fi Room",
    description: "Rain on the window, warm desk lamp",
    emoji: "🎧",
    baseImage:
      "https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=1920&q=85",
    overlays: [
      { type: "rain", intensity: 0.6, speed: 1.0 },
      { type: "glow", intensity: 0.35, color: "rgba(255, 200, 120, 0.3)" },
    ],
    audio: { url: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3", label: "Lo-fi + Rain" },
    perfProfile: "medium",
  },
  {
    id: "night-city",
    name: "Night City",
    description: "City lights through a misty window",
    emoji: "🌃",
    baseImage:
      "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=1920&q=85",
    overlays: [
      { type: "gradient-drift", intensity: 0.4 },
      { type: "dust", intensity: 0.25, color: "rgba(180, 200, 255, 0.5)" },
    ],
    audio: { url: "https://cdn.pixabay.com/audio/2022/03/10/audio_4dedf5bf94.mp3", label: "City Ambience" },
    perfProfile: "low",
  },
  {
    id: "forest-morning",
    name: "Forest Morning",
    description: "Light filtering through trees",
    emoji: "🌲",
    baseImage:
      "https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&q=85",
    overlays: [
      { type: "fireflies", intensity: 0.4, speed: 0.6 },
      { type: "glow", intensity: 0.3, color: "rgba(255, 240, 180, 0.3)" },
    ],
    audio: { url: "https://cdn.pixabay.com/audio/2022/08/23/audio_d16737dc28.mp3", label: "Forest Birdsong" },
    perfProfile: "medium",
  },
  {
    id: "minimal-dark",
    name: "Minimal Dark",
    description: "Drifting gradient, deep focus",
    emoji: "🌑",
    baseImage:
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&q=85",
    overlays: [
      { type: "gradient-drift", intensity: 0.6, speed: 0.4 },
    ],
    audio: { url: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3", label: "Binaural Alpha" },
    perfProfile: "low",
  },
  {
    id: "warm-library",
    name: "Warm Library",
    description: "Lamp-lit shelves, candle flicker",
    emoji: "📚",
    baseImage:
      "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1920&q=85",
    overlays: [
      { type: "candle", intensity: 0.5 },
      { type: "dust", intensity: 0.3, color: "rgba(255, 220, 160, 0.6)" },
      { type: "glow", intensity: 0.3, color: "rgba(220, 180, 100, 0.25)" },
    ],
    audio: { url: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3", label: "Fireplace Crackle" },
    perfProfile: "low",
  },
  // Seasonal alternates
  {
    id: "snowy-cabin",
    name: "Snowy Cabin",
    description: "Falling snow outside a cosy cabin",
    emoji: "❄️",
    baseImage:
      "https://images.unsplash.com/photo-1483921020237-2ff51e8e4b22?w=1920&q=85",
    overlays: [
      { type: "snow", intensity: 0.55, speed: 0.8 },
      { type: "glow", intensity: 0.2, color: "rgba(180, 200, 255, 0.2)" },
    ],
    audio: { url: "https://cdn.pixabay.com/audio/2022/08/23/audio_d16737dc28.mp3", label: "Winter Wind" },
    perfProfile: "medium",
  },
  {
    id: "spring-blossom",
    name: "Spring Blossom",
    description: "Cherry blossoms drifting by",
    emoji: "🌸",
    baseImage:
      "https://images.unsplash.com/photo-1522383225653-ed111181a951?w=1920&q=85",
    overlays: [
      { type: "blossom", intensity: 0.5, speed: 0.7 },
      { type: "glow", intensity: 0.25, color: "rgba(255, 200, 220, 0.25)" },
    ],
    audio: { url: "https://cdn.pixabay.com/audio/2022/08/23/audio_d16737dc28.mp3", label: "Soft Chimes" },
    perfProfile: "medium",
  },
  {
    id: "autumn-study",
    name: "Autumn Study",
    description: "Falling leaves, golden light",
    emoji: "🍂",
    baseImage:
      "https://images.unsplash.com/photo-1507371341162-763b5e419408?w=1920&q=85",
    overlays: [
      { type: "leaves", intensity: 0.5, speed: 0.8 },
      { type: "glow", intensity: 0.3, color: "rgba(255, 180, 100, 0.3)" },
    ],
    audio: { url: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3", label: "Autumn Wind" },
    perfProfile: "medium",
  },
];

let dynamicThemes: FocusTheme[] = [];

export const setDynamicThemes = (themes: FocusTheme[]) => {
  dynamicThemes = themes;
};

export const getAllThemes = (): FocusTheme[] => [...FOCUS_THEMES, ...dynamicThemes];

export const getThemeById = (id: string): FocusTheme | undefined =>
  getAllThemes().find((t) => t.id === id);

export const DEFAULT_THEME_ID = "lofi-room";

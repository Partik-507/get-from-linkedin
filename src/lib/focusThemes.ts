/**
 * Focus Theme registry — each theme = static high-quality background image
 * + lightweight code-driven overlays (snow, rain, particles, glow) + audio.
 *
 * Animations are pure code (canvas particles + CSS), so the only network
 * payload is the base image and audio file, which are cached once via
 * focusAssetCache for fully offline playback.
 */

export type OverlayType = "snow" | "rain" | "dust" | "glow";

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
}

// Royalty-free Unsplash images (cached locally on first load)
export const FOCUS_THEMES: FocusTheme[] = [
  {
    id: "night-desk",
    name: "Night Desk",
    description: "Warm desk lamp, gentle glow",
    emoji: "🌙",
    baseImage: "https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=1920&q=80",
    overlays: [
      { type: "glow", intensity: 0.4, color: "rgba(255, 200, 120, 0.3)" },
      { type: "dust", intensity: 0.3 },
    ],
    audio: { url: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3", label: "Lo-fi Beats" },
    perfProfile: "low",
  },
  {
    id: "rainy-window",
    name: "Rainy Window",
    description: "Soft rain on a window",
    emoji: "🌧️",
    baseImage: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=1920&q=80",
    overlays: [
      { type: "rain", intensity: 0.7, speed: 1.0 },
    ],
    audio: { url: "https://cdn.pixabay.com/audio/2022/03/10/audio_4dedf5bf94.mp3", label: "Rain Sounds" },
    perfProfile: "medium",
  },
  {
    id: "snowy-cabin",
    name: "Snowy Cabin",
    description: "Falling snow outside a cosy cabin",
    emoji: "❄️",
    baseImage: "https://images.unsplash.com/photo-1483921020237-2ff51e8e4b22?w=1920&q=80",
    overlays: [
      { type: "snow", intensity: 0.5, speed: 0.8 },
      { type: "glow", intensity: 0.2, color: "rgba(180, 200, 255, 0.2)" },
    ],
    audio: { url: "https://cdn.pixabay.com/audio/2022/08/23/audio_d16737dc28.mp3", label: "Winter Wind" },
    perfProfile: "medium",
  },
  {
    id: "library",
    name: "Library",
    description: "Quiet bookshelves, paper texture",
    emoji: "📚",
    baseImage: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1920&q=80",
    overlays: [
      { type: "dust", intensity: 0.2 },
      { type: "glow", intensity: 0.25, color: "rgba(220, 180, 100, 0.2)" },
    ],
    audio: { url: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3", label: "Page Turns" },
    perfProfile: "low",
  },
  {
    id: "anime-cafe",
    name: "Anime Café",
    description: "Soft afternoon light, calm cafe",
    emoji: "☕",
    baseImage: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1920&q=80",
    overlays: [
      { type: "dust", intensity: 0.4, color: "rgba(255, 220, 180, 0.6)" },
      { type: "glow", intensity: 0.35, color: "rgba(255, 180, 120, 0.25)" },
    ],
    audio: { url: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3", label: "Café Ambient" },
    perfProfile: "medium",
  },
];

export const getThemeById = (id: string): FocusTheme | undefined =>
  FOCUS_THEMES.find((t) => t.id === id);

export const DEFAULT_THEME_ID = "night-desk";

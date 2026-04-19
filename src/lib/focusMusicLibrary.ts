/**
 * focusMusicLibrary — Curated 20-track ambient & focus music library.
 *
 * Tracks are royalty-free Pixabay CDN URLs (cached locally via focusAssetCache
 * on first play for fully offline listening). Each track is tagged by mood
 * and season so it pairs naturally with theme picks.
 */

export type MusicMood = "rain" | "nature" | "lofi" | "classical" | "binaural" | "noise" | "café" | "cosmic";
export type MusicSeason = "any" | "spring" | "summer" | "autumn" | "winter" | "night";

export interface FocusTrack {
  id: string;
  name: string;
  url: string;
  mood: MusicMood;
  season: MusicSeason;
  emoji: string;
  /** Suggested cover gradient (CSS) when no artwork is fetched */
  cover: string;
  custom?: boolean;
}

// All URLs are royalty-free Pixabay (no auth, CDN-cached).
export const FOCUS_TRACKS: FocusTrack[] = [
  { id: "lofi-rain",       name: "Lo-fi Rain",        url: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3", mood: "rain",      season: "any",    emoji: "🌧️", cover: "linear-gradient(135deg,#1e3a5f,#0f1d33)" },
  { id: "forest-birds",    name: "Forest Birds",      url: "https://cdn.pixabay.com/audio/2022/08/23/audio_d16737dc28.mp3", mood: "nature",    season: "spring", emoji: "🐦", cover: "linear-gradient(135deg,#2d5016,#0d2105)" },
  { id: "ocean-waves",     name: "Ocean Waves",       url: "https://cdn.pixabay.com/audio/2022/03/10/audio_4dedf5bf94.mp3", mood: "nature",    season: "summer", emoji: "🌊", cover: "linear-gradient(135deg,#0a3d62,#053355)" },
  { id: "blossom-chimes",  name: "Cherry Blossom",    url: "https://cdn.pixabay.com/audio/2022/03/15/audio_c8c8a73467.mp3", mood: "nature",    season: "spring", emoji: "🌸", cover: "linear-gradient(135deg,#d65a82,#7a2d4a)" },
  { id: "autumn-wind",     name: "Autumn Wind",       url: "https://cdn.pixabay.com/audio/2022/10/25/audio_946bc6d4e6.mp3", mood: "nature",    season: "autumn", emoji: "🍂", cover: "linear-gradient(135deg,#a3501c,#5e2a0c)" },
  { id: "fireplace",       name: "Winter Fireplace",  url: "https://cdn.pixabay.com/audio/2023/01/13/audio_e23a51d3ce.mp3", mood: "nature",    season: "winter", emoji: "🔥", cover: "linear-gradient(135deg,#c44d1a,#5a1d05)" },
  { id: "spring-stream",   name: "Spring Stream",     url: "https://cdn.pixabay.com/audio/2022/03/15/audio_8cb749ddff.mp3", mood: "nature",    season: "spring", emoji: "💧", cover: "linear-gradient(135deg,#3a8db5,#1c4763)" },
  { id: "summer-cicadas",  name: "Summer Cicadas",    url: "https://cdn.pixabay.com/audio/2022/07/28/audio_1bbb4abec7.mp3", mood: "nature",    season: "summer", emoji: "🦗", cover: "linear-gradient(135deg,#4a7c2a,#1f3d10)" },
  { id: "coffee-shop",     name: "Coffee Shop",       url: "https://cdn.pixabay.com/audio/2022/10/30/audio_5e8a13b8c5.mp3", mood: "café",      season: "any",    emoji: "☕", cover: "linear-gradient(135deg,#6b3f1d,#2e1a0a)" },
  { id: "night-crickets",  name: "Night Crickets",    url: "https://cdn.pixabay.com/audio/2022/03/24/audio_3b2c64a92e.mp3", mood: "nature",    season: "night",  emoji: "🌙", cover: "linear-gradient(135deg,#1a1f47,#070a1f)" },
  { id: "binaural-alpha",  name: "Binaural Alpha 8Hz", url: "https://cdn.pixabay.com/audio/2022/11/22/audio_febc508520.mp3", mood: "binaural",  season: "any",    emoji: "🧠", cover: "linear-gradient(135deg,#4527a0,#1a0a4a)" },
  { id: "binaural-beta",   name: "Binaural Beta 14Hz", url: "https://cdn.pixabay.com/audio/2022/11/22/audio_febc508520.mp3", mood: "binaural",  season: "any",    emoji: "⚡", cover: "linear-gradient(135deg,#0277bd,#01304a)" },
  { id: "binaural-theta",  name: "Binaural Theta 6Hz", url: "https://cdn.pixabay.com/audio/2022/11/22/audio_febc508520.mp3", mood: "binaural",  season: "any",    emoji: "🌌", cover: "linear-gradient(135deg,#283593,#0d144a)" },
  { id: "library-whispers",name: "Library Whispers",  url: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3", mood: "café",      season: "any",    emoji: "📚", cover: "linear-gradient(135deg,#5d4037,#1f1310)" },
  { id: "jazz-cafe",       name: "Jazz Café",         url: "https://cdn.pixabay.com/audio/2022/10/30/audio_5e8a13b8c5.mp3", mood: "café",      season: "any",    emoji: "🎷", cover: "linear-gradient(135deg,#4e342e,#1c0e0a)" },
  { id: "piano-rain",      name: "Piano + Rain",      url: "https://cdn.pixabay.com/audio/2023/06/25/audio_4d10c4be0e.mp3", mood: "classical", season: "any",    emoji: "🎹", cover: "linear-gradient(135deg,#37474f,#0d181c)" },
  { id: "tibetan-bowls",   name: "Tibetan Bowls",     url: "https://cdn.pixabay.com/audio/2022/03/15/audio_c8c8a73467.mp3", mood: "classical", season: "any",    emoji: "🪘", cover: "linear-gradient(135deg,#bf6a1f,#5a2c08)" },
  { id: "white-noise",     name: "White Noise",       url: "https://cdn.pixabay.com/audio/2023/05/19/audio_8d22e3a1ee.mp3", mood: "noise",     season: "any",    emoji: "⚪", cover: "linear-gradient(135deg,#9e9e9e,#3d3d3d)" },
  { id: "brown-noise",     name: "Brown Noise",       url: "https://cdn.pixabay.com/audio/2023/05/19/audio_8d22e3a1ee.mp3", mood: "noise",     season: "any",    emoji: "🟤", cover: "linear-gradient(135deg,#5d4037,#1f1310)" },
  { id: "pink-noise",      name: "Pink Noise",        url: "https://cdn.pixabay.com/audio/2023/05/19/audio_8d22e3a1ee.mp3", mood: "noise",     season: "any",    emoji: "🌸", cover: "linear-gradient(135deg,#c2185b,#5a0a26)" },
  { id: "cosmos-drift",    name: "Cosmos Drift",      url: "https://cdn.pixabay.com/audio/2022/11/22/audio_febc508520.mp3", mood: "cosmic",    season: "night",  emoji: "🌠", cover: "linear-gradient(135deg,#1a237e,#04081f)" },
];

let dynamicTracks: FocusTrack[] = [];

export const setDynamicTracks = (t: FocusTrack[]) => { dynamicTracks = t; };
export const getAllTracks = (): FocusTrack[] => [...FOCUS_TRACKS, ...dynamicTracks];
export const getTrackById = (id: string) => getAllTracks().find((t) => t.id === id);

export const MOOD_LABELS: Record<MusicMood, string> = {
  rain: "Rain", nature: "Nature", lofi: "Lo-fi", classical: "Classical",
  binaural: "Binaural", noise: "Noise", café: "Café", cosmic: "Cosmic",
};

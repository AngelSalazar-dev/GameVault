export const CATEGORIES = [
  { slug: "action", name: "Action", icon: "💥", color: "from-red-500/20 to-orange-500/20" },
  { slug: "adventure", name: "Adventure", icon: "🗺️", color: "from-blue-500/20 to-cyan-500/20" },
  { slug: "role-playing-game", name: "RPG", icon: "⚔️", color: "from-purple-500/20 to-pink-500/20" },
  { slug: "platformer", name: "Platformer", icon: "🟢", color: "from-lime-500/20 to-green-500/20" },
  { slug: "fighting", name: "Fighting", icon: "🥊", color: "from-red-500/20 to-rose-500/20" },
  { slug: "shooter", name: "Shooter", icon: "🔫", color: "from-red-500/20 to-pink-500/20" },
  { slug: "racing", name: "Racing", icon: "🏎️", color: "from-orange-500/20 to-red-500/20" },
  { slug: "puzzle", name: "Puzzle", icon: "🧩", color: "from-sky-500/20 to-blue-500/20" },
  { slug: "strategy", name: "Strategy", icon: "🧠", color: "from-amber-500/20 to-yellow-500/20" },
  { slug: "sports", name: "Sports", icon: "⚽", color: "from-green-500/20 to-lime-500/20" },
  { slug: "simulation", name: "Simulation", icon: "🎯", color: "from-indigo-500/20 to-blue-500/20" },
  { slug: "indie", name: "Indie", icon: "🎮", color: "from-green-500/20 to-emerald-500/20" },
  { slug: "visual-novel", name: "Visual Novel", icon: "📖", color: "from-fuchsia-500/20 to-pink-500/20" },
  { slug: "survival", name: "Survival", icon: "🏕️", color: "from-emerald-500/20 to-teal-500/20" },
  { slug: "horror", name: "Horror", icon: "👻", color: "from-gray-500/20 to-red-500/20" },
  { slug: "building", name: "Building", icon: "🏗️", color: "from-yellow-500/20 to-amber-500/20" },
  { slug: "anime", name: "Anime", icon: "🎌", color: "from-pink-500/20 to-purple-500/20" },
];

export const PLATFORM_LABELS: Record<string, string> = {
  "32x": "Sega 32X",
  "3do": "3DO",
  "3ds": "Nintendo 3DS",
  dos: "MS-DOS",
  dreamcast: "Dreamcast",
  gamecube: "GameCube",
  gamegear: "Game Gear",
  gb: "Game Boy",
  gba: "Game Boy Advance",
  gbc: "Game Boy Color",
  genesis: "Sega Genesis",
  mastersystem: "Master System",
  msx: "MSX",
  n64: "Nintendo 64",
  nds: "Nintendo DS",
  nes: "Nintendo",
  ngcd: "Neo Geo CD",
  ngp: "Neo Geo Pocket",
  pc: "PC",
  pcfx: "PC-FX",
  ps1: "PlayStation 1",
  ps2: "PlayStation 2",
  ps3: "PlayStation 3",
  ps4: "PlayStation 4",
  ps5: "PlayStation 5",
  psp: "PlayStation Portable",
  saturn: "Sega Saturn",
  segacd: "Sega CD",
  snes: "Super Nintendo",
  switch: "Nintendo Switch",
  tg16: "TurboGrafx-16",
  tgcd: "TurboGrafx-CD",
  vita: "PlayStation Vita",
  wii: "Wii",
  wiiu: "Wii U",
  wonderswan: "WonderSwan",
  xbox: "Xbox",
  xbox360: "Xbox 360",
  xboxone: "Xbox One",
  xboxseries: "Xbox Series",
};

export const PLATFORM_SHORT: Record<string, string> = {
  "32x": "32X",
  "3do": "3DO",
  "3ds": "3DS",
  dos: "DOS",
  dreamcast: "DC",
  gamecube: "GCN",
  gamegear: "GG",
  gb: "GB",
  gba: "GBA",
  gbc: "GBC",
  genesis: "GEN",
  mastersystem: "SMS",
  msx: "MSX",
  n64: "N64",
  nds: "NDS",
  nes: "NES",
  ngcd: "NGCD",
  ngp: "NGP",
  pc: "PC",
  pcfx: "PCFX",
  ps1: "PS1",
  ps2: "PS2",
  ps3: "PS3",
  ps4: "PS4",
  ps5: "PS5",
  psp: "PSP",
  saturn: "SAT",
  segacd: "SEGACD",
  snes: "SNES",
  switch: "SWITCH",
  tg16: "TG16",
  tgcd: "TGCD",
  vita: "VITA",
  wii: "WII",
  wiiu: "WIIU",
  wonderswan: "WS",
  xbox: "XBOX",
  xbox360: "X360",
  xboxone: "XONE",
  xboxseries: "XSER",
};

export const PC_PLATFORMS = new Set(["pc", "dos", "pcfx"]);

export type PlatformKind = "pc" | "rom";

// The DB uses `nds`; the UI used to use `ds`, which left 1.765 games
// unreachable. `nds` is the only canonical value.
export const PLATFORM_ALIASES: Record<string, string> = {
  ds: "nds",
  nintendods: "nds",
  windows: "pc",
  win: "pc",
};

export function normalizePlatform(raw: string | null | undefined): string {
  if (!raw) return "";
  const key = raw.toLowerCase().trim();
  return PLATFORM_ALIASES[key] ?? key;
}

export function isValidPlatform(raw: string | null | undefined): boolean {
  const value = normalizePlatform(raw);
  return Object.prototype.hasOwnProperty.call(PLATFORM_LABELS, value);
}

export function getPlatformKind(platform: string): PlatformKind {
  return PC_PLATFORMS.has(normalizePlatform(platform)) ? "pc" : "rom";
}

export function getPlatformLabel(platform: string): string {
  const value = normalizePlatform(platform);
  return PLATFORM_LABELS[value] || value.toUpperCase();
}

export function getPlatformShort(platform: string): string {
  const value = normalizePlatform(platform);
  return PLATFORM_SHORT[value] || value.toUpperCase();
}

export const HOME_PLATFORM = "pc";

export const HOME_PLATFORM_CHIPS: { slug: string; label: string }[] = [
  { slug: "pc", label: "PC" },
  { slug: "dos", label: "DOS" },
  { slug: "pcfx", label: "PC-FX" },
  { slug: "ps1", label: "PS1" },
  { slug: "ps2", label: "PS2" },
  { slug: "psp", label: "PSP" },
  { slug: "n64", label: "N64" },
  { slug: "gamecube", label: "GameCube" },
  { slug: "wii", label: "Wii" },
  { slug: "switch", label: "Switch" },
  { slug: "genesis", label: "Genesis" },
  { slug: "snes", label: "SNES" },
  { slug: "nes", label: "NES" },
  { slug: "gb", label: "GB" },
  { slug: "gbc", label: "GBC" },
  { slug: "gba", label: "GBA" },
  { slug: "nds", label: "DS" },
  { slug: "3ds", label: "3DS" },
  { slug: "saturn", label: "Saturn" },
  { slug: "dreamcast", label: "Dreamcast" },
  { slug: "segacd", label: "Sega CD" },
  { slug: "gamegear", label: "Game Gear" },
  { slug: "mastersystem", label: "Master System" },
  { slug: "32x", label: "32X" },
  { slug: "vita", label: "Vita" },
  { slug: "msx", label: "MSX" },
  { slug: "wonderswan", label: "WonderSwan" },
  { slug: "tg16", label: "TG16" },
  { slug: "tgcd", label: "TGCD" },
  { slug: "ngp", label: "NGP" },
  { slug: "ngcd", label: "Neo Geo CD" },
  { slug: "3do", label: "3DO" },
];

export const HOME_CATEGORIES = CATEGORIES.slice(0, 12);

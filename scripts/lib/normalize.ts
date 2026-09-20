const GENRE_MAP: Record<string, string> = {
  "action": "action",
  "adventure": "adventure",
  "anime": "anime",
  "building": "building",
  "horror": "horror",
  "indie": "indie",
  "multiplayer": "multiplayer",
  "open world": "open-world",
  "open-world": "open-world",
  "racing": "racing",
  "rpg": "role-playing-game",
  "role-playing-game": "role-playing-game",
  "simulation": "simulation",
  "sports": "sports",
  "strategy": "strategy",
  "survival": "survival",
  "virtual reality": "virtual-reality",
  "virtual-reality": "virtual-reality",
  "first-person-shooter": "first-person-shooter",
  "fps": "first-person-shooter",
  "platformer": "indie",
  "casual": "indie",
  "utility": "simulation",
  "collection": "indie",
};

export function normalizeGenre(raw: string | null | undefined): string {
  if (!raw) return "action";
  const lower = raw.toLowerCase().trim();
  const first = lower.split(",")[0].trim();
  return GENRE_MAP[first] || GENRE_MAP[lower] || lower;
}

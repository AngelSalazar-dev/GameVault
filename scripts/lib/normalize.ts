export const VALID_GENRES = [
  "action",
  "adventure",
  "fighting",
  "platformer",
  "puzzle",
  "role-playing-game",
  "shooter",
  "racing",
  "strategy",
  "sports",
  "simulation",
  "survival",
  "horror",
  "visual-novel",
  "indie",
  "anime",
  "building",
] as const;

export type ValidGenre = (typeof VALID_GENRES)[number];

const GENRE_MAP: Record<string, string> = {
  action: "action",
  adventure: "adventure",
  anime: "anime",
  building: "building",
  horror: "horror",
  indie: "indie",
  racing: "racing",
  simulation: "simulation",
  sports: "sports",
  strategy: "strategy",
  survival: "survival",

  rpg: "role-playing-game",
  "role-playing-game": "role-playing-game",
  "action rpg": "role-playing-game",
  "tactical rpg": "role-playing-game",
  "dungeon crawler": "role-playing-game",
  roguelike: "role-playing-game",
  roguelite: "role-playing-game",

  fighting: "fighting",
  "beat 'em up": "fighting",
  "beat em up": "fighting",
  wrestling: "fighting",
  boxing: "fighting",

  platformer: "platformer",
  "platformer 2d": "platformer",
  "platformer 3d": "platformer",

  puzzle: "puzzle",

  "visual novel": "visual-novel",
  "dating sim": "visual-novel",
  otome: "visual-novel",
  "interactive movie": "visual-novel",
  fmv: "visual-novel",

  shooter: "shooter",
  "first person shooter": "shooter",
  "first-person-shooter": "shooter",
  fps: "shooter",
  "third person shooter": "shooter",
  "shoot 'em up": "shooter",
  "rail shooter": "shooter",
  "light gun": "shooter",

  "action-adventure": "action",
  "hack and slash": "action",
  hack: "action",
  stealth: "action",
  "run and gun": "action",
  "vehicular combat": "action",

  soccer: "sports",
  football: "sports",
  baseball: "sports",
  basketball: "sports",
  golf: "sports",
  tennis: "sports",
  hockey: "sports",
  bowling: "sports",
  skateboarding: "sports",
  snowboarding: "sports",
  skiing: "sports",
  pinball: "sports",

  driving: "racing",

  "real time strategy": "strategy",
  "tower defense": "strategy",
  "card battle": "strategy",
  "card game": "strategy",
  "board game": "strategy",

  "flight simulator": "simulation",
  "virtual life": "simulation",
  "construction": "building",

  "survival horror": "survival",

  "point-and-click": "adventure",
  "adventure ": "adventure",

  "miscellaneous": "indie",
  compilation: "indie",
  "mini games": "indie",
  party: "indie",
  rhythm: "indie",
  music: "indie",
  edutainment: "indie",
  homebrew: "indie",
  bootleg: "indie",
  arcade: "action",
  gambling: "indie",
  trivia: "indie",
  "game show": "indie",
  pool: "sports",
  fishing: "sports",
  "light gun ": "shooter",
};

const PRIORITY: string[] = [
  "role-playing-game",
  "strategy",
  "sports",
  "racing",
  "horror",
  "survival",
  "fighting",
  "puzzle",
  "platformer",
  "shooter",
  "visual-novel",
  "simulation",
  "building",
  "anime",
  "adventure",
  "indie",
  "action",
];

function mapToken(token: string): string | null {
  const t = token.toLowerCase().trim();
  if (!t) return null;
  if ((VALID_GENRES as readonly string[]).includes(t)) return t;
  return GENRE_MAP[t] || null;
}

export function normalizeGenre(raw: string | null | undefined): string {
  if (!raw) return "action";
  const lower = raw.toLowerCase().trim();
  if ((VALID_GENRES as readonly string[]).includes(lower)) return lower;

  const direct = GENRE_MAP[lower];
  if (direct) return direct;

  const tokens = lower.split(",").map((t) => t.trim()).filter(Boolean);
  const mapped = tokens.map(mapToken).filter((g): g is string => g !== null);

  if (mapped.length === 0) return "action";
  if (mapped.length === 1) return mapped[0];

  let best = mapped[0];
  let bestIdx = PRIORITY.indexOf(best);
  if (bestIdx === -1) bestIdx = PRIORITY.length;
  for (let i = 1; i < mapped.length; i++) {
    const idx = PRIORITY.indexOf(mapped[i]);
    const rank = idx === -1 ? PRIORITY.length : idx;
    if (rank < bestIdx) {
      best = mapped[i];
      bestIdx = rank;
    }
  }
  return best;
}

export function inferGenreFromTitle(title: string): string {
  const t = title.toLowerCase();
  const rules: [RegExp, string][] = [
    [/\bpuzzle\b/, "puzzle"],
    [/\bkart\b|\bracing\b|\bneed for speed\b|\bgran turismo\b/, "racing"],
    [
      /\bfootball\b|\bsoccer\b|\bnba\b|\bwwe\b|\bwrestling\b|\bboxing\b|\bbaseball\b|\bgolf\b|\btennis\b|\bhockey\b|\bfifa\b|\bmadden\b|\bnfl\b/,
      "sports",
    ],
    [
      /\bfighter\b|\btekken\b|\bstreet fighter\b|\bsmash\b|\bbrawl\b|\bdragon ball\b|\bdragonball\b|\bnaruto\b/,
      "fighting",
    ],
    [
      /\bpok[eé]mon\b|final fantasy|dragon quest|\bjrpg\b|\bshin megami\b|\byo-?kai watch\b/,
      "role-playing-game",
    ],
    [/\bhorror\b|resident evil|silent hill|\bsurvival horror\b/, "survival"],
    [
      /\bcall of duty\b|\bhalo\b|\bcounter-?strike\b|\bdoom\b|\bquake\b|\bfps\b|\bbattlefield\b|\bsplinter cell\b/,
      "shooter",
    ],
    [/\bzelda\b|\badventure\b|\buncharted\b|\btomb raider\b/, "adventure"],
    [/\bsonic\b|\bcrash bandicoot\b|\bsuper mario(?! kart)\b|\bplatform\b/, "platformer"],
    [/\banime\b|\bmanga\b/, "anime"],
    [/\bminecraft\b|\bsims\b|\bsimulator\b|\bcities\b|\bskylines\b/, "building"],
    [/\bhorror\b|\bamnesia\b|\boutlast\b|\bp.t\b/, "horror"],
    [/\bindie\b/, "indie"],
    [/\bvisual novel\b|\bdating sim\b/, "visual-novel"],
    [/\bsurvival\b|\brust\b|\bsubnautica\b|\bthe forest\b/, "survival"],
    [/\bstrategy\b|\btower defense\b|\bcivilization\b|\btotal war\b/, "strategy"],
    [/\bsimulation\b|\bflight sim\b/, "simulation"],
    [/\bmultiplayer\b|\bonline\b/, "action"],
    [/\bopen world\b|\bopen-world\b/, "action"],
    [/\bvirtual reality\b|\bvr\b/, "action"],
  ];

  for (const [re, genre] of rules) {
    if (re.test(t)) return genre;
  }
  return "action";
}

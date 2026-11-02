/**
 * Prueba del matcher de GamePCFull contra casos conocidos, sin tocar la DB.
 *   npx tsx scripts/test-matcher.ts
 *
 * Se importa la logica del scraper replicandola aqui para poder assertar.
 * Si el scraper cambia, hay que actualizar esta copia.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EDITION_WORDS =
  /\b(edition|deluxe|goty|game\s+of\s+the\s+year|ultimate|complete|definitive|remastered|remaster|expanded|anniversary|premium|standard|collector|gold|final|plus|pro|enhanced|upgrade|extreme|first\s+person|trilogy|collection|hd|next\s+gen|multi\d*|fitgirl|dodi|elamigos|elenemigos|rune|codex|plaza|razor1911|hypervisor|reloaded|steam)\b/gi;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 80);
}

function stripTags(title: string): string {
  return title
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function looseKey(text: string): string {
  return slugify(text.replace(EDITION_WORDS, " "))
    .split("-")
    .filter(Boolean)
    .join("-")
    .replace(/^-+|-+$/g, "");
}

function isTrailingNoise(word: string): boolean {
  return !/^\d+$/.test(word) && !/^\d+(st|nd|rd|th)$/.test(word);
}

function looseKeyCandidates(text: string): string[] {
  const words = looseKey(text).split("-").filter(Boolean);
  const out: string[] = [];
  for (let n = words.length; n > 0; n--) {
    const tail = words.slice(n);
    if (tail.length > 5) break;
    if (!tail.every(isTrailingNoise)) break;
    if (words.slice(0, n).join("-").length < 6) break;
    const key = words.slice(0, n).join("-");
    if (!out.includes(key)) out.push(key);
  }
  return out;
}

type Candidate = { id: string; slug: string };

function findByPrefix(text: string, index: Map<string, Candidate[]>) {
  for (const key of looseKeyCandidates(text)) {
    const hits = index.get(key);
    if (!hits || hits.length === 0) continue;
    const unique = [...new Map(hits.map((c) => [c.id, c])).values()];
    if (unique.length === 1) return { match: unique[0], candidates: unique };
    return { match: null, candidates: unique };
  }
  return { match: null, candidates: [] };
}

// [h1 real del sitio, slug esperado en la base, o null si NO debe matchear]
const cases: [string, string | null][] = [
  ["Northgard: The Viking Age Edition (v3.6.20.40749) [GOG]", "northgard"],
  ["Tropico 6 El Prez Edition (v1.23.1282) [GOG]", "tropico-6"],
  ["Oxygen Not Included The Bionic Booster Pack (v646843) [TENOKE]", "oxygen-not-included"],
  ["Frostpunk Game of the Year Edition", "frostpunk-goty"],
  // No existen en la base: deben quedar sin match.
  ["BATTLETECH – Digital Deluxe Edition (v1.9.1) (GOG)", null],
  ["GreedFall – Gold Edition (v1.0) [GOG]", null],
  ["FIFA 19", null],
  // Numeros jamas se rebajan: fifa-19 no debe caer en "fifa".
  ["Doom 64", "doom-64"],
];

async function main() {
  const games = await prisma.game.findMany({
    where: { platform: "pc" },
    select: { id: true, slug: true },
  });
  const index = new Map<string, Candidate[]>();
  for (const g of games) {
    for (const key of new Set([looseKey(g.slug), looseKey(g.title ?? g.slug)])) {
      if (!key || key.length < 4) continue;
      const arr = index.get(key) ?? [];
      arr.push(g);
      index.set(key, arr);
    }
  }
  console.log(`indice: ${games.length} juegos, ${index.size} claves\n`);

  for (const [h1, expected] of cases) {
    const title = stripTags(h1);
    const r = findByPrefix(title, index);
    const got = r.match?.slug ?? null;
    const cands = looseKeyCandidates(title);
    const ok = expected === null ? got === null : got === expected;
    console.log(`${ok ? "OK  " : "FALLA"} ${h1}`);
    console.log(`      candidates: ${cands.join(" | ")}`);
    console.log(`      -> ${got ?? "(sin match)"}${expected && expected !== "battletech-gog" ? `  esperado: ${expected}` : ""}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
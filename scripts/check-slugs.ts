/**
 * Revisa slugs reales de juegos concretos para validar expectativas del matcher.
 *   npx tsx scripts/check-slugs.ts
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

function looseKey(text: string): string {
  return slugify(text.replace(EDITION_WORDS, " "))
    .split("-")
    .filter(Boolean)
    .join("-")
    .replace(/^-+|-+$/g, "");
}

async function main() {
  for (const term of ["ark", "frostpunk", "northgard", "battletech", "greedfall", "doom"]) {
    const rows = await prisma.game.findMany({
      where: { platform: "pc", slug: { contains: term } },
      select: { slug: true },
      take: 6,
    });
    console.log(`\n${term}:`);
    for (const r of rows) console.log(`   slug=${r.slug}   looseKey=${looseKey(r.slug)}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
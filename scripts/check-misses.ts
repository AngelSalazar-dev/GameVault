/**
 * Verifica si los titulos que GamePCFull no encuentra existen en la base
 * con otro nombre. Sirve para distinguir "juego ausente" de "fallo del matcher".
 *
 *   npx tsx scripts/check-misses.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Muestras tomadas del log de la corrida --only-existing.
const samples = [
  "fifa-19",
  "shenmue-iii",
  "battletech",
  "greedfall",
  "northgard",
  "tropico-6",
  "oxygen-not-included",
  "factory-town",
  "planetbase",
  "call-of-cthulhu",
  "on-the-road",
  "human-fall-flat",
  "railroad-corporation",
  "automation-empire",
  "dawn-of-man",
];

async function main() {
  for (const s of samples) {
    const words = s.split("-").filter((w) => w.length > 3);
    const where = {
      OR: words.map((w) => ({ slug: { contains: w } })),
    };
    const hits = await prisma.game.findMany({
      where,
      select: { slug: true, source: true, status: true },
      take: 4,
    });
    console.log(`\n${s}`);
    if (hits.length === 0) console.log("   (sin coincidencias parciales: juego ausente de verdad)");
    for (const h of hits) console.log(`   ${h.slug}  [${h.source}/${h.status}]`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
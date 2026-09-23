import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: { url: "mysql://2XFSYDCW259rGgw.root:ViVWCLBxa1Zs18UA@gateway01.us-east-1.prod.aws.tidbcloud.com:4000/gamevault?sslaccept=strict" },
  },
});

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
};

function normalizeGenre(raw: string | null): string {
  if (!raw) return "action";
  const lower = raw.toLowerCase().trim();
  // Handle compound genres like "Casual, Indie, Simulation, Strategy" - take first
  const first = lower.split(",")[0].trim();
  return GENRE_MAP[first] || GENRE_MAP[lower] || lower;
}

async function main() {
  const allGames = await prisma.game.findMany({
    select: { id: true, genre: true },
  });

  let updated = 0;
  let skipped = 0;

  for (const game of allGames) {
    const normalized = normalizeGenre(game.genre);
    if (game.genre !== normalized) {
      await prisma.game.update({
        where: { id: game.id },
        data: { genre: normalized },
      });
      updated++;
      if (updated % 500 === 0) console.log(`  Updated ${updated}...`);
    } else {
      skipped++;
    }
  }

  console.log(`Done! Updated: ${updated}, Skipped (already correct): ${skipped}`);

  // Verify
  const counts = await prisma.game.groupBy({
    by: ["genre"],
    where: { status: "active" },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });
  console.log("\nAFTER NORMALIZATION:");
  for (const c of counts) {
    console.log(`  "${c.genre}" => ${c._count.id} games`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
const db = new PrismaClient();

async function main() {
  const listings: { title: string; url: string }[] = JSON.parse(
    readFileSync("scripts/steamrip-all-listings.json", "utf-8")
  );

  // Get all megadb games
  const games = await db.game.findMany({
    where: { downloadLinks: { some: { host: "megadb", isActive: true } } },
    select: { id: true, title: true, slug: true },
  });

  console.log(`Total games with megadb links: ${games.length}`);

  let matched = 0;
  let unmatched = 0;

  for (const g of games) {
    const match = listings.find(
      (l) => l.title.toLowerCase() === g.title.toLowerCase()
    );
    if (match) {
      matched++;
    } else {
      unmatched++;
      console.log(`  NO MATCH: ${g.title}`);
    }
  }

  console.log(`\nMatched: ${matched}/${games.length}`);
  console.log(`Unmatched: ${unmatched}/${games.length}`);

  await db.$disconnect();
}

main();

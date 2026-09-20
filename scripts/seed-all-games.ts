import { PrismaClient } from "@prisma/client";
import fs from "fs";
import { normalizeGenre } from "./lib/normalize";

const prisma = new PrismaClient();

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 80);
}

async function main() {
  const rawData = fs.readFileSync("scripts/steamrip-all-listings.json", "utf-8");
  const games = JSON.parse(rawData);

  console.log(`Processing ${games.length} games from SteamRip...`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const game of games) {
    const slug = slugify(game.title);
    if (!slug) { skipped++; continue; }

    try {
      const existing = await prisma.game.findUnique({ where: { slug } });

      const gameData = {
        title: game.title.replace(/\s*Free Download.*$/i, "").trim(),
        slug,
        description: `${game.title.replace(/\s*Free Download.*$/i, "").trim()} - Pre-installed PC game from SteamRip.`,
        platform: "PC",
        genre: normalizeGenre(game.categories?.[0]),
        releaseYear: game.year || null,
        coverImage: game.coverImage || null,
        fileSize: game.fileSize || null,
        status: "active" as const,
        source: "steamrip",
      };

      if (existing) {
        await prisma.game.update({
          where: { id: existing.id },
          data: {
            coverImage: game.coverImage || existing.coverImage,
            fileSize: game.fileSize || existing.fileSize,
          },
        });
        updated++;
      } else {
        await prisma.game.create({ data: gameData });
        created++;
      }

      if ((created + updated) % 100 === 0) {
        console.log(`Progress: ${created + updated}/${games.length} (created: ${created}, updated: ${updated})`);
      }
    } catch (err: any) {
      console.error(`Error: ${game.title} - ${err.message?.substring(0, 50)}`);
      skipped++;
    }
  }

  console.log(`\nDone! Created: ${created}, Updated: ${updated}, Skipped: ${skipped}`);

  const totalGames = await prisma.game.count();
  const totalLinks = await prisma.downloadLink.count();
  console.log(`Total games in DB: ${totalGames}`);
  console.log(`Total download links: ${totalLinks}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

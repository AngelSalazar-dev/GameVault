import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 80);
}

// Known download links from webfetch
const knownLinks: Record<string, { url: string; host: string }[]> = {
  "walk-of-life": [{ url: "https://bzzhr.to/68a3q5j0grhp", host: "bzzhr" }],
  "chainstaff": [{ url: "https://bzzhr.to/oyjdf1qq4o7g", host: "bzzhr" }],
};

async function main() {
  // Load scraped data
  const rawData = fs.readFileSync("scripts/steamrip-full.json", "utf-8");
  const games = JSON.parse(rawData);

  console.log(`Processing ${games.length} games from SteamRip...`);

  let created = 0;
  let updated = 0;
  let linksAdded = 0;

  for (const game of games) {
    const slug = slugify(game.title);
    if (!slug) continue;

    try {
      // Check if game exists
      const existing = await prisma.game.findUnique({
        where: { slug },
      });

      const gameData = {
        title: game.title.replace(/\s*Free Download.*$/i, "").trim(),
        slug,
        description: `${game.title} - Pre-installed PC game from SteamRip.`,
        platform: "pc",
        genre: game.genre || "Action",
        releaseYear: game.year || null,
        developer: game.developer || null,
        publisher: null,
        coverImage: game.coverImage || null,
        fileSize: game.fileSize || null,
        systemRequirements: {},
        status: "active",
        source: "steamrip",
      };

      let gameId: string;

      if (existing) {
        // Update existing game
        await prisma.game.update({
          where: { id: existing.id },
          data: {
            coverImage: game.coverImage || existing.coverImage,
            fileSize: game.fileSize || existing.fileSize,
            genre: game.genre || existing.genre,
            developer: game.developer || existing.developer,
            source: "steamrip",
          },
        });
        gameId = existing.id;
        updated++;
        console.log(`Updated: ${game.title}`);
      } else {
        // Create new game
        const newGame = await prisma.game.create({ data: gameData });
        gameId = newGame.id;
        created++;
        console.log(`Created: ${game.title}`);
      }

      // Add download links if known
      const links = knownLinks[slug] || [];
      for (const link of links) {
        const existingLink = await prisma.downloadLink.findFirst({
          where: { gameId, url: link.url },
        });
        if (!existingLink) {
          await prisma.downloadLink.create({
            data: {
              gameId,
              linkType: "direct",
              url: link.url,
              host: link.host,
              isActive: true,
            },
          });
          linksAdded++;
          console.log(`  Added link: ${link.host}`);
        }
      }
    } catch (err: any) {
      console.error(`Error processing ${game.title}: ${err.message}`);
    }
  }

  console.log(`\nDone!`);
  console.log(`  Created: ${created}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Links added: ${linksAdded}`);

  // Show summary
  const totalGames = await prisma.game.count();
  const totalLinks = await prisma.downloadLink.count();
  console.log(`\nTotal games in DB: ${totalGames}`);
  console.log(`Total download links: ${totalLinks}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

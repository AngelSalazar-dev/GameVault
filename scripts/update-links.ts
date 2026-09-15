import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();

async function main() {
  const linksData = JSON.parse(
    fs.readFileSync("scripts/steamrip-links.json", "utf-8")
  );

  console.log(`Updating ${Object.keys(linksData).length} games with download links...`);

  let updated = 0;
  let added = 0;
  let notFound = 0;

  for (const [slug, url] of Object.entries(linksData)) {
    const game = await prisma.game.findUnique({
      where: { slug },
      select: { id: true, title: true },
    });

    if (!game) {
      console.log(`  NOT FOUND: ${slug}`);
      notFound++;
      continue;
    }

    // Check if link already exists
    const existingLink = await prisma.downloadLink.findFirst({
      where: { gameId: game.id, url: url as string },
    });

    if (existingLink) {
      console.log(`  EXISTS: ${game.title}`);
      continue;
    }

    // Remove old placeholder links
    await prisma.downloadLink.deleteMany({
      where: {
        gameId: game.id,
        url: { contains: "example.com" },
      },
    });

    // Add real link
    await prisma.downloadLink.create({
      data: {
        gameId: game.id,
        linkType: "direct",
        url: url as string,
        host: "bzzhr",
        isActive: true,
      },
    });

    console.log(`  ADDED: ${game.title}`);
    added++;
  }

  // Also add known links for games that timed out
  const knownLinks: Record<string, string> = {
    "walk-of-life": "https://bzzhr.to/68a3q5j0grhp",
    "chainstaff": "https://bzzhr.to/oyjdf1qq4o7g",
  };

  for (const [slug, url] of Object.entries(knownLinks)) {
    const game = await prisma.game.findUnique({
      where: { slug },
      select: { id: true, title: true },
    });

    if (!game) continue;

    const existingLink = await prisma.downloadLink.findFirst({
      where: { gameId: game.id, url },
    });

    if (!existingLink) {
      await prisma.downloadLink.deleteMany({
        where: { gameId: game.id, url: { contains: "example.com" } },
      });

      await prisma.downloadLink.create({
        data: {
          gameId: game.id,
          linkType: "direct",
          url,
          host: "bzzhr",
          isActive: true,
        },
      });
      console.log(`  ADDED (known): ${game.title}`);
      added++;
    }
  }

  console.log(`\nDone!`);
  console.log(`  Added: ${added}`);
  console.log(`  Not found: ${notFound}`);

  const totalLinks = await prisma.downloadLink.count();
  console.log(`  Total links in DB: ${totalLinks}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

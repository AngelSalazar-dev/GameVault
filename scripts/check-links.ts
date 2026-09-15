import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const total = await prisma.game.count({ where: { source: "steamrip" } });
  const withLinks = await prisma.game.count({
    where: {
      source: "steamrip",
      downloadLinks: { some: { url: { not: { contains: "example.com" } } } },
    },
  });

  console.log(`Total SteamRip games: ${total}`);
  console.log(`Games with real links: ${withLinks}`);

  const games = await prisma.game.findMany({
    where: { source: "steamrip" },
    include: {
      downloadLinks: {
        where: { url: { not: { contains: "example.com" } } },
      },
    },
    orderBy: { title: "asc" },
    take: 10,
  });

  games.forEach((g) => {
    console.log(`${g.title} | ${g.downloadLinks.length} links`);
  });

  await prisma.$disconnect();
}

main();

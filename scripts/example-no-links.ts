import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const games = await db.game.findMany({
    where: { downloadLinks: { none: {} } },
    take: 5,
    select: { title: true, slug: true, source: true, genre: true },
  });
  console.log('Ejemplos de juegos sin links:');
  games.forEach(g => console.log(`  - ${g.title} | ${g.url}`));
  process.exit(0);
}

main();

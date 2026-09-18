import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const total = await db.game.count();
  const withLinks = await db.game.count({ where: { downloadLinks: { some: {} } } });
  console.log('Total juegos:', total);
  console.log('Con links:', withLinks);
  console.log('Sin links:', total - withLinks);
  await db.$disconnect();
}

main();

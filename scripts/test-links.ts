import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  console.log('=== Query 1: Games with MEGADB links ===\n');
  const megadbGames = await db.game.findMany({
    where: { downloadLinks: { some: { host: 'megadb' } } },
    take: 3,
    include: {
      downloadLinks: {
        where: { host: 'megadb' },
        select: { id: true, host: true, url: true },
      },
    },
  });
  for (const g of megadbGames) {
    for (const l of g.downloadLinks) {
      console.log(`  Title: ${g.title}`);
      console.log(`  Slug:  ${g.slug}`);
      console.log(`  LinkID: ${l.id}`);
      console.log(`  Host:  ${l.host}`);
      console.log(`  URL:   ${l.url}`);
      console.log();
    }
  }

  console.log('=== Query 2: Games with BZZHR links ===\n');
  const bzzhrGames = await db.game.findMany({
    where: { downloadLinks: { some: { host: 'bzzhr' } } },
    take: 3,
    include: {
      downloadLinks: {
        where: { host: 'bzzhr' },
        select: { id: true, host: true, url: true },
      },
    },
  });
  for (const g of bzzhrGames) {
    for (const l of g.downloadLinks) {
      console.log(`  Title: ${g.title}`);
      console.log(`  Slug:  ${g.slug}`);
      console.log(`  LinkID: ${l.id}`);
      console.log(`  Host:  ${l.host}`);
      console.log(`  URL:   ${l.url}`);
      console.log();
    }
  }

  console.log('=== Query 3: Games with BOTH megadb AND bzzhr ===\n');
  const bothGames = await db.game.findMany({
    where: {
      AND: [
        { downloadLinks: { some: { host: 'megadb' } } },
        { downloadLinks: { some: { host: 'bzzhr' } } },
      ],
    },
    take: 3,
    include: {
      downloadLinks: {
        where: { host: { in: ['megadb', 'bzzhr'] } },
        select: { id: true, host: true, url: true },
      },
    },
  });
  for (const g of bothGames) {
    for (const l of g.downloadLinks) {
      console.log(`  Title: ${g.title}`);
      console.log(`  Slug:  ${g.slug}`);
      console.log(`  LinkID: ${l.id}`);
      console.log(`  Host:  ${l.host}`);
      console.log(`  URL:   ${l.url}`);
      console.log();
    }
  }

  console.log('=== Query 4: Total links per host ===\n');
  const hosts = ['megadb', 'bzzhr', 'fileditch', 'gofile'];
  for (const h of hosts) {
    const count = await db.downloadLink.count({ where: { host: h } });
    console.log(`  ${h}: ${count}`);
  }
  const total = await db.downloadLink.count();
  console.log(`  TOTAL: ${total}`);

  await db.$disconnect();
}

main();

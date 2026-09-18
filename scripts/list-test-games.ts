import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const megadb = await db.downloadLink.findMany({
    where: { host: "megadb", isActive: true },
    include: { game: { select: { title: true, slug: true } } },
    take: 5,
  });
  console.log("=== MEGADB (probar estos) ===");
  for (const l of megadb) {
    console.log(`Juego: ${l.game.title}`);
    console.log(`URL: /games/${l.game.slug}`);
    console.log(`Link ID: ${l.id}`);
    console.log(`Destino: ${l.url}`);
    console.log("");
  }

  const gofile = await db.downloadLink.findMany({
    where: { host: "gofile", isActive: true },
    include: { game: { select: { title: true, slug: true } } },
    take: 3,
  });
  console.log("=== GOFILE (ya funcionan) ===");
  for (const l of gofile) {
    console.log(`Juego: ${l.game.title}`);
    console.log(`URL: /games/${l.game.slug}`);
    console.log("");
  }

  const fileditch = await db.downloadLink.findMany({
    where: { host: "fileditch", isActive: true },
    include: { game: { select: { title: true, slug: true } } },
    take: 3,
  });
  console.log("=== FILEDITCH (ya funcionan) ===");
  for (const l of fileditch) {
    console.log(`Juego: ${l.game.title}`);
    console.log(`URL: /games/${l.game.slug}`);
    console.log("");
  }

  await db.$disconnect();
}

main();

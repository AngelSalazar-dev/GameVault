import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const noLinks = await prisma.game.findMany({
    where: { status: "active", downloadLinks: { none: {} } },
    select: { id: true, title: true, slug: true, source: true },
  });

  console.log(`Games to deactivate: ${noLinks.length}`);

  for (const g of noLinks) {
    await prisma.game.update({
      where: { id: g.id },
      data: { status: "removed" },
    });
    console.log(`  ✅ Removed: ${g.title}`);
  }

  const active = await prisma.game.count({ where: { status: "active" } });
  const removed = await prisma.game.count({ where: { status: "removed" } });
  const withLinks = await prisma.game.count({ where: { status: "active", downloadLinks: { some: {} } } });

  console.log(`\n=== SUMMARY ===`);
  console.log(`Active games: ${active}`);
  console.log(`Removed games: ${removed}`);
  console.log(`Active with links: ${withLinks}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
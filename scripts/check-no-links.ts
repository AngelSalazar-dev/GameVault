import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient({ datasources: { db: { url: "mysql://2XFSYDCW259rGgw.root:ViVWCLBxa1Zs18UA@gateway01.us-east-1.prod.aws.tidbcloud.com:4000/gamevault?sslaccept=strict" } } });

async function main() {
  const total = await prisma.game.count({ where: { status: "active" } });
  const withLinks = await prisma.game.count({ where: { status: "active", downloadLinks: { some: {} } } });
  const noLinks = total - withLinks;

  console.log(`Total activos: ${total}`);
  console.log(`Con links: ${withLinks}`);
  console.log(`Sin links: ${noLinks}`);

  // By source
  const bySource = await prisma.game.groupBy({
    by: ["source"],
    where: { status: "active", downloadLinks: { none: {} } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });
  console.log("\nSin links por source:");
  for (const s of bySource) console.log(`  ${s.source || "null"}: ${s._count.id}`);

  // By genre
  const byGenre = await prisma.game.groupBy({
    by: ["genre"],
    where: { status: "active", downloadLinks: { none: {} } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 10,
  });
  console.log("\nSin links por genre (top 10):");
  for (const g of byGenre) console.log(`  ${g.genre}: ${g._count.id}`);

  // Sample titles
  const samples = await prisma.game.findMany({
    where: { status: "active", downloadLinks: { none: {} } },
    select: { title: true, source: true, genre: true },
    take: 15,
    orderBy: { createdAt: "desc" },
  });
  console.log("\nEjemplos recientes:");
  for (const s of samples) console.log(`  [${s.source}] ${s.title} (${s.genre})`);
}

main().finally(() => prisma.$disconnect());

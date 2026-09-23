import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient({ datasources: { db: { url: "mysql://2XFSYDCW259rGgw.root:ViVWCLBxa1Zs18UA@gateway01.us-east-1.prod.aws.tidbcloud.com:4000/gamevault?sslaccept=strict" } } });

async function main() {
  const noLinks = await prisma.game.findMany({
    where: { status: "active", downloadLinks: { none: {} } },
    select: { id: true, title: true, slug: true, source: true, coverImage: true },
    orderBy: { createdAt: "desc" },
  });

  console.log(`Juegos sin links: ${noLinks.length}\n`);

  // Group by source
  const steamrip = noLinks.filter(g => g.source?.includes("steamrip"));
  const ovagames = noLinks.filter(g => g.source?.includes("ovagames") && !g.source?.includes("steamrip"));

  console.log(`SteamRip (${steamrip.length}):`);
  for (const g of steamrip) console.log(`  ${g.slug}`);

  console.log(`\nOvaGames (${ovagames.length}):`);
  for (const g of ovagames) console.log(`  ${g.slug} - ${g.title}`);
}

main().finally(() => prisma.$disconnect());

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient({ datasources: { db: { url: "mysql://2XFSYDCW259rGgw.root:ViVWCLBxa1Zs18UA@gateway01.us-east-1.prod.aws.tidbcloud.com:4000/gamevault?sslaccept=strict" } } });

async function main() {
  const games = await prisma.game.findMany({
    where: {
      status: "active",
      downloadLinks: {
        some: {
          host: "filecrypt",
          source: "ovagames",
        },
      },
    },
    include: {
      downloadLinks: {
        where: { host: "filecrypt", source: "ovagames" },
      },
    },
    take: 5,
  });

  for (const g of games) {
    console.log(`${g.title} (${g.slug})`);
    console.log(`  Source: ${g.source}`);
    console.log(`  Links: ${g.downloadLinks.length}`);
    for (const link of g.downloadLinks) {
      console.log(`    - ${link.url}`);
    }
    console.log();
  }
}

main().finally(() => prisma.$disconnect());
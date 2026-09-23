import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: { url: "mysql://2XFSYDCW259rGgw.root:ViVWCLBxa1Zs18UA@gateway01.us-east-1.prod.aws.tidbcloud.com:4000/gamevault?sslaccept=strict" },
  },
});

async function main() {
  const counts = await prisma.game.groupBy({
    by: ["genre"],
    where: { status: "active" },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });
  console.log("GENRE VALUES IN DB:");
  for (const c of counts) {
    console.log(`  "${c.genre}" => ${c._count.id} games`);
  }
  console.log("TOTAL:", counts.reduce((a, b) => a + b._count.id, 0));

  // Check the expected slugs
  const slugs = ["action","adventure","role-playing-game","platformer","fighting","shooter","racing","puzzle","strategy","sports","simulation","indie","visual-novel","survival","horror","building","anime"];
  const dbGenres = new Set(counts.map(c => c.genre));
  console.log("\nMISSING FROM DB (slug not found):");
  for (const s of slugs) {
    if (!dbGenres.has(s)) console.log(`  ${s}`);
  }
  console.log("\nEXTRA IN DB (not in slugs):");
  for (const c of counts) {
    if (c.genre && !slugs.includes(c.genre)) console.log(`  "${c.genre}" => ${c._count.id} games`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

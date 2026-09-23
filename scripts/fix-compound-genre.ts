import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient({
  datasources: { db: { url: "mysql://2XFSYDCW259rGgw.root:ViVWCLBxa1Zs18UA@gateway01.us-east-1.prod.aws.tidbcloud.com:4000/gamevault?sslaccept=strict" } },
});
async function main() {
  await prisma.game.updateMany({ where: { genre: "casual, indie, simulation, strategy" }, data: { genre: "simulation" } });
  console.log("Fixed compound genre");
  const counts = await prisma.game.groupBy({ by: ["genre"], _count: { id: true }, orderBy: { _count: { id: "desc" } } });
  for (const c of counts) console.log(`"${c.genre}" => ${c._count.id}`);
}
main().finally(() => prisma.$disconnect());

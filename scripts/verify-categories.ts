import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient({ datasources: { db: { url: "mysql://2XFSYDCW259rGgw.root:ViVWCLBxa1Zs18UA@gateway01.us-east-1.prod.aws.tidbcloud.com:4000/gamevault?sslaccept=strict" } } });
const slugs = ["action","adventure","anime","building","horror","indie","multiplayer","open-world","racing","role-playing-game","simulation","sports","strategy","survival","virtual-reality","first-person-shooter"];
async function main() {
  for (const s of slugs) {
    const c = await prisma.game.count({ where: { genre: s, status: "active" } });
    console.log(`${s} => ${c}`);
  }
}
main().finally(() => prisma.$disconnect());

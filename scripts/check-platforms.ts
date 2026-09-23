import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const platforms = await prisma.game.groupBy({
    by: ["platform"],
    where: { status: "active" },
    _count: { id: true },
    orderBy: { platform: "asc" },
  });

  console.log("Games by platform:");
  for (const p of platforms) {
    console.log(`  ${p.platform}: ${p._count.id}`);
  }
}

main().finally(() => prisma.$disconnect());

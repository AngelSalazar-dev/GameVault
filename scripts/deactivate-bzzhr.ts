import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const result = await db.downloadLink.updateMany({
    where: {
      host: { in: ["bzzhr", "buzzheavier"] },
      isActive: true,
    },
    data: { isActive: false },
  });

  console.log(`Deactivated ${result.count} bzzhr/buzzheavier links`);

  // Count remaining active links
  const active = await db.downloadLink.groupBy({
    by: ["host"],
    where: { isActive: true },
    _count: true,
  });

  console.log("\nActive links by host:");
  for (const h of active) {
    console.log(`  ${h.host || "unknown"}: ${h._count}`);
  }

  await db.$disconnect();
}

main().catch(console.error);

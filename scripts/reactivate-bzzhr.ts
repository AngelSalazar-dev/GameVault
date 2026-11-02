/**
 * Reactiva los links de bzzhr que scripts/deactivate-bzzhr.ts desactivo.
 *
 * Motivo: bzzhr.to responde 403 a axios/node-fetch (con y sin Referer) pero
 * 200 en navegador real. Es bloqueo por fingerprint de HTTP, no un host muerto.
 * /download/[id] redirige desde el navegador del usuario, asi que el link funciona.
 *
 *   npx tsx scripts/reactivate-bzzhr.ts            # muestra que haria
 *   npx tsx scripts/reactivate-bzzhr.ts --apply    # lo aplica
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const HOSTS = ["bzzhr", "buzzheavier"];

async function main() {
  const apply = process.argv.includes("--apply");

  const target = await prisma.downloadLink.findMany({
    where: { host: { in: HOSTS }, isActive: false },
    select: { id: true, url: true },
  });

  const byHost = await prisma.$queryRawUnsafe<{ host: string | null; n: bigint }[]>(
    `SELECT host, COUNT(*) n FROM DownloadLink WHERE host IN ('bzzhr','buzzheavier') GROUP BY host`
  );
  console.log("Estado actual de bzzhr en la DB:");
  for (const r of byHost) console.log(`  host=${r.host}  total=${r.n}`);

  console.log(`\nA reactivar: ${target.length}`);

  if (!apply) {
    console.log("\n(dry run: usa --apply para escribir)");
    for (const l of target.slice(0, 5)) console.log(`  ej: ${l.url.slice(0, 70)}`);
    if (target.length > 5) console.log(`  ... y ${target.length - 5} mas`);
    return;
  }

  if (target.length === 0) {
    console.log("nada que reactivar");
    return;
  }

  const res = await prisma.downloadLink.updateMany({
    where: { id: { in: target.map((l) => l.id) } },
    data: { isActive: true },
  });
  console.log(`reactivados: ${res.count}`);

  const after = await prisma.$queryRawUnsafe<{ isActive: number; n: bigint }[]>(
    `SELECT isActive, COUNT(*) n FROM DownloadLink WHERE host IN ('bzzhr','buzzheavier') GROUP BY isActive`
  );
  console.log("\nEstado final:");
  for (const r of after) console.log(`  isActive=${r.isActive}  ${r.n}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
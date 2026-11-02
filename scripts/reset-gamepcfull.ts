/**
 * Limpia lo que genero la primera corrida de scrape-gamepcfull.ts con el
 * filtro de hosts demasiado permisivo (agregaba links de WinRAR, 7-Zip,
 * daemon tools, la tienda de GOG, etc.) y con un matcher que no detectaba
 * duplicados por edicion (frostpunk-goty vs Frostpunk Game of the Year Edition).
 *
 * Solo toca filas con source='gamepcfull', que son exclusivamente de esa
 * corrida. Verifica antes de borrar.
 *
 *   npx tsx scripts/reset-gamepcfull.ts          # muestra
 *   npx tsx scripts/reset-gamepcfull.ts --apply  # borra
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const SOURCE = "gamepcfull";

async function main() {
  const apply = process.argv.includes("--apply");

  const games = await prisma.game.findMany({
    where: { source: SOURCE },
    select: { id: true, title: true, slug: true, status: true },
  });
  const links = await prisma.downloadLink.count({ where: { source: SOURCE } });

  const byHost = await prisma.$queryRawUnsafe<{ host: string | null; n: bigint }[]>(
    "SELECT host, COUNT(*) n FROM DownloadLink WHERE source = ? GROUP BY host ORDER BY n DESC",
    SOURCE
  );

  console.log(`source=${SOURCE}`);
  console.log(`  juegos: ${games.length}`);
  console.log(`  links:  ${links}`);
  console.log("\nlinks por host:");
  for (const r of byHost) console.log(`  ${String(r.host).padEnd(16)} ${r.n}`);

  console.log("\njuegos:");
  for (const g of games) console.log(`  ${g.status.padEnd(8)} ${g.slug}  "${g.title}"`);

  if (!apply) {
    console.log("\n(dry run: usa --apply para borrar)");
    return;
  }

  if (games.length === 0 && links === 0) {
    console.log("nada que limpiar");
    return;
  }

  const delLinks = await prisma.downloadLink.deleteMany({ where: { source: SOURCE } });
  console.log(`\nlinks borrados: ${delLinks.count}`);

  const delGames = await prisma.game.deleteMany({ where: { source: SOURCE } });
  console.log(`juegos borrados: ${delGames.count}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
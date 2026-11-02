/**
 * Resumen de cobertura de enlaces: cuantos juegos tienen cuantos links,
 * desglosado por origen de scraping.
 *
 *   npx tsx scripts/stats-links.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Row = { src: string | null; games: bigint; links: bigint };

async function main() {
  const totalGames = await prisma.game.count();
  const totalLinks = await prisma.downloadLink.count();
  const dupes = await prisma.$queryRawUnsafe<[{ n: bigint }]>(
    "SELECT COUNT(*) n FROM (SELECT gameId,url,COUNT(*) c FROM DownloadLink GROUP BY gameId,url HAVING c>1) t"
  );

  console.log(`juegos: ${totalGames}`);
  console.log(`links:  ${totalLinks}`);
  console.log(`promedio links/juego: ${(totalLinks / totalGames).toFixed(2)}`);
  console.log(`duplicados (gameId,url): ${dupes[0].n}\n`);

  const perSource = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT g.source as src, COUNT(*) as games, COALESCE(SUM(c.n),0) as links
     FROM Game g LEFT JOIN (SELECT gameId, COUNT(*) n FROM DownloadLink GROUP BY gameId) c ON c.gameId = g.id
     GROUP BY g.source ORDER BY games DESC`
  );
  console.log("por origen:");
  for (const r of perSource)
    console.log(
      `  ${String(r.src).padEnd(12)} juegos=${String(r.games).padStart(6)}  links=${String(r.links).padStart(6)}  prom=${(
        Number(r.links) / Number(r.games)
      ).toFixed(2)}`
    );

  const buckets = await prisma.$queryRawUnsafe<{ bucket: string; games: bigint }[]>(
    `SELECT bucket, COUNT(*) games FROM (
       SELECT g.id, CASE WHEN c.n IS NULL THEN '0' WHEN c.n=1 THEN '1' WHEN c.n=2 THEN '2'
            WHEN c.n<=5 THEN '3-5' ELSE '6+' END bucket
       FROM Game g LEFT JOIN (SELECT gameId, COUNT(*) n FROM DownloadLink GROUP BY gameId) c ON c.gameId=g.id
     ) t GROUP BY bucket ORDER BY bucket`
  );
  console.log("\nlinks por juego:");
  for (const b of buckets) console.log(`  ${b.bucket.padEnd(5)} ${b.games}`);

  const byHost = await prisma.$queryRawUnsafe<{ host: string | null; n: bigint }[]>(
    "SELECT host, COUNT(*) n FROM DownloadLink GROUP BY host ORDER BY n DESC LIMIT 18"
  );
  console.log("\ntop hosts:");
  for (const h of byHost) console.log(`  ${String(h.host).padEnd(14)} ${h.n}`);

  const status = await prisma.game.groupBy({ by: ["status"], _count: { _all: true } });
  console.log("\nestado de juegos:");
  for (const s of status) console.log(`  ${s.status.padEnd(9)} ${s._count._all}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
import { PrismaClient } from "@prisma/client";

/**
 * Normalizes Game.platform / TelegramFile.platform to the canonical lowercase
 * slugs used by PLATFORM_LABELS.
 *
 * Why this exists: the DB collation is case-insensitive, so `WHERE platform =
 * 'pc'` matched both "pc" and "PC" and hid the problem. It only surfaced where
 * Prisma dedupes in JS (`distinct`), which produced a duplicated "PC" entry in
 * the platform filter. 4,157 rows were stored non-canonical.
 *
 * Dry-run by default. Pass --apply to write.
 */

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

// MySQL/TiDB comparisons are case-insensitive here, so every predicate and
// every write must be byte-exact: compare HEX(), and filter with HEX() too.
const HEX_DS = "6473"; // 'ds'

async function hexGroups(table: string, where: string) {
  return prisma.$queryRawUnsafe<{ p: string; c: bigint }[]>(
    `SELECT HEX(platform) AS p, COUNT(*) AS c FROM ${table}
     WHERE ${where}
     GROUP BY HEX(platform)
     ORDER BY c DESC`
  );
}

function decode(hex: string): string {
  let out = "";
  for (let i = 0; i < hex.length; i += 2) {
    out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
  }
  return out;
}

async function main() {
  console.log(apply ? "=== APPLY ===" : "=== DRY RUN (pass --apply to write) ===\n");

  const gameBad = await hexGroups("Game", "HEX(LOWER(TRIM(platform))) <> HEX(platform)");
  const gameDs = await hexGroups("Game", `HEX(platform) = '${HEX_DS}'`);
  const tgBad = await hexGroups("TelegramFile", "HEX(LOWER(TRIM(platform))) <> HEX(platform)");
  const tgUnknown = await hexGroups("TelegramFile", "HEX(platform) = '756E6B6E6F776E'"); // 'unknown'

  console.log("Game.platform non-canonical:");
  console.log(gameBad.length ? gameBad.map((r) => `  ${decode(r.p)} -> ${r.c}`).join("\n") : "  (none)");
  console.log("Game.platform = 'ds' (stray duplicate of 'nds'):");
  console.log(gameDs.length ? gameDs.map((r) => `  ${decode(r.p)} -> ${r.c}`).join("\n") : "  (none)");
  console.log("TelegramFile.platform non-canonical:");
  console.log(tgBad.length ? tgBad.map((r) => `  ${decode(r.p)} -> ${r.c}`).join("\n") : "  (none)");
  console.log("TelegramFile.platform = 'unknown' (not a real platform, left as-is):");
  console.log(tgUnknown.length ? tgUnknown.map((r) => `  ${decode(r.p)} -> ${r.c}`).join("\n") : "  (none)");

  const gameTotal = gameBad.reduce((n, r) => n + Number(r.c), 0);
  const dsTotal = gameDs.reduce((n, r) => n + Number(r.c), 0);
  const tgTotal = tgBad.reduce((n, r) => n + Number(r.c), 0);

  console.log(`\nTotals -> Game: ${gameTotal} + ${dsTotal} 'ds' | TelegramFile: ${tgTotal}`);

  if (!apply) {
    console.log("\nNothing written.");
    return;
  }

  if (gameTotal + dsTotal + tgTotal === 0) {
    console.log("\nNothing to do.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    if (gameTotal > 0) {
      const r = await tx.$executeRawUnsafe(
        `UPDATE Game SET platform = LOWER(TRIM(platform))
         WHERE HEX(LOWER(TRIM(platform))) <> HEX(platform)`
      );
      console.log(`Game lowercased: ${r}`);
    }
    if (dsTotal > 0) {
      const r = await tx.$executeRawUnsafe(
        `UPDATE Game SET platform = 'nds' WHERE HEX(platform) = '${HEX_DS}'`
      );
      console.log(`Game 'ds' -> 'nds': ${r}`);
    }
    if (tgTotal > 0) {
      const r = await tx.$executeRawUnsafe(
        `UPDATE TelegramFile SET platform = LOWER(TRIM(platform))
         WHERE HEX(LOWER(TRIM(platform))) <> HEX(platform)`
      );
      console.log(`TelegramFile lowercased: ${r}`);
    }
  });

  const after = await hexGroups("Game", "HEX(LOWER(TRIM(platform))) <> HEX(platform)");
  const afterDs = await hexGroups("Game", `HEX(platform) = '${HEX_DS}'`);
  const distinct = await prisma.game.groupBy({
    by: ["platform"],
    where: { status: "active" },
    _count: { id: true },
    orderBy: { platform: "asc" },
  });

  console.log(`\nAfter -> non-canonical: ${after.length} | stray 'ds': ${afterDs.length}`);
  console.log(`Distinct active platforms: ${distinct.length}`);
  console.log(distinct.map((d) => `  ${d.platform} = ${d._count.id}`).join("\n"));
}

main()
  .catch((e) => {
    console.error("FAILED:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

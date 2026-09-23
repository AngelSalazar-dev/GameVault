import { db } from "../src/lib/db";
import { normalizeGenre, inferGenreFromTitle, VALID_GENRES } from "./lib/normalize";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function retry<T>(fn: () => Promise<T>, attempts = 5): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("closed the connection") || msg.includes("Timed out") || msg.includes("P1017") || msg.includes("P2024")) {
        await sleep(2000 * (i + 1));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

async function bulkSetGenre(ids: string[], genre: string): Promise<number> {
  if (ids.length === 0) return 0;
  const BATCH = 500;
  let total = 0;
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH);
    const res = await retry(() =>
      db.game.updateMany({ where: { id: { in: batch } }, data: { genre } })
    );
    total += res.count;
  }
  return total;
}

async function main() {
  console.log("=== Normalizing genres ===\n");
  const validSet = new Set<string>(VALID_GENRES);

  // ── Phase 1: bulk remap existing non-null genres ──
  console.log("Phase 1: Bulk remap of existing genres...");
  const distinct = await db.game.findMany({
    where: { status: "active", genre: { not: null } },
    select: { genre: true },
    distinct: ["genre"],
  });

  const remap = new Map<string, string>();
  for (const d of distinct) {
    if (!d.genre) continue;
    const target = normalizeGenre(d.genre);
    if (target !== d.genre && validSet.has(target)) {
      remap.set(d.genre, target);
    }
  }

  console.log(`  ${remap.size} distinct values need remapping`);
  let bulkUpdated = 0;
  for (const [oldGenre, newGenre] of remap) {
    const res = await retry(() =>
      db.game.updateMany({
        where: { status: "active", genre: oldGenre },
        data: { genre: newGenre },
      })
    );
    bulkUpdated += res.count;
  }
  console.log(`  Bulk updated: ${bulkUpdated}`);

  // ── Phase 2: infer null-genre games, grouped by inferred genre ──
  console.log("\nPhase 2: Infer null-genre games...");
  const nullGames = await db.game.findMany({
    where: { status: "active", genre: null },
    select: { id: true, title: true },
  });
  console.log(`  ${nullGames.length} games with null genre`);

  const nullGroups = new Map<string, string[]>();
  for (const g of nullGames) {
    const genre = inferGenreFromTitle(g.title);
    if (!nullGroups.has(genre)) nullGroups.set(genre, []);
    nullGroups.get(genre)!.push(g.id);
  }

  let nullUpdated = 0;
  for (const [genre, ids] of nullGroups) {
    const n = await bulkSetGenre(ids, genre);
    nullUpdated += n;
    console.log(`  ${genre}: +${n}`);
  }
  console.log(`  Null-genre updated: ${nullUpdated}`);

  // ── Phase 3: re-infer hShop titles ──
  console.log("\nPhase 3: Re-infer hShop titles...");
  const hshopGames = await db.game.findMany({
    where: { status: "active", source: "hshop" },
    select: { id: true, title: true, genre: true },
  });
  console.log(`  ${hshopGames.length} hShop games`);

  const hshopGroups = new Map<string, string[]>();
  let hshopUnchanged = 0;
  for (const g of hshopGames) {
    const genre = inferGenreFromTitle(g.title);
    if (genre === g.genre) {
      hshopUnchanged++;
      continue;
    }
    if (!hshopGroups.has(genre)) hshopGroups.set(genre, []);
    hshopGroups.get(genre)!.push(g.id);
  }

  let hshopUpdated = 0;
  for (const [genre, ids] of hshopGroups) {
    const n = await bulkSetGenre(ids, genre);
    hshopUpdated += n;
    console.log(`  ${genre}: +${n}`);
  }
  console.log(`  hShop re-inferred: ${hshopUpdated} (unchanged: ${hshopUnchanged})`);

  // ── Verify ──
  console.log("\n=== AFTER NORMALIZATION ===");
  const counts = await db.game.groupBy({
    by: ["genre"],
    where: { status: "active" },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });

  let validTotal = 0;
  let invalidTotal = 0;
  for (const c of counts) {
    if (c.genre && validSet.has(c.genre)) validTotal += c._count.id;
    else {
      invalidTotal += c._count.id;
      console.log(`  [!!] ${c.genre ?? "null"} => ${c._count.id}`);
    }
  }
  console.log(`Valid: ${validTotal} | Invalid/null: ${invalidTotal}`);

  console.log("\n=== CATEGORY COUNTS ===");
  const empty: string[] = [];
  for (const s of VALID_GENRES) {
    const c = counts.find((x) => x.genre === s);
    const n = c ? c._count.id : 0;
    console.log(`  ${s} => ${n}`);
    if (n === 0) empty.push(s);
  }
  console.log(empty.length ? `\nEMPTY: ${empty.join(", ")}` : "\nNo empty categories!");
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));

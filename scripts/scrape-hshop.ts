import * as cheerio from "cheerio";
import { db } from "../src/lib/db";
import { inferGenreFromTitle } from "./lib/normalize";

const BASE = "https://hshop.erista.me";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

// Only the games category (actual titles, not updates/DLC)
const SUBCATEGORIES = [
  "australia",
  "canada",
  "china",
  "europe",
  "france",
  "germany",
  "italy",
  "japan",
  "korea",
  "netherlands",
  "north-america",
  "russia",
  "spain",
  "taiwan",
  "united-kingdom",
  "unknown-other",
  "world",
];

// Demos — pass "demos" as argv to include them
const DEMO_SUBCATEGORIES = ["digital-demos", "kiosk-demos"];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
    .slice(0, 80);
}

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

interface HshopGame {
  hshopId: number;
  title: string;
  titleId: string;
  size: string;
  version: string;
  productCode: string;
  contentType: string;
  region: string;
  url: string;
}

function parseListEntry($: cheerio.CheerioAPI, el: any): HshopGame | null {
  const $el = $(el);
  const href = $el.attr("href") || "";
  const idMatch = href.match(/\/t\/(\d+)/);
  if (!idMatch) return null;

  const title = $el.find("h3").first().text().trim();
  if (!title) return null;

  const metas: Record<string, string> = {};
  $el.find(".meta-content").each((_, mc) => {
    const $mc = $(mc);
    const label = $mc.children("span").last().text().trim();
    const value = $mc.children("span").first().text().trim();
    if (label && value) metas[label] = value;
  });

  // region from h4 "content in games ➞ north-america"
  const h4 = $el.find("h4").text();
  const regionMatch = h4.match(/➞\s*(.+)$/);
  const region = regionMatch ? regionMatch[1].trim() : "";

  return {
    hshopId: parseInt(idMatch[1]),
    title,
    titleId: metas["Title ID"] || "",
    size: metas["Size"] || "",
    version: metas["Version"] || "",
    productCode: metas["Product Code"] || "",
    contentType: metas["Content Type"] || "",
    region,
    url: `${BASE}${href}`,
  };
}

async function scrapeSubcategory(sub: string): Promise<HshopGame[]> {
  const games: HshopGame[] = [];
  let offset = 0;
  const count = 100;

  while (true) {
    const url = `${BASE}/c/games/s/${sub}?count=${count}&offset=${offset}`;
    const html = await fetchPage(url);
    const $ = cheerio.load(html);

    const entries = $("a.list-entry.block-link").toArray();
    if (entries.length === 0) break;

    for (const el of entries) {
      const g = parseListEntry($, el);
      if (g) games.push(g);
    }

    // check "showing X - Y of Z"
    const showing = html.match(/showing\s+\d+\s*-\s*(\d+)\s+of\s+(\d+)/i);
    if (showing) {
      const end = parseInt(showing[1]);
      const total = parseInt(showing[2]);
      if (end >= total) break;
    }

    if (entries.length < count) break;
    offset += count;
    await new Promise((r) => setTimeout(r, 150));
  }

  return games;
}

async function importGames(hshopGames: HshopGame[]): Promise<{ created: number; linked: number; skipped: number }> {
  // Dedupe by hshopId within batch
  const seen = new Set<number>();
  const unique = hshopGames.filter((g) => {
    if (seen.has(g.hshopId)) return false;
    seen.add(g.hshopId);
    return true;
  });

  // Find existing 3ds games by slug candidates
  const slugCandidates = unique.map((g) => slugify(g.title));
  const existing = await db.game.findMany({
    where: { platform: "3ds", slug: { in: slugCandidates } },
    select: { id: true, slug: true },
  });
  const bySlug = new Map(existing.map((e) => [e.slug, e.id]));

  // Also fetch existing hshop-sourced games to avoid re-linking
  const existingHshop = await db.game.findMany({
    where: { source: "hshop", platform: "3ds" },
    select: { id: true, slug: true },
  });
  const hshopSlugs = new Set(existingHshop.map((e) => e.slug));

  let created = 0;
  let linked = 0;
  let skipped = 0;

  const gamesToCreate: any[] = [];
  const linksToCreate: any[] = [];
  const gameIdsNeedingLink: string[] = [];

  for (const g of unique) {
    const slug = slugify(g.title);

    // Prefer matching an existing 3ds game (from Telegram etc.)
    const existingId = bySlug.get(slug);

    if (existingId) {
      gameIdsNeedingLink.push(existingId);
      // store hshop metadata on the game
      await db.game.update({
        where: { id: existingId },
        data: {
          source: g.title ? "hshop" : undefined,
          fileSize: g.size || undefined,
        },
      }).catch(() => {});
      linked++;
      continue;
    }

    if (hshopSlugs.has(slug)) {
      skipped++;
      continue;
    }

    // Create new game
    const uniqueSlug = `${slug}-3ds`;
    gamesToCreate.push({
      title: g.title,
      slug: uniqueSlug,
      description: `${g.title} - Nintendo 3DS CIA${g.region ? ` (${g.region})` : ""}`,
      platform: "3ds",
      genre: inferGenreFromTitle(g.title),
      fileSize: g.size || null,
      source: "hshop",
      status: "active" as const,
    });
    // We'll link after create — stash mapping
    (g as any)._newSlug = uniqueSlug;
    created++;
  }

  // Create games
  if (gamesToCreate.length > 0) {
    const res = await db.game.createMany({ data: gamesToCreate, skipDuplicates: true });
    created = res.count;
  }

  // Map new slugs to ids
  const newSlugs = gamesToCreate.map((g) => g.slug);
  const newGames =
    newSlugs.length > 0
      ? await db.game.findMany({
          where: { slug: { in: newSlugs } },
          select: { id: true, slug: true },
        })
      : [];
  const idBySlug = new Map(newGames.map((ng) => [ng.slug, ng.id]));

  // Build links for all matched/new games
  for (const g of unique) {
    const slug = (g as any)._newSlug || slugify(g.title);
    const gameId = idBySlug.get(slug) || bySlug.get(slugify(g.title));
    if (!gameId) continue;

    linksToCreate.push({
      gameId,
      url: g.url,
      host: "hshop",
      fileSize: g.size || null,
      linkType: "direct" as const,
      source: `hshop:${g.hshopId}`,
      password: null,
      isActive: true,
    });
  }

  // Also link games that matched existing
  for (const gameId of gameIdsNeedingLink) {
    const g = unique.find((x) => bySlug.get(slugify(x.title)) === gameId);
    if (g) {
      linksToCreate.push({
        gameId,
        url: g.url,
        host: "hshop",
        fileSize: g.size || null,
        linkType: "direct" as const,
        source: `hshop:${g.hshopId}`,
        isActive: true,
      });
    }
  }

  // Dedupe links by gameId+url
  const linkSeen = new Set<string>();
  const dedupedLinks = linksToCreate.filter((l) => {
    const key = `${l.gameId}|${l.url}`;
    if (linkSeen.has(key)) return false;
    linkSeen.add(key);
    return true;
  });

  if (dedupedLinks.length > 0) {
    // Only create links that don't already exist
    const existingLinks = await db.downloadLink.findMany({
      where: { url: { in: dedupedLinks.map((l) => l.url) } },
      select: { url: true },
    });
    const existingUrls = new Set(existingLinks.map((e) => e.url));
    const toCreate = dedupedLinks.filter((l) => !existingUrls.has(l.url));
    if (toCreate.length > 0) {
      await db.downloadLink.createMany({ data: toCreate, skipDuplicates: true });
      linked += toCreate.length;
    }
  }

  return { created, linked, skipped };
}

async function main() {
  const args = process.argv.slice(2);
  const includeDemos = args.includes("demos");
  const subcats = includeDemos
    ? [...SUBCATEGORIES, ...DEMO_SUBCATEGORIES]
    : SUBCATEGORIES;

  console.log("=== hShop Scraper (3DS Games) ===");
  console.log(`Subcategories: ${subcats.length}${includeDemos ? " (incl. demos)" : ""}\n`);

  let totalCreated = 0;
  let totalLinked = 0;
  let totalSkipped = 0;
  let totalGames = 0;

  for (const sub of subcats) {
    try {
      const games = await scrapeSubcategory(sub);
      totalGames += games.length;
      console.log(`\n📁 ${sub}: ${games.length} titles`);

      if (games.length === 0) continue;

      const { created, linked, skipped } = await importGames(games);
      totalCreated += created;
      totalLinked += linked;
      totalSkipped += skipped;
      console.log(`  ✅ +${created} created, +${linked} linked, ${skipped} skipped`);

      await new Promise((r) => setTimeout(r, 300));
    } catch (err: any) {
      console.error(`\n  ❌ ${sub}: ${err.message}`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  console.log(`\n=== RESUMEN ===`);
  console.log(`Scrapeados: ${totalGames}`);
  console.log(`Creados: ${totalCreated}`);
  console.log(`Links agregados: ${totalLinked}`);
  console.log(`Saltados: ${totalSkipped}`);

  const total = await db.game.count({ where: { status: "active" } });
  const withLinks = await db.game.count({
    where: { status: "active", downloadLinks: { some: {} } },
  });
  console.log(`Total activos: ${total} | Con links: ${withLinks}`);
}

main().then(() => process.exit(0));

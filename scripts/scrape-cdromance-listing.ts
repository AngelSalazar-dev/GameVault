import * as cheerio from "cheerio";
import { db } from "../src/lib/db";
import { normalizeGenre } from "./lib/normalize";

const BASE = "https://cdromance.org";

const PLATFORMS: Record<string, string> = {
  "gba-roms": "gba",
  "nds-roms": "nds",
  "snes-rom": "snes",
  "nes-roms": "nes",
  "psx-iso": "ps1",
  psp: "psp",
  "n64-roms": "n64",
  gamecube: "gamecube",
  "dc-iso": "dreamcast",
  "gameboy-roms": "gb",
  "gameboy-color-roms": "gbc",
  "sega_saturn_isos": "saturn",
  "sega_cd_isos": "segacd",
  "sega_32x_roms": "32x",
  "sega_genesis_roms": "genesis",
  sms_roms: "mastersystem",
  "game-gear": "gamegear",
  "turbografx-16": "tg16",
  "turbografx-cd": "tgcd",
  "pc-fx": "pcfx",
  "neo-geo-pocket": "ngp",
  "neo-geo-cd": "ngcd",
  windows: "pc",
  msdos: "dos",
  "3do-iso": "3do",
  wonderswan: "wonderswan",
  "msx-roms": "msx",
  "wii-iso": "wii",
  "ps2-iso": "ps2",
  vita: "vita",
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

interface ListingGame {
  title: string;
  url: string;
  slug: string;
  cover: string;
  genre: string;
  language: string;
  downloads: number;
  score: number;
  region: string;
}

function parseListing(html: string): ListingGame[] {
  const $ = cheerio.load(html);
  const games: ListingGame[] = [];

  $(".game-container").each((_, el) => {
    const $el = $(el);
    const url = $el.find("a.cover-link").attr("href") || $el.find(".bottom-section > a").attr("href") || "";
    const title = $el.find(".game-title").text().trim();
    const cover = $el.find(".game-thumb img").attr("src") || "";
    const langs = $el.find(".lang");
    const genre = langs.eq(0).text().trim();
    const language = langs.eq(1).text().trim();
    const downloadsText = $el.find(".downloads").text().trim().replace(/[,\s]/g, "");
    const scoreText = $el.find(".score").text().trim().replace(/[,\s]/g, "");
    const region = $el.find(".region").text().trim();

    if (!url || !title) return;

    const path = new URL(url).pathname;
    const slug = path.split("/").filter(Boolean).pop() || slugify(title);

    games.push({
      title,
      url,
      slug,
      cover,
      genre,
      language,
      downloads: parseInt(downloadsText) || 0,
      score: parseFloat(scoreText) || 0,
      region,
    });
  });

  return games;
}

async function getMaxPage(platformSlug: string): Promise<number> {
  try {
    const html = await fetchPage(`${BASE}/${platformSlug}/`);
    const matches = [...html.matchAll(/page\/(\d+)/g)];
    if (matches.length === 0) return 1;
    return Math.max(...matches.map((m) => parseInt(m[1])));
  } catch {
    return 1;
  }
}

async function importGames(
  platformSlug: string,
  platform: string,
  games: ListingGame[]
): Promise<{ created: number; skipped: number }> {
  const existing = await db.game.findMany({
    where: { slug: { in: games.map((g) => g.slug) } },
    select: { slug: true },
  });
  const existingSet = new Set(existing.map((e) => e.slug));

  const toCreate = games
    .filter((g) => !existingSet.has(g.slug))
    .map((g) => ({
      title: g.title,
      slug: g.slug,
      description: `${g.title} - ROM for ${platform.toUpperCase()}`,
      platform,
      genre: normalizeGenre(g.genre),
      coverImage: g.cover,
      source: "cdromance",
      status: "active" as const,
      rating: g.score || 0,
      totalRatings: g.downloads > 0 ? 1 : 0,
    }));

  let created = 0;
  if (toCreate.length > 0) {
    try {
      const result = await db.game.createMany({ data: toCreate, skipDuplicates: true });
      created = result.count;
    } catch (err: any) {
      console.error(`  createMany error: ${err.message}`);
    }
  }

  return { created, skipped: games.length - created };
}

async function main() {
  const args = process.argv.slice(2);
  const platformsToRun = args.length > 0 ? args : Object.keys(PLATFORMS);

  console.log("=== CDRomance Scraper (Listing Phase) ===\n");

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const platformSlug of platformsToRun) {
    const platform = PLATFORMS[platformSlug];
    if (!platform) {
      console.warn(`Unknown platform: ${platformSlug}`);
      continue;
    }

    const maxPage = await getMaxPage(platformSlug);
    console.log(`\n📁 ${platformSlug} (${platform}) - ${maxPage} pages`);

    let platformCreated = 0;
    let platformSkipped = 0;

    for (let page = 1; page <= maxPage; page++) {
      const url =
        page === 1
          ? `${BASE}/${platformSlug}/`
          : `${BASE}/${platformSlug}/page/${page}/`;

      try {
        const html = await fetchPage(url);
        const games = parseListing(html);

        if (games.length === 0) {
          console.log(`  Page ${page}: 0 games, stopping`);
          break;
        }

        const { created, skipped } = await importGames(platformSlug, platform, games);
        platformCreated += created;
        platformSkipped += skipped;

        process.stdout.write(
          `  Page ${page}/${maxPage}: ${games.length} games (+${created})\r`
        );

        // Rate limit
        await new Promise((r) => setTimeout(r, 200));
      } catch (err: any) {
        console.error(`\n  Error page ${page}: ${err.message}`);
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    console.log(
      `\n  ✅ ${platformSlug}: +${platformCreated} created, ${platformSkipped} skipped`
    );
    totalCreated += platformCreated;
    totalSkipped += platformSkipped;
  }

  console.log(`\n=== RESUMEN ===`);
  console.log(`Creados: ${totalCreated}`);
  console.log(`Saltados: ${totalSkipped}`);

  const total = await db.game.count({ where: { status: "active" } });
  console.log(`Total juegos activos: ${total}`);
}

main().then(() => process.exit(0));
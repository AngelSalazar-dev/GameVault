import * as cheerio from "cheerio";
import { db } from "../src/lib/db";

const BASE = "https://cdromance.org";
const AJAX_URL = `${BASE}/wp-content/plugins/cdr-main/public/ajax.php`;

const PLATFORM_SLUG_MAP: Record<string, string> = {
  gba: "gba-roms",
  nds: "nds-roms",
  snes: "snes-rom",
  nes: "nes-roms",
  ps1: "psx-iso",
  psp: "psp",
  n64: "n64-roms",
  gamecube: "gamecube",
  dreamcast: "dc-iso",
  gb: "gameboy-roms",
  gbc: "gameboy-color-roms",
  saturn: "sega_saturn_isos",
  segacd: "sega_cd_isos",
  "32x": "sega_32x_roms",
  genesis: "sega_genesis_roms",
  mastersystem: "sms_roms",
  gamegear: "game-gear",
  tg16: "turbografx-16",
  tgcd: "turbografx-cd",
  pcfx: "pc-fx",
  ngp: "neo-geo-pocket",
  ngcd: "neo-geo-cd",
  pc: "windows",
  dos: "msdos",
  "3do": "3do-iso",
  wonderswan: "wonderswan",
  msx: "msx-roms",
  wii: "wii-iso",
  ps2: "ps2-iso",
  vita: "vita",
};

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function getDownloadLinks(postId: string, referer: string): Promise<{ url: string; fileName: string; fileSize: string }[]> {
  const res = await fetch(AJAX_URL, {
    method: "POST",
    headers: {
      "User-Agent": UA,
      "X-Requested-With": "XMLHttpRequest",
      Referer: referer,
      Origin: BASE,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ post_id: postId }),
  });
  if (!res.ok) throw new Error(`AJAX HTTP ${res.status}`);
  const html = await res.text();

  const $ = cheerio.load(html);
  const links: { url: string; fileName: string; fileSize: string }[] = [];

  $(".tr").each((_, el) => {
    const $el = $(el);
    const a = $el.find("a[href]");
    const href = a.attr("href");
    const fileName = a.text().trim();
    const fileSize = $el.find(".td").last().text().trim();
    if (href && fileName) {
      links.push({ url: href, fileName, fileSize });
    }
  });

  return links;
}

async function extractPostId(html: string): Promise<string | null> {
  const $ = cheerio.load(html);
  const articleId = $("article").attr("id"); // post-273124
  if (articleId) {
    const match = articleId.match(/post-(\d+)/);
    if (match) return match[1];
  }
  // Fallback: data-id on acf-content-wrapper
  const dataId = $("#acf-content-wrapper").data("id");
  if (dataId) return String(dataId);
  return null;
}

function extractMetadata(html: string) {
  const $ = cheerio.load(html);
  const getRow = (label: string): string => {
    let result = "";
    $("table.rom-info tr").each((_, tr) => {
      const th = $(tr).find("th").text().trim();
      if (th === label) {
        result = $(tr).find("td").text().trim();
      }
    });
    return result;
  };

  const description = $(".entry-content > p").first().text().trim().slice(0, 2000);
  const publisher = getRow("Publisher");
  const releaseDate = getRow("Game Release").split(" (")[0];
  const fileFormat = getRow("Image Format");
  const region = getRow("Region");
  const gameName = $('span[itemprop="name"]').text().trim();

  return { description, publisher, releaseDate, fileFormat, region, gameName };
}

async function main() {
  const args = process.argv.slice(2);
  const batchSize = parseInt(args[0]) || 50;
  const offset = parseInt(args[1]) || 0;

  console.log(`=== CDRomance Phase 2: Download Links ===`);
  console.log(`Batch: offset=${offset}, size=${batchSize}\n`);

  // Get games from cdromance that have no download links
  const games = await db.game.findMany({
    where: {
      source: "cdromance",
      status: "active",
      downloadLinks: { none: {} },
    },
    select: { id: true, slug: true, title: true, platform: true },
    skip: offset,
    take: batchSize,
    orderBy: { createdAt: "asc" },
  });

  console.log(`Games to process: ${games.length}`);

  let processed = 0;
  let withLinks = 0;
  let errors = 0;

  for (const game of games) {
    const platformSlug = PLATFORM_SLUG_MAP[game.platform];
    if (!platformSlug) {
      processed++;
      continue;
    }

    const gameUrl = `${BASE}/${platformSlug}/${game.slug}/`;

    try {
      const html = await fetchPage(gameUrl);
      const postId = await extractPostId(html);

      if (!postId) {
        errors++;
        processed++;
        continue;
      }

      const meta = extractMetadata(html);

      // Update game with metadata
      const updateData: any = {};
      if (meta.publisher) updateData.publisher = meta.publisher;
      if (meta.description) updateData.description = meta.description;
      if (meta.releaseDate) {
        const yearMatch = meta.releaseDate.match(/\d{4}/);
        if (yearMatch) updateData.releaseYear = parseInt(yearMatch[0]);
      }
      if (Object.keys(updateData).length > 0) {
        await db.game.update({
          where: { id: game.id },
          data: updateData,
        });
      }

      // Get download links
      const links = await getDownloadLinks(postId, gameUrl);

      if (links.length > 0) {
        await db.downloadLink.createMany({
          data: links.map((l) => ({
            gameId: game.id,
            url: l.url,
            host: "cdromance",
            fileSize: l.fileSize,
            linkType: "direct" as const,
            source: l.fileName,
            isActive: true,
          })),
          skipDuplicates: true,
        });
        withLinks++;
      }

      processed++;
      process.stdout.write(`  ${processed}/${games.length} (links: ${withLinks}, errors: ${errors})\r`);

      await new Promise((r) => setTimeout(r, 250));
    } catch (err: any) {
      errors++;
      processed++;
      if (errors < 5) console.error(`\n  Error ${game.slug}: ${err.message}`);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  console.log(`\n\n=== RESULTADO ===`);
  console.log(`Procesados: ${processed}`);
  console.log(`Con links: ${withLinks}`);
  console.log(`Errores: ${errors}`);

  const total = await db.game.count({
    where: { source: "cdromance", downloadLinks: { some: {} } },
  });
  console.log(`CDRomance games with links: ${total}`);
}

main().then(() => process.exit(0));
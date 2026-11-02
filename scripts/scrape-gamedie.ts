/**
 * Gamdie scraper (https://gamdie.com/)
 *
 * Patron igual al de scrape-ovagames.ts / scrape-hshop.ts:
 *   listado -> detalle -> match por slug -> crea juego si no existe -> agrega links.
 *
 * Uso:
 *   npx tsx scripts/scrape-gamedie.ts --limit 5     # etapa 1 (prueba)
 *   npx tsx scripts/scrape-gamedie.ts --limit 50    # etapa 2
 *   npx tsx scripts/scrape-gamedie.ts               # etapa 3 (completo)
 *   npx tsx scripts/scrape-gamedie.ts --dry-run     # no escribe en la DB
 */
import axios from "axios";
import * as cheerio from "cheerio";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import { normalizeGenre } from "./lib/normalize";

const prisma = new PrismaClient();

const BASE = "https://gamdie.com";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const DELAY_MS = 1500;
const SOURCE = "gamdie";
const PROGRESS_FILE = "scripts/progress-gamdie.json";

// /updated-games/ trae los titulos en el texto del link.
// /popular-games/ solo trae imagenes, pero agrega juegos que no estan en el otro.
// El sitio NO pagina: /page/N/ devuelve siempre la misma pagina.
const LISTINGS = [`${BASE}/updated-games/`, `${BASE}/popular-games/`];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 80);
}

/** "Geometry Dash Download (v2.2081)" -> "Geometry Dash" */
function cleanTitle(title: string): string {
  return title
    .replace(/\s*[-–—]\s*Download\s*(\(.*\))?$/i, "")
    .replace(/\s*Download\s*(\(.*\))?\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Host del link tal como ya se usa en la DB (gofile, vikingfile, mediafire...) */
function hostFromUrl(url: string): string {
  try {
    const h = new URL(url).hostname.replace(/^www\./, "");
    const first = h.split(".")[0];
    return first || h;
  } catch {
    return "unknown";
  }
}

/** Anclas que no son de gamdie ni de la tienda de steam = links de descarga */
const IGNORED_HOSTS = new Set([
  "gamdie.com",
  "store.steampowered.com",
  "discord.gg",
  "discord.com",
  "twitter.com",
  "x.com",
  "facebook.com",
  "youtube.com",
  "wp.com",
  "wordpress.com",
]);

/**
 * NOTA sobre bzzhr.to: responde 403 a node-fetch/axios (con y sin Referer),
 * pero en navegador real responde 200 y descarga bien. Es bloqueo por
 * fingerprint de HTTP, no un host muerto. Como /download/[id] redirige desde
 * el navegador del usuario, el link SI funciona y se importa.
 * Se puede excluir con --skip-bzzhr.
 */
const SKIP_HOSTS = new Set<string>();

const SKIP_PATHS = new Set([
  "/",
  "/about",
  "/contact",
  "/popular-games",
  "/updated-games",
  "/troubleshoot",
]);

async function fetchHtml(url: string): Promise<string | null> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await axios.get(url, {
        headers: {
          "User-Agent": UA,
          Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        timeout: 30000,
        validateStatus: (s) => s === 200,
      });
      return String(res.data);
    } catch (err: any) {
      const msg = err?.message?.substring(0, 80) ?? "";
      if (attempt === 3) {
        console.log(`  ! fallo ${url}: ${msg}`);
        return null;
      }
      const wait = attempt * 3000;
      console.log(`  reintento ${attempt}/3 en ${wait}ms (${msg})`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  return null;
}

interface Discovered {
  url: string;
  title: string | null;
}

async function collectGames(): Promise<Discovered[]> {
  const byUrl = new Map<string, Discovered>();

  for (const listing of LISTINGS) {
    const html = await fetchHtml(listing);
    if (!html) continue;
    const $ = cheerio.load(html);

    $("a").each((_, el) => {
      const href = $(el).attr("href") ?? "";
      if (!href.startsWith("http")) return;

      let path: string;
      let full: string;
      try {
        const u = new URL(href);
        if (!u.hostname.endsWith("gamdie.com")) return;
        path = u.pathname;
        full = `${BASE}${u.pathname}`;
      } catch {
        return;
      }

      // /poplar-games/ , /updated-games/ , /about/ , /contact/ , /troubleshoot/
      if (!/^\/[a-z0-9][a-z0-9-]*\/?$/i.test(path)) return;
      if (SKIP_PATHS.has(path.replace(/\/+$/, ""))) return;

      const text = $(el).text().trim().replace(/\s+/g, " ");
      const title = text.length > 3 && /download/i.test(text) ? cleanTitle(text) : null;

      const prev = byUrl.get(full);
      if (!prev) byUrl.set(full, { url: full, title });
      else if (!prev.title && title) byUrl.set(full, { url: full, title });
    });

    console.log(`  ${listing} -> ${byUrl.size} juegos acumulados`);
  }

  return [...byUrl.values()];
}

interface ScrapedGame {
  url: string;
  title: string;
  cover: string | null;
  description: string | null;
  genre: string | null;
  developer: string | null;
  publisher: string | null;
  fileSize: string | null;
  links: { url: string; host: string; label: string }[];
}

async function scrapeGame(url: string, fallbackTitle: string | null): Promise<ScrapedGame | null> {
  const html = await fetchHtml(url);
  if (!html) return null;
  const $ = cheerio.load(html);

  const h1 = $("h1").first().text().trim();
  if (!h1) return null;

  const title = cleanTitle(h1) || fallbackTitle;
  if (!title) return null;

  const cover = $('meta[property="og:image"]').attr("content") ?? null;
  const description =
    $("h2.gp-subtitle").first().text().trim() ||
    $('meta[name="description"]').attr("content") ||
    null;

  // Game Info: <span class="gp-post-meta-before-text">Label: </span><span class="gp-post-meta-value">valor</span>
  const meta: Record<string, string> = {};
  $("span.gp-post-meta-inner").each((_, el) => {
    const label = $(el)
      .find(".gp-post-meta-before-text")
      .text()
      .replace(/\s*:?\s*$/, "")
      .trim();
    const value = $(el).find(".gp-post-meta-value").text().trim();
    if (label && value) meta[label.toLowerCase()] = value;
  });

  // Available Links: div.elementor-widget-ghostpool_button a[rel=nofollow]
  const links: { url: string; host: string; label: string }[] = [];
  const seen = new Set<string>();
  $("div.elementor-widget-ghostpool_button a[href], .gp-element-button a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const label = $(el).find(".gp-button-text").text().trim() || $(el).text().trim();
    if (!href.startsWith("http")) return;

    let hostname = "";
    try {
      hostname = new URL(href).hostname.replace(/^www\./, "");
    } catch {
      return;
    }
    if (IGNORED_HOSTS.has(hostname)) return;
    if (seen.has(href)) return;
    seen.add(href);

    const host = hostFromUrl(href);
    if (SKIP_HOSTS.has(host)) return;

    links.push({
      url: href,
      host,
      label: label.replace(/\s+/g, " ").trim().slice(0, 60),
    });
  });

  return {
    url,
    title,
    cover,
    description,
    genre: meta["genre"] ? normalizeGenre(meta["genre"]) : null,
    developer: meta["developer"] ?? null,
    publisher: meta["released by"] ?? null,
    fileSize: meta["game size"] ?? null,
    links,
  };
}

function loadProgress(): { processed: string[] } {
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf-8"));
  } catch {
    return { processed: [] };
  }
}

function saveProgress(processed: string[]) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify({ processed }, null, 2), "utf-8");
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const limitArg = args.indexOf("--limit");
  const limit = limitArg !== -1 ? parseInt(args[limitArg + 1], 10) : Infinity;
  const reset = args.includes("--reset");
  if (args.includes("--skip-bzzhr")) SKIP_HOSTS.add("bzzhr");

  console.log("=== GAMDIE SCRAPER ===");
  console.log(`modo: ${dryRun ? "DRY RUN (no escribe)" : "escribe en DB"}`);
  console.log(`limite: ${limit === Infinity ? "sin limite" : limit}`);
  if (reset && fs.existsSync(PROGRESS_FILE)) {
    fs.unlinkSync(PROGRESS_FILE);
    console.log("progreso anterior borrado");
  }

  console.log("\n1) Recolectando listado...");
  let discovered = await collectGames();
  console.log(`   total juegos en gamdie: ${discovered.length}`);

  const processed = new Set<string>(loadProgress().processed);
  if (processed.size > 0 && limit === Infinity) {
    const before = discovered.length;
    discovered = discovered.filter((d) => !processed.has(d.url));
    console.log(`   ${before - discovered.length} ya procesados, quedan ${discovered.length}`);
  }

  if (limit !== Infinity) discovered = discovered.slice(0, limit);
  console.log(`   a procesar en esta corrida: ${discovered.length}\n`);

  // El progreso se acumula en el Set; antes se reescribia con el array inicial
  // en cada iteracion y solo quedaba la ultima URL.
  // En dry-run no se toca el archivo.
  function markDone(u: string) {
    if (dryRun) return;
    processed.add(u);
    saveProgress([...processed]);
  }

  const stats = {
    scanned: 0,
    gamesMatched: 0,
    gamesCreated: 0,
    linksSeen: 0,
    linksAdded: 0,
    gamesWithoutLinks: 0,
  };
  const hostCount: Record<string, number> = {};
  const newGames: string[] = [];
  const matchedGames: string[] = [];
  const noLinkGames: string[] = [];

  for (const [i, item] of discovered.entries()) {
    stats.scanned++;
    process.stdout.write(`  [${i + 1}/${discovered.length}] ${item.url.replace(BASE, "")} ... `);

    const game = await scrapeGame(item.url, item.title);
    if (!game) {
      console.log("sin datos");
      continue;
    }

    stats.linksSeen += game.links.length;
    for (const l of game.links) hostCount[l.host] = (hostCount[l.host] ?? 0) + 1;

    if (game.links.length === 0) {
      stats.gamesWithoutLinks++;
      noLinkGames.push(game.title);
    }

    const slug = slugify(game.title);
    if (!slug) {
      console.log("slug vacio");
      continue;
    }

    const existing = await prisma.game.findUnique({ where: { slug }, select: { id: true } });

    let gameId: string;
    if (existing) {
      gameId = existing.id;
      stats.gamesMatched++;
      matchedGames.push(`${game.title} (${slug})`);
    } else {
      matchedGames.push(`NUEVO: ${game.title} (${slug})`);
      if (dryRun) {
        stats.gamesCreated++;
        newGames.push(game.title);
        console.log(`${game.links.length} links [${dryRun ? "dry-run" : ""}]`);
        continue;
      }
      const created = await prisma.game.create({
        data: {
          title: game.title,
          slug,
          description: game.description,
          platform: "pc",
          genre: game.genre,
          developer: game.developer,
          publisher: game.publisher,
          coverImage: game.cover,
          fileSize: game.fileSize,
          status: "pending",
          source: SOURCE,
        },
      });
      gameId = created.id;
      stats.gamesCreated++;
      newGames.push(`${game.title} -> ${game.links.length} links`);
    }

    if (!dryRun && game.links.length > 0) {
      // Mismo dedupe que scrape-hshop.ts: traer las urls existentes y filtrar en memoria.
      const existingLinks = await prisma.downloadLink.findMany({
        where: { url: { in: game.links.map((l) => l.url) } },
        select: { url: true },
      });
      const existingUrls = new Set(existingLinks.map((e) => e.url));
      const toCreate = game.links
        .filter((l) => !existingUrls.has(l.url))
        .map((l) => ({
          gameId,
          url: l.url,
          host: l.host,
          linkType: "direct" as const,
          source: SOURCE,
          password: null,
          isActive: true,
        }));

      if (toCreate.length > 0) {
        await prisma.downloadLink.createMany({ data: toCreate });
        stats.linksAdded += toCreate.length;
      }
    }

    console.log(`${game.links.length} links${existing ? " [existente]" : " [nuevo]"}`);
    markDone(item.url);

    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  console.log("\n=== RESUMEN ===");
  console.log(`Juegos revisados:      ${stats.scanned}`);
  console.log(`  ya en la base:       ${stats.gamesMatched}`);
  console.log(`  creados (pending):   ${stats.gamesCreated}`);
  console.log(`  sin links:           ${stats.gamesWithoutLinks}`);
  console.log(`Links vistos:          ${stats.linksSeen}`);
  console.log(`Links agregados:       ${stats.linksAdded}`);
  console.log(
    `Promedio links/juego:  ${(stats.linksSeen / Math.max(1, stats.scanned)).toFixed(2)}`
  );

  console.log("\nHosts encontrados:");
  for (const [h, n] of Object.entries(hostCount).sort((a, b) => b[1] - a[1]))
    console.log(`  ${h.padEnd(16)} ${n}`);

  if (newGames.length) {
    console.log(`\nJuegos nuevos (${newGames.length}):`);
    for (const g of newGames) console.log(`  + ${g}`);
  }
  if (noLinkGames.length) {
    console.log(`\nSin links (${noLinkGames.length}): ${noLinkGames.slice(0, 15).join(", ")}`);
  }

  if (dryRun) {
    console.log("\n(dry run: no se modifico nada en la base de datos)");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
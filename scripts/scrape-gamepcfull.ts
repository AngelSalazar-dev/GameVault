/**
 * GamePCFull scraper (https://gamepcfull.com/)
 *
 * Mismo patron que scrape-gamedie.ts: sitemap -> detalle -> match por slug ->
 * crea juego si no existe -> agrega links.
 *
 * Descubrimiento via sitemap (5,023 urls en 6 archivos) en vez de paginar
 * /all-game/page/N/ (279 paginas x 23 juegos). Menos peticiones y mas rapido.
 *
 * Uso:
 *   npx tsx scripts/scrape-gamepcfull.ts --limit 5          # etapa 1
 *   npx tsx scripts/scrape-gamepcfull.ts --limit 50         # etapa 2
 *   npx tsx scripts/scrape-gamepcfull.ts                    # etapa 3
 *   npx tsx scripts/scrape-gamepcfull.ts --dry-run
 *   npx tsx scripts/scrape-gamepcfull.ts --reset
 */
import axios from "axios";
import * as cheerio from "cheerio";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import { normalizeGenre } from "./lib/normalize";

const prisma = new PrismaClient();

const BASE = "https://gamepcfull.com";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const DELAY_MS = 1200;
const SOURCE = "gamepcfull";
const PROGRESS_FILE = "scripts/progress-gamepcfull.json";

/** Paginas del sitio que no son juegos */
const SKIP_PATHS = new Set([
  "all-game",
  "tutorial-download",
  "software-essentials",
  "faq",
  "bypass-google-drive-download-limit",
  "contact",
  "about",
  "privacy-policy",
  "terms-of-use",
  "dmca",
  "advertise",
  "sitemap",
]);

/** Hosts que no son links de descarga */
const IGNORED_HOSTS = new Set([
  "gamepcfull.com",
  "game18x.com",
  "facebook.com",
  "twitter.com",
  "pinterest.com",
  "linkedin.com",
  "wp.com",
  "gravatar.com",
  "gstatic.com",
  "google.com",
  "store.steampowered.com",
  "discord.gg",
]);

/**
 * Lista blanca de hosts de archivos. Se usa allowlist y no blocklist porque el
 * sitio mete en cada pagina links de WinRAR, 7-Zip, daemon tools, "support",
 * la tienda de GOG y el cliente qBittorrent. Esos son software del sitio, no
 * descargas del juego.
 */
const FILE_HOSTS = new Set([
  "filecrypt",
  "gofile",
  "1fichier",
  "vikingfile",
  "pixeldrain",
  "buffdrive",
  "bzzhr",
  "buzzheavier",
  "bowfile",
  "mediafire",
  "mega",
  "dropbox",
  "workupload",
  "uploadhaven",
  "multiup",
  "cyberdrop",
  "reupload",
  "hydrafiles",
  "alisto",
  "terabox",
  "katfile",
  "fileditch",
  "modsfire",
  "uploadfiles",
  "4shared",
  "keepvid",
  "droppy",
  "1drv",
  "zippyshare",
  "uploaded",
  "bayfiles",
  "datanodes",
  "filekeeper",
  "megausercontent",
  "gofiledrive",
  "uploadedto",
  "skfile",
  "scribd",
]);

/**
 * Palabras de edicion/paquete que cambian el titulo entre sitios pero no el juego:
 * SteamRip guarda "frostpunk-goty", GamePCFull guarda "Frostpunk Game of the Year Edition".
 * Sin quitarlas se crean juegos duplicados.
 * El flag i es obligatorio: los slugs de la base van en minuscula y los titulos del
 * sitio no ("Game of the Year Edition" con mayusculas).
 */
const EDITION_WORDS =
  /\b(edition|deluxe|goty|game\s+of\s+the\s+year|ultimate|complete|definitive|remastered|remaster|expanded|anniversary|premium|standard|collector|gold|final|plus|pro|enhanced|upgrade|extreme|first\s+person|trilogy|collection|hd|next\s+gen|multi\d*|fitgirl|dodi|elamigos|elenemigos|rune|codex|plaza|razor1911|hypervisor|reloaded|steam)\b/gi;

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

/**
 * Quita los tags de edicion/repack que mete el sitio en los titulos:
 *   "FIFA 27 / EA Sports FC 27 [Hypervisor] [ElAmigos]" -> "FIFA 27 / EA Sports FC 27"
 *   "Rescue HQ - The Tycoon (GOG)"                     -> "Rescue HQ - The Tycoon"
 * Se hace porque los slugs de SteamRip en la base no llevan esos tags,
 * y sin quitarlos el match falla y se crean juegos duplicados.
 */
function stripTags(title: string): string {
  return title
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hostFromUrl(url: string): string {
  try {
    const h = new URL(url).hostname.replace(/^www\./, "");
    return h.split(".")[0] || h;
  } catch {
    return "unknown";
  }
}

/**
 * Clave laxa para comparar juegos entre sitios: sin tags de edicion, sin
 * repeticiones y sin palabras de edicion.
 *   "Frostpunk Game of the Year Edition" -> "frostpunk"
 *   "frostpunk-goty"                      -> "frostpunk"
 */
function looseKey(text: string): string {
  return slugify(text.replace(EDITION_WORDS, " "))
    .split("-")
    .filter(Boolean)
    .join("-")
    .replace(/^-+|-+$/g, "");
}

function isFileLink(url: string, host: string): boolean {
  if (/\.(torrent|magnet)($|\?)/i.test(url)) return true;
  return FILE_HOSTS.has(host);
}

async function fetchText(url: string): Promise<string | null> {
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
      const msg = err?.message?.substring(0, 70) ?? "";
      if (attempt === 3) {
        console.log(`  ! fallo ${url}: ${msg}`);
        return null;
      }
      await new Promise((r) => setTimeout(r, attempt * 3000));
    }
  }
  return null;
}

async function discoverUrls(): Promise<string[]> {
  const indexXml = await fetchText(`${BASE}/sitemap-index-1.xml`);
  if (!indexXml) throw new Error("no se pudo leer sitemap-index-1.xml");

  const sitemaps = [...indexXml.matchAll(/<loc>(.*?)<\/loc>/g)]
    .map((m) => m[1].trim())
    .filter((u) => u.endsWith(".xml"));

  console.log(`  sitemaps: ${sitemaps.length}`);

  const urls: string[] = [];
  const seen = new Set<string>();

  for (const sm of sitemaps) {
    const xml = await fetchText(sm);
    if (!xml) continue;
    let added = 0;
    for (const m of xml.matchAll(/<loc>(.*?)<\/loc>/g)) {
      const u = m[1].trim().replace(/&amp;/g, "&");
      const path = u.replace(`${BASE}/`, "").replace(/\/$/, "");
      if (!path || path.includes("/")) continue;
      if (SKIP_PATHS.has(path.toLowerCase())) continue;
      if (seen.has(u)) continue;
      seen.add(u);
      urls.push(u);
      added++;
    }
    console.log(`    ${sm.split("/").pop()}: +${added} (total ${urls.length})`);
    await new Promise((r) => setTimeout(r, 500));
  }

  return urls;
}

interface ScrapedGame {
  url: string;
  title: string;
  rawTitle: string;
  cover: string | null;
  description: string | null;
  genre: string | null;
  developer: string | null;
  publisher: string | null;
  releaseYear: number | null;
  fileSize: string | null;
  links: { url: string; host: string; linkType: "direct" | "torrent" }[];
}

async function scrapeGame(url: string): Promise<ScrapedGame | null> {
  const html = await fetchText(url);
  if (!html) return null;
  const $ = cheerio.load(html);

  const h1 = $("h1").first().text().trim();
  if (!h1) return null;

  const title = stripTags(h1);
  if (!title) return null;

  const cover = $('meta[property="og:image"]').attr("content") ?? null;
  const description = $('meta[name="description"]').attr("content") ?? null;

  // Metadata dentro de <blockquote class="wp-block-quote">:
  //   <p><strong>DEVELOPER:&nbsp;OSome Studio</strong></p>
  //   <p><strong>FILE SIZE</strong><em>:&nbsp;</em><strong>4.5 GB</strong></p>
  const info = $("blockquote.wp-block-quote").first().text().replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();

  const pick = (label: string): string | null => {
    const re = new RegExp(`${label}\\s*:?\\s*([^|]+?)(?=\\s{0,3}(?:TITLE|DEVELOPER|PUBLISHER|RELEASE DATE|GENRE|FILE SIZE)\\b|$)`, "i");
    const m = info.match(re);
    return m ? m[1].trim().slice(0, 160) : null;
  };

  const releaseRaw = pick("RELEASE DATE");
  const yearMatch = releaseRaw?.match(/\b(19|20)\d{2}\b/);

  const links: { url: string; host: string; linkType: "direct" | "torrent" }[] = [];
  const seenLinks = new Set<string>();
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    if (!href.startsWith("http")) return;

    let hostname = "";
    try {
      hostname = new URL(href).hostname.replace(/^www\./, "");
    } catch {
      return;
    }
    if (IGNORED_HOSTS.has(hostname)) return;
    if (seenLinks.has(href)) return;

    const host = hostFromUrl(href);
    if (!isFileLink(href, host)) return;
    seenLinks.add(href);

    links.push({ url: href, host, linkType: /\.torrent($|\?)/i.test(href) ? ("torrent" as const) : ("direct" as const) });
  });

  return {
    url,
    title,
    rawTitle: h1,
    cover,
    description,
    genre: (() => {
      const g = pick("GENRE");
      return g ? normalizeGenre(g.split(",")[0]) : null;
    })(),
    developer: pick("DEVELOPER"),
    publisher: pick("PUBLISHER"),
    releaseYear: yearMatch ? parseInt(yearMatch[0], 10) : null,
    fileSize: pick("FILE SIZE"),
    links,
  };
}

/**
 * Marca un sufijo como "numérico" (4, 2019, ii). Estas palabras NUNCA se
 * deben quitar al buscar el titulo base: "fifa-19" no es "fifa" y
 * "resident-evil-4" no es "resident-evil".
 */
function isTrailingNoise(word: string): boolean {
  return !/^\d+$/.test(word) && !/^\d+(st|nd|rd|th)$/.test(word);
}

/**
 * Candidatos de clave laxa, del mas largo al mas corto, para emparejar por
 * prefijo. Motivo: los <h1> del sitio anaden subtiítulos y packs que la lista
 * de EDITION_WORDS no cubre:
 *   "Northgard: The Viking Age Edition (v3.6.20.40749) [GOG]"
 *     -> northgard-the-viking-age -> northgard-the -> northgard  <- este
 *   "Oxygen Not Included The Bionic Booster Pack (v646843) [TENOKE]"
 *     -> oxygen-not-included-the-bionic-booster-pack
 *     -> oxygen-not-included-the-bionic -> ... -> oxygen-not-included  <- este
 *   "Tropico 6 El Prez Edition" -> tropico-6-el-prez -> tropico-6  <- este
 * Quitar palabras SOLO del final y detenerse en la primera coincidencia unica
 * mantiene el conservatism: si "resident-evil-4" esta en la base, se usa ese
 * y nunca se cae a "resident-evil".
 */
function looseKeyCandidates(text: string): string[] {
  const words = looseKey(text).split("-").filter(Boolean);
  const out: string[] = [];
  for (let n = words.length; n > 0; n--) {
    const tail = words.slice(n);
    // Maximo 5 palabras de ruido.
    if (tail.length > 5) break;
    // No se tocan numeros/versiones: "fifa-19" no es "fifa".
    if (!tail.every(isTrailingNoise)) break;
    // Se permite bajar a una sola palabra ("frostpunk", "northgard"), pero
    // nunca a una tan corta que colisione: "dead space" no debe caer en "dead".
    if (words.slice(0, n).join("-").length < 6) break;
    const key = words.slice(0, n).join("-");
    if (!out.includes(key)) out.push(key);
  }
  return out;
}

type Candidate = { id: string; slug: string; title: string };

/**
 * Busca el juego existente usando las claves candidatas de la mas larga a la
 * mas corta. Se detiene en la primera que devuelva exactamente un candidato.
 * Si una clave devuelve mas de uno, se considera ambigua y se abandona (no se
 * sigue recortando, porque podria terminar en un juego equivocado).
 */
function findByPrefix(
  text: string,
  index: Map<string, Candidate[]>
): { match: Candidate | null; ambiguousBy: string | null; candidates: Candidate[]; dropped: number } {
  const cands = looseKeyCandidates(text);
  for (let i = 0; i < cands.length; i++) {
    const key = cands[i];
    const hits = index.get(key);
    if (!hits || hits.length === 0) continue;
    const unique = [...new Map(hits.map((c) => [c.id, c])).values()];
    if (unique.length === 1) return { match: unique[0], ambiguousBy: null, candidates: unique, dropped: i };
    return { match: null, ambiguousBy: key, candidates: unique, dropped: i };
  }
  return { match: null, ambiguousBy: null, candidates: [], dropped: 0 };
}

async function buildGameIndex(): Promise<Map<string, Candidate[]>> {
  console.log("\n2) Cargando indice de juegos PC existentes para evitar duplicados...");
  const games = await prisma.game.findMany({
    where: { platform: "pc" },
    select: { id: true, slug: true, title: true },
  });
  const index = new Map<string, Candidate[]>();
  for (const g of games) {
    for (const key of new Set([looseKey(g.slug), looseKey(g.title)])) {
      if (!key || key.length < 4) continue;
      const arr = index.get(key) ?? [];
      arr.push(g);
      index.set(key, arr);
    }
  }
  console.log(`   ${games.length} juegos PC -> ${index.size} claves laxas`);
  return index;
}

function loadProgress(): string[] {
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf-8")).processed ?? [];
  } catch {
    return [];
  }
}

function saveProgress(processed: string[]) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify({ processed }, null, 2), "utf-8");
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const reset = args.includes("--reset");
  const limitArg = args.indexOf("--limit");
  const limit = limitArg !== -1 ? parseInt(args[limitArg + 1], 10) : Infinity;
  const onlyExisting = args.includes("--only-existing");

  console.log("=== GAMEPCFULL SCRAPER ===");
  console.log(`modo: ${dryRun ? "DRY RUN (no escribe)" : "escribe en DB"}`);
  console.log(`limite: ${limit === Infinity ? "sin limite" : limit}`);
  console.log(
    `modo: ${
      onlyExisting
        ? "solo agrega links a juegos existentes, NO crea juegos (los nuevos van a un reporte)"
        : "crea juegos nuevos como pending"
    }`
  );
  if (reset && fs.existsSync(PROGRESS_FILE)) {
    fs.unlinkSync(PROGRESS_FILE);
    console.log("progreso anterior borrado");
  }

  console.log("\n1) Descubriendo juegos via sitemap...");
  let urls = await discoverUrls();
  console.log(`   total juegos: ${urls.length}`);

  const processed = new Set<string>(loadProgress());
  if (processed.size > 0) {
    const before = urls.length;
    urls = urls.filter((u) => !processed.has(u));
    console.log(`   ${before - urls.length} ya procesados, quedan ${urls.length}`);
  }
  if (limit !== Infinity) urls = urls.slice(0, limit);
  console.log(`   a procesar: ${urls.length}\n`);

  const stats = {
    scanned: 0,
    matchedExact: 0,
    matchedByCleanTitle: 0,
    matchedByLooseKey: 0,
    created: 0,
    linksSeen: 0,
    linksAdded: 0,
    withoutLinks: 0,
    errors: 0,
    ambiguous: 0,
    skippedNew: 0,
  };
  const hostCount: Record<string, number> = {};
  const newGames: string[] = [];
  const weakMatches: {
    titulo: string;
    url: string;
    asignadoA: string;
    palabrasRebajadas: number;
  }[] = [];
  const ambiguous: {
    titulo: string;
    url: string;
    candidates: { slug: string; title: string }[];
    links: number;
  }[] = [];
  const index = await buildGameIndex();
  console.log("");

  // En dry-run no se toca el archivo de progreso: asi se puede repetir
  // la prueba sin perder el avance real.
  function markDone(u: string) {
    if (dryRun) return;
    processed.add(u);
    saveProgress([...processed]);
  }

  for (const [i, url] of urls.entries()) {
    stats.scanned++;
    process.stdout.write(`  [${i + 1}/${urls.length}] ${url.replace(`${BASE}/`, "")} ... `);

    const game = await scrapeGame(url);
    if (!game) {
      stats.errors++;
      console.log("error");
      await new Promise((r) => setTimeout(r, DELAY_MS));
      continue;
    }

    stats.linksSeen += game.links.length;
    for (const l of game.links) hostCount[l.host] = (hostCount[l.host] ?? 0) + 1;
    if (game.links.length === 0) {
      stats.withoutLinks++;
      console.log(`sin links (${game.title})`);
      markDone(url);
      await new Promise((r) => setTimeout(r, DELAY_MS));
      continue;
    }

    // Match en 3 pasos:
    //   1) slug exacto del titulo tal cual
    //   2) slug con el titulo sin tags [ElAmigos] / (GOG)
    //   3) clave laxa (sin palabras de edicion) contra el indice de la DB
    const slugFull = slugify(game.rawTitle);
    const slugClean = slugify(game.title);

    let existing = slugFull ? await prisma.game.findUnique({ where: { slug: slugFull }, select: { id: true } }) : null;
    let matchedBy = "exact";

    if (!existing && slugClean !== slugFull) {
      existing = await prisma.game.findUnique({ where: { slug: slugClean }, select: { id: true } });
      if (existing) matchedBy = "sinTags";
    }

    if (!existing) {
      const found = findByPrefix(game.title, index);
      if (found.match) {
        existing = { id: found.match.id };
        matchedBy = "claveLaxa";
        // Match muy rebajado ("northgard-the-viking-age" -> "northgard").
        // En --only-existing esto solo mal coloca links, nunca crea juegos, asi
        // que se acepta; pero se anota para poder auditarlo.
        if (found.dropped >= 2) {
          weakMatches.push({
            titulo: game.title,
            url,
            asignadoA: found.match.slug,
            palabrasRebajadas: found.dropped,
          });
        }
      } else if (found.candidates.length > 1) {
        // Varios juegos de la base podrian ser este. No se adivina: se salta
        // y se reporta para que se decida a mano.
        ambiguous.push({
          titulo: game.title,
          url,
          candidates: found.candidates.map((c) => ({ slug: c.slug, title: c.title })),
          links: game.links.length,
        });
        stats.ambiguous++;
        console.log(`${game.links.length} links [AMBIGUO, se salta]`);
        markDone(url);
        await new Promise((r) => setTimeout(r, DELAY_MS));
        continue;
      }
    }

    let gameId: string;

    if (existing) {
      gameId = existing.id;
      if (matchedBy === "exact") stats.matchedExact++;
      else if (matchedBy === "sinTags") stats.matchedByCleanTitle++;
      else stats.matchedByLooseKey++;
      console.log(`${game.links.length} links [existente/${matchedBy}]`);
    } else {
      if (!slugClean) {
        console.log("slug vacio");
        continue;
      }

      // --only-existing: no se crea el juego, pero no se pierde el link.
      // Se acumula en el reporte para decidir despues.
      if (onlyExisting) {
        newGames.push(
          `${game.title} | ${game.url} | ${game.links.length} links | "slug candidato: ${slugClean}"`
        );
        stats.skippedNew++;
        console.log(`${game.links.length} links [nuevo, NO se crea]`);
        markDone(url);
        await new Promise((r) => setTimeout(r, DELAY_MS));
        continue;
      }

      if (dryRun) {
        stats.created++;
        newGames.push(game.title);
        console.log(`${game.links.length} links [nuevo/dry-run]`);
        markDone(url);
        await new Promise((r) => setTimeout(r, DELAY_MS));
        continue;
      }
      const created = await prisma.game.create({
        data: {
          title: game.title,
          slug: slugClean,
          description: game.description,
          platform: "pc",
          genre: game.genre,
          developer: game.developer,
          publisher: game.publisher,
          releaseYear: game.releaseYear,
          coverImage: game.cover,
          fileSize: game.fileSize,
          status: "pending",
          source: SOURCE,
        },
      });
      gameId = created.id;
      stats.created++;
      newGames.push(`${game.title} -> ${game.links.length} links`);
      console.log(`${game.links.length} links [nuevo]`);
    }

    if (!dryRun) {
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
          // filecrypt usa captcha PoW, no hay password que guardar.
          linkType: l.linkType,
          source: SOURCE,
          password: null,
          isActive: true,
        }));
      if (toCreate.length > 0) {
        await prisma.downloadLink.createMany({ data: toCreate });
        stats.linksAdded += toCreate.length;
      }
    }

    markDone(url);
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  console.log("\n=== RESUMEN ===");
  console.log(`Juegos revisados:        ${stats.scanned}   (errores: ${stats.errors})`);
  console.log(`  match exacto:          ${stats.matchedExact}`);
  console.log(`  match sin tags:        ${stats.matchedByCleanTitle}`);
  console.log(`  match por clave laxa:  ${stats.matchedByLooseKey}`);
  console.log(`  creados (pending):     ${stats.created}`);
  if (onlyExisting) {
    console.log(`  nuevos NO creados:     ${stats.skippedNew}  (estan en el reporte)`);
  }
  console.log(`  sin links:             ${stats.withoutLinks}`);
  console.log(`Links vistos:            ${stats.linksSeen}`);
  console.log(`Links agregados:         ${stats.linksAdded}`);
  console.log(`Promedio links/juego:    ${(stats.linksSeen / Math.max(1, stats.scanned)).toFixed(2)}`);

  console.log("\nHosts:");
  for (const [h, n] of Object.entries(hostCount).sort((a, b) => b[1] - a[1]))
    console.log(`  ${h.padEnd(16)} ${n}`);

  if (weakMatches.length) {
    const file = "scripts/report-gamepcfull-matches-debiles.json";
    fs.writeFileSync(file, JSON.stringify(weakMatches, null, 2), "utf-8");
    console.log(`\nMatches por prefijo (revisar posibles falsos positivos): ${weakMatches.length}`);
    console.log(`  guardado en ${file}`);
    for (const w of weakMatches.slice(0, 15))
      console.log(`  ~ "${w.titulo}" -> ${w.asignadoA} (-${w.palabrasRebajadas} palabras)`);
  }

  if (newGames.length) {
    const file = "scripts/report-gamepcfull-nuevos.json";
    fs.writeFileSync(file, JSON.stringify(newGames, null, 2), "utf-8");
    console.log(`\nJuegos no encontrados en la base: ${newGames.length}`);
    console.log(`  guardado en ${file}`);
    for (const g of newGames.slice(0, 30)) console.log(`  + ${g}`);
  }
  if (ambiguous.length) {
    fs.writeFileSync(
      "scripts/report-gamepcfull-ambiguous.json",
      JSON.stringify(ambiguous, null, 2),
      "utf-8"
    );
    console.log(`\nAMBIGUOS: ${ambiguous.length} (saltados, no se creo nada)`);
    console.log("  guardado en scripts/report-gamepcfull-ambiguous.json");
    for (const a of ambiguous.slice(0, 15))
      console.log(`  ? "${a.titulo}" -> ${a.candidates.map((c) => c.slug).join(" | ")}`);
  }
  if (dryRun) console.log("\n(dry run: no se modifico nada)");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
import puppeteer from "puppeteer";
import * as cheerio from "cheerio";
import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();
const PROGRESS_FILE = "scripts/link-scrape-progress.json";

interface Progress {
  processed: number;
  found: number;
  failed: number;
  blocked: number;
  lastSlug: string;
  completedSlugs: string[];
}

function loadProgress(): Progress {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf-8"));
    }
  } catch {}
  return { processed: 0, found: 0, failed: 0, blocked: 0, lastSlug: "", completedSlugs: [] };
}

function saveProgress(p: Progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2));
}

async function extractLinks($: cheerio.CheerioAPI): Promise<{ url: string; host: string }[]> {
  const links: { url: string; host: string }[] = [];
  const seen = new Set<string>();

  const shortcButtons = $("a.shortc-button");
  shortcButtons.each((i, el) => {
    const rawHref = $(el).attr("href");
    let href = rawHref || "";
    if (!href) return;
    // Convert protocol-relative URLs FIRST (before checking /)
    href = href.startsWith("//") ? `https:${href}` : href;
    // Skip relative paths (/path) but not https://...
    if (href.startsWith("/") && !href.startsWith("https://")) return;

    let host = "";
    if (href.includes("bzzhr")) host = "bzzhr";
    else if (href.includes("megadb")) host = "megadb";
    else if (href.includes("gofile")) host = "gofile";
    else if (href.includes("fileditch")) host = "fileditch";
    else if (href.includes("krakenfiles")) host = "krakenfiles";

    if (host && !seen.has(href)) {
      seen.add(href);
      links.push({ url: href, host });
    }
  });

  if (links.length === 0) {
    $("a[href]").each((_, el) => {
      let href = $(el).attr("href") || "";
      if (!href) return;
      href = href.startsWith("//") ? `https:${href}` : href;
      if (href.startsWith("/") && !href.startsWith("https://")) return;

      let host = "";
      if (href.includes("bzzhr.to")) host = "bzzhr";
      else if (href.includes("megadb.net")) host = "megadb";
      else if (href.includes("gofile.io")) host = "gofile";
      else if (href.includes("fileditch")) host = "fileditch";
      else if (href.includes("krakenfiles")) host = "krakenfiles";

      if (host && !seen.has(href)) {
        seen.add(href);
        links.push({ url: href, host });
      }
    });
  }

  return links;
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  const progress = loadProgress();
  console.log(`Resuming: ${progress.processed} processed, ${progress.found} found, ${progress.failed} failed`);

  // Load the real SteamRip URLs from listings
  const listings: { title: string; url: string }[] = JSON.parse(
    fs.readFileSync("scripts/steamrip-all-listings.json", "utf-8")
  );

  // Build a lookup map: normalized title -> URL
  const urlMap = new Map<string, string>();
  for (const listing of listings) {
    if (listing.url) {
      const key = normalizeTitle(listing.title);
      // Fix double slashes in URLs
      const cleanUrl = listing.url.replace("steamrip.com//", "steamrip.com/");
      urlMap.set(key, cleanUrl);
    }
  }
  console.log(`Loaded ${urlMap.size} URLs from listings`);

  // Get games without download links
  const games = await prisma.game.findMany({
    where: {
      status: "active",
      source: "steamrip",
      downloadLinks: { none: {} },
    },
    select: {
      id: true,
      title: true,
      slug: true,
    },
    orderBy: { title: "asc" },
  });

  // Match games to their real URLs
  const gamesWithUrls = games
    .filter((g) => !progress.completedSlugs.includes(g.slug))
    .map((g) => {
      const key = normalizeTitle(g.title);
      const url = urlMap.get(key);
      return { ...g, url };
    });

  const withUrl = gamesWithUrls.filter((g) => g.url);
  const withoutUrl = gamesWithUrls.filter((g) => !g.url);

  console.log(`Games to scrape: ${gamesWithUrls.length}`);
  console.log(`  With URL match: ${withUrl.length}`);
  console.log(`  Without URL match: ${withoutUrl.length} (will skip)`);

  if (withUrl.length === 0) {
    console.log("No games to scrape!");
    await prisma.$disconnect();
    return;
  }

  let browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-dev-shm-usage",
    ],
  });

  let page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
  );
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    Object.defineProperty(navigator, "languages", { get: () => ["en-US", "en"] });
  });

  async function restartBrowser() {
    try { await browser.close(); } catch {}
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
        "--disable-dev-shm-usage",
      ],
    });
    page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    );
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
      Object.defineProperty(navigator, "languages", { get: () => ["en-US", "en"] });
    });
  }

  let batchCount = 0;

  for (let i = 0; i < withUrl.length; i++) {
    const game = withUrl[i];
    const searchUrl = game.url;

    try {
      if (i > 0) {
        const delay = 3000 + Math.random() * 4000;
        await new Promise((r) => setTimeout(r, delay));
      }

      await page.goto(searchUrl, { waitUntil: "networkidle2", timeout: 30000 });
      await new Promise((r) => setTimeout(r, 3000));

      let html = await page.content();
      let $ = cheerio.load(html);

      if ($("title").text().includes("Just a moment")) {
        console.log(`  [${progress.processed + 1}] Cloudflare, waiting...`);
        await new Promise((r) => setTimeout(r, 8000));
        html = await page.content();
        $ = cheerio.load(html);
        if ($("title").text().includes("Just a moment")) {
          console.log(`  -> Still blocked, skipping`);
          progress.blocked++;
          progress.processed++;
          progress.completedSlugs.push(game.slug);
          saveProgress(progress);
          continue;
        }
      }

      const links = await extractLinks($);

      if (links.length > 0) {
        for (const link of links) {
          await prisma.downloadLink.create({
            data: {
              gameId: game.id,
              linkType: "direct",
              url: link.url,
              host: link.host,
              isActive: true,
            },
          });
        }
        progress.found++;
        console.log(`  [${progress.processed + 1}] ${game.title} -> ${links.length} link(s) [${links.map(l => l.host).join(", ")}]`);
      } else {
        progress.failed++;
        // Debug: log page title and shortc-button count
        const pageTitle = $("title").text();
        const shortcCount = $("a.shortc-button").length;
        console.log(`  [${progress.processed + 1}] ${game.title} -> no links (title: "${pageTitle.substring(0, 40)}", shortc: ${shortcCount})`);
      }

      progress.processed++;
      progress.lastSlug = game.slug;
      progress.completedSlugs.push(game.slug);

      batchCount++;
      if (batchCount >= 10) {
        saveProgress(progress);
        batchCount = 0;
      }

      if (progress.processed % 50 === 0) {
        console.log(`\n--- Progress: ${progress.processed}/${withUrl.length} (${progress.found} found, ${progress.failed} failed, ${progress.blocked} blocked) ---\n`);
      }
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("detached") || msg.includes("Target closed") || msg.includes("Session closed")) {
        console.log(`  -> Browser crashed, restarting...`);
        await restartBrowser();
      }
      progress.failed++;
      progress.processed++;
      progress.completedSlugs.push(game.slug);
      console.log(`  [${progress.processed}] ${game.title} -> ERROR: ${msg.substring(0, 60)}`);
      saveProgress(progress);
    }
  }

  // Mark games without URL match as completed (can't scrape them)
  for (const g of withoutUrl) {
    progress.processed++;
    progress.completedSlugs.push(g.slug);
  }

  await browser.close();
  saveProgress(progress);

  const totalLinks = await prisma.downloadLink.count();
  console.log(`\n=== DONE ===`);
  console.log(`Processed: ${progress.processed}`);
  console.log(`Found links: ${progress.found}`);
  console.log(`No links: ${progress.failed}`);
  console.log(`Blocked: ${progress.blocked}`);
  console.log(`Total links in DB: ${totalLinks}`);

  await prisma.$disconnect();
}

main().catch(console.error);

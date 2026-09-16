import puppeteer from "puppeteer";
import * as cheerio from "cheerio";
import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();
const PROGRESS_FILE = "scripts/link-scrape-progress.json";
const BATCH_SIZE = 50;

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

function buildSearchUrl(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/-+/g, "-")
    .trim();
  return `https://steamrip.com/${slug}-free-download/`;
}

async function extractLinks($: cheerio.CheerioAPI): Promise<{ url: string; host: string }[]> {
  const links: { url: string; host: string }[] = [];
  const seen = new Set<string>();

  // Primary: look for shortc-button links
  $("a.shortc-button").each((_, el) => {
    let href = $(el).attr("href") || "";
    if (href && href.includes("bzzhr")) {
      href = href.startsWith("//") ? `https:${href}` : href;
      if (!seen.has(href)) {
        seen.add(href);
        links.push({ url: href, host: "bzzhr" });
      }
    }
  });

  // Fallback: look for any bzzhr links
  if (links.length === 0) {
    $("a[href]").each((_, el) => {
      let href = $(el).attr("href") || "";
      if (href.includes("bzzhr.to")) {
        href = href.startsWith("//") ? `https:${href}` : href;
        if (!seen.has(href)) {
          seen.add(href);
          links.push({ url: href, host: "bzzhr" });
        }
      }
    });
  }

  // Also check for GOFILE, FILEDITCH, etc.
  $("a[href]").each((_, el) => {
    let href = $(el).attr("href") || "";
    if (href.includes("gofile.io") || href.includes("fileditch") || href.includes("krakenfiles")) {
      href = href.startsWith("//") ? `https:${href}` : href;
      if (!seen.has(href)) {
        seen.add(href);
        const host = href.includes("gofile") ? "gofile" : href.includes("fileditch") ? "fileditch" : "krakenfiles";
        links.push({ url: href, host });
      }
    }
  });

  return links;
}

async function main() {
  const progress = loadProgress();
  console.log(`Resuming: ${progress.processed} processed, ${progress.found} found, ${progress.failed} failed`);

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

  // Filter out already completed
  const remaining = games.filter((g) => !progress.completedSlugs.includes(g.slug));
  console.log(`Games to scrape: ${remaining.length}`);

  if (remaining.length === 0) {
    console.log("All games already processed!");
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

  for (let i = 0; i < remaining.length; i++) {
    const game = remaining[i];
    const searchUrl = buildSearchUrl(game.title);

    try {
      // Delay between requests (3-7 seconds)
      if (i > 0) {
        const delay = 3000 + Math.random() * 4000;
        await new Promise((r) => setTimeout(r, delay));
      }

      await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      await new Promise((r) => setTimeout(r, 2000));

      let html = await page.content();
      let $ = cheerio.load(html);

      // Handle Cloudflare
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
        // Save to DB
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
        console.log(`  [${progress.processed + 1}] ${game.title} -> ${links.length} link(s)`);
      } else {
        progress.failed++;
        console.log(`  [${progress.processed + 1}] ${game.title} -> no links`);
      }

      progress.processed++;
      progress.lastSlug = game.slug;
      progress.completedSlugs.push(game.slug);

      // Save progress every 10 games
      batchCount++;
      if (batchCount >= 10) {
        saveProgress(progress);
        batchCount = 0;
      }

      // Status update every 50 games
      if (progress.processed % 50 === 0) {
        console.log(`\n--- Progress: ${progress.processed}/${remaining.length} (${progress.found} found, ${progress.failed} failed, ${progress.blocked} blocked) ---\n`);
      }
    } catch (err: any) {
      const msg = err.message || "";
      // Restart browser on detached frame or critical errors
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

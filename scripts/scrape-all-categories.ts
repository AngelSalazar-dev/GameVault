import puppeteer from "puppeteer";
import * as cheerio from "cheerio";
import fs from "fs";
import { normalizeGenre } from "./lib/normalize";

const BASE_URL = "https://steamrip.com";
const CATEGORIES = [
  "action",
  "adventure",
  "anime",
  "building",
  "first-person-shooter",
  "horror",
  "indie",
  "multiplayer",
  "open-world",
  "racing",
  "role-playing-game",
  "simulation",
  "sports",
  "strategy",
  "survival",
  "virtual-reality",
];

interface GameEntry {
  title: string;
  url: string;
  coverImage?: string;
  year?: number;
  fileSize?: string;
  categories: string[];
}

interface GameDetail extends GameEntry {
  slug: string;
  genre?: string;
  developer?: string;
  description?: string;
  downloadLinks: { url: string; host: string }[];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 80);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Phase 1: Scrape all category listing pages to get unique game URLs
async function scrapeCategoryListings(
  browser: puppeteer.Browser
): Promise<Map<string, GameEntry>> {
  const allGames = new Map<string, GameEntry>();
  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
  );
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });

  for (const category of CATEGORIES) {
    console.log(`\n=== Scraping category: ${category} ===`);
    let pageNum = 1;
    let hasMore = true;

    while (hasMore) {
      const url =
        pageNum === 1
          ? `${BASE_URL}/category/${category}/`
          : `${BASE_URL}/category/${category}/page/${pageNum}/`;

      try {
        if (pageNum > 1) await sleep(3000 + Math.random() * 3000);

        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
        await sleep(2000);

        const html = await page.content();
        const $ = cheerio.load(html);

        // Check for Cloudflare challenge
        if ($("title").text().includes("Just a moment")) {
          console.log(`  Page ${pageNum}: Cloudflare challenge, waiting...`);
          await sleep(10000);
          const html2 = await page.content();
          const $2 = cheerio.load(html2);
          if ($2("title").text().includes("Just a moment")) {
            console.log(`  Page ${pageNum}: Still blocked, skipping rest of ${category}`);
            break;
          }
          var $final = $2;
        } else {
          var $final = $;
        }

        let gamesOnPage = 0;

        // Category pages use div.post-element with h2.thumb-title
        $final("div.post-element").each((_, el) => {
          const $el = $final(el);
          const href = $el.find("a.all-over-thumb-link").attr("href") || "";
          const titleText = $el.find("h2.thumb-title a").text().trim();
          const title = titleText.replace(/\s*Free Download.*$/i, "").trim();
          const coverImage =
            $el.find("div.slide").attr("data-back") || undefined;
          const metaText = $el.find("span.game-meta-line").text().trim();
          let year: number | undefined;
          let fileSize: string | undefined;
          if (metaText) {
            const parts = metaText.split("|").map((s: string) => s.trim());
            if (parts.length >= 1) {
              const y = parseInt(parts[0]);
              if (!isNaN(y)) year = y;
            }
            if (parts.length >= 2) fileSize = parts[1];
          }

          if (title && href) {
            const fullUrl = href.startsWith("http") ? href : `${BASE_URL}/${href}`;
            const existing = allGames.get(fullUrl);
            if (existing) {
              if (!existing.categories.includes(category)) {
                existing.categories.push(category);
              }
            } else {
              allGames.set(fullUrl, {
                title,
                url: fullUrl,
                coverImage,
                year,
                fileSize,
                categories: [category],
              });
            }
            gamesOnPage++;
          }
        });

        console.log(`  Page ${pageNum}: ${gamesOnPage} games (total unique: ${allGames.size})`);

        // Check if there's a next page
        const nextLink = $final('a:contains("Next")').attr("href");
        hasMore = !!nextLink && gamesOnPage > 0;
        pageNum++;
      } catch (err: any) {
        console.log(`  Page ${pageNum}: ERROR - ${err.message?.substring(0, 60)}`);
        hasMore = false;
      }
    }
  }

  await page.close();
  return allGames;
}

// Phase 2: Scrape detail pages for download links
async function scrapeDetailPages(
  browser: puppeteer.Browser,
  games: Map<string, GameEntry>
): Promise<GameDetail[]> {
  const results: GameDetail[] = [];
  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
  );
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });

  const entries = Array.from(games.entries());
  console.log(`\n=== Scraping ${entries.length} detail pages ===`);

  for (let i = 0; i < entries.length; i++) {
    const [url, game] = entries[i];
    console.log(`[${i + 1}/${entries.length}] ${game.title}`);

    try {
      if (i > 0) await sleep(5000 + Math.random() * 5000);

      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
      await sleep(3000);

      const html = await page.content();
      const $ = cheerio.load(html);

      let $final = $;
      if ($("title").text().includes("Just a moment")) {
        console.log(`  Cloudflare challenge, waiting...`);
        await sleep(10000);
        const html2 = await page.content();
        const $2 = cheerio.load(html2);
        if ($2("title").text().includes("Just a moment")) {
          console.log(`  Still blocked`);
          results.push({ ...game, slug: slugify(game.title), downloadLinks: [] });
          continue;
        }
        $final = $2;
      }

      // Extract download links
      const downloadLinks: { url: string; host: string }[] = [];
      $final("a.shortc-button").each((_, el) => {
        const href = $final(el).attr("href") || "";
        if (!href || href === "#") return;
        let fullUrl = href;
        if (href.startsWith("//")) fullUrl = `https:${href}`;
        downloadLinks.push({ url: fullUrl, host: "bzzhr" });
      });

      if (downloadLinks.length === 0) {
        $final("a[href]").each((_, el) => {
          const href = $final(el).attr("href") || "";
          let host = "";
          if (href.includes("bzzhr")) host = "bzzhr";
          else if (href.includes("gofile")) host = "gofile";
          else if (href.includes("fileditch")) host = "fileditch";
          if (host) {
            let fullUrl = href;
            if (href.startsWith("//")) fullUrl = `https:${href}`;
            downloadLinks.push({ url: fullUrl, host });
          }
        });
      }

      // Game info
      const gameInfo: Record<string, string> = {};
      $final("div.plus.tie-list-shortcode li").each((_, el) => {
        const text = $final(el).text().trim();
        const match = text.match(/^([^:]+):\s*(.+)$/);
        if (match) {
          gameInfo[match[1].trim().toLowerCase()] = match[2].trim();
        }
      });

      // Cover from detail page
      const detailCover =
        $final("figure.single-featured-image img.wp-post-image").attr("data-src") ||
        $final("img.wp-post-image").attr("data-src");

      results.push({
        ...game,
        slug: slugify(game.title),
        coverImage: detailCover
          ? detailCover.startsWith("http")
            ? detailCover
            : `${BASE_URL}/${detailCover}`
          : game.coverImage,
        genre: normalizeGenre(gameInfo["genre"]),
        developer: gameInfo["developer"],
        downloadLinks,
      });

      if (downloadLinks.length > 0) {
        console.log(`  -> ${downloadLinks.length} links`);
      } else {
        console.log(`  -> No links`);
      }
    } catch (err: any) {
      console.log(`  ERROR: ${err.message?.substring(0, 60)}`);
      results.push({ ...game, slug: slugify(game.title), downloadLinks: [] });
    }
  }

  await page.close();
  return results;
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
    ],
  });

  // Phase 1: Get all game URLs from categories
  console.log("PHASE 1: Scraping category listings...");
  const allGames = await scrapeCategoryListings(browser);

  fs.writeFileSync(
    "scripts/steamrip-all-games-listing.json",
    JSON.stringify(Array.from(allGames.values()), null, 2)
  );
  console.log(`\nSaved ${allGames.size} unique games to steamrip-all-games-listing.json`);

  // Phase 2: Scrape detail pages
  console.log("\nPHASE 2: Scraping detail pages...");
  const details = await scrapeDetailPages(browser, allGames);

  fs.writeFileSync(
    "scripts/steamrip-all-games-details.json",
    JSON.stringify(details, null, 2)
  );
  console.log(`\nSaved ${details.length} game details to steamrip-all-games-details.json`);

  // Summary
  const withLinks = details.filter((d) => d.downloadLinks.length > 0);
  console.log(`\n=== SUMMARY ===`);
  console.log(`Total games: ${details.length}`);
  console.log(`With download links: ${withLinks.length}`);
  console.log(`Without links: ${details.length - withLinks.length}`);

  await browser.close();
}

main().catch(console.error);

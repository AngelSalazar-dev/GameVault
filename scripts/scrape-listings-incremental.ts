import puppeteer from "puppeteer";
import * as cheerio from "cheerio";
import fs from "fs";

const BASE_URL = "https://steamrip.com";
const CATEGORIES = [
  "action", "adventure", "anime", "building", "first-person-shooter",
  "horror", "indie", "multiplayer", "open-world", "racing",
  "role-playing-game", "simulation", "sports", "strategy", "survival", "virtual-reality",
];
const OUTPUT_FILE = "scripts/steamrip-all-listings.json";

interface GameEntry {
  title: string;
  url: string;
  coverImage?: string;
  year?: number;
  fileSize?: string;
  categories: string[];
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function loadExisting(): Map<string, GameEntry> {
  try {
    if (fs.existsSync(OUTPUT_FILE)) {
      const data = JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf-8"));
      const map = new Map<string, GameEntry>();
      for (const g of data) map.set(g.url, g);
      return map;
    }
  } catch {}
  return new Map();
}

function saveAll(games: Map<string, GameEntry>) {
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(Array.from(games.values()), null, 2));
}

async function main() {
  const allGames = loadExisting();
  console.log(`Loaded ${allGames.size} existing games`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-blink-features=AutomationControlled"],
  });

  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36");
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });

  for (const category of CATEGORIES) {
    console.log(`\n=== ${category} ===`);
    let pageNum = 1;
    let hasMore = true;

    while (hasMore) {
      const url = pageNum === 1
        ? `${BASE_URL}/category/${category}/`
        : `${BASE_URL}/category/${category}/page/${pageNum}/`;

      try {
        if (pageNum > 1) await sleep(2000 + Math.random() * 2000);

        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
        await sleep(1500);

        let html = await page.content();
        let $ = cheerio.load(html);

        // Handle Cloudflare
        if ($("title").text().includes("Just a moment")) {
          console.log(`  Page ${pageNum}: Cloudflare, waiting...`);
          await sleep(8000);
          html = await page.content();
          $ = cheerio.load(html);
          if ($("title").text().includes("Just a moment")) {
            console.log(`  Blocked, skipping rest`);
            break;
          }
        }

        let count = 0;
        $("div.post-element").each((_, el) => {
          const $el = $(el);
          const href = $el.find("a.all-over-thumb-link").attr("href") || "";
          const titleText = $el.find("h2.thumb-title a").text().trim();
          const title = titleText.replace(/\s*Free Download.*$/i, "").trim();
          const coverImage = $el.find("div.slide").attr("data-back") || undefined;
          const metaText = $el.find("span.game-meta-line").text().trim();
          let year: number | undefined;
          let fileSize: string | undefined;
          if (metaText) {
            const parts = metaText.split("|").map((s: string) => s.trim());
            if (parts.length >= 1) { const y = parseInt(parts[0]); if (!isNaN(y)) year = y; }
            if (parts.length >= 2) fileSize = parts[1];
          }
          if (title && href) {
            const fullUrl = href.startsWith("http") ? href : `${BASE_URL}/${href}`;
            const existing = allGames.get(fullUrl);
            if (existing) {
              if (!existing.categories.includes(category)) existing.categories.push(category);
            } else {
              allGames.set(fullUrl, { title, url: fullUrl, coverImage, year, fileSize, categories: [category] });
            }
            count++;
          }
        });

        console.log(`  Page ${pageNum}: +${count} (total: ${allGames.size})`);

        // Save every 5 pages
        if (pageNum % 5 === 0) saveAll(allGames);

        const nextLink = $('a:contains("Next")').attr("href");
        hasMore = !!nextLink && count > 0;
        pageNum++;
      } catch (err: any) {
        console.log(`  Page ${pageNum}: ERROR ${err.message?.substring(0, 50)}`);
        hasMore = false;
      }
    }

    // Save after each category
    saveAll(allGames);
  }

  await browser.close();
  saveAll(allGames);
  console.log(`\nDONE: ${allGames.size} unique games saved to ${OUTPUT_FILE}`);
}

main().catch(console.error);

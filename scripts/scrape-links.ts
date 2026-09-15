import puppeteer from "puppeteer";
import * as cheerio from "cheerio";
import fs from "fs";

const BASE_URL = "https://steamrip.com";

async function main() {
  const listingRaw = fs.readFileSync("scripts/steamrip-listing.json", "utf-8");
  const listing = JSON.parse(listingRaw);

  // Deduplicate by URL
  const uniqueGames = listing.filter(
    (g: any, i: number, self: any[]) =>
      self.findIndex((t: any) => t.url === g.url) === i
  );

  console.log(`Scraping ${uniqueGames.length} unique games...`);

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
    ],
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
  );

  // Stealth: override webdriver detection
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    Object.defineProperty(navigator, "languages", {
      get: () => ["en-US", "en"],
    });
    Object.defineProperty(navigator, "plugins", {
      get: () => [1, 2, 3, 4, 5],
    });
  });

  const results: Record<string, string> = {};

  for (let i = 0; i < uniqueGames.length; i++) {
    const game = uniqueGames[i];
    console.log(`[${i + 1}/${uniqueGames.length}] ${game.title}`);

    try {
      // Longer random delay between requests
      if (i > 0) {
        const delay = 5000 + Math.random() * 5000; // 5-10 seconds
        await new Promise((r) => setTimeout(r, delay));
      }

      await page.goto(game.url, {
        waitUntil: "networkidle2",
        timeout: 45000,
      });

      // Wait for potential Cloudflare challenge
      await new Promise((r) => setTimeout(r, 5000));

      const html = await page.content();
      const $ = cheerio.load(html);

      // Check if we got a Cloudflare challenge page
      const pageTitle = $("title").text();
      if (pageTitle.includes("Just a moment")) {
        console.log(`  -> Cloudflare challenge, waiting longer...`);
        await new Promise((r) => setTimeout(r, 10000));
        const html2 = await page.content();
        const $2 = cheerio.load(html2);
        const title2 = $2("title").text();
        if (title2.includes("Just a moment")) {
          console.log(`  -> Still blocked`);
          continue;
        }
        // Use refreshed content
        var $final = $2;
      } else {
        var $final = $;
      }

      // Extract download link
      let downloadUrl = "";
      $final("a.shortc-button").each((_, el) => {
        const href = $final(el).attr("href") || "";
        if (href && href.includes("bzzhr")) {
          downloadUrl = href.startsWith("//")
            ? `https:${href}`
            : href;
        }
      });

      // Fallback: look for bzzhr links
      if (!downloadUrl) {
        $("a[href]").each((_, el) => {
          const href = $(el).attr("href") || "";
          if (href.includes("bzzhr.to")) {
            downloadUrl = href.startsWith("//") ? `https:${href}` : href;
          }
        });
      }

      if (downloadUrl) {
        const slug = game.title
          .toLowerCase()
          .replace(/[^\w\s-]/g, "")
          .replace(/[\s_-]+/g, "-")
          .substring(0, 80);
        results[slug] = downloadUrl;
        console.log(`  -> ${downloadUrl}`);
      } else {
        console.log(`  -> No link found`);
      }
    } catch (err: any) {
      console.log(`  -> ERROR: ${err.message?.substring(0, 80)}`);
    }
  }

  await browser.close();

  fs.writeFileSync(
    "scripts/steamrip-links.json",
    JSON.stringify(results, null, 2)
  );
  console.log(`\nSaved ${Object.keys(results).length} links to steamrip-links.json`);
}

main();

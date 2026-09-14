import puppeteer from "puppeteer";
import * as cheerio from "cheerio";
import fs from "fs";

const BASE_URL = "https://steamrip.com";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function main() {
  const listingRaw = fs.readFileSync("scripts/steamrip-listing.json", "utf-8");
  const listing = JSON.parse(listingRaw);

  console.log(`Scraping details for ${listing.length} games...`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );

  const results: any[] = [];

  for (let i = 0; i < listing.length; i++) {
    const game = listing[i];
    console.log(`[${i + 1}/${listing.length}] ${game.title}`);

    try {
      await page.goto(game.url, { waitUntil: "domcontentloaded", timeout: 30000 });
      // Wait a bit for Cloudflare challenge
      await new Promise((r) => setTimeout(r, 3000));

      const html = await page.content();
      const $ = cheerio.load(html);

      // Download link
      const downloadLinks: { url: string; host: string }[] = [];
      $("a.shortc-button").each((_, el) => {
        const href = $(el).attr("href") || "";
        if (!href || href === "#") return;
        let fullUrl = href;
        if (href.startsWith("//")) fullUrl = `https:${href}`;
        downloadLinks.push({ url: fullUrl, host: "bzzhr" });
      });

      // Also check for known domains
      if (downloadLinks.length === 0) {
        $("a[href]").each((_, el) => {
          const href = $(el).attr("href") || "";
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
      $("div.plus.tie-list-shortcode li").each((_, el) => {
        const text = $(el).text().trim();
        const match = text.match(/^([^:]+):\s*(.+)$/);
        if (match) {
          gameInfo[match[1].trim().toLowerCase()] = match[2].trim();
        }
      });

      // Cover image from detail page
      const detailCover =
        $("figure.single-featured-image img.wp-post-image").attr("data-src") ||
        $("img.wp-post-image").attr("data-src") ||
        game.coverImage;

      results.push({
        ...game,
        coverImage: detailCover
          ? detailCover.startsWith("http")
            ? detailCover
            : `${BASE_URL}/${detailCover}`
          : game.coverImage,
        downloadLinks,
        genre: gameInfo["genre"],
        developer: gameInfo["developer"],
        fileSize: gameInfo["game size"] || game.fileSize,
      });

      console.log(
        `  -> ${downloadLinks.length} links, cover: ${detailCover ? "yes" : "no"}`
      );
    } catch (err: any) {
      console.log(`  -> ERROR: ${err.message}`);
      results.push({ ...game, downloadLinks: [] });
    }
  }

  await browser.close();

  fs.writeFileSync(
    "scripts/steamrip-full.json",
    JSON.stringify(results, null, 2)
  );
  console.log(`\nSaved ${results.length} games with details to steamrip-full.json`);
}

main();

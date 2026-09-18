import puppeteer from "puppeteer";
import * as cheerio from "cheerio";

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-blink-features=AutomationControlled"],
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
  );
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });

  // Test games with "no links" to see if they have megadb
  const testUrls = [
    { slug: "anime-shop-simulator", url: "https://steamrip.com/anime-shop-simulator-free-download/" },
    { slug: "stranger-things-vr", url: "https://steamrip.com/stranger-things-vr-free-download/" },
    { slug: "breathedge-2", url: "https://steamrip.com/breathedge-2-free-download/" },
    { slug: "metal-gear-solid-master-collection-vol-2", url: "https://steamrip.com/metal-gear-solid-master-collection-vol-2-free-download/" },
    { slug: "la-noire-the-vr-case-files", url: "https://steamrip.com/la-noire-the-vr-case-files-free-download/" },
  ];

  for (const test of testUrls) {
    console.log(`\n=== ${test.slug} ===`);
    try {
      await page.goto(test.url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await new Promise((r) => setTimeout(r, 5000));

      const html = await page.content();
      const $ = cheerio.load(html);

      // 1. Check ALL a.shortc-button
      console.log("a.shortc-button links:");
      $("a.shortc-button").each((_, el) => {
        let href = $(el).attr("href") || "";
        const text = $(el).text().trim();
        console.log(`  href="${href}" text="${text}"`);
      });

      // 2. Check for megadb in raw HTML
      if (html.includes("megadb")) {
        console.log("Contains 'megadb' in HTML: YES");
        // Extract context around megadb
        const idx = html.indexOf("megadb");
        console.log("Context:", html.substring(Math.max(0, idx - 100), idx + 200).replace(/\n/g, " ").substring(0, 300));
      } else {
        console.log("Contains 'megadb' in HTML: NO");
      }

      // 3. Check for any href with known download hosts
      console.log("All download host links:");
      $("a[href]").each((_, el) => {
        const href = $(el).attr("href") || "";
        if (href.match(/bzzhr|megadb|gofile|fileditch|krakenfiles|mediafire|mega\.nz|1fichier|pixeldrain|send\.cm|workupload|racaty|streamlare|bayfiles|letsupload|catbox|litterbox/i)) {
          console.log(`  href="${href.substring(0, 100)}" text="${$(el).text().trim().substring(0, 50)}"`);
        }
      });
    } catch (err: any) {
      console.log(`ERROR: ${err.message.substring(0, 80)}`);
    }
  }

  await browser.close();
}

main().catch(console.error);

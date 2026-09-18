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

  // Test with a game that has MegaDB links
  const url = "https://steamrip.com/anime-shop-simulator-free-download/";
  console.log(`Fetching: ${url}`);

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await new Promise((r) => setTimeout(r, 5000));

  const html = await page.content();
  const $ = cheerio.load(html);

  // Look for MegaDB patterns
  console.log("\n=== Looking for MegaDB patterns ===");

  // Check all links for megadb
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    const text = $(el).text().trim();
    if (href.includes("megadb") || text.toLowerCase().includes("megadb") || text.toLowerCase().includes("download here")) {
      console.log(`Link: href="${href}" text="${text}"`);
    }
  });

  // Check for DOWNLOAD HERE buttons
  console.log("\n=== Looking for DOWNLOAD HERE / shortc-button ===");
  $("a.shortc-button, a").each((_, el) => {
    const href = $(el).attr("href") || "";
    const text = $(el).text().trim();
    if (text.toLowerCase().includes("download")) {
      console.log(`Download link: href="${href}" text="${text}" class="${$(el).attr("class") || ""}"`);
    }
  });

  // Get the entire download section HTML
  console.log("\n=== Raw HTML around download section ===");
  const bodyHtml = $.html();
  // Find MegaDB mentions
  const megadbIdx = bodyHtml.indexOf("megadb");
  if (megadbIdx >= 0) {
    console.log("Found 'megadb' at index", megadbIdx);
    console.log(bodyHtml.substring(Math.max(0, megadbIdx - 200), megadbIdx + 500));
  }

  // Also look for shortc-button class
  const shortcIdx = bodyHtml.indexOf("shortc-button");
  if (shortcIdx >= 0) {
    console.log("\n=== Found shortc-button ===");
    console.log(bodyHtml.substring(Math.max(0, shortcIdx - 200), shortcIdx + 500));
  }

  await browser.close();
}

main().catch(console.error);

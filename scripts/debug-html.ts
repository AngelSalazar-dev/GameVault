import puppeteer from "puppeteer";
import * as cheerio from "cheerio";

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-blink-features=AutomationControlled"],
  });
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36");
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });

  const url = "https://steamrip.com/anime-shop-simulator-free-download/";
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await new Promise((r) => setTimeout(r, 5000));

  // Get ALL HTML and search for shortc-button
  const html = await page.content();

  // Check with regex
  const shortcMatches = html.match(/shortc-button/g);
  console.log(`"shortc-button" appears in HTML: ${shortcMatches ? shortcMatches.length : 0} times`);

  const megadbMatches = html.match(/megadb/g);
  console.log(`"megadb" appears in HTML: ${megadbMatches ? megadbMatches.length : 0} times`);

  const downloadMatches = html.match(/DOWNLOAD HERE/g);
  console.log(`"DOWNLOAD HERE" appears in HTML: ${downloadMatches ? downloadMatches.length : 0} times`);

  // Find context around first shortc-button
  const idx = html.indexOf("shortc-button");
  if (idx >= 0) {
    console.log(`\nContext around "shortc-button":`);
    console.log(html.substring(Math.max(0, idx - 300), idx + 300));
  }

  // Try cheerio parse
  const $ = cheerio.load(html);
  console.log(`\ncheerio a.shortc-button count: ${$("a.shortc-button").length}`);
  console.log(`cheerio a count: ${$("a").length}`);
  console.log(`cheerio a[href] with megadb: ${$('a[href*="megadb"]').length}`);
  console.log(`cheerio a[href] with bzzhr: ${$('a[href*="bzzhr"]').length}`);

  // Check all a tags
  console.log(`\nAll <a> tags with href:`);
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    if (href.includes("megadb") || href.includes("bzzhr") || href.includes("gofile") || href.includes("fileditch")) {
      console.log(`  href="${href}" class="${$(el).attr("class") || ""}" text="${$(el).text().trim().substring(0, 40)}"`);
    }
  });

  await browser.close();
}

main().catch(console.error);

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

  const html = await page.content();
  const $ = cheerio.load(html);

  // Test 1: count shortc-button
  const count = $("a.shortc-button").length;
  console.log(`Test 1 - a.shortc-button count: ${count}`);

  // Test 2: iterate and check each
  $("a.shortc-button").each((i, el) => {
    const rawHref = $(el).attr("href");
    const text = $(el).text().trim();
    console.log(`Test 2 - [${i}] rawHref="${rawHref}" text="${text}"`);
    console.log(`  typeof rawHref: ${typeof rawHref}`);
    console.log(`  rawHref === undefined: ${rawHref === undefined}`);
    console.log(`  rawHref === "": ${rawHref === ""}`);
    if (rawHref) {
      console.log(`  starts with "//": ${rawHref.startsWith("//")}`);
      console.log(`  includes megadb: ${rawHref.includes("megadb")}`);
    }
  });

  // Test 3: use the exact same logic as extractLinks
  const links: { url: string; host: string }[] = [];
  const seen = new Set<string>();

  $("a.shortc-button").each((i, el) => {
    let href = $(el).attr("href") || "";
    console.log(`Test 3 - [${i}] href="${href}"`);
    if (!href || href.startsWith("/")) {
      console.log(`  SKIPPED (empty or starts with /)`);
      return;
    }
    href = href.startsWith("//") ? `https:${href}` : href;

    let host = "";
    if (href.includes("bzzhr")) host = "bzzhr";
    else if (href.includes("megadb")) host = "megadb";
    else if (href.includes("gofile")) host = "gofile";
    else if (href.includes("fileditch")) host = "fileditch";
    else if (href.includes("krakenfiles")) host = "krakenfiles";

    console.log(`  host="${host}"`);
    if (host && !seen.has(href)) {
      seen.add(href);
      links.push({ url: href, host });
    }
  });

  console.log(`\nFinal links: ${links.length}`);
  links.forEach(l => console.log(`  ${l.host}: ${l.url}`));

  await browser.close();
}

main().catch(console.error);

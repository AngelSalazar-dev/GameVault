import puppeteer from "puppeteer";
import * as cheerio from "cheerio";

function buildSearchUrl(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/-+/g, "-")
    .trim();
  return `https://steamrip.com/${slug}-free-download/`;
}

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
    Object.defineProperty(navigator, "languages", { get: () => ["en-US", "en"] });
  });

  // Test specific games that we KNOW have links
  const testTitles = [
    "Anime Shop Simulator",
    "Stranger Things VR",
    "Breathedge 2",
  ];

  for (const title of testTitles) {
    const url = buildSearchUrl(title);
    console.log(`\n=== ${title} ===`);
    console.log(`URL: ${url}`);

    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await new Promise((r) => setTimeout(r, 5000));

      const html = await page.content();
      const $ = cheerio.load(html);

      const pageTitle = $("title").text();
      console.log(`Page title: ${pageTitle}`);

      // Check for Cloudflare
      if (pageTitle.includes("Just a moment") || pageTitle.includes("Attention Required")) {
        console.log("CLOUDFLARE BLOCKED!");
        continue;
      }

      // Check for 404
      if (html.includes("not found") || html.includes("404")) {
        console.log("POSSIBLE 404");
      }

      // Find shortc-button
      const shortcButtons = $("a.shortc-button");
      console.log(`Found ${shortcButtons.length} shortc-button links`);

      shortcButtons.each((_, el) => {
        const href = $(el).attr("href") || "";
        const text = $(el).text().trim();
        console.log(`  href="${href}" text="${text}"`);
      });

      // Check for megadb in HTML
      if (html.includes("megadb")) {
        console.log("HTML contains 'megadb': YES");
      }
      if (html.includes("bzzhr")) {
        console.log("HTML contains 'bzzhr': YES");
      }

      // Show first 500 chars of entry-content
      const entryContent = $(".entry-content").html() || "";
      if (entryContent.length > 0) {
        console.log(`entry-content length: ${entryContent.length}`);
        // Check for download buttons
        const downloadMatches = entryContent.match(/shortc-button|megadb|bzzhr|gofile|fileditch/g);
        if (downloadMatches) {
          console.log(`Download patterns found: ${downloadMatches.join(", ")}`);
        }
      } else {
        console.log("entry-content: EMPTY");
      }

    } catch (err: any) {
      console.log(`ERROR: ${err.message.substring(0, 100)}`);
    }
  }

  await browser.close();
}

main().catch(console.error);

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

  // Test multiple games to find ALL download host patterns
  const testUrls = [
    "https://steamrip.com/anime-shop-simulator-free-download/",
    "https://steamrip.com/stranger-things-vr-free-download/",
    "https://steamrip.com/breathedge-2-free-download/",
    "https://steamrip.com/la-noire-the-vr-case-files-free-download/",
    "https://steamrip.com/grand-theft-auto-v-gta-5-free-download/",
  ];

  const allHosts = new Map<string, number>();

  for (const url of testUrls) {
    console.log(`\n--- ${url.split("/")[3]} ---`);
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await new Promise((r) => setTimeout(r, 3000));

      const html = await page.content();
      const $ = cheerio.load(html);

      // Find ALL shortc-button links
      $("a.shortc-button").each((_, el) => {
        let href = $(el).attr("href") || "";
        const text = $(el).text().trim();
        if (href && !href.startsWith("/")) {
          href = href.startsWith("//") ? `https:${href}` : href;
          try {
            const host = new URL(href).hostname;
            allHosts.set(host, (allHosts.get(host) || 0) + 1);
            console.log(`  shortc-button: ${host} -> ${href.substring(0, 80)} (text: "${text}")`);
          } catch {}
        }
      });

      // Also check for other download patterns in the entry-content
      const entryContent = $(".entry-content").html() || "";
      const hostPatterns = ["bzzhr", "megadb", "gofile", "fileditch", "krakenfiles", "mediafire", "mega.nz", "pixeldrain", "1fichier", "bayfiles", "letsupload", "mixdrop", "streamtape", "anonfiles", "upload.ee", "rockfile", "racaty", "streamlare", "send.cm", "workupload", "zippyshare", "uptobox", "catbox", " litterbox", "gofile", "owfile", "bowfile"];
      
      for (const pattern of hostPatterns) {
        if (entryContent.includes(pattern)) {
          console.log(`  Found pattern in content: ${pattern}`);
        }
      }
    } catch (err: any) {
      console.log(`  ERROR: ${err.message.substring(0, 60)}`);
    }
  }

  console.log("\n=== Summary of ALL hosts found ===");
  allHosts.forEach((count, host) => {
    console.log(`  ${host}: ${count}`);
  });

  await browser.close();
}

main().catch(console.error);

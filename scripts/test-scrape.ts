import axios from "axios";
import * as cheerio from "cheerio";

const BASE_URL = "https://steamrip.com";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function testScrape() {
  console.log("Testing SteamRip scraping...\n");

  // Test 1: Get listing
  console.log("=== Test 1: Listing ===");
  const { data: listData } = await axios.get(BASE_URL, {
    headers: { "User-Agent": USER_AGENT },
    timeout: 20000,
  });

  const $list = cheerio.load(listData);
  const games: { title: string; url: string; coverImage?: string }[] = [];

  $list("li.post-item").each((_, el) => {
    const $el = $list(el);
    const $link = $el.find("a.post-thumb");
    const href = $link.attr("href") || "";
    
    // Get title from post-details
    const titleText = $el.find("div.post-details h2.post-title a").text().trim();
    const title = titleText.replace(/\s*Free Download.*$/i, "").trim();
    
    // Get cover image
    const coverImage = $el.find("img.thumbnail-image").attr("data-src") || undefined;

    if (title && href) {
      games.push({ title, url: href.startsWith("http") ? href : `${BASE_URL}/${href}`, coverImage });
    }
  });

  console.log(`Found ${games.length} games`);
  console.log("First 3 games:");
  games.slice(0, 3).forEach((g, i) => {
    console.log(`  ${i + 1}. ${g.title}`);
    console.log(`     URL: ${g.url}`);
    console.log(`     Image: ${g.coverImage || "none"}`);
  });

  // Test 2: Get detail of first game
  if (games.length > 0) {
    console.log("\n=== Test 2: Detail ===");
    const testGame = games[0];
    console.log(`Scraping: ${testGame.url}`);

    const { data: detailData } = await axios.get(testGame.url, {
      headers: { "User-Agent": USER_AGENT },
      timeout: 20000,
    });

    const $ = cheerio.load(detailData);

    // Title
    const rawTitle = $("h1.post-title.entry-title").text().trim() ||
      $("title").text().split("Free Download")[0].trim();
    const title = rawTitle.replace(/\s*Free Download.*$/i, "").trim();
    console.log(`Title: ${title}`);

    // Cover image
    const coverImage = $("figure.single-featured-image img.wp-post-image").attr("data-src") ||
      $("img.wp-post-image").attr("data-src");
    console.log(`Cover: ${coverImage || "none"}`);

    // Game info
    const gameInfo: Record<string, string> = {};
    $("div.plus.tie-list-shortcode li").each((_, el) => {
      const text = $(el).text().trim();
      const match = text.match(/^([^:]+):\s*(.+)$/);
      if (match) {
        gameInfo[match[1].trim().toLowerCase()] = match[2].trim();
      }
    });
    console.log(`Info: ${JSON.stringify(gameInfo, null, 2)}`);

    // Download links
    const downloadLinks: { url: string; host: string }[] = [];
    $("a.shortc-button").each((_, el) => {
      const $a = $(el);
      const href = $a.attr("href") || "";
      if (!href || href === "#") return;

      const $parent = $a.parent("p");
      const hostText = $parent.find("strong").first().text().trim().toLowerCase();
      
      let host = "unknown";
      if (hostText.includes("gofile")) host = "gofile";
      else if (hostText.includes("bzzhr") || hostText.includes("buzz")) host = "buzzheavier";
      else if (hostText.includes("fileditch")) host = "fileditch";
      else if (hostText.includes("1fichier")) host = "1fichier";
      else host = hostText || "unknown";

      let fullUrl = href;
      if (href.startsWith("//")) fullUrl = `https:${href}`;

      downloadLinks.push({ url: fullUrl, host });
    });
    console.log(`Links: ${downloadLinks.length}`);
    downloadLinks.forEach((l) => console.log(`  - ${l.host}: ${l.url}`));
  }
}

testScrape().catch(console.error);

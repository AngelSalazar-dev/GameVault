import axios from "axios";
import * as cheerio from "cheerio";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

async function main() {
  const url = "https://www.ovagames.com/dune-awakening-ultimate-edition-multi12-elamigos.html";
  console.log("Analyzing: " + url + "\n");

  const res = await axios.get(url, {
    headers: { "User-Agent": UA },
    timeout: 30000,
  });
  const $ = cheerio.load(String(res.data));

  // Find ALL images
  console.log("=== IMAGES ===");
  $("img").each((i, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-lazy-src") || "";
    const alt = $(el).attr("alt") || "";
    const cls = $(el).attr("class") || "";
    if (src && !src.includes("data:image") && !src.includes("gravatar") && !src.includes("logo")) {
      console.log(`  [${cls}] src="${src.substring(0, 120)}" alt="${alt}"`);
    }
  });

  // og:image
  console.log("\n  og:image: " + ($('meta[property="og:image"]').attr("content") || "none"));

  // Look for game info in the content
  console.log("\n=== CONTENT STRUCTURE ===");
  const content = $(".entry-content, .post-content, .game-content, article .content, .single-content, .post-entry").first();
  if (content.length) {
    console.log("  Content container found: " + content.attr("class"));
    // Show first 2000 chars of HTML
    console.log("  HTML (2000 chars):");
    console.log(content.html()?.substring(0, 2000) || "empty");
  } else {
    console.log("  No content container found");
    // Show body children
    $("body").children().slice(0, 10).each((i, el) => {
      console.log(`  <${el.tagName}> class="${$(el).attr("class") || ""}" id="${$(el).attr("id") || ""}"`);
    });
  }

  // Look for bold/strong labels
  console.log("\n=== BOLD LABELS ===");
  $("strong, b").each((i, el) => {
    const text = $(el).text().trim();
    if (text.length < 50 && text.length > 2) {
      const parent = $(el).parent().text().trim().substring(0, 150);
      console.log(`  "${text}" => ${parent}`);
    }
  });

  // Pagination on homepage
  console.log("\n=== HOMEPAGE PAGINATION ===");
  const homeRes = await axios.get("https://ovagames.com/", { headers: { "User-Agent": UA }, timeout: 30000 });
  const $home = cheerio.load(String(homeRes.data));
  const pageLinks: string[] = [];
  $home('a[href]').each((_, el) => {
    const href = $home(el).attr("href") || "";
    if (/\/page\/\d+/.test(href) || /[?&]page=\d+/.test(href)) pageLinks.push(href);
  });
  console.log("  Page links: " + [...new Set(pageLinks)].join(", "));
}

main().catch(console.error);

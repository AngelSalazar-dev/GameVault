import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";

const BASE_URL = "https://steamrip.com";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function main() {
  const { data } = await axios.get(BASE_URL, {
    headers: { "User-Agent": UA },
    timeout: 20000,
  });
  const $ = cheerio.load(data);
  const games: any[] = [];

  $("li.post-item").each((_, el) => {
    const $el = $(el);
    const href = $el.find("a.post-thumb").attr("href") || "";
    const titleText = $el.find("div.post-details h2.post-title a").text().trim();
    const title = titleText.replace(/\s*Free Download.*$/i, "").trim();
    const coverImage =
      $el.find("img.thumbnail-image").attr("data-src") || undefined;
    const metaText = $el.find("span.game-meta-line").text().trim();
    let year: number | undefined;
    let fileSize: string | undefined;
    if (metaText) {
      const parts = metaText.split("|").map((s: string) => s.trim());
      if (parts.length >= 1) {
        const y = parseInt(parts[0]);
        if (!isNaN(y)) year = y;
      }
      if (parts.length >= 2) fileSize = parts[1];
    }
    if (title && href) {
      const fullUrl = href.startsWith("http") ? href : BASE_URL + "/" + href;
      games.push({ title, url: fullUrl, coverImage, year, fileSize });
    }
  });

  fs.writeFileSync(
    "scripts/steamrip-listing.json",
    JSON.stringify(games, null, 2)
  );
  console.log("Saved " + games.length + " games to steamrip-listing.json");
  games
    .slice(0, 5)
    .forEach(
      (g, i) =>
        console.log(`${i + 1}. ${g.title} | ${g.url} | img: ${g.coverImage || "none"}`)
    );
}

main();

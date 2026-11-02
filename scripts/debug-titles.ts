/**
 * Muestra el <h1> real de paginas de GamePCFull para depurar el matcher.
 *   npx tsx scripts/debug-titles.ts
 */
import axios from "axios";
import * as cheerio from "cheerio";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const slugs = [
  "northgard-gog",
  "tropico-6-gog",
  "oxygen-not-included-rune",
  "fifa-19",
  "greedfall-gog-free-download",
  "battletech",
];

async function main() {
  for (const s of slugs) {
    try {
      const res = await axios.get(`https://gamepcfull.com/${s}/`, {
        headers: { "User-Agent": UA },
        timeout: 30000,
      });
      const $ = cheerio.load(String(res.data));
      const h1 = $("h1").first().text().trim();
      const docTitle = $("title").first().text().trim();
      console.log(`\nslug: ${s}`);
      console.log(`  h1:    [${h1}]`);
      console.log(`  title: [${docTitle}]`);
    } catch (e: any) {
      console.log(`\nslug: ${s}\n  ERROR ${e?.message?.substring(0, 60)}`);
    }
  }
}

main();
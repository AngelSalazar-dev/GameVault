import { PrismaClient } from "@prisma/client";
import axios from "axios";
import * as cheerio from "cheerio";

const prisma = new PrismaClient();
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const BASE_URL = "https://www.ovagames.com";
const PASSWORD = "www.ovagames.com";

const GAMES = [
  "nba-2k27-deluxe-edition-multi10-elamigos",
  "mortal-kombat-1-definitive-edition-multi13-elamigos",
  "star-wars-outlaws-ultimate-edition-multi12-elamigos",
  "persona-3-reload-premium-edition-multi13-elamigos",
  "dragon-ball-sparking-zero-ultimate-edition-multi16-elamigos",
  "dragonsword-awakening-deluxe-edition-multi11-elamigos",
  "code-vein-ii-deluxe-edition-multi12-elamigos",
  "mortal-shell-ii-devout-edition-multi15-elamigos",
  "final-fantasy-tactics-the-ivalice-chronicles-multi7-elamigos",
  "forza-horizon-6-premium-edition-multi23-elamigos",
  "assassins-creed-shadows-premium-edition-multi13-elamigos",
  "crimson-desert-deluxe-edition-multi14-elamigos",
  "assassins-creed-black-flag-resynced-deluxe-edition-multi13-elamigos",
  "the-blood-of-dawnwalker-eclipse-edition-multi15-elamigos",
  "grand-theft-auto-v-enhanced-multi13-elamigos",
  "007-first-light-deluxe-edition-multi14-elamigos",
  "beast-of-reincarnation-deluxe-edition-multi11-elamigos",
  "assassins-creed-mirage-master-assassin-edition-multi14-elamigos",
  "prince-of-persia-the-lost-crown-complete-edition-multi14-elamigos",
];

// Hosts we recognize
const HOST_PATTERNS: { host: string; patterns: string[] }[] = [
  { host: "datanodes", patterns: ["datanodes.com", "datanodes.to"] },
  { host: "filekeeper", patterns: ["filekeeper.to", "filekeeper.com"] },
  { host: "fileq", patterns: ["fileq.co", "fileq.com"] },
  { host: "gdrive", patterns: ["drive.google.com", "docs.google.com"] },
  { host: "mediafire", patterns: ["mediafire.com"] },
  { host: "gofile", patterns: ["gofile.io"] },
  { host: "filecrypt", patterns: ["filecrypt.cc", "filecrypt.co"] },
  { host: "1fichier", patterns: ["1fichier.com"] },
  { host: "fileditch", patterns: ["fileditch.com"] },
  { host: "megadb", patterns: ["megadb.net"] },
];

function detectHost(url: string): string | null {
  const lower = url.toLowerCase();
  for (const { host, patterns } of HOST_PATTERNS) {
    for (const p of patterns) {
      if (lower.includes(p)) return host;
    }
  }
  return null;
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await axios.get(url, {
      headers: { "User-Agent": UA },
      timeout: 30000,
      validateStatus: (s) => s === 200,
    });
    return String(res.data);
  } catch (err: any) {
    console.log(`  Fetch failed: ${err.message?.substring(0, 60)}`);
    return null;
  }
}

async function main() {
  console.log(`=== FIX OVAGAMES LINKS (.html URL + multi-host): ${GAMES.length} games ===`);

  let totalLinksCreated = 0;

  for (const slug of GAMES) {
    console.log(`\n[${slug}]`);

    const game = await prisma.game.findUnique({ where: { slug } });
    if (!game) {
      console.log(`  ❌ Not found in DB`);
      continue;
    }

    // CORRECT URL: {slug}.html (NOT {slug}/)
    const gameUrl = `${BASE_URL}/${slug}.html`;
    const html = await fetchPage(gameUrl);

    if (!html) {
      console.log(`  ❌ Page not found: ${gameUrl}`);
      continue;
    }

    const $ = cheerio.load(html);
    const title = $("h1.post-title, h1.entry-title, h1").first().text().trim();
    console.log(`  Page: ${title || "(no title)"}`);

    // Extract ALL links in the download section
    const foundLinks: { url: string; host: string }[] = [];

    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") || "";
      const fullUrl = href.startsWith("//") ? `https:${href}` : href;
      if (!fullUrl.startsWith("http")) return;

      const host = detectHost(fullUrl);
      if (host && !foundLinks.some(l => l.url === fullUrl)) {
        foundLinks.push({ url: fullUrl, host });
      }
    });

    console.log(`  Found ${foundLinks.length} links`);

    if (foundLinks.length === 0) {
      console.log(`  ❌ No download links on page`);
      continue;
    }

    // Create download links
    let created = 0;
    for (const link of foundLinks) {
      const existing = await prisma.downloadLink.findFirst({
        where: { gameId: game.id, url: link.url },
      });

      if (!existing) {
        await prisma.downloadLink.create({
          data: {
            gameId: game.id,
            linkType: "direct",
            url: link.url,
            host: link.host,
            password: PASSWORD,
            source: "ovagames",
            isActive: true,
          },
        });
        created++;
        totalLinksCreated++;
        console.log(`    ✅ ${link.host}: ${link.url.substring(0, 60)}`);
      } else {
        console.log(`    ⚠️ Already exists: ${link.host}`);
      }
    }

    console.log(`  Created: ${created}`);
    await new Promise(r => setTimeout(r, 500));
  }

  const totalLinks = await prisma.downloadLink.count();
  const totalGames = await prisma.game.count();
  console.log(`\n=== SUMMARY ===`);
  console.log(`New links created: ${totalLinksCreated}`);
  console.log(`Total links in DB: ${totalLinks}`);
  console.log(`Total games in DB: ${totalGames}`);
  await prisma.$disconnect();
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
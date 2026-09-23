import { PrismaClient } from "@prisma/client";
import axios from "axios";
import * as cheerio from "cheerio";

const prisma = new PrismaClient();
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const GAMES = [
  "academia-school-simulator",
  "a-memoir-blue",
  "catie-in-meowmeowland",
  "ghost-watchers",
  "backpack-hero",
  "a-short-hike",
  "dead-by-daylight",
  "evil-dead-the-game",
  "the-outlast-trials",
  "party-animals",
  "gorilla-tag",
  "cat-quest-iii",
  "sea-of-thieves",
  "rematch",
  "farever",
  "mistfall-hunter",
];

const STEAMRIP_BASE = "https://steamrip.com";

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await axios.get(url, {
      headers: { "User-Agent": UA },
      timeout: 30000,
      validateStatus: (s) => s === 200,
    });
    return String(res.data);
  } catch (err: any) {
    console.log(`  Failed to fetch ${url}: ${err.message?.substring(0, 80)}`);
    return null;
  }
}

async function main() {
  console.log(`=== FIX STEAMRIP LINKS: ${GAMES.length} games ===`);

  for (const slug of GAMES) {
    console.log(`\nProcessing: ${slug}`);

    const game = await prisma.game.findUnique({
      where: { slug },
    });

    if (!game) {
      console.log(`  ❌ Game not found in DB`);
      continue;
    }

    console.log(`  Game ID: ${game.id}, Source: ${game.source}`);

    // Fetch SteamRip detail page
    const detailUrl = `${STEAMRIP_BASE}/${slug}-free-download/`;
    console.log(`  Fetching: ${detailUrl}`);
    const html = await fetchPage(detailUrl);

    if (!html) {
      console.log(`  ❌ Failed to fetch detail page`);
      continue;
    }

    const $ = cheerio.load(html);

    // Extract download links - look for the download section
    const links: { host: string; url: string }[] = [];

    // Method 1: Look for MegaDB links
    $(".down-loading a, .download-button a, a[href^=\"//megadb\"], a[href*=\"megadb\"]").each((_, el) => {
      const href = $(el).attr("href") || "";
      const fullUrl = href.startsWith("//") ? `https:${href}` : href;
      if (fullUrl.includes("megadb")) {
        links.push({ host: "megadb", url: fullUrl });
      }
    });

    // Method 2: Look for gofile links
    $(".down-loading a, .download-button a").each((_, el) => {
      const href = $(el).attr("href") || "";
      if (href.includes("gofile.io/")) {
        links.push({ host: "gofile", url: href });
      }
    });

    // Method 3: Look for fileditch links
    $(".down-loading a, .download-button a").each((_, el) => {
      const href = $(el).attr("href") || "";
      if (href.includes("fileditch")) {
        links.push({ host: "fileditch", url: href });
      }
    });

    // Method 4: Any link with download in text
    if (links.length === 0) {
      $("a").each((_, el) => {
        const text = $(el).text().trim().toLowerCase();
        const href = $(el).attr("href") || "";
        if ((text.includes("download") || text.includes("descargar")) && href && !href.includes("steamrip")) {
          let fullUrl = href;
          if (href.startsWith("//")) fullUrl = `https:${href}`;
          if (!fullUrl.startsWith("http")) fullUrl = `${STEAMRIP_BASE}${href}`;
          links.push({ host: "unknown", url: fullUrl });
        }
      });
    }

    console.log(`  Found ${links.length} links`);

    // Create download links
    let linksCreated = 0;
    for (const link of links) {
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
            isActive: true,
          },
        });
        linksCreated++;
        console.log(`  ✅ Link created: ${link.host} - ${link.url.substring(0, 40)}...`);
      } else {
        console.log(`  ⚠️ Link already exists`);
      }
    }

    console.log(`  Links created this round: ${linksCreated}`);
    await new Promise((r) => setTimeout(r, 1000));
  }

  const totalLinks = await prisma.downloadLink.count();
  const totalGames = await prisma.game.count();
  console.log(`\n=== SUMMARY ===`);
  console.log(`Total games in DB: ${totalGames}`);
  console.log(`Total download links: ${totalLinks}`);
  prisma.$disconnect();
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
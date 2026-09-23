import { PrismaClient } from "@prisma/client";
import axios from "axios";
import * as cheerio from "cheerio";
import { slugify } from "./scrape-ovagames";

const prisma = new PrismaClient();
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const PASSWORD = "www.ovagames.com";
const BASE_URL = "https://www.ovagames.com";

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

async function scrapeGamePage(url: string) {
  const html = await fetchPage(url);
  if (!html) return null;

  const $ = cheerio.load(html);

  // Title
  const title = $("h1.post-title, h1.entry-title, h1").first().text().trim();
  if (!title) return null;

  // Cover image
  let cover = $('meta[property="og:image"]').attr("content") || "";
  if (!cover) {
    cover = $("img.aligncenter").first().attr("src") || "";
  }

  // Filecrypt links (unique)
  const filecryptUrls: string[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    if (href.includes("filecrypt.cc/Container/") && !filecryptUrls.includes(href)) {
      filecryptUrls.push(href);
    }
  });

  return {
    title,
    slug: slugify(title),
    cover,
    filecryptUrls,
  };
}

async function main() {
  console.log(`=== FIX OVAGAMES LINKS: ${GAMES.length} games ===`);

  for (const slug of GAMES) {
    console.log(`\nProcessing: ${slug}`);

    // Find game in DB
    const game = await prisma.game.findUnique({
      where: { slug },
    });

    if (!game) {
      console.log(`  ❌ Game not found in DB`);
      continue;
    }

    console.log(`  Game ID: ${game.id}, Source: ${game.source}`);

    // Fetch OvaGames page
    const gameUrl = `${BASE_URL}/${slug}/`;
    console.log(`  Fetching: ${gameUrl}`);
    const gameData = await scrapeGamePage(gameUrl);

    if (!gameData || gameData.filecryptUrls.length === 0) {
      console.log(`  ❌ No filecrypt URLs found`);
      continue;
    }

    console.log(`  Found ${gameData.filecryptUrls.length} filecrypt URLs`);

    // Create download links (skip if already exist)
    let linksCreated = 0;
    for (const fcUrl of gameData.filecryptUrls) {
      const existing = await prisma.downloadLink.findFirst({
        where: { gameId: game.id, url: fcUrl },
      });

      if (!existing) {
        await prisma.downloadLink.create({
          data: {
            gameId: game.id,
            linkType: "direct",
            url: fcUrl,
            host: "filecrypt",
            password: PASSWORD,
            source: "ovagames",
            isActive: true,
          },
        });
        linksCreated++;
        console.log(`  ✅ Link created: ${fcUrl.substring(0, 40)}...`);
      } else {
        console.log(`  ⚠️ Link already exists`);
      }
    }

    console.log(`  Links created this round: ${linksCreated}`);
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
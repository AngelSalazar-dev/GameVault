import axios from "axios";
import * as cheerio from "cheerio";
import { PrismaClient } from "@prisma/client";
import { normalizeGenre } from "./lib/normalize";

const prisma = new PrismaClient();
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const BASE_URL = "https://www.ovagames.com";
const PASSWORD = "www.ovagames.com";
const MAX_PAGES = 5; // Start with 5 pages for testing

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 80);
}

function cleanTitle(title: string): string {
  return title
    .replace(/\s*Free Download.*$/i, "")
    .replace(/\s*PC Game.*$/i, "")
    .trim();
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
    console.log(`  Failed to fetch ${url}: ${err.message?.substring(0, 80)}`);
    return null;
  }
}

async function scrapeListingPage(url: string): Promise<string[]> {
  const html = await fetchPage(url);
  if (!html) return [];

  const $ = cheerio.load(html);
  const links: string[] = [];

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    if (href.includes(".html") && (href.includes("ovagames.com") || href.startsWith("/"))) {
      const fullUrl = href.startsWith("http") ? href : BASE_URL + href;
      if (!links.includes(fullUrl)) links.push(fullUrl);
    }
  });

  return links;
}

async function scrapeGamePage(url: string) {
  const html = await fetchPage(url);
  if (!html) return null;

  const $ = cheerio.load(html);

  // Title
  const title = $("h1.post-title, h1.entry-title, h1").first().text().trim();
  if (!title) return null;

  // Cover image (og:image or first content image)
  let cover = $('meta[property="og:image"]').attr("content") || "";
  if (!cover) {
    cover = $("img.aligncenter").first().attr("src") || "";
  }

  // Categories from tags
  const categories: string[] = [];
  $('a[rel="tag"]').each((_, el) => {
    const cat = $(el).text().trim();
    if (cat && !categories.includes(cat)) categories.push(cat);
  });

  // Extract metadata from bold labels
  const metadata: Record<string, string> = {};
  $("strong, b").each((_, el) => {
    const label = $(el).text().trim().toLowerCase().replace(/[:\s]+$/, "");
    if (["title", "genre", "developer", "publisher", "release date", "languages", "file size"].includes(label)) {
      const parent = $(el).parent();
      const fullText = parent.text().trim();
      const val = fullText.replace($(el).text(), "").trim().replace(/^[:\s]+/, "");
      if (val) metadata[label] = val;
    }
  });

  // Filecrypt links (unique)
  const filecryptUrls: string[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    if (href.includes("filecrypt.cc/Container/") && !filecryptUrls.includes(href)) {
      filecryptUrls.push(href);
    }
  });

  // Genre from metadata or categories
  const rawGenre = metadata["genre"] || categories[0] || "action";
  const genre = normalizeGenre(rawGenre);

  return {
    title: cleanTitle(title),
    slug: slugify(cleanTitle(title)),
    cover,
    genre,
    developer: metadata["developer"] || null,
    publisher: metadata["publisher"] || null,
    fileSize: metadata["file size"] || null,
    categories,
    filecryptUrls,
  };
}

async function main() {
  console.log("=== OVAGAMES SCRAPER ===\n");

  let totalGames = 0;
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let withLinks = 0;

  for (let page = 1; page <= MAX_PAGES; page++) {
    const pageUrl = page === 1 ? BASE_URL + "/" : BASE_URL + "/page/" + page + "/";
    console.log(`\nPage ${page}: ${pageUrl}`);

    const gameUrls = await scrapeListingPage(pageUrl);
    console.log(`  Found ${gameUrls.length} game URLs`);

    for (const url of gameUrls) {
      totalGames++;
      try {
        const gameData = await scrapeGamePage(url);
        if (!gameData) {
          skipped++;
          continue;
        }
        const existing = await prisma.game.findUnique({
          where: { slug: gameData.slug },
        });

        let gameId: string;

        if (existing) {
          // Update existing game with OvaGames data (prefer OvaGames metadata)
          await prisma.game.update({
            where: { id: existing.id },
            data: {
              coverImage: gameData.cover || existing.coverImage,
              genre: gameData.genre || existing.genre,
              developer: gameData.developer || existing.developer,
              publisher: gameData.publisher || existing.publisher,
              fileSize: gameData.fileSize || existing.fileSize,
              source: "ovagames",
            },
          });
          gameId = existing.id;
          updated++;
          console.log(`  Updated: ${gameData.title}`);
        } else {
          // Create new game
          const newGame = await prisma.game.create({
            data: {
              title: gameData.title,
              slug: gameData.slug,
              description: `${gameData.title} - Game from OvaGames.`,
              platform: "pc",
              genre: gameData.genre,
              developer: gameData.developer,
              publisher: gameData.publisher,
              coverImage: gameData.cover,
              fileSize: gameData.fileSize,
              status: "active",
              source: "ovagames",
            },
          });
          gameId = newGame.id;
          created++;
          console.log(`  Created: ${gameData.title}`);
        }

        // Add filecrypt download links
        for (const fcUrl of gameData.filecryptUrls) {
          const existingLink = await prisma.downloadLink.findFirst({
            where: { gameId, url: fcUrl },
          });
          if (!existingLink) {
            await prisma.downloadLink.create({
              data: {
                gameId,
                linkType: "direct",
                url: fcUrl,
                host: "filecrypt",
                password: PASSWORD,
                source: "ovagames",
                isActive: true,
              },
            });
            withLinks++;
          }
        }
      } catch (err: any) {
        // Print full error to stderr for debugging
        console.error(`  FULL ERROR [${url}]:`, JSON.stringify(err, null, 2)?.substring(0, 500));
      }

      // Rate limit
      await new Promise((r) => setTimeout(r, 1000));
    }

    // Rate limit between pages
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Total games scraped: ${totalGames}`);
  console.log(`Created: ${created}`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`New download links: ${withLinks}`);

  // Show total counts
  const totalInDb = await prisma.game.count();
  const totalLinks = await prisma.downloadLink.count();
  console.log(`\nTotal games in DB: ${totalInDb}`);
  console.log(`Total download links: ${totalLinks}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

import { PrismaClient } from "@prisma/client";
import axios from "axios";
import * as cheerio from "cheerio";

const prisma = new PrismaClient();
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const BASE_URL = "https://www.ovagames.com";
const PASSWORD = "www.ovagames.com";
const MAX_PAGES = 10;

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
    console.log(`  Fetch failed: ${err.message?.substring(0, 60)}`);
    return null;
  }
}

async function main() {
  console.log("=== FIND GAMES WITHOUT LINKS VIA LISTING PAGES ===\n");

  // Get games without links
  const noLinks = await prisma.game.findMany({
    where: { status: "active", downloadLinks: { none: {} }, source: { contains: "ovagames" } },
    select: { id: true, title: true, slug: true },
  });

  console.log(`Games without links (OvaGames): ${noLinks.length}`);

  // Build lookup by slug
  const targetSlugs = new Map<string, { id: string; title: string; slug: string }>();
  for (const g of noLinks) {
    targetSlugs.set(g.slug, g);
  }

  let found = 0;

  // Scrape listing pages and find matching games
  for (let page = 1; page <= MAX_PAGES && targetSlugs.size > 0; page++) {
    const pageUrl = page === 1 ? BASE_URL + "/" : BASE_URL + "/page/" + page + "/";
    console.log(`\nPage ${page}: ${pageUrl}`);

    const html = await fetchPage(pageUrl);
    if (!html) continue;

    const $ = cheerio.load(html);
    const gameUrls: string[] = [];

    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") || "";
      if (href.includes(".html") && (href.includes("ovagames.com") || href.startsWith("/"))) {
        const fullUrl = href.startsWith("http") ? href : BASE_URL + href;
        if (!gameUrls.includes(fullUrl)) gameUrls.push(fullUrl);
      }
    });

    console.log(`  Found ${gameUrls.length} game URLs`);

    // Visit each game page
    for (const url of gameUrls) {
      const gameHtml = await fetchPage(url);
      if (!gameHtml) continue;

      const $game = cheerio.load(gameHtml);
      const title = $game("h1.post-title, h1.entry-title, h1").first().text().trim();
      if (!title) continue;

      const gameSlug = slugify(cleanTitle(title));

      if (!targetSlugs.has(gameSlug)) continue;

      console.log(`  ✅ MATCH: ${title} -> ${gameSlug}`);

      // Extract filecrypt links
      const filecryptUrls: string[] = [];
      $game("a[href]").each((_, el) => {
        const href = $game(el).attr("href") || "";
        if (href.includes("filecrypt.cc/Container/") && !filecryptUrls.includes(href)) {
          filecryptUrls.push(href);
        }
      });

      console.log(`    Found ${filecryptUrls.length} filecrypt URLs`);

      const target = targetSlugs.get(gameSlug)!;

      for (const fcUrl of filecryptUrls) {
        const existing = await prisma.downloadLink.findFirst({
          where: { gameId: target.id, url: fcUrl },
        });
        if (!existing) {
          await prisma.downloadLink.create({
            data: {
              gameId: target.id,
              linkType: "direct",
              url: fcUrl,
              host: "filecrypt",
              password: PASSWORD,
              source: "ovagames",
              isActive: true,
            },
          });
          console.log(`    ✅ Link created: ${fcUrl}`);
          found++;
        }
      }

      targetSlugs.delete(gameSlug);
      await new Promise(r => setTimeout(r, 500));
    }

    console.log(`  Remaining: ${targetSlugs.size} games`);
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Games found and linked: ${found}`);
  console.log(`Games still missing: ${targetSlugs.size}`);
  if (targetSlugs.size > 0) {
    console.log("Missing slugs:");
    for (const [slug] of targetSlugs) console.log(`  - ${slug}`);
  }

  const totalLinks = await prisma.downloadLink.count();
  console.log(`\nTotal download links in DB: ${totalLinks}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
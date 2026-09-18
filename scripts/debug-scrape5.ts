import puppeteer from "puppeteer";
import * as cheerio from "cheerio";
import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function extractLinks($: cheerio.CheerioAPI): Promise<{ url: string; host: string }[]> {
  const links: { url: string; host: string }[] = [];
  const seen = new Set<string>();

  $("a.shortc-button").each((_, el) => {
    let href = $(el).attr("href") || "";
    if (!href || href.startsWith("/")) return;
    href = href.startsWith("//") ? `https:${href}` : href;

    let host = "";
    if (href.includes("bzzhr")) host = "bzzhr";
    else if (href.includes("megadb")) host = "megadb";
    else if (href.includes("gofile")) host = "gofile";
    else if (href.includes("fileditch")) host = "fileditch";
    else if (href.includes("krakenfiles")) host = "krakenfiles";

    if (host && !seen.has(href)) {
      seen.add(href);
      links.push({ url: href, host });
    }
  });

  return links;
}

async function main() {
  const listings: { title: string; url: string }[] = JSON.parse(
    fs.readFileSync("scripts/steamrip-all-listings.json", "utf-8")
  );

  const urlMap = new Map<string, string>();
  for (const listing of listings) {
    if (listing.url) {
      const key = normalizeTitle(listing.title);
      const cleanUrl = listing.url.replace("steamrip.com//", "steamrip.com/");
      urlMap.set(key, cleanUrl);
    }
  }

  // Get first 5 games without links
  const games = await prisma.game.findMany({
    where: {
      status: "active",
      source: "steamrip",
      downloadLinks: { none: {} },
    },
    select: { id: true, title: true, slug: true },
    take: 5,
  });

  console.log("Testing 5 games:");
  for (const game of games) {
    const key = normalizeTitle(game.title);
    const url = urlMap.get(key);
    console.log(`\n${game.title}`);
    console.log(`  slug: ${game.slug}`);
    console.log(`  key: "${key}"`);
    console.log(`  url: ${url || "NOT FOUND"}`);

    if (url) {
      console.log(`  Fetching: ${url}`);
      const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-blink-features=AutomationControlled"],
      });
      const page = await browser.newPage();
      await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36");
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, "webdriver", { get: () => false });
      });

      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
        await new Promise((r) => setTimeout(r, 5000));
        const html = await page.content();
        const $ = cheerio.load(html);
        const pageTitle = $("title").text();
        console.log(`  Page title: ${pageTitle}`);

        const links = await extractLinks($);
        console.log(`  Links found: ${links.length}`);
        links.forEach(l => console.log(`    ${l.host}: ${l.url.substring(0, 80)}`));
      } catch (err: any) {
        console.log(`  ERROR: ${err.message.substring(0, 80)}`);
      }
      await browser.close();
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);

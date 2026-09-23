import { PrismaClient } from "@prisma/client";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

const prisma = new PrismaClient();
const STEAMRIP_BASE = "https://steamrip.com";

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

const HOST_PATTERNS: { host: string; patterns: string[] }[] = [
  { host: "megadb", patterns: ["megadb.net"] },
  { host: "gofile", patterns: ["gofile.io"] },
  { host: "fileditch", patterns: ["fileditch"] },
  { host: "filecrypt", patterns: ["filecrypt.cc", "filecrypt.co"] },
  { host: "mediafire", patterns: ["mediafire.com"] },
  { host: "gdrive", patterns: ["drive.google.com", "docs.google.com"] },
  { host: "1fichier", patterns: ["1fichier.com"] },
  { host: "datanodes", patterns: ["datanodes"] },
  { host: "filekeeper", patterns: ["filekeeper"] },
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

async function main() {
  console.log(`=== FIX STEAMRIP WITH PUPPETEER: ${GAMES.length} games ===`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });

  let totalLinksCreated = 0;

  for (let i = 0; i < GAMES.length; i++) {
    const slug = GAMES[i];
    console.log(`\n[${i + 1}/${GAMES.length}] ${slug}`);

    const game = await prisma.game.findUnique({ where: { slug } });
    if (!game) {
      console.log(`  ❌ Not found in DB`);
      continue;
    }

    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36");
    await page.setViewport({ width: 1366, height: 768 });

    try {
      const gameUrl = `${STEAMRIP_BASE}/${slug}-free-download/`;
      console.log(`  URL: ${gameUrl}`);

      await page.goto(gameUrl, { waitUntil: "networkidle2", timeout: 30000 });
      await new Promise(r => setTimeout(r, 2000));

      // Check if page loaded
      const title = await page.title();
      console.log(`  Title: ${title}`);

      // Extract download links
      const foundLinks = await page.evaluate((patterns) => {
        const links: { url: string; host: string }[] = [];
        const seen = new Set<string>();

        document.querySelectorAll("a[href]").forEach((el) => {
          const href = (el as HTMLAnchorElement).href;
          if (!href || seen.has(href)) return;
          if (!href.startsWith("http")) return;
          if (href.includes("steamrip.com")) return;
          if (href.includes("facebook") || href.includes("twitter") || href.includes("instagram")) return;

          const lower = href.toLowerCase();
          for (const { host, hosts } of patterns) {
            for (const p of hosts) {
              if (lower.includes(p)) {
                seen.add(href);
                links.push({ url: href, host });
                break;
              }
            }
            if (seen.has(href)) break;
          }
        });

        return links;
      }, HOST_PATTERNS.map(p => ({ host: p.host, hosts: p.patterns })));

      console.log(`  Found ${foundLinks.length} download links`);

      if (foundLinks.length === 0) {
        // Debug: get all external links
        const allLinks = await page.evaluate(() => {
          const links: string[] = [];
          document.querySelectorAll("a[href]").forEach((el) => {
            const href = (el as HTMLAnchorElement).href;
            if (href && href.startsWith("http") && !href.includes("steamrip.com")) {
              links.push(href);
            }
          });
          return links;
        });
        console.log(`  Debug - External links: ${allLinks.length}`);
        allLinks.slice(0, 5).forEach(l => console.log(`    ${l}`));

        await page.close();
        continue;
      }

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
              source: "steamrip",
              isActive: true,
            },
          });
          created++;
          totalLinksCreated++;
        }
      }

      console.log(`  ✅ Created ${created} links`);

    } catch (err: any) {
      console.log(`  ❌ Error: ${err.message?.substring(0, 80)}`);
    } finally {
      await page.close().catch(() => {});
    }

    await new Promise(r => setTimeout(r, 3000));
  }

  await browser.close();

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
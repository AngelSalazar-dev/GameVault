import { PrismaClient } from "@prisma/client";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

const prisma = new PrismaClient();
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
  { host: "datanodes", patterns: ["datanodes"] },
  { host: "filekeeper", patterns: ["filekeeper"] },
  { host: "fileq", patterns: ["fileq"] },
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
  console.log(`=== FIX OVAGAMES WITH PUPPETEER: ${GAMES.length} games ===`);

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
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
      const gameUrl = `${BASE_URL}/${slug}.html`;
      console.log(`  URL: ${gameUrl}`);

      await page.goto(gameUrl, { waitUntil: "networkidle2", timeout: 30000 });
      await new Promise(r => setTimeout(r, 2000));

      // Try clicking "LINK DOWNLOAD" tab
      try {
        const tabs = await page.$$("a, button, li");
        for (const tab of tabs) {
          const text = await tab.evaluate(el => el.textContent?.trim() || "");
          if (text === "LINK DOWNLOAD") {
            await tab.click();
            console.log(`  Clicked LINK DOWNLOAD tab`);
            await new Promise(r => setTimeout(r, 2000));
            break;
          }
        }
      } catch (e) {
        // Tab click not critical
      }

      // Extract all links with recognized hosts
      const foundLinks = await page.evaluate((patterns) => {
        const links: { url: string; host: string }[] = [];
        const seen = new Set<string>();

        document.querySelectorAll("a[href]").forEach((el) => {
          const href = (el as HTMLAnchorElement).href;
          if (!href || seen.has(href)) return;
          if (!href.startsWith("http")) return;

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

      console.log(`  Found ${foundLinks.length} links`);

      if (foundLinks.length === 0) {
        // Debug: dump all links
        const allLinks = await page.evaluate(() => {
          const links: string[] = [];
          document.querySelectorAll("a[href]").forEach((el) => {
            const href = (el as HTMLAnchorElement).href;
            if (href && href.startsWith("http") && !href.includes("ovagames.com")) {
              links.push(href);
            }
          });
          return links;
        });
        console.log(`  Debug - All external links: ${allLinks.length}`);
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
              password: PASSWORD,
              source: "ovagames",
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

    await new Promise(r => setTimeout(r, 2000));
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
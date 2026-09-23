import { PrismaClient } from "@prisma/client";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

const prisma = new PrismaClient();
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

async function main() {
  console.log(`=== FIX OVAGAMES LINKS WITH PUPPETEER: ${GAMES.length} games ===`);

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--disable-gpu",
    ],
  });

  for (let i = 0; i < GAMES.length; i++) {
    const slug = GAMES[i];
    console.log(`\n[${i + 1}/${GAMES.length}] Processing: ${slug}`);

    const game = await prisma.game.findUnique({ where: { slug } });
    if (!game) {
      console.log(`  ❌ Game not found in DB`);
      continue;
    }

    console.log(`  Game ID: ${game.id}`);

    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36");
    await page.setViewport({ width: 1366, height: 768 });

    try {
      const gameUrl = `${BASE_URL}/${slug}/`;
      console.log(`  Fetching: ${gameUrl}`);

      await page.goto(gameUrl, { waitUntil: "networkidle2", timeout: 60000 });
      await new Promise((r) => setTimeout(r, 3000));

      // Extract filecrypt links
      const filecryptUrls = await page.evaluate(() => {
        const urls: string[] = [];
        document.querySelectorAll("a[href]").forEach((el) => {
          const href = (el as HTMLAnchorElement).href;
          if (href.includes("filecrypt.cc/Container/") && !urls.includes(href)) {
            urls.push(href);
          }
        });
        return urls;
      });

      if (filecryptUrls.length === 0) {
        console.log(`  ❌ No filecrypt URLs found`);
        // Try waiting for dynamic content
        await new Promise((r) => setTimeout(r, 5000));
        const filecryptUrls2 = await page.evaluate(() => {
          const urls: string[] = [];
          document.querySelectorAll("a[href]").forEach((el) => {
            const href = (el as HTMLAnchorElement).href;
            if (href.includes("filecrypt.cc/Container/") && !urls.includes(href)) {
              urls.push(href);
            }
          });
          return urls;
        });
        if (filecryptUrls2.length === 0) {
          console.log(`  ❌ Still no filecrypt URLs after waiting`);
          await page.close();
          continue;
        }
        filecryptUrls.push(...filecryptUrls2);
      }

      console.log(`  Found ${filecryptUrls.length} filecrypt URLs`);

      // Create download links
      let linksCreated = 0;
      for (const fcUrl of filecryptUrls) {
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
          console.log(`  ✅ Link created: ${fcUrl}`);
        }
      }

      console.log(`  Links created: ${linksCreated}`);

    } catch (err: any) {
      console.log(`  ❌ Error: ${err.message?.substring(0, 100)}`);
    } finally {
      await page.close();
    }

    // Rate limit
    await new Promise((r) => setTimeout(r, 5000));
  }

  await browser.close();

  const totalLinks = await prisma.downloadLink.count();
  const totalGames = await prisma.game.count();
  console.log(`\n=== SUMMARY ===`);
  console.log(`Total games in DB: ${totalGames}`);
  console.log(`Total download links: ${totalLinks}`);
  await prisma.$disconnect();
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
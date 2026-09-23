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

function detectHostFromText(text: string): string | null {
  const lower = text.toLowerCase();
  if (lower.includes("datanodes")) return "datanodes";
  if (lower.includes("filekeeper")) return "filekeeper";
  if (lower.includes("fileq")) return "fileq";
  if (lower.includes("google drive") || lower.includes("gdrive")) return "gdrive";
  if (lower.includes("mediafire")) return "mediafire";
  if (lower.includes("gofile")) return "gofile";
  if (lower.includes("filecrypt")) return "filecrypt";
  if (lower.includes("1fichier")) return "1fichier";
  if (lower.includes("fileditch")) return "fileditch";
  if (lower.includes("megadb")) return "megadb";
  if (lower.includes("datanodes")) return "datanodes";
  if (lower.includes("torrent")) return "torrent";
  return null;
}

function detectHostFromUrl(url: string): string | null {
  const lower = url.toLowerCase();
  if (lower.includes("filecrypt")) return "filecrypt";
  if (lower.includes("gofile.io")) return "gofile";
  if (lower.includes("mediafire.com")) return "mediafire";
  if (lower.includes("drive.google.com")) return "gdrive";
  if (lower.includes("1fichier.com")) return "1fichier";
  if (lower.includes("fileditch")) return "fileditch";
  if (lower.includes("megadb")) return "megadb";
  return null;
}

async function main() {
  console.log(`=== FIX OVAGAMES WITH BUTTON TEXT: ${GAMES.length} games ===`);

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
      const gameUrl = `${BASE_URL}/${slug}.html`;
      await page.goto(gameUrl, { waitUntil: "networkidle2", timeout: 30000 });
      await new Promise(r => setTimeout(r, 2000));

      // Click LINK DOWNLOAD tab
      try {
        const tabs = await page.$$("a, button, li");
        for (const tab of tabs) {
          const text = await tab.evaluate(el => el.textContent?.trim() || "");
          if (text === "LINK DOWNLOAD") {
            await tab.click();
            await new Promise(r => setTimeout(r, 2000));
            break;
          }
        }
      } catch (e) {}

      // Extract links WITH their button text
      const foundLinks = await page.evaluate(() => {
        const links: { url: string; text: string }[] = [];
        const seen = new Set<string>();

        // Get all links in the download section
        document.querySelectorAll("a[href]").forEach((el) => {
          const href = (el as HTMLAnchorElement).href;
          const text = (el as HTMLElement).textContent?.trim() || "";
          if (!href || seen.has(href)) return;
          if (!href.startsWith("http")) return;
          if (href.includes("ovagames.com")) return;
          if (href.includes("facebook") || href.includes("twitter") || href.includes("instagram")) return;

          // Only capture links that have recognizable host text OR are shorteners
          const isShortener = href.includes("tpi.li") || href.includes("oii.la") || href.includes("shrinkme.click") || href.includes("srnky.com") || href.includes("clksz.com");
          const hasHostText = /datanodes|filekeeper|fileq|google.?drive|mediafire|gofile|filecrypt|1fichier|fileditch|megadb/i.test(text);

          if (isShortener || hasHostText) {
            seen.add(href);
            links.push({ url: href, text });
          }
        });

        return links;
      });

      console.log(`  Found ${foundLinks.length} download buttons`);

      if (foundLinks.length === 0) {
        await page.close();
        continue;
      }

      // Map to hosts
      const mappedLinks: { url: string; host: string }[] = [];
      for (const link of foundLinks) {
        let host = detectHostFromText(link.text) || detectHostFromUrl(link.url);
        if (!host) {
          // Try extracting host from button context (parent element)
          const parentText = link.text;
          host = detectHostFromText(parentText);
        }
        if (host) {
          mappedLinks.push({ url: link.url, host });
        }
      }

      // Deduplicate by URL
      const uniqueLinks = mappedLinks.filter((link, idx, arr) => arr.findIndex(l => l.url === link.url) === idx);

      console.log(`  Mapped ${uniqueLinks.length} unique links`);

      let created = 0;
      for (const link of uniqueLinks) {
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
  console.log(`\n=== SUMMARY ===`);
  console.log(`New links created: ${totalLinksCreated}`);
  console.log(`Total links in DB: ${totalLinks}`);
  await prisma.$disconnect();
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
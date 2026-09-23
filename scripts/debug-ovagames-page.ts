import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
puppeteer.use(StealthPlugin());

async function main() {
  const testUrls = [
    "https://www.ovagames.com/nba-2k27-deluxe-edition-multi10-elamigos/",
    "https://www.ovagames.com/euro-truck-simulator-2-multi43-elamigos/", // known to have links
  ];

  for (const url of testUrls) {
    console.log(`\n=== ${url} ===`);
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36");

    try {
      const res = await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
      console.log(`  Status: ${res?.status()}`);
      console.log(`  Title: ${await page.title()}`);

      // Check for filecrypt
      const filecrypt = await page.evaluate(() => {
        const urls: string[] = [];
        document.querySelectorAll("a[href]").forEach((el) => {
          const href = (el as HTMLAnchorElement).href;
          if (href.includes("filecrypt")) urls.push(href);
        });
        return urls;
      });
      console.log(`  filecrypt links: ${filecrypt.length}`);
      filecrypt.slice(0, 3).forEach(u => console.log(`    ${u}`));

      // Check for ANY download-looking links
      const allLinks = await page.evaluate(() => {
        const links: string[] = [];
        document.querySelectorAll("a[href]").forEach((el) => {
          const href = (el as HTMLAnchorElement).href;
          if (href.includes("gofile") || href.includes("megadb") || href.includes("fileditch") || href.includes("1fichier") || href.includes("datanodes")) {
            links.push(href);
          }
        });
        return links;
      });
      console.log(`  Other download links: ${allLinks.length}`);
      allLinks.slice(0, 3).forEach(u => console.log(`    ${u}`));

      // Get body text snippet
      const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
      console.log(`  Body preview: ${bodyText.substring(0, 300)}`);

    } catch (err: any) {
      console.log(`  ERROR: ${err.message}`);
    }

    await browser.close();
    await new Promise(r => setTimeout(r, 2000));
  }
}

main().catch(console.error);

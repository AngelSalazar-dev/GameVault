import puppeteer from "puppeteer";
import fs from "fs";

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
    ],
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
  );
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });

  console.log("Navigating to action category...");
  await page.goto("https://steamrip.com/category/action/", {
    waitUntil: "networkidle2",
    timeout: 60000,
  });

  // Wait extra time for Cloudflare
  await new Promise((r) => setTimeout(r, 8000));

  const html = await page.content();
  fs.writeFileSync("scripts/test-category.html", html);

  const title = await page.title();
  console.log("Page title:", title);
  console.log("HTML length:", html.length);
  console.log("Has post-item:", html.includes("post-item"));
  console.log("Has Cloudflare:", html.includes("Just a moment"));

  await browser.close();
}

main().catch(console.error);

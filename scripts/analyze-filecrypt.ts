import puppeteer from "puppeteer";
import * as cheerio from "cheerio";
import fs from "fs";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

async function main() {
  console.log("=== FILECRYPT DEEP ANALYSIS ===\n");

  const browser = await puppeteer.launch({
    headless: "new" as any,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-blink-features=AutomationControlled"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent(UA);
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });

  try {
    console.log("1. Loading filecrypt page...");
    await page.goto("https://www.filecrypt.cc/Container/7122E8F0C2.html", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });
    await new Promise((r) => setTimeout(r, 3000));

    // Get the full page HTML
    const html = await page.content();
    fs.writeFileSync("scripts/filecrypt-analysis.html", html);

    // Check all scripts loaded
    console.log("\n2. Checking scripts:");
    const scripts = await page.evaluate(() => {
      const ss = document.querySelectorAll("script[src]");
      return Array.from(ss).map((s) => s.getAttribute("src"));
    });
    for (const s of scripts) console.log("  " + s);

    // Check if pow_captcha_worker.js is loaded
    const workerLoaded = await page.evaluate(() => {
      return typeof (window as any).PowCaptcha !== "undefined" ||
        typeof (window as any).pow_captcha !== "undefined" ||
        document.querySelector('script[src*="pow_captcha"]') !== null;
    });
    console.log("  Worker-related code loaded: " + workerLoaded);

    // Check captcha element details
    console.log("\n3. Captcha element state:");
    const captchaInfo = await page.evaluate(() => {
      const el = document.getElementById("pow-captcha");
      if (!el) return "NOT FOUND";
      return {
        state: el.getAttribute("data-state"),
        session: el.getAttribute("data-session"),
        worker: el.getAttribute("data-worker"),
        ext: el.getAttribute("data-ext"),
        px: el.getAttribute("data-px"),
        innerHTML: el.innerHTML.substring(0, 500),
      };
    });
    console.log(JSON.stringify(captchaInfo, null, 2));

    // Check for service workers
    console.log("\n4. Service workers:");
    const swState = await page.evaluate(async () => {
      if (!navigator.serviceWorker) return "Not supported";
      const regs = await navigator.serviceWorker.getRegistrations();
      return regs.map((r) => r.scope);
    });
    console.log(JSON.stringify(swState));

    // Check web workers via performance entries
    console.log("\n5. Network requests for worker files:");
    const perfEntries = await page.evaluate(() => {
      return performance.getEntriesByType("resource")
        .filter((e: any) => e.name.includes("worker") || e.name.includes("pow") || e.name.includes("captcha"))
        .map((e: any) => ({ name: e.name, duration: e.duration, size: e.transferSize }));
    });
    console.log(JSON.stringify(perfEntries, null, 2));

    // Check console errors
    console.log("\n6. Console errors:");
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    // Click the captcha box
    console.log("\n7. Clicking captcha box...");
    await page.click(".pow-captcha__box").catch(() => console.log("  Click failed"));

    // Wait 30 seconds and check state
    await new Promise((r) => setTimeout(r, 30000));

    console.log("\n8. After 30s wait:");
    const afterClick = await page.evaluate(() => {
      const el = document.getElementById("pow-captcha");
      if (!el) return "NOT FOUND";
      const nonceInput = document.querySelector('input[name="pow_nonce"]');
      const powXInput = document.querySelector('input[name="pow_x"]');
      return {
        state: el.getAttribute("data-state"),
        nonceValue: (nonceInput as any)?.value || "NONE",
        powXValue: (powXInput as any)?.value?.substring(0, 50) || "NONE",
        powXLen: (powXInput as any)?.value?.length || 0,
        checkboxChecked: document.querySelector(".pow-captcha__box")?.getAttribute("aria-checked"),
      };
    });
    console.log(JSON.stringify(afterClick, null, 2));

    // Check all network requests
    console.log("\n9. Captcha-related network requests:");
    const captchaRequests = await page.evaluate(() => {
      return performance.getEntriesByType("resource")
        .filter((e: any) => e.name.includes("captcha") || e.name.includes("pow") || e.name.includes("worker") || e.name.includes("session"))
        .map((e: any) => e.name);
    });
    for (const r of captchaRequests) console.log("  " + r);

    // Check cookies
    console.log("\n10. Cookies:");
    const cookies = await page.cookies();
    for (const c of cookies) console.log("  " + c.name + "=" + c.value.substring(0, 50));

  } catch (err: any) {
    console.error("ERROR:", err.message);
  } finally {
    await browser.close();
  }
}

main();

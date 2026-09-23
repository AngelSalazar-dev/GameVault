import puppeteer from "puppeteer";
import * as fs from "fs";

const TARGET_URL = "https://www.filecrypt.cc/Container/7122E8F0C2.html";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

async function ev(page: puppeteer.Page, code: string): Promise<any> { return page.evaluate(code); }

async function main() {
  console.log("FILECRYPT.CC - DEBUGGING");
  console.log("=".repeat(60));

  const browser = await puppeteer.launch({
    headless: "new" as any,
    args: ["--no-sandbox","--disable-setuid-sandbox","--disable-blink-features=AutomationControlled"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent(UA);
  await ev(page, "Object.defineProperty(navigator,'webdriver',{get:function(){return false}})");

  // Collect console messages
  const consoleLogs: string[] = [];
  page.on("console", function(msg) { consoleLogs.push(msg.type() + ": " + msg.text()); });

  // Collect errors
  const pageErrors: string[] = [];
  page.on("pageerror", function(err) { pageErrors.push(err.message); });

  try {
    await page.goto(TARGET_URL, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise(function(r){setTimeout(r,3000)});

    // Check if Worker is supported
    const workerTest = await ev(page, 'typeof Worker');
    console.log("Worker support: " + workerTest);

    // Check if pow_captcha script loaded
    const scriptCheck = await ev(page, 'typeof document.getElementById("pow-captcha")');
    console.log("pow-captcha element: " + scriptCheck);

    // Check data attributes
    const attrs = await ev(page, 'var el=document.getElementById("pow-captcha");JSON.stringify({session:el?el.getAttribute("data-session"):"",worker:el?el.getAttribute("data-worker"):"",state:el?el.getAttribute("data-state"):""})');
    console.log("Attributes: " + attrs);

    // Override window.open
    await ev(page, 'window.open=function(){return null}');

    // Add debug logging to the click handler
    await ev(page, 'var box=document.querySelector(".pow-captcha__box");box.addEventListener("click",function(){console.log("BOX CLICKED!")})');

    // Click the box
    console.log("Clicking...");
    await page.click(".pow-captcha__box");
    await new Promise(function(r){setTimeout(r,5000)});

    // Check state after click
    const state1 = await ev(page, 'var el=document.getElementById("pow-captcha");JSON.stringify({state:el?el.getAttribute("data-state"):""})');
    console.log("State after click: " + state1);

    // Print console logs
    console.log("\nConsole logs:");
    for (const log of consoleLogs.slice(-20)) console.log("  " + log);

    console.log("\nPage errors:");
    for (const err of pageErrors) console.log("  " + err);

    // Try manually creating a Worker to see if it works
    console.log("\nTesting Worker directly...");
    const workerTest2 = await ev(page, 'new Promise(function(resolve){try{var w=new Worker("data:text/javascript,self.postMessage(42)");w.onmessage=function(e){resolve("Worker works: "+e.data)};setTimeout(function resolve("Worker timeout")},3000)}catch(e){resolve("Worker error: "+e)})');
    console.log("Worker test: " + workerTest2);

    // Check if the captcha's Worker URL is accessible
    const workerUrl = await ev(page, 'document.getElementById("pow-captcha").getAttribute("data-worker")');
    console.log("Worker URL: " + workerUrl);

    // Try fetching the worker script
    const workerFetch = await ev(page, 'fetch("' + workerUrl + '").then(function(r){return r.status+""}).catch(function(e){"error: "+e})');
    console.log("Worker fetch status: " + workerFetch);

  } catch(err:any) {
    console.error("ERROR:", err.message);
  } finally {
    await browser.close();
  }
}

main();

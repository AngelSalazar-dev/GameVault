import puppeteer from "puppeteer";
import * as fs from "fs";

const TARGET_URL = "https://www.filecrypt.cc/Container/7122E8F0C2.html";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

async function ev(page: puppeteer.Page, code: string): Promise<any> { return page.evaluate(code); }

async function main() {
  console.log("FILECRYPT.CC - NATURAL WORKER, LONG WAIT (8 min)");
  console.log("=".repeat(60));

  const t0 = Date.now();
  const browser = await puppeteer.launch({
    headless: "new" as any,
    args: ["--no-sandbox","--disable-setuid-sandbox","--disable-blink-features=AutomationControlled"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent(UA);
  await ev(page, "Object.defineProperty(navigator,'webdriver',{get:function(){return false}})");

  page.on("popup", async function(popup) { await popup.close().catch(function(){}); });

  try {
    console.log("Loading page...");
    await page.goto(TARGET_URL, { waitUntil: "networkidle2", timeout: 30000 });
    console.log("Loaded in " + (Date.now()-t0) + "ms");
    await new Promise(function(r){setTimeout(r,3000)});

    // Block popup
    await ev(page, 'window.open=function(){return null}');

    console.log("Clicking captcha box...");
    await page.click(".pow-captcha__box").catch(function(){});

    // Wait for PoW - up to 8 minutes
    console.log("Waiting for PoW (up to 8 min)...");
    let solved = false;
    for (let i = 0; i < 240; i++) {
      await new Promise(function(r){setTimeout(r,2000)});
      const nonce = await ev(page, '(document.querySelector(\'input[name="pow_nonce"]\')||{}).value||""');
      if (nonce) {
        console.log("  SOLVED at " + i*2 + "s! nonce=" + nonce);
        solved = true;
        break;
      }
      if (i % 30 === 0 && i > 0) {
        const state = await ev(page, 'document.getElementById("pow-captcha").getAttribute("data-state")');
        const powXLen = await ev(page, '((document.querySelector(\'input[name="pow_x"]\')||{}).value||"").length');
        console.log("  " + i*2 + "s... state=" + state + " pow_x_len=" + powXLen);
      }
    }

    if (solved) {
      console.log("Waiting for form auto-submit...");
      try { await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 20000 }); } catch(_){}
      
      const html = await page.content();
      const passed = !(html.includes("pow-captcha") && html.indexOf("Verificación") >= 0);
      console.log("Captcha passed: " + passed);
      console.log("HTML: " + html.length + " bytes");
      fs.writeFileSync("scripts/filecrypt-final.html", html);

      if (passed) {
        console.log("\n*** CAPTCHA PASSED! ***");
        const ids = await ev(page, 'var r=[];var re=/Link\\/([A-Fa-f0-9]{4,})/g;var m;while((m=re.exec(document.documentElement.innerHTML))!==null){if(r.indexOf(m[1])===-1)r.push(m[1])}JSON.stringify(r)');
        const linkIds: string[] = JSON.parse(ids || "[]");
        console.log("Link IDs: " + linkIds.join(", "));

        const allUrls: string[] = [];
        const allHosts: string[] = [];

        for (const lid of linkIds) {
          console.log("\n--- Link " + lid + " ---");
          try {
            await page.goto("https://www.filecrypt.cc/Link/" + lid + ".html", { waitUntil: "domcontentloaded", timeout: 30000 });
            await new Promise(function(r){setTimeout(r,5000)});

            const data = JSON.parse(await ev(page, 'var r={url:location.href,title:document.title,links:[],iframes:[]};var aa=document.querySelectorAll("a[href]");for(var i=0;i<aa.length;i++){var h=aa[i].href;if(h.indexOf("filecrypt")===-1&&h.indexOf("http")===0)r.links.push({href:h,text:(aa[i].textContent||"").trim().substring(0,200)})}var iff=document.querySelectorAll("iframe[src]");for(var i=0;i<iff.length;i++)r.iframes.push(iff[i].src);JSON.stringify(r)') || "{}");

            console.log("  URL: " + data.url);
            console.log("  Title: " + data.title);
            for (const l of (data.links || [])) {
              console.log("    " + l.href.substring(0, 120));
              allUrls.push(l.href);
              try { allHosts.push(new URL(l.href).hostname); } catch(_){}
            }
            for (const f of (data.iframes || [])) {
              console.log("    [iframe] " + f.substring(0, 120));
              allUrls.push(f);
              try { allHosts.push(new URL(f).hostname); } catch(_){}
            }
            const lhtml = await page.content();
            fs.writeFileSync("scripts/filecrypt-link-" + lid + ".html", lhtml);
          } catch(err:any) {
            console.log("  ERROR: " + err.message.substring(0, 100));
          }
        }

        console.log("\n\n" + "=".repeat(60));
        console.log("EXTRACTED DOWNLOAD URLs");
        console.log("=".repeat(60));
        const uniq = [...new Set(allUrls)];
        const hosts = [...new Set(allHosts)];
        console.log("Unique URLs: " + uniq.length);
        for (const u of uniq) console.log("  " + u);
        console.log("Hosts: " + (hosts.join(", ") || "none"));
      }
    } else {
      console.log("\nPoW did not solve in 8 minutes");
    }

    console.log("\nTotal: " + ((Date.now()-t0)/1000).toFixed(1) + "s");
  } catch(err:any) {
    console.error("FATAL:", err.message);
  } finally {
    await browser.close();
  }
}

main();

import puppeteer from "puppeteer";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const TARGET = "https://www.filecrypt.cc/Container/7122E8F0C2.html";

function sha1LZ(str: string): number {
  const enc = new TextEncoder();
  const data = enc.encode(str);
  const len = data.length;
  let total = (len + 1 + 8 + 63) & ~63;
  const buf = new Uint8Array(total);
  buf.set(data); buf[len] = 0x80;
  const bl = len * 8;
  buf[total-4]=(bl>>>24)&0xff;buf[total-3]=(bl>>>16)&0xff;buf[total-2]=(bl>>>8)&0xff;buf[total-1]=bl&0xff;
  const w=new Int32Array(80);
  let h0=0x67452301,h1=0xEFCDAB89,h2=0x98BADCFE,h3=0x10325476,h4=0xC3D2E1F0;
  for(let o=0;o<total;o+=64){
    for(let i=0;i<16;i++){const j=o+i*4;w[i]=(buf[j]<<24)|(buf[j+1]<<16)|(buf[j+2]<<8)|buf[j+3];}
    for(let i=16;i<80;i++){const v=w[i-3]^w[i-8]^w[i-14]^w[i-16];w[i]=(v<<1)|(v>>>31);}
    let a=h0,b=h1,c=h2,d=h3,e=h4;
    for(let i=0;i<80;i++){let f,k;if(i<20){f=(b&c)|(~b&d);k=0x5A827999;}else if(i<40){f=b^c^d;k=0x6ED9EBA1;}else if(i<60){f=(b&c)|(b&d)|(c&d);k=0x8F1BBCDC;}else{f=b^c^d;k=0xCA62C1D6;}const t=(((a<<5)|(a>>>27))+f+e+k+w[i])|0;e=d;d=c;c=((b<<30)|(b>>>2))|0;b=a;a=t;}
    h0=(h0+a)|0;h1=(h1+b)|0;h2=(h2+c)|0;h3=(h3+d)|0;h4=(h4+e)|0;
  }
  let u=h0>>>0;if(u)return Math.clz32(u);u=h1>>>0;if(u)return 32+Math.clz32(u);
  u=h2>>>0;if(u)return 64+Math.clz32(u);u=h3>>>0;if(u)return 96+Math.clz32(u);
  u=h4>>>0;if(u)return 128+Math.clz32(u);return 160;
}
function solvePow(ch: string, diff: number) {
  const p=ch+":";const s=Date.now();let n=0;
  while(n<Math.pow(2,diff)*2){if(sha1LZ(p+n)>=diff)return{nonce:n,ms:Date.now()-s};n++;}
  return{nonce:-1,ms:Date.now()-s};
}

async function main() {
  console.log("=== FILECRYPT SOLVER v8 ===\n");
  const browser = await puppeteer.launch({
    headless: "new" as any,
    args: ["--no-sandbox","--disable-setuid-sandbox","--disable-blink-features=AutomationControlled","--disable-dev-shm-usage"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent(UA);
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });
  page.on("pageerror", () => {});

  try {
    console.log("1. Loading...");
    await page.goto(TARGET, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    const config = await page.evaluate(() => {
      const el = document.getElementById("pow-captcha")!;
      return {
        sessionUrl: el.getAttribute("data-session"),
        xUrl: el.getAttribute("data-ext"),
        pxUrls: (el.getAttribute("data-px")||"").split(",").map((s:string)=>s.trim()).filter(Boolean),
      };
    });
    console.log("2. Session:", config.sessionUrl);

    // Get pow_x
    console.log("3. Getting pow_x...");
    const powX = await page.evaluate(async (xUrl: string) => {
      try {
        const m = await import(xUrl);
        const fn = m && (m.R || (m.default && m.default.R));
        return fn ? await fn() : "";
      } catch { return ""; }
    }, config.xUrl);
    console.log("   pow_x:", (powX||"").substring(0, 50));

    // Get pow_y
    console.log("4. Getting pow_y...");
    const yNonce = await page.evaluate(() => {
      const a = new Uint32Array(2); crypto.getRandomValues(a);
      return a[0].toString(36) + a[1].toString(36);
    });
    let powY = "";
    for (const url of config.pxUrls) {
      const fullUrl = url + (url.includes("?")?"&":"?") + "t=" + yNonce;
      try {
        const r = await page.evaluate(async (u: string) => {
          const ctl = new AbortController();
          const to = setTimeout(()=>ctl.abort(), 10000);
          try {
            const res = await fetch(u, {cache:"no-store",mode:"cors",signal:ctl.signal});
            if (res.ok) { const j = await res.json(); return j?.cid || ""; }
          } catch {} finally { clearTimeout(to); }
          return "";
        }, fullUrl);
        if (r) { powY = r; console.log("   Got from " + url.split("/")[2]); break; }
      } catch {}
    }

    // Get challenge
    console.log("5. Getting challenge...");
    const challenge = await page.evaluate(async (sUrl, pX, pY, yN) => {
      const body = new URLSearchParams();
      body.set("pow_x", pX); body.set("pow_y", pY); body.set("pow_yn", yN);
      try { body.set("tz", Intl.DateTimeFormat().resolvedOptions().timeZone); } catch { body.set("tz","unknown"); }
      const r = await fetch(sUrl, {method:"POST",cache:"no-store",body});
      const j = await r.json(); return j?.challenge;
    }, config.sessionUrl, powX, powY, yNonce);
    console.log("   diff=" + challenge.difficulty + " id=" + challenge.id);

    // Solve PoW
    console.log("6. Solving PoW...");
    const sol = solvePow(challenge.challenge, challenge.difficulty);
    console.log("   nonce=" + sol.nonce + " time=" + sol.ms + "ms");

    // Submit form via page.evaluate fetch (keep browser context)
    console.log("7. Submitting via browser fetch...");
    const result = await page.evaluate(async (data) => {
      const form = document.getElementById("cform") as HTMLFormElement;
      const body = new URLSearchParams();
      body.set("pow_id", data.challengeId);
      body.set("pow_nonce", String(data.nonce));
      body.set("pow_elapsed", String(data.ms));
      body.set("pow_pauses", "0");
      body.set("pow_data", "");
      body.set("pow_x", data.powX);
      
      const r = await fetch(form.action, {
        method: "POST",
        body,
        credentials: "same-origin",
      });
      return { url: r.url, status: r.status, html: await r.text() };
    }, { challengeId: challenge.id, nonce: sol.nonce, ms: sol.ms, powX });

    console.log("   Status: " + result.status);
    console.log("   URL: " + result.url);
    console.log("   HTML size: " + result.html.length);

    // Check for Link redirects (captcha solved)
    const linkRedirect = result.html.match(/top\.location\.href\s*=\s*['"]\/Link\/([A-Fa-f0-9]+)\.html['"]/);
    const stillCaptcha = result.html.includes("pow-captcha") && result.html.includes("Verificación de seguridad");
    console.log("   Captcha solved: " + !!linkRedirect);
    console.log("   Still shows captcha UI: " + stillCaptcha);

    if (linkRedirect) {
      console.log("   Redirect to: /Link/" + linkRedirect[1] + ".html");
      
      // Navigate to the link page in the browser
      const linkUrl = "https://www.filecrypt.cc/Link/" + linkRedirect[1] + ".html";
      console.log("\n8. Visiting link page...");
      
      await page.goto(linkUrl, { waitUntil: "networkidle2", timeout: 30000 });
      await new Promise(r => setTimeout(r, 3000));
      
      const linkData = await page.evaluate(() => {
        const links: string[] = [];
        document.querySelectorAll("a[href]").forEach(a => {
          const h = a.getAttribute("href") || "";
          if (h && !h.includes("filecrypt") && !h.includes("cutcaptcha") && h.startsWith("http")) links.push(h);
        });
        const iframes: string[] = [];
        document.querySelectorAll("iframe[src]").forEach(f => {
          iframes.push(f.getAttribute("src") || "");
        });
        return { title: document.title, url: location.href, links, iframes };
      });
      console.log("   URL: " + linkData.url);
      console.log("   Title: " + linkData.title);
      console.log("   Links: " + linkData.links.length);
      for (const u of linkData.links) console.log("     " + u.substring(0, 120));
      console.log("   Iframes: " + linkData.iframes.length);
      for (const u of linkData.iframes) console.log("     " + u.substring(0, 120));
    } else if (!stillCaptcha) {
      // Page changed - maybe download links are visible
      console.log("\n8. Page changed! Checking for download links...");
      const extLinks = result.html.match(/href="(https?:\/\/(?!filecrypt)[^"]+)"/g) || [];
      const uniqueExt = [...new Set(extLinks)].filter(l =>
        !l.includes("opera.com") && !l.includes("cutcaptcha") && !l.includes("cloudflare")
      );
      console.log("   External links: " + uniqueExt.length);
      for (const l of uniqueExt.slice(0, 10)) console.log("     " + l.substring(0, 120));
    } else {
      console.log("\n   Captcha NOT solved. Possible reasons:");
      console.log("   - Server rejected the solution");
      console.log("   - Missing pow_data (behavioral data)");
      console.log("   - pow_x was invalid");
    }

  } catch (err: any) {
    console.error("FATAL:", err.message);
  } finally {
    await browser.close();
  }
}

main();

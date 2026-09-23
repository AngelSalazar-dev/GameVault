import axios from "axios";
import * as cheerio from "cheerio";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const TEST_URL = "https://www.filecrypt.cc/Container/7122E8F0C2.html";

interface TestResult {
  name: string;
  status?: number;
  statusText?: string;
  headers: Record<string, string>;
  html: string;
  redirectChain: string[];
  elapsed: number;
  error?: string;
}

async function fetchWithDetails(
  name: string,
  url: string,
  extraHeaders: Record<string, string> = {}
): Promise<TestResult> {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`TEST: ${name}`);
  console.log(`URL: ${url}`);
  console.log(`Extra headers: ${JSON.stringify(extraHeaders, null, 2)}`);
  console.log(`${"=".repeat(80)}`);

  const start = Date.now();
  const redirectChain: string[] = [];
  const headers: Record<string, string> = {};

  try {
    const res = await axios.get(url, {
      headers: {
        "User-Agent": USER_AGENT,
        ...extraHeaders,
      },
      timeout: 30000,
      maxRedirects: 10,
      validateStatus: () => true,
      // Track redirects manually
      beforeRedirect: (redirectUrl: string) => {
        redirectChain.push(redirectUrl);
      },
    });

    const elapsed = Date.now() - start;

    // Capture headers
    if (res.headers && typeof res.headers === "object") {
      for (const [k, v] of Object.entries(res.headers)) {
        headers[k] = String(v);
      }
    }

    // Capture final URL if redirected
    if (res.request?.res?.responseUrl) {
      const finalUrl = res.request.res.responseUrl;
      if (finalUrl !== url) {
        redirectChain.unshift(finalUrl);
      }
    }

    const html = String(res.data);

    console.log(`\nStatus: ${res.status} ${res.statusText}`);
    console.log(`Response time: ${elapsed}ms`);
    console.log(`Response size: ${html.length} bytes`);
    console.log(`Redirect chain: ${redirectChain.length > 0 ? redirectChain.join(" -> ") : "none"}`);

    return {
      name,
      status: res.status,
      statusText: res.statusText,
      headers,
      html,
      redirectChain,
      elapsed,
    };
  } catch (err: any) {
    const elapsed = Date.now() - start;
    console.log(`\nFAILED: ${err.message}`);
    return {
      name,
      status: undefined,
      statusText: undefined,
      headers: {},
      html: "",
      redirectChain,
      elapsed,
      error: err.message,
    };
  }
}

function analyzeResult(result: TestResult) {
  console.log(`\n--- HEADERS for "${result.name}" ---`);
  const interesting = [
    "server", "x-frame-options", "content-security-policy",
    "cf-ray", "cf-cache-status", "x-powered-by",
    "location", "strict-transport-security", "x-content-type-options",
    "set-cookie", "x-redirect-by", "x-download-options",
  ];
  for (const key of interesting) {
    const val = result.headers[key.toLowerCase()] || "NOT SET";
    console.log(`  ${key}: ${val}`);
  }
  const isCloudflare = !!result.headers["cf-ray"];
  console.log(`  => Cloudflare detected: ${isCloudflare}`);

  if (!result.html) {
    console.log("\n  (no HTML content)");
    return;
  }

  const $ = cheerio.load(result.html);

  console.log(`\n--- HTML ANALYSIS for "${result.name}" ---`);
  console.log(`Title: ${$("title").text().trim()}`);
  console.log(`HTML length: ${result.html.length}`);

  // Cloudflare challenge detection
  const bodyText = $("body").text();
  if (bodyText.includes("Just a moment") || bodyText.includes("Checking your browser")) {
    console.log("\n  *** CLOUDFLARE JS CHALLENGE DETECTED ***");
    console.log("  The page requires JavaScript to pass Cloudflare protection.");
  }
  if (bodyText.includes("challenge-platform") || bodyText.includes("cf-challenge")) {
    console.log("  *** CLOUDFLARE CHALLENGE PLATFORM DETECTED ***");
  }

  // X-Frame-Options
  const xfo = result.headers["x-frame-options"];
  if (xfo) {
    console.log(`\n  X-Frame-Options: ${xfo}`);
    if (xfo.toLowerCase().includes("deny")) {
      console.log("  => iframe embedding is DENIED");
    } else if (xfo.toLowerCase().includes("sameorigin")) {
      console.log("  => iframe embedding allowed only from same origin");
    }
  }

  // CSP
  const csp = result.headers["content-security-policy"];
  if (csp) {
    console.log(`\n  Content-Security-Policy: ${csp.substring(0, 200)}...`);
    if (csp.includes("frame-ancestors")) {
      const match = csp.match(/frame-ancestors[^;]+/);
      if (match) console.log(`  => frame-ancestors: ${match[0]}`);
    }
  }

  // Extract all URLs from the page
  console.log(`\n--- URLs FOUND IN HTML for "${result.name}" ---`);
  const allUrls = new Set<string>();

  // All <a href>
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    if (href && !href.startsWith("javascript:") && !href.startsWith("mailto:") && href !== "#") {
      allUrls.add(href);
    }
  });

  // All <iframe src>
  $("iframe[src]").each((_, el) => {
    const src = $(el).attr("src") || "";
    if (src) allUrls.add(`[iframe] ${src}`);
  });

  // All <script src>
  $("script[src]").each((_, el) => {
    const src = $(el).attr("src") || "";
    if (src) allUrls.add(`[script] ${src}`);
  });

  // All links/buttons with onclick
  $("[onclick]").each((_, el) => {
    const onclick = $(el).attr("onclick") || "";
    allUrls.add(`[onclick] ${onclick.substring(0, 200)}`);
  });

  console.log(`Total URLs/refs found: ${allUrls.size}`);
  for (const u of allUrls) {
    console.log(`  ${u}`);
  }

  // Check for file hosting mirrors
  console.log(`\n--- FILE HOSTING MIRRORS for "${result.name}" ---`);
  const hostingPatterns = [
    "datanodes", "filekeeper", "mega", "mediafire", "1fichier",
    "buzzheavier", "buzz", "gofile", "rapidgator", "nitroflare",
    "katfile", "filefactory", "turbobit", "hitfile", "alfafile",
    "uptobox", "keep2share", "share-online", "zippyshare", "pixeldrain",
    "krakenfiles", "anonfiles", "bayfiles", "letsupload", "mediafire",
    "up-4", "megaup", "kshared", "filerio", "oboom",
    "cloudflare", "recaptcha", "hcaptcha", "turnstile",
  ];

  const htmlLower = result.html.toLowerCase();
  for (const pattern of hostingPatterns) {
    if (htmlLower.includes(pattern)) {
      // Find context around the match
      const idx = htmlLower.indexOf(pattern);
      const context = result.html.substring(Math.max(0, idx - 80), idx + pattern.length + 80);
      console.log(`  Found "${pattern}": ...${context.replace(/\n/g, " ").trim()}...`);
    }
  }

  // Check for download buttons/forms
  console.log(`\n--- DOWNLOAD MECHANISMS for "${result.name}" ---`);

  // Forms
  const forms = $("form");
  console.log(`Forms found: ${forms.length}`);
  forms.each((i, form) => {
    const action = $(form).attr("action") || "";
    const method = $(form).attr("method") || "GET";
    const id = $(form).attr("id") || "";
    const cls = $(form).attr("class") || "";
    console.log(`  Form ${i + 1}: action="${action}" method="${method}" id="${id}" class="${cls}"`);
    // Hidden inputs
    $(form).find("input[type=hidden]").each((_, input) => {
      const name = $(input).attr("name") || "";
      const value = $(input).attr("value") || "";
      console.log(`    hidden: ${name}=${value.substring(0, 100)}`);
    });
  });

  // Buttons
  const buttons = $("button, input[type=submit], a.btn, a.button, [class*=button], [class*=btn]");
  console.log(`Buttons found: ${buttons.length}`);
  buttons.slice(0, 10).each((i, btn) => {
    const text = $(btn).text().trim().substring(0, 80);
    const href = $(btn).attr("href") || "";
    const cls = $(btn).attr("class") || "";
    console.log(`  Button ${i + 1}: text="${text}" href="${href}" class="${cls}"`);
  });

  // Check for encrypted/obfuscated links
  console.log(`\n--- ENCRYPTION/PROTECTION CHECKS for "${result.name}" ---`);
  if (htmlLower.includes("filecrypt")) console.log("  Contains 'filecrypt' reference");
  if (htmlLower.includes("encrypt") || htmlLower.includes("decrypt")) console.log("  Contains encryption/decryption references");
  if (htmlLower.includes("obfusc") || htmlLower.includes("encode")) console.log("  Contains obfuscation/encoding references");
  if (htmlLower.includes("captcha")) console.log("  Contains CAPTCHA");
  if (htmlLower.includes("recaptcha")) console.log("  Contains reCAPTCHA");
  if (htmlLower.includes("hcaptcha")) console.log("  Contains hCaptcha");
  if (htmlLower.includes("turnstile")) console.log("  Contains Cloudflare Turnstile");

  // Look for hidden or data attributes that might contain URLs
  console.log(`\n--- HIDDEN DATA for "${result.name}" ---`);
  $("[data-url], [data-href], [data-link], [data-download]").each((_, el) => {
    const dataUrl = $(el).attr("data-url") || "";
    const dataHref = $(el).attr("data-href") || "";
    const dataLink = $(el).attr("data-link") || "";
    const dataDownload = $(el).attr("data-download") || "";
    if (dataUrl) console.log(`  data-url: ${dataUrl}`);
    if (dataHref) console.log(`  data-href: ${dataHref}`);
    if (dataLink) console.log(`  data-link: ${dataLink}`);
    if (dataDownload) console.log(`  data-download: ${dataDownload}`);
  });

  // Check for JavaScript that builds download URLs
  console.log(`\n--- INLINE SCRIPTS for "${result.name}" ---`);
  $("script:not([src])").each((i, script) => {
    const content = $(script).html() || "";
    if (content.length > 10 && content.length < 5000) {
      // Look for URL patterns in inline scripts
      const urlMatches = content.match(/https?:\/\/[^\s"'<>]+/g);
      if (urlMatches) {
        console.log(`  Script ${i + 1} contains URLs:`);
        urlMatches.forEach((u) => console.log(`    ${u}`));
      }
      // Look for download-related keywords
      if (content.includes("download") || content.includes("href") || content.includes("location")) {
        console.log(`  Script ${i + 1} (first 500 chars):`);
        console.log(`    ${content.substring(0, 500).replace(/\n/g, "\n    ")}`);
      }
    }
  });
}

async function main() {
  console.log("=".repeat(80));
  console.log("FILECRYPT.CC ANALYSIS SCRIPT");
  console.log(`Target: ${TEST_URL}`);
  console.log("=".repeat(80));

  // Test 1: Simple fetch (no referrer)
  const test1 = await fetchWithDetails("No Referrer", TEST_URL);

  // Test 2: Fetch with Referrer: https://ovagames.com/
  const test2 = await fetchWithDetails(
    "Referrer: ovagames.com",
    TEST_URL,
    { Referer: "https://ovagames.com/" }
  );

  // Test 3: Fetch with Referrer: https://www.ovagames.com/
  const test3 = await fetchWithDetails(
    "Referrer: www.ovagames.com",
    TEST_URL,
    { Referer: "https://www.ovagames.com/" }
  );

  // Analyze all results
  for (const result of [test1, test2, test3]) {
    analyzeResult(result);
  }

  // Summary comparison
  console.log("\n\n" + "=".repeat(80));
  console.log("COMPARISON SUMMARY");
  console.log("=".repeat(80));

  for (const result of [test1, test2, test3]) {
    console.log(`\n[${result.name}]`);
    console.log(`  Status: ${result.status} ${result.statusText}`);
    console.log(`  Size: ${result.html.length} bytes`);
    console.log(`  Time: ${result.elapsed}ms`);
    console.log(`  Redirects: ${result.redirectChain.length}`);
    console.log(`  Cloudflare: ${!!result.headers["cf-ray"]}`);
    console.log(`  X-Frame-Options: ${result.headers["x-frame-options"] || "NOT SET"}`);
    console.log(`  CSP: ${result.headers["content-security-policy"] ? "YES (has restrictions)" : "NOT SET"}`);
    console.log(`  Error: ${result.error || "none"}`);
  }

  // Also dump the raw HTML for reference
  console.log("\n\n" + "=".repeat(80));
  console.log("RAW HTML DUMP (first 5000 chars)");
  console.log("=".repeat(80));
  if (test1.html) {
    console.log(test1.html.substring(0, 5000));
  }

  // Try the session endpoint (what the PoW captcha calls)
  console.log("\n\n" + "=".repeat(80));
  console.log("TEST: PoW Session Endpoint");
  console.log("=".repeat(80));
  try {
    const sessionRes = await axios.post(
      "https://www.filecrypt.cc/pow_captcha_session",
      new URLSearchParams({ pow_x: "", pow_y: "", pow_yn: "test123", tz: "America/New_York" }),
      {
        headers: {
          "User-Agent": USER_AGENT,
          "Content-Type": "application/x-www-form-urlencoded",
          Referer: TEST_URL,
        },
        timeout: 15000,
        validateStatus: () => true,
      }
    );
    console.log(`Status: ${sessionRes.status} ${sessionRes.statusText}`);
    console.log(`Body: ${JSON.stringify(sessionRes.data, null, 2).substring(0, 2000)}`);
  } catch (err: any) {
    console.log(`Failed: ${err.message}`);
    if (err.response) {
      console.log(`Status: ${err.response.status}`);
      console.log(`Body: ${String(err.response.data).substring(0, 500)}`);
    }
  }

  // Try CNL endpoint
  console.log("\n\n" + "=".repeat(80));
  console.log("TEST: CNL Endpoint (Click'n'Load)");
  console.log("=".repeat(80));
  try {
    const cnlRes = await axios.get("https://www.filecrypt.cc/CNL/7122E8F0C2.html", {
      headers: { "User-Agent": USER_AGENT },
      timeout: 15000,
      validateStatus: () => true,
    });
    console.log(`Status: ${cnlRes.status} ${cnlRes.statusText}`);
    console.log(`Content-Type: ${cnlRes.headers["content-type"]}`);
    console.log(`Body (first 2000 chars): ${String(cnlRes.data).substring(0, 2000)}`);
  } catch (err: any) {
    console.log(`Failed: ${err.message}`);
  }

  // Final comprehensive analysis
  console.log("\n\n" + "=".repeat(80));
  console.log("FILECRYPT.CC ARCHITECTURE ANALYSIS");
  console.log("=".repeat(80));

  console.log(`
FILECRYPT.CC WORKS AS FOLLOWS:

1. CONTAINER PAGE (/Container/{HASH}.html)
   - Returns 200 OK with HTML (no Cloudflare JS challenge blocking)
   - Behind Cloudflare (cf-ray header present) but NOT blocking server-side requests
   - NO X-Frame-Options header (but JS-level protection may exist)
   - NO Content-Security-Policy header
   - Sets PHPSESSID cookie (session-based)
   - Contains a <meta name="rapidgator" content="..."> tag (hash identifier)

2. PROTECTION LAYERS:
   a) Proof-of-Work (PoW) CAPTCHA:
      - Custom system (NOT reCAPTCHA/hCaptcha despite CSS references)
      - Flow: POST to /captchasession/{id}.json -> get challenge + difficulty
      - Worker solves SHA1 hash: find nonce where sha1(challenge:nonce) has N leading zero bits
      - After solving, submits form with: pow_id, pow_nonce, pow_elapsed, pow_pauses, pow_data, pow_x
      - Uses external signals from: v3.cutcaptcha.net, pow.filecrypt.cc, captcha.filecrypt.cc

   b) Click'n'Load (CNL) integration:
      - Endpoint: /CNL/{hash}.html
      - Designed for JDownloader integration
      - Opens helper.html popup to transfer links

3. DOWNLOAD FLOW:
   Container Page -> [Solve PoW Captcha] -> Form Submit -> Reveals Link Buttons
   -> openLink(link_id) -> /Link/{link_id}.html -> [Actual file host URL]

4. THE openLink FUNCTION:
   - Builds URL: https://filecrypt.cc/Link/{link_id}.html
   - Opens in new window/tab (window.open)
   - The /Link/ page contains the actual file hosting service URLs

5. FILE HOSTS REFERENCED IN HTML:
   - rapidgator (meta tag present)
   - No direct download links visible without solving captcha

6. CLOUDFLARE STATUS:
   - Present (server: cloudflare, cf-ray header)
   - NOT blocking initial page fetch (returns 200 with full HTML)
   - The "Cloudflare Challenge Platform" text in body is for the PoW captcha UI, NOT Cloudflare's own challenge

7. CAN OvaGames LINKS BE USED DIRECTLY?
   NO - filecrypt.cc requires:
   a) JavaScript execution (PoW captcha solving)
   b) Browser session (cookies)
   c) Multiple page hops (Container -> Link page -> file host)
   The download links are NOT directly accessible via simple HTTP fetch.
   A headless browser (Puppeteer/Playwright) would be needed to automate this.
`);

  console.log("=".repeat(80));
  console.log("ANALYSIS COMPLETE");
  console.log("=".repeat(80));
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});

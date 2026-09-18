import * as cheerio from "cheerio";

const HASH = "3xq7zgb43fy2";
const BASE = "https://megadb.net";
const STEAMRIP_REF = "https://steamrip.com/";

const DELAY = (ms: number) => new Promise((r) => setTimeout(r, ms));

function headers(opts: {
  referer?: string;
  userAgent?: string;
  extra?: Record<string, string>;
} = {}): Record<string, string> {
  const h: Record<string, string> = {
    "User-Agent":
      opts.userAgent ??
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    Connection: "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "cross-site",
    "Sec-Fetch-User": "?1",
    "Cache-Control": "max-age=0",
    ...opts.extra,
  };
  if (opts.referer !== undefined) h["Referer"] = opts.referer;
  return h;
}

async function req(
  url: string,
  opts: {
    referer?: string;
    userAgent?: string;
    redirect?: "follow" | "manual";
    extra?: Record<string, string>;
  } = {}
) {
  try {
    const res = await fetch(url, {
      headers: headers(opts),
      redirect: opts.redirect ?? "follow",
      signal: AbortSignal.timeout(20000),
    });
    const body = await res.text();
    return { ok: true, status: res.status, finalUrl: res.url, headers: Object.fromEntries(res.headers.entries()), body };
  } catch (e: any) {
    return { ok: false, status: 0, finalUrl: "", headers: {}, body: "", error: String(e) };
  }
}

// ─── Section 1: Referer Variants ────────────────────────────────────────────
async function testReferrers() {
  console.log("\n" + "═".repeat(80));
  console.log("  SECTION 1: REFERER VARIANTS");
  console.log("═".repeat(80));

  const referers = [
    { label: "steamrip.com/", value: "https://steamrip.com/" },
    { label: "steamrip.com (no slash)", value: "https://steamrip.com" },
    { label: "www.steamrip.com/", value: "https://www.steamrip.com/" },
    { label: "mega.nz/", value: "https://mega.nz/" },
    { label: "www.google.com/", value: "https://www.google.com/" },
    { label: "www.google.com (no slash)", value: "https://www.google.com" },
    { label: "empty string", value: "" },
    { label: "megadb.net/ (self)", value: "https://megadb.net/" },
    { label: "just /", value: "/" },
  ];

  const url = `${BASE}/${HASH}`;
  for (const ref of referers) {
    console.log(`\n--- Referer: ${ref.label} = "${ref.value}" ---`);
    const r = await req(url, { referer: ref.value, redirect: "follow" });
    console.log(`  Status: ${r.status}`);
    console.log(`  Final URL: ${r.finalUrl}`);
    console.log(`  HTML length: ${r.body.length}`);
    const $ = cheerio.load(r.body);
    console.log(`  Title: ${$("title").text().trim()}`);
    console.log(`  Has download btn: ${r.body.includes("download") || r.body.includes("Download")}`);
    console.log(`  Has Cloudflare challenge: ${r.body.includes("challenge-platform") || r.body.includes("cfclearance")}`);
    console.log(`  Has captcha: ${r.body.includes("captcha") || r.body.includes("recaptcha")}`);
    console.log(`  Has timer: ${r.body.includes("countdown") || r.body.includes("timer")}`);
    console.log(`  First 500 chars: ${r.body.substring(0, 500)}`);
    await DELAY(1500);
  }
}

// ─── Section 2: URL Pattern Variants ────────────────────────────────────────
async function testUrlPatterns() {
  console.log("\n" + "═".repeat(80));
  console.log("  SECTION 2: URL PATTERN VARIANTS");
  console.log("═".repeat(80));

  const patterns = [
    { label: "original", url: `${BASE}/${HASH}` },
    { label: "/d/", url: `${BASE}/d/${HASH}` },
    { label: "/api/", url: `${BASE}/api/${HASH}` },
    { label: "/file/", url: `${BASE}/file/${HASH}` },
    { label: "cdn.megadb.net", url: `https://cdn.megadb.net/${HASH}` },
    { label: "/get/", url: `${BASE}/get/${HASH}` },
    { label: "/download/", url: `${BASE}/download/${HASH}` },
    { label: "/files/", url: `${BASE}/files/${HASH}` },
  ];

  for (const p of patterns) {
    console.log(`\n--- Pattern: ${p.label} = ${p.url} ---`);
    const r = await req(p.url, { referer: STEAMRIP_REF, redirect: "manual" });
    console.log(`  Status: ${r.status}`);
    console.log(`  Final URL: ${r.finalUrl}`);
    console.log(`  Location header: ${r.headers["location"] || "(none)"}`);
    console.log(`  Content-Type: ${r.headers["content-type"] || "(none)"}`);
    console.log(`  Content-Length: ${r.headers["content-length"] || "(none)"}`);
    console.log(`  HTML length: ${r.body.length}`);
    if (r.body.length < 2000) {
      console.log(`  Full body: ${r.body}`);
    } else {
      console.log(`  Body preview (500): ${r.body.substring(0, 500)}`);
    }
    await DELAY(1500);
  }
}

// ─── Section 3: Response Headers from Working Request ───────────────────────
async function testResponseHeaders() {
  console.log("\n" + "═".repeat(80));
  console.log("  SECTION 3: RESPONSE HEADERS (working request)");
  console.log("═".repeat(80));

  const url = `${BASE}/${HASH}`;
  const r = await req(url, { referer: STEAMRIP_REF, redirect: "follow" });
  console.log(`Status: ${r.status}`);
  console.log(`Final URL: ${r.finalUrl}`);
  console.log(`\nALL RESPONSE HEADERS:`);
  for (const [k, v] of Object.entries(r.headers)) {
    console.log(`  ${k}: ${v}`);
  }

  // Check for specific headers of interest
  const interesting = [
    "content-disposition",
    "location",
    "x-frame-options",
    "access-control-allow-origin",
    "x-download-options",
    "content-security-policy",
    "set-cookie",
  ];
  console.log(`\nInteresting headers check:`);
  for (const h of interesting) {
    const val = r.headers[h] || r.headers[h.toLowerCase()];
    console.log(`  ${h}: ${val ?? "(not present)"}`);
  }
}

// ─── Section 4: Parse HTML for ALL Links ─────────────────────────────────────
async function testHtmlParsing() {
  console.log("\n" + "═".repeat(80));
  console.log("  SECTION 4: HTML PARSING (ALL LINKS)");
  console.log("═".repeat(80));

  const url = `${BASE}/${HASH}`;
  const r = await req(url, { referer: STEAMRIP_REF });
  const $ = cheerio.load(r.body);

  // All <a href>
  console.log(`\n[A] ALL <a href> LINKS (${$("[href]").length}):`);
  $("[href]").each((i, el) => {
    const href = $(el).attr("href") || "";
    const text = $(el).text().trim().substring(0, 80);
    const cls = $(el).attr("class") || "";
    const onclick = $(el).attr("onclick") || "";
    console.log(`  [${i}] href="${href}" class="${cls}" onclick="${onclick}" text="${text}"`);
  });

  // All <iframe src>
  console.log(`\n[B] ALL <iframe src> (${$("iframe").length}):`);
  $("iframe").each((i, el) => {
    console.log(`  [${i}] src="${$(el).attr("src") || ""}" data-src="${$(el).attr("data-src") || ""}" width="${$(el).attr("width") || ""}" height="${$(el).attr("height") || ""}"`);
  });

  // All scripts
  console.log(`\n[C] ALL <script> TAGS (${$("script").length}):`);
  $("script").each((i, el) => {
    const src = $(el).attr("src") || "";
    const inline = $(el).html()?.trim() || "";
    if (src) console.log(`  [${i}] src="${src}"`);
    if (inline) {
      console.log(`  [${i}] INLINE (${inline.length} chars):`);
      console.log(`    ${inline.substring(0, 1000)}`);
    }
  });

  // JavaScript variables with URLs
  console.log(`\n[D] JAVASCRIPT URL VARIABLES:`);
  const jsUrlPatterns = [
    /(?:var|let|const|window\.)\s*(\w+)\s*=\s*['"`]([^'"`]+)['"`]/g,
    /finalDownloadUrl\s*=\s*['"`]([^'"`]+)['"`]/g,
    /downloadUrl\s*=\s*['"`]([^'"`]+)['"`]/g,
    /fileUrl\s*=\s*['"`]([^'"`]+)['"`]/g,
    /redirectUrl\s*=\s*['"`]([^'"`]+)['"`]/g,
  ];
  for (const pat of jsUrlPatterns) {
    let match;
    while ((match = pat.exec(r.body)) !== null) {
      console.log(`  Found: ${match[0]}`);
    }
  }

  // data-* attributes with URLs
  console.log(`\n[E] data-* ATTRIBUTES WITH URLS:`);
  $("[data-url], [data-href], [data-link], [data-download], [data-file], [data-src]").each((i, el) => {
    const attrs: string[] = [];
    for (const attr of Object.keys(el.attribs || {})) {
      if (attr.startsWith("data-")) attrs.push(`${attr}="${el.attribs[attr]}"`);
    }
    console.log(`  [${i}] tag="${el.tagName}" ${attrs.join(" ")}`);
  });

  // All <form>
  console.log(`\n[F] ALL <form> (${$("form").length}):`);
  $("form").each((i, el) => {
    console.log(`  [${i}] action="${$(el).attr("action") || ""}" method="${$(el).attr("method") || ""}" id="${$(el).attr("id") || ""}"`);
    $(el).find("input").each((j, inp) => {
      console.log(`    input: name="${$(inp).attr("name") || ""}" type="${$(inp).attr("type") || ""}" value="${$(inp).attr("value") || ""}"`);
    });
  });

  // All buttons
  console.log(`\n[G] ALL BUTTONS/CTAs:`);
  $("button, [type='submit'], [class*='button'], [class*='btn'], [class*='download'], [id*='download']").each((i, el) => {
    console.log(`  [${i}] tag="${el.tagName}" text="${$(el).text().trim().substring(0, 50)}" class="${$(el).attr("class") || ""}" id="${$(el).attr("id") || ""}" onclick="${$(el).attr("onclick") || ""}"`);
  });

  // Detect hash usage
  console.log(`\n[H] HASH "${HASH}" APPEARANCES IN HTML:`);
  const indices: number[] = [];
  let idx = r.body.indexOf(HASH);
  while (idx !== -1) {
    indices.push(idx);
    idx = r.body.indexOf(HASH, idx + 1);
  }
  console.log(`  Found ${indices.length} times at positions: ${indices.join(", ")}`);
  for (const pos of indices.slice(0, 10)) {
    console.log(`  Context at ${pos}: ...${r.body.substring(Math.max(0, pos - 80), pos + 80 + HASH.length)}...`);
  }

  // All hrefs (deduplicated)
  const allHrefs = new Set<string>();
  $("[href]").each((_, el) => allHrefs.add($(el).attr("href") || ""));
  console.log(`\n[I] DEDUPLICATED HREFS (${allHrefs.size}):`);
  for (const h of allHrefs) {
    console.log(`  ${h}`);
  }
}

// ─── Section 5: pt= Token Analysis ───────────────────────────────────────────
async function testPtToken() {
  console.log("\n" + "═".repeat(80));
  console.log("  SECTION 5: pt= TOKEN ANALYSIS");
  console.log("═".repeat(80));

  // Step 1: Fetch the page with steamrip referrer to get pt= URL
  const url = `${BASE}/${HASH}`;
  const r = await req(url, { referer: STEAMRIP_REF });
  const $ = cheerio.load(r.body);

  console.log(`\nStep 1: Page fetched with steamrip referrer (status ${r.status})`);

  // Extract pt= URLs from HTML
  const ptPatterns = [
    /https?:\/\/[^\s"'<>]+\?pt=[^\s"'<>]+/g,
    /\?pt=([^\s"'<>&]+)/g,
    /finalDownloadUrl\s*=\s*['"]([^'"]+)['"]/g,
    /data-url=["']([^"']+)["']/g,
    /href=["']([^"']*pt=[^"']*)["']/g,
  ];

  const ptUrls: string[] = [];
  for (const pat of ptPatterns) {
    let match;
    while ((match = pat.exec(r.body)) !== null) {
      const url = match[1] || match[0];
      if (!ptUrls.includes(url)) ptUrls.push(url);
    }
  }

  console.log(`\nFound ${ptUrls.length} pt= URLs:`);
  for (const u of ptUrls) console.log(`  ${u}`);

  // Also look for cdn-cgi links
  const cdnLinks: string[] = [];
  $('a[href*="cdn-cgi"]').each((_, el) => {
    cdnLinks.push($(el).attr("href") || "");
  });
  console.log(`\ncdn-cgi links found: ${cdnLinks.length}`);
  for (const l of cdnLinks) console.log(`  ${l}`);

  // Look for any other interesting URLs in scripts
  const scriptUrls: string[] = [];
  const urlRegex = /https?:\/\/[^\s"'<>]+/g;
  let m;
  while ((m = urlRegex.exec(r.body)) !== null) {
    if (!scriptUrls.includes(m[0])) scriptUrls.push(m[0]);
  }
  console.log(`\nAll URLs found in HTML (${scriptUrls.length}):`);
  for (const u of scriptUrls) console.log(`  ${u}`);

  // Step 2: Test pt= URLs with different referrers
  if (ptUrls.length > 0) {
    const testUrl = ptUrls[0];
    const refTests = [
      { label: "NO referrer", referer: undefined },
      { label: "steamrip referrer", referer: STEAMRIP_REF },
      { label: "megadb self-referrer", referer: "https://megadb.net/" },
      { label: "google referrer", referer: "https://www.google.com/" },
      { label: "empty referrer", referer: "" },
    ];

    for (const refTest of refTests) {
      console.log(`\n--- pt= URL with ${refTest.label} ---`);
      const r2 = await req(testUrl, { referer: refTest.referer, redirect: "manual" });
      console.log(`  Status: ${r2.status}`);
      console.log(`  Final URL: ${r2.finalUrl}`);
      console.log(`  Location: ${r2.headers["location"] || "(none)"}`);
      console.log(`  Content-Type: ${r2.headers["content-type"] || "(none)"}`);
      console.log(`  Content-Disposition: ${r2.headers["content-disposition"] || "(none)"}`);
      console.log(`  Content-Length: ${r2.headers["content-length"] || "(none)"}`);
      console.log(`  Body length: ${r2.body.length}`);
      if (r2.body.length > 0 && r2.body.length < 2000) {
        console.log(`  Body: ${r2.body}`);
      }
      await DELAY(1500);
    }
  }

  // Step 3: Test cdn-cgi links with different referrers
  if (cdnLinks.length > 0) {
    const testUrl = cdnLinks[0];
    const refTests = [
      { label: "NO referrer", referer: undefined },
      { label: "megadb referrer", referer: "https://megadb.net/" },
      { label: "steamrip referrer", referer: STEAMRIP_REF },
    ];

    for (const refTest of refTests) {
      console.log(`\n--- cdn-cgi URL with ${refTest.label} ---`);
      const r2 = await req(testUrl, { referer: refTest.referer, redirect: "manual" });
      console.log(`  Status: ${r2.status}`);
      console.log(`  Location: ${r2.headers["location"] || "(none)"}`);
      console.log(`  Content-Type: ${r2.headers["content-type"] || "(none)"}`);
      console.log(`  Body length: ${r2.body.length}`);
      await DELAY(1500);
    }
  }
}

// ─── Section 6: User-Agent Variants ─────────────────────────────────────────
async function testUserAgents() {
  console.log("\n" + "═".repeat(80));
  console.log("  SECTION 6: USER-AGENT VARIANTS");
  console.log("═".repeat(80));

  const agents = [
    {
      label: "Chrome Desktop",
      value:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    },
    {
      label: "Chrome Mobile",
      value:
        "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
    },
    {
      label: "Googlebot",
      value: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    },
    { label: "Empty User-Agent", value: "" },
    {
      label: "Firefox Desktop",
      value:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
    },
    {
      label: "Safari Desktop",
      value:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15",
    },
    {
      label: "curl",
      value: "curl/8.5.0",
    },
  ];

  const url = `${BASE}/${HASH}`;
  for (const agent of agents) {
    console.log(`\n--- User-Agent: ${agent.label} ---`);
    const r = await req(url, {
      referer: STEAMRIP_REF,
      userAgent: agent.value,
      redirect: "follow",
    });
    console.log(`  Status: ${r.status}`);
    console.log(`  Final URL: ${r.finalUrl}`);
    console.log(`  HTML length: ${r.body.length}`);
    const $ = cheerio.load(r.body);
    console.log(`  Title: ${$("title").text().trim()}`);
    console.log(`  Has challenge: ${r.body.includes("challenge-platform") || r.body.includes("Just a moment")}`);
    console.log(`  Has download: ${r.body.toLowerCase().includes("download")}`);
    await DELAY(1500);
  }
}

// ─── Section 7: Second MegaDB Hash ──────────────────────────────────────────
async function testSecondHash() {
  console.log("\n" + "═".repeat(80));
  console.log("  SECTION 7: SECOND MEGADB HASH (aw0at8o3c964)");
  console.log("═".repeat(80));

  const hash2 = "aw0at8o3c964";
  const url = `${BASE}/${hash2}`;
  const r = await req(url, { referer: STEAMRIP_REF });
  console.log(`Status: ${r.status}`);
  console.log(`HTML length: ${r.body.length}`);
  const $ = cheerio.load(r.body);
  console.log(`Title: ${$("title").text().trim()}`);

  // Extract pt= and finalDownloadUrl
  const ptMatch = r.body.match(/\?pt=([^\s"'<>&]+)/);
  const fdMatch = r.body.match(/finalDownloadUrl\s*=\s*['"]([^'"]+)['"]/);
  console.log(`pt= value: ${ptMatch?.[1] || "(not found)"}`);
  console.log(`finalDownloadUrl: ${fdMatch?.[1] || "(not found)"}`);

  if (fdMatch?.[1]) {
    console.log(`\nFetching finalDownloadUrl with NO referrer:`);
    const r2 = await req(fdMatch[1], { redirect: "manual" });
    console.log(`  Status: ${r2.status}`);
    console.log(`  Location: ${r2.headers["location"] || "(none)"}`);
    console.log(`  Content-Type: ${r2.headers["content-type"] || "(none)"}`);
  }
}

// ─── Section 8: Timing & Rate Limit ─────────────────────────────────────────
async function testTiming() {
  console.log("\n" + "═".repeat(80));
  console.log("  SECTION 8: TIMING / RATE LIMIT TEST");
  console.log("═".repeat(80));

  const url = `${BASE}/${HASH}`;
  const times: number[] = [];

  for (let i = 0; i < 5; i++) {
    const start = Date.now();
    const r = await req(url, { referer: STEAMRIP_REF });
    const elapsed = Date.now() - start;
    times.push(elapsed);
    console.log(`  Request ${i + 1}: ${elapsed}ms, status ${r.status}, html ${r.body.length} chars`);
    await DELAY(300);
  }

  console.log(`\n  Average: ${Math.round(times.reduce((a, b) => a + b, 0) / times.length)}ms`);
  console.log(`  Min: ${Math.min(...times)}ms, Max: ${Math.max(...times)}ms`);
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log("╔══════════════════════════════════════════════════════════════════════════╗");
  console.log("║          MEGADB DEEP ANALYSIS - ALL ACCESS METHODS TEST                ║");
  console.log("╚══════════════════════════════════════════════════════════════════════════╝");
  console.log(`Hash: ${HASH}`);
  console.log(`Base URL: ${BASE}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);

  await testReferrers();
  await testUrlPatterns();
  await testResponseHeaders();
  await testHtmlParsing();
  await testPtToken();
  await testUserAgents();
  await testSecondHash();
  await testTiming();

  console.log("\n" + "═".repeat(80));
  console.log("  ANALYSIS COMPLETE");
  console.log("═".repeat(80));
}

main().catch(console.error);

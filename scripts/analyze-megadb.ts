import * as cheerio from "cheerio";

const MEGADB_URLS = [
  "https://megadb.net/3xq7zgb43fy2",
  "https://megadb.net/aw0at8o3c964",
];

const REFERERS = [
  "https://steamrip.com/",
  "",
];

interface Analysis {
  url: string;
  referer: string;
  status: number;
  finalUrl: string;
  htmlLength: number;
  title: string;
  metaTags: string[];
  downloadLinks: { href: string; text: string; class: string; onclick: string }[];
  iframes: string[];
  scripts: { src: string; inline: string }[];
  buttons: { text: string; href: string; class: string; onclick: string }[];
  forms: { action: string; method: string; id: string }[];
  allHrefs: string[];
  patterns: Record<string, boolean>;
  htmlPreview: string;
}

async function analyzePage(url: string, referer: string): Promise<Analysis> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Fetching: ${url}`);
  console.log(`Referer: ${referer || "(none)"}`);
  console.log(`${"=".repeat(60)}`);

  const headers: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "cross-site",
    "Sec-Fetch-User": "?1",
    "Cache-Control": "max-age=0",
  };
  if (referer) {
    headers["Referer"] = referer;
  }

  let status = 0;
  let finalUrl = "";
  let html = "";

  try {
    const res = await fetch(url, {
      headers,
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
    status = res.status;
    finalUrl = res.url;
    html = await res.text();
    console.log(`Status: ${status}`);
    console.log(`Final URL: ${finalUrl}`);
    console.log(`HTML length: ${html.length} chars`);
  } catch (e) {
    console.log(`ERROR fetching: ${e}`);
    return {
      url, referer, status: 0, finalUrl: "", htmlLength: 0,
      title: "", metaTags: [], downloadLinks: [], iframes: [], scripts: [],
      buttons: [], forms: [], allHrefs: [], patterns: {},
      htmlPreview: String(e),
    };
  }

  const $ = cheerio.load(html);

  // Title
  const title = $("title").text().trim();

  // Meta tags
  const metaTags: string[] = [];
  $("meta").each((_, el) => {
    const name = $(el).attr("name") || $(el).attr("property") || "";
    const content = $(el).attr("content") || "";
    if (name || content) metaTags.push(`${name}: ${content}`);
  });

  // All links
  const downloadLinks: Analysis["downloadLinks"] = [];
  const allHrefs: string[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    const text = $(el).text().trim();
    const cls = $(el).attr("class") || "";
    const onclick = $(el).attr("onclick") || "";
    allHrefs.push(href);

    // Grab download-related links
    const lowerText = text.toLowerCase();
    const lowerHref = href.toLowerCase();
    if (
      lowerText.includes("download") ||
      lowerText.includes("click here") ||
      lowerHref.includes("download") ||
      lowerHref.includes("/dl/") ||
      lowerHref.includes("/file/") ||
      lowerHref.includes("drive.google") ||
      lowerHref.includes("mega.nz") ||
      lowerHref.includes("mediafire") ||
      lowerHref.includes("gofile") ||
      cls.includes("download") ||
      cls.includes("button")
    ) {
      downloadLinks.push({ href, text, class: cls, onclick });
    }
  });

  // Iframes
  const iframes: string[] = [];
  $("iframe").each((_, el) => {
    iframes.push($(el).attr("src") || $(el).attr("data-src") || "");
  });

  // Scripts
  const scripts: { src: string; inline: string }[] = [];
  $("script").each((_, el) => {
    const src = $(el).attr("src") || "";
    const inline = $(el).html()?.trim()?.substring(0, 500) || "";
    scripts.push({ src, inline });
  });

  // Buttons
  const buttons: Analysis["buttons"] = [];
  $("button, input[type='button'], input[type='submit'], a.button, a.btn, [class*='button'], [class*='btn']").each((_, el) => {
    const text = $(el).text().trim() || $(el).attr("value") || "";
    const href = $(el).attr("href") || "";
    const cls = $(el).attr("class") || "";
    const onclick = $(el).attr("onclick") || "";
    buttons.push({ text, href, class: cls, onclick });
  });

  // Forms
  const forms: { action: string; method: string; id: string }[] = [];
  $("form").each((_, el) => {
    forms.push({
      action: $(el).attr("action") || "",
      method: $(el).attr("method") || "",
      id: $(el).attr("id") || "",
    });
  });

  // Pattern detection
  const htmlLower = html.toLowerCase();
  const patterns: Record<string, boolean> = {
    "has-download-button": htmlLower.includes("download"),
    "has-direct-link": /https?:\/\/[^\s"']+\.(zip|rar|7z|iso|exe|torrent)/i.test(html),
    "has-mega.nz": htmlLower.includes("mega.nz"),
    "has-google-drive": htmlLower.includes("drive.google"),
    "has-mediafire": htmlLower.includes("mediafire"),
    "has-gofile": htmlLower.includes("gofile"),
    "has-cfclearance": htmlLower.includes("cfclearance") || htmlLower.includes("challenge-platform"),
    "has-captcha": htmlLower.includes("captcha") || htmlLower.includes("recaptcha"),
    "has-turnstile": htmlLower.includes("turnstile"),
    "has-adblock-check": htmlLower.includes("adblock") || htmlLower.includes("ad blocker"),
    "has-redirect-js": htmlLower.includes("window.location") || htmlLower.includes("location.href") || htmlLower.includes("location.replace"),
    "has-iframe-redirect": htmlLower.includes("iframe") && (htmlLower.includes("redirect") || htmlLower.includes("location")),
    "has-timer-countdown": htmlLower.includes("countdown") || htmlLower.includes("timer") || htmlLower.includes("seconds"),
    "has-shortener": htmlLower.includes("shorten") || htmlLower.includes("shortc") || htmlLower.includes("shorturl"),
    "has-bypass": htmlLower.includes("bypass") || htmlLower.includes("skip"),
    "has-javascript-obfuscation": /\\x[0-9a-f]{2}|\\u[0-9a-f]{4}|atob\(|eval\(/i.test(html),
    "has-data-attributes": /\bdata-[a-z]+=["'][^"']+["']/i.test(html),
    "has-xhr-fetch": htmlLower.includes("xmlhttprequest") || htmlLower.includes("fetch("),
    "has-ajax-download": /ajax|\.get\(|\.post\(|fetch\(|XMLHttpRequest/i.test(html),
  };

  // HTML preview (first 5000 chars)
  const htmlPreview = html.substring(0, 5000);

  return {
    url, referer, status, finalUrl, htmlLength: html.length,
    title, metaTags, downloadLinks, iframes, scripts,
    buttons, forms, allHrefs, patterns, htmlPreview,
  };
}

function printAnalysis(a: Analysis) {
  console.log(`\n--- RESULTS for ${a.url} ---`);
  console.log(`Status: ${a.status}`);
  console.log(`Final URL: ${a.finalUrl}`);
  console.log(`Title: ${a.title}`);
  console.log(`HTML length: ${a.htmlLength}`);

  console.log(`\n[Meta Tags] (${a.metaTags.length})`);
  a.metaTags.slice(0, 15).forEach((m) => console.log(`  ${m}`));

  console.log(`\n[Download Links] (${a.downloadLinks.length})`);
  a.downloadLinks.forEach((l) => console.log(`  href="${l.href}" text="${l.text}" class="${l.class}" onclick="${l.onclick}"`));

  console.log(`\n[Iframes] (${a.iframes.length})`);
  a.iframes.forEach((i) => console.log(`  ${i}`));

  console.log(`\n[Scripts] (${a.scripts.length})`);
  a.scripts.forEach((s) => {
    if (s.src) console.log(`  src: ${s.src}`);
    if (s.inline) console.log(`  inline: ${s.inline.substring(0, 300)}`);
  });

  console.log(`\n[Buttons] (${a.buttons.length})`);
  a.buttons.forEach((b) => console.log(`  text="${b.text}" href="${b.href}" class="${b.class}" onclick="${b.onclick}"`));

  console.log(`\n[Forms] (${a.forms.length})`);
  a.forms.forEach((f) => console.log(`  action="${f.action}" method="${f.method}" id="${f.id}"`));

  console.log(`\n[All hrefs] (${a.allHrefs.length})`);
  a.allHrefs.forEach((h) => console.log(`  ${h}`));

  console.log(`\n[Pattern Detection]`);
  for (const [k, v] of Object.entries(a.patterns)) {
    if (v) console.log(`  ✓ ${k}`);
  }

  console.log(`\n[HTML Preview - first 3000 chars]`);
  console.log(a.htmlPreview.substring(0, 3000));
}

async function main() {
  const results: Analysis[] = [];

  for (const url of MEGADB_URLS) {
    for (const referer of REFERERS) {
      const a = await analyzePage(url, referer);
      results.push(a);
      printAnalysis(a);
      // Small delay between requests
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  // Comparison summary
  console.log(`\n${"=".repeat(60)}`);
  console.log("COMPARISON SUMMARY");
  console.log(`${"=".repeat(60)}`);

  for (const a of results) {
    const refererLabel = a.referer || "(no referrer)";
    console.log(`\n${a.url} [${refererLabel}]:`);
    console.log(`  Status: ${a.status} | HTML: ${a.htmlLength} chars | Title: ${a.title}`);
    console.log(`  Links: ${a.downloadLinks.length} | Iframes: ${a.iframes.length} | Scripts: ${a.scripts.length}`);
    const truePatterns = Object.entries(a.patterns).filter(([, v]) => v).map(([k]) => k);
    console.log(`  Patterns: ${truePatterns.join(", ") || "none"}`);
  }
}

main().catch(console.error);

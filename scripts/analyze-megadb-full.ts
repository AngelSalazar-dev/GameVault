import * as cheerio from "cheerio";

async function main() {
  // First get the page to extract tokens
  const res = await fetch("https://megadb.net/3xq7zgb43fy2", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Referer": "https://steamrip.com/",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  });
  const html = await res.text();
  const $ = cheerio.load(html);

  // Extract finalDownloadUrl
  const ptMatch = html.match(/finalDownloadUrl\s*=\s*'([^']+)'/);
  const finalUrl = ptMatch?.[1];
  console.log("finalDownloadUrl:", finalUrl);

  // Extract cdn-cgi link
  const cdnLink = $('a[href*="cdn-cgi/content"]').attr("href");
  console.log("cdn-cgi link:", cdnLink);

  if (finalUrl) {
    // Test 1: Fetch finalDownloadUrl with no referrer
    console.log("\n=== TEST 1: finalDownloadUrl, no referrer ===");
    const r1 = await fetch(finalUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    });
    console.log("Status:", r1.status);
    console.log("Location:", r1.headers.get("location"));
    console.log("Content-Type:", r1.headers.get("content-type"));
    console.log("Content-Length:", r1.headers.get("content-length"));
    console.log("Content-Disposition:", r1.headers.get("content-disposition"));

    // Test 2: Fetch finalDownloadUrl with megadb referrer
    console.log("\n=== TEST 2: finalDownloadUrl, megadb referrer ===");
    const r2 = await fetch(finalUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Referer": "https://megadb.net/",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    });
    console.log("Status:", r2.status);
    console.log("Location:", r2.headers.get("location"));
    console.log("Content-Type:", r2.headers.get("content-type"));
    console.log("Content-Length:", r2.headers.get("content-length"));
    console.log("Content-Disposition:", r2.headers.get("content-disposition"));

    // Test 3: Fetch finalDownloadUrl with steamrip referrer
    console.log("\n=== TEST 3: finalDownloadUrl, steamrip referrer ===");
    const r3 = await fetch(finalUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Referer": "https://steamrip.com/",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    });
    console.log("Status:", r3.status);
    console.log("Location:", r3.headers.get("location"));
    console.log("Content-Type:", r3.headers.get("content-type"));
    console.log("Content-Length:", r3.headers.get("content-length"));
    console.log("Content-Disposition:", r3.headers.get("content-disposition"));

    // Test 4: Follow redirects with steamrip referrer
    console.log("\n=== TEST 4: finalDownloadUrl, steamrip referrer, follow redirects ===");
    const r4 = await fetch(finalUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Referer": "https://steamrip.com/",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
    console.log("Status:", r4.status);
    console.log("Final URL:", r4.url);
    console.log("Content-Type:", r4.headers.get("content-type"));
    console.log("Content-Length:", r4.headers.get("content-length"));
    console.log("Content-Disposition:", r4.headers.get("content-disposition"));
    const body = await r4.text();
    console.log("Body length:", body.length);
    console.log("Body preview:", body.substring(0, 1000));

    // Test 5: Fetch cdn-cgi endpoint
    if (cdnLink) {
      console.log("\n=== TEST 5: cdn-cgi/content endpoint ===");
      const r5 = await fetch(cdnLink, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          "Referer": "https://megadb.net/",
          "Accept": "*/*",
        },
        redirect: "manual",
        signal: AbortSignal.timeout(15000),
      });
      console.log("Status:", r5.status);
      console.log("Location:", r5.headers.get("location"));
      console.log("Content-Type:", r5.headers.get("content-type"));
      console.log("Content-Length:", r5.headers.get("content-length"));
      console.log("Content-Disposition:", r5.headers.get("content-disposition"));
    }

    // Test 6: Check what Cloudflare challenge returns
    console.log("\n=== TEST 6: Check for Cloudflare challenge ===");
    const r6 = await fetch("https://megadb.net/cdn-cgi/challenge-platform/scripts/jsd/main.js", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
    console.log("Status:", r6.status);
    console.log("Content-Type:", r6.headers.get("content-type"));
    const jsBody = await r6.text();
    console.log("JS body length:", jsBody.length);
    console.log("JS body preview:", jsBody.substring(0, 500));
  }
}
main().catch(console.error);

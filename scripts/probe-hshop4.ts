const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

async function probe(label: string, url: string, init: RequestInit = {}) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Referer: "https://hshop.erista.me/t/2482", ...(init.headers || {}) },
      redirect: "manual",
      ...init,
    });
    const text = await res.text().catch(() => "");
    console.log(`\n=== ${label} ===`);
    console.log(`${res.status} ${url}`);
    const loc = res.headers.get("location");
    if (loc) console.log("Location:", loc);
    if (text) console.log("Body:", text.slice(0, 600));
  } catch (e: any) {
    console.log(`\n=== ${label} === ERROR: ${e.message}`);
  }
}

async function main() {
  // download-widget variants
  await probe("widget no token", "https://hshop.erista.me/t/2482/download-widget");
  await probe("widget empty token", "https://hshop.erista.me/t/2482/download-widget?captcha_token=");
  await probe("widget fake token", "https://hshop.erista.me/t/2482/download-widget?captcha_token=xxx.yyy.zzz");
  
  // 3hs API guesses (from Makefile HS_BASE_LOC etc)
  await probe("hs api", "https://api.hshop.erista.me/");
  await probe("hs api titles", "https://api.hshop.erista.me/titles");
  await probe("hs cdn", "https://cdn.hshop.erista.me/");
  
  // Maybe download is a subdomain pattern
  await probe("download subdomain", "https://download.hshop.erista.me/2482", { redirect: "manual" });
  
  // Check hshop-api pypi source
  const pypi = await fetch("https://pypi.org/pypi/hshop-api/json", { headers: { "User-Agent": UA } });
  const pj = await pypi.json().catch(() => null);
  if (pj) {
    console.log("\n=== hshop-api pypi ===");
    console.log("Home:", pj.info.home_page);
    console.log("Project URLs:", JSON.stringify(pj.info.project_urls));
    const urls = pj.urls?.map((u: any) => u.url) || [];
    console.log("Files:", urls.join("\n"));
  }
  
  // Search 3hs source for API base
  const gh = await fetch("https://api.github.com/search/code?q=repo:Tescu48/3hs+HS_BASE", {
    headers: { "User-Agent": UA, Accept: "application/vnd.github+json" },
  });
  console.log("\n=== github code search ===", gh.status);
}

main().then(() => process.exit(0));

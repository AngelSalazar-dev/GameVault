const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

async function probe(label: string, url: string) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
    const text = await res.text();
    console.log(`\n=== ${label} ===`);
    console.log(`URL: ${url}`);
    console.log(`Status: ${res.status}`);
    console.log(`Content-Type: ${res.headers.get("content-type")}`);
    // extract interesting bits
    const snippets: string[] = [];
    const patterns = [
      /Direct Download[^<]*<[^>]+href="([^"]+)"/gi,
      /href="(https?:\/\/[^"]*(?:cdn|download|file|\.cia)[^"]*)"/gi,
      /src="([^"]*captcha[^"]*)"/gi,
      /class="[^"]*captcha[^"]*"/gi,
      /data-[a-z-]+="[^"]*"/gi,
      /\/t\/\d+/g,
      /showing \d+ - \d+ of \d+/i,
      /count=\d+&offset=\d+/g,
    ];
    for (const p of patterns) {
      const m = text.match(p);
      if (m) snippets.push(`${p}: ${m.slice(0, 5).join(" | ")}`);
    }
    // print first 500 chars around "Download" or "security"
    const idx = text.search(/Download Content|security check|Direct Download/i);
    if (idx >= 0) {
      snippets.push(`context: ${text.slice(Math.max(0, idx - 100), idx + 500)}`);
    }
    console.log(snippets.join("\n") || "(nothing matched)");
    // for JSON APIs print body head
    if (text.startsWith("{") || text.startsWith("[")) {
      console.log("BODY:", text.slice(0, 800));
    }
  } catch (e: any) {
    console.log(`\n=== ${label} === ERROR: ${e.message}`);
  }
}

async function main() {
  await probe("Search page HTML", "https://hshop.erista.me/search/results?lgy=false&q=pokemon&qt=Text");
  await probe("Category page", "https://hshop.erista.me/c/games/s/north-america?count=100&offset=0");
  await probe("Game page 2482", "https://hshop.erista.me/t/2482");
  await probe("API guess /api/titles", "https://hshop.erista.me/api/titles");
  await probe("API guess /api/v1/titles", "https://hshop.erista.me/api/v1/titles");
  await probe("JSON catalog guess", "https://hshop.erista.me/api/games");
  await probe("Search JSON accept", "https://hshop.erista.me/search/results?lgy=false&q=pokemon&qt=Text");
}

main().then(() => process.exit(0));

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

async function main() {
  // 1. Get game page and extract all scripts + submitCaptcha context
  const res = await fetch("https://hshop.erista.me/t/2482", { headers: { "User-Agent": UA } });
  const html = await res.text();

  // Find submitCaptcha function definition
  const idx = html.indexOf("function submitCaptcha");
  if (idx >= 0) {
    console.log("=== submitCaptcha ===");
    console.log(html.slice(idx, idx + 800));
  } else {
    // search for submitCaptcha anywhere
    const i2 = html.indexOf("submitCaptcha");
    console.log("submitCaptcha at:", i2);
    if (i2 >= 0) console.log(html.slice(Math.max(0, i2 - 200), i2 + 600));
  }

  // Find all inline scripts src
  const scriptSrcs = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m => m[1]);
  console.log("\n=== script srcs ===");
  console.log(scriptSrcs.join("\n"));

  // Extract the landing-box region fully
  const lb = html.indexOf('id="landing-box"');
  if (lb >= 0) {
    console.log("\n=== landing-box ===");
    console.log(html.slice(lb - 100, lb + 1500));
  }

  // Try known download URL patterns
  const patterns = [
    "https://hshop.erista.me/download/2482",
    "https://hshop.erista.me/dl/2482",
    "https://hshop.erista.me/downloads/2482",
    "https://hshop.erista.me/file/2482",
    "https://hshop.erista.me/cdn/2482",
    "https://hshop.erista.me/t/2482/download",
    "https://hshop.erista.me/api/download/2482",
    "https://hshop.erista.me/api/t/2482",
    "https://hshop.erista.me/qr/2482",
    "https://hshop.erista.me/redirect/2482",
  ];
  console.log("\n=== pattern probes ===");
  for (const p of patterns) {
    try {
      const r = await fetch(p, { headers: { "User-Agent": UA }, redirect: "manual" });
      console.log(`${r.status} ${p} (${r.headers.get("location") || r.headers.get("content-type") || ""})`);
    } catch (e: any) {
      console.log(`ERR ${p}: ${e.message}`);
    }
  }
}

main().then(() => process.exit(0));

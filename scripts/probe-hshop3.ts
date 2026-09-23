const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

async function main() {
  const res = await fetch("https://hshop.erista.me/js/landing.min.js?v=2.10", {
    headers: { "User-Agent": UA, Referer: "https://hshop.erista.me/t/2482" },
  });
  const js = await res.text();
  console.log("Status:", res.status, "Length:", js.length);
  console.log(js);
}

main().then(() => process.exit(0));

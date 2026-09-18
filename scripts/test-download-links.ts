import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

interface TestResult {
  host: string;
  gameTitle: string;
  url: string;
  method: string;
  status: number;
  finalUrl: string;
  success: boolean;
  error?: string;
}

async function testLink(url: string, referrer: string, label: string): Promise<{ status: number; finalUrl: string; error?: string }> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Referer": referrer,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });
    return { status: res.status, finalUrl: res.url };
  } catch (e) {
    return { status: 0, finalUrl: "", error: String(e) };
  }
}

async function main() {
  // Get sample links
  const megadbLinks = await db.downloadLink.findMany({
    where: { host: "megadb", isActive: true },
    include: { game: { select: { title: true } } },
    take: 3,
  });

  const bzzhrLinks = await db.downloadLink.findMany({
    where: { host: { in: ["bzzhr", "buzzheavier"] }, isActive: true },
    include: { game: { select: { title: true } } },
    take: 3,
  });

  const results: TestResult[] = [];

  console.log("\n=== TESTING MEGADB LINKS ===\n");

  for (const link of megadbLinks) {
    console.log(`Testing: ${link.game.title} - ${link.url}`);

    // Test 1: No referrer
    const r1 = await testLink(link.url, "", "no-referrer");
    console.log(`  No referrer: ${r1.status} -> ${r1.finalUrl} ${r1.error ? `ERROR: ${r1.error}` : ""}`);
    results.push({ host: "megadb", gameTitle: link.game.title, url: link.url, method: "no-referrer", ...r1, success: r1.status === 200 && !r1.finalUrl.includes("error") });

    // Test 2: SteamRip referrer
    const r2 = await testLink(link.url, "https://steamrip.com/", "steamrip-referrer");
    console.log(`  SteamRip ref: ${r2.status} -> ${r2.finalUrl} ${r2.error ? `ERROR: ${r2.error}` : ""}`);
    results.push({ host: "megadb", gameTitle: link.game.title, url: link.url, method: "steamrip-referrer", ...r2, success: r2.status === 200 && !r2.finalUrl.includes("error") });

    // Test 3: Our domain referrer
    const r3 = await testLink(link.url, "https://game2vault.vercel.app/", "our-referrer");
    console.log(`  Our ref: ${r3.status} -> ${r3.finalUrl} ${r3.error ? `ERROR: ${r3.error}` : ""}`);
    results.push({ host: "megadb", gameTitle: link.game.title, url: link.url, method: "our-referrer", ...r3, success: r3.status === 200 && !r3.finalUrl.includes("error") });

    console.log("");
  }

  console.log("\n=== TESTING BZZHR LINKS ===\n");

  for (const link of bzzhrLinks) {
    console.log(`Testing: ${link.game.title} - ${link.url}`);

    // Test 1: No referrer
    const r1 = await testLink(link.url, "", "no-referrer");
    console.log(`  No referrer: ${r1.status} -> ${r1.finalUrl} ${r1.error ? `ERROR: ${r1.error}` : ""}`);
    results.push({ host: "bzzhr", gameTitle: link.game.title, url: link.url, method: "no-referrer", ...r1, success: r1.status === 200 && !r1.finalUrl.includes("steamrip.com") && !r1.finalUrl.includes("error") });

    // Test 2: SteamRip referrer
    const r2 = await testLink(link.url, "https://steamrip.com/", "steamrip-referrer");
    console.log(`  SteamRip ref: ${r2.status} -> ${r2.finalUrl} ${r2.error ? `ERROR: ${r2.error}` : ""}`);
    results.push({ host: "bzzhr", gameTitle: link.game.title, url: link.url, method: "steamrip-referrer", ...r2, success: r2.status === 200 && !r2.finalUrl.includes("steamrip.com") && !r2.finalUrl.includes("error") });

    // Test 3: Our domain referrer
    const r3 = await testLink(link.url, "https://game2vault.vercel.app/", "our-referrer");
    console.log(`  Our ref: ${r3.status} -> ${r3.finalUrl} ${r3.error ? `ERROR: ${r3.error}` : ""}`);
    results.push({ host: "bzzhr", gameTitle: link.game.title, url: link.url, method: "our-referrer", ...r3, success: r3.status === 200 && !r3.finalUrl.includes("steamrip.com") && !r3.finalUrl.includes("error") });

    console.log("");
  }

  // Summary
  console.log("\n=== SUMMARY ===\n");
  const byHost = results.reduce((acc, r) => {
    if (!acc[r.host]) acc[r.host] = {};
    if (!acc[r.host][r.method]) acc[r.host][r.method] = { total: 0, success: 0 };
    acc[r.host][r.method].total++;
    if (r.success) acc[r.host][r.method].success++;
    return acc;
  }, {} as Record<string, Record<string, { total: number; success: number }>>);

  for (const [host, methods] of Object.entries(byHost)) {
    console.log(`${host}:`);
    for (const [method, stats] of Object.entries(methods)) {
      console.log(`  ${method}: ${stats.success}/${stats.total} OK`);
    }
  }

  await db.$disconnect();
}

main().catch(console.error);

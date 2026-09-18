import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const links = await db.downloadLink.findMany({ select: { url: true } });
  const hostCounts: Record<string, number> = {};
  
  for (const l of links) {
    try {
      const url = l.url.startsWith('//') ? 'https:' + l.url : l.url;
      const host = new URL(url).hostname;
      hostCounts[host] = (hostCounts[host] || 0) + 1;
    } catch {
      hostCounts['invalid'] = (hostCounts['invalid'] || 0) + 1;
    }
  }
  
  const sorted = Object.entries(hostCounts).sort((a, b) => b[1] - a[1]);
  console.log('Total links:', links.length);
  sorted.forEach(([host, count]) => console.log(`  ${host}: ${count}`));
  
  await db.$disconnect();
}

main();

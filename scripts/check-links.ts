import { PrismaClient } from "@prisma/client";
import fetch from 'node-fetch';

const prisma = new PrismaClient();

async function checkLink(url: string): Promise<{ url: string; status: string; ok: boolean }> {
  try {
    // Using HEAD request for efficiency, with a timeout.
    const response = await fetch(url, { method: 'HEAD', timeout: 10000 }); 
    return { url, status: String(response.status), ok: response.ok };
  } catch (error: any) {
    return { url, status: `Error: ${error.message}`, ok: false };
  }
}

async function main() {
  console.log("Buscando y verificando enlaces de tipo 'direct' o 'mirror'...");

  const links = await prisma.downloadLink.findMany({
    where: {
      OR: [
        { linkType: "direct" },
        { linkType: "mirror" },
      ],
    },
    select: {
      id: true,
      url: true,
    },
    take: 50, // Limiting to 50 to avoid excessive output for now
  });

  if (links.length === 0) {
    console.log("No se encontraron enlaces con linkType 'direct' o 'mirror'.");
    return;
  }

  console.log(`\nSe encontraron ${links.length} enlaces para verificar.`);
  console.log("Verificando accesibilidad de enlaces...");

  const results = await Promise.all(links.map(link => checkLink(link.url)));

  let workingCount = 0;
  let failedCount = 0;

  console.log("\n--- Resultados de Verificación ---");
  results.forEach(result => {
    if (result.ok) {
      workingCount++;
      console.log(`✅ OK   (${result.status}): ${result.url}`);
    } else {
      failedCount++;
      console.log(`❌ FAIL (${result.status}): ${result.url}`);
    }
  });

  console.log(`\nResumen: ${workingCount} enlaces funcionales, ${failedCount} enlaces fallidos.`);
}

main()
  .catch((e) => {
    console.error("Error al verificar enlaces:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

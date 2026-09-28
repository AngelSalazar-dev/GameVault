import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Buscando juegos con datos faltantes (coverImage o description)...");

  const missingDataGames = await prisma.game.findMany({
    where: {
      OR: [
        { coverImage: null },
        { coverImage: "" },
        { description: null },
        { description: "" },
      ],
    },
    select: {
      id: true,
      title: true,
      slug: true,
      coverImage: true,
      description: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  if (missingDataGames.length === 0) {
    console.log("¡No se encontraron juegos con datos faltantes!");
    return;
  }

  console.log(`\nSe encontraron ${missingDataGames.length} juegos con datos faltantes:`);
  missingDataGames.forEach((game) => {
    console.log(
      `- ID: ${game.id}, Title: "${game.title}", Slug: "${game.slug}", Cover: "${game.coverImage || 'MISSING'}", Desc: "${game.description ? game.description.substring(0, 50) + '...' : 'MISSING'}"`
    );
  });

  // Aquí podríamos añadir lógica para el scraping, pero por ahora solo listamos.
  console.log("\nPara proceder, se necesitaría un script de scraping que use esta lista.");
}

main()
  .catch((e) => {
    console.error("Error al buscar datos faltantes:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

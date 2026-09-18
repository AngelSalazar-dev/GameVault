import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Agregando links externos a la DB ===\n");

  // 1. Hollow Knight - Mediafire (password: thefenix010)
  const hollowKnight = await prisma.game.upsert({
    where: { slug: "hollow-knight" },
    update: {},
    create: {
      title: "Hollow Knight",
      slug: "hollow-knight",
      description: "Un épico juego de acción y aventuras en un mundo de insectos subterráneos.",
      genre: "ACTION",
      platform: "PC",
      developer: "Team Cherry",
      releaseYear: 2017,
      coverImage: "https://cdn.akamai.steamstatic.com/steam/apps/367520/header.jpg",
      fileSize: "3.5 GB",
    },
  });

  await prisma.downloadLink.create({
    data: {
      gameId: hollowKnight.id,
      linkType: "direct",
      url: "https://www.mediafire.com/file/8gb10974578vi2t/HK+-+TheFenix010.rar/file",
      host: "mediafire",
      isActive: true,
      fileSize: "3.5 GB",
    },
  });
  console.log("✅ Hollow Knight - Mediafire (password: thefenix010)");

  // 2. PS2 BIOS
  const biosPs2 = await prisma.game.upsert({
    where: { slug: "bios-ps2" },
    update: {},
    create: {
      title: "BIOS PS2 (Para emuladores)",
      slug: "bios-ps2",
      description: "Archivos BIOS necesarios para emular PlayStation 2 en PCSX2.",
      genre: "UTILITY",
      platform: "PS2",
      developer: "Sony",
      releaseYear: 2000,
      coverImage: "/images/ps2-bios.jpg",
      fileSize: "10 MB",
    },
  });

  await prisma.downloadLink.create({
    data: {
      gameId: biosPs2.id,
      linkType: "direct",
      url: "https://www.mediafire.com/file/sncrg1xbocdlwqy/bios.rar/file",
      host: "mediafire",
      isActive: true,
      fileSize: "10 MB",
    },
  });
  console.log("✅ BIOS PS2 - Mediafire");

  // 3. NDS ROMs
  const ndsRoms = await prisma.game.upsert({
    where: { slug: "roms-nds" },
    update: {},
    create: {
      title: "Colección ROMs Nintendo DS",
      slug: "roms-nds",
      description: "Pack completo de ROMs para Nintendo DS.",
      genre: "COLLECTION",
      platform: "NDS",
      developer: "Nintendo",
      releaseYear: 2004,
      coverImage: "/images/nds-collection.jpg",
      fileSize: "15 GB",
    },
  });

  await prisma.downloadLink.create({
    data: {
      gameId: ndsRoms.id,
      linkType: "direct",
      url: "https://drive.google.com/file/d/13b4X0IGPdBD2fL1chOw4QEx_SSxktycq/view",
      host: "gdrive",
      isActive: true,
      fileSize: "15 GB",
    },
  });
  console.log("✅ ROMs NDS - Google Drive");

  // 4. N64 ROMs
  const n64Roms = await prisma.game.upsert({
    where: { slug: "roms-n64" },
    update: {},
    create: {
      title: "Colección ROMs Nintendo 64",
      slug: "roms-n64",
      description: "Pack de ROMs para Nintendo 64.",
      genre: "COLLECTION",
      platform: "N64",
      developer: "Nintendo",
      releaseYear: 1996,
      coverImage: "/images/n64-collection.jpg",
      fileSize: "8 GB",
    },
  });

  await prisma.downloadLink.create({
    data: {
      gameId: n64Roms.id,
      linkType: "direct",
      url: "https://www.mediafire.com/file/5c516dks5pxcopl/Coleccio%25CC%2581n_Roms_N64.zip/file",
      host: "mediafire",
      isActive: true,
      fileSize: "8 GB",
    },
  });
  console.log("✅ ROMs N64 - Mediafire");

  // 5. GBA ROMs (en español)
  const gbaRoms = await prisma.game.upsert({
    where: { slug: "roms-gba" },
    update: {},
    create: {
      title: "Pack ROMs GBA en Español",
      slug: "roms-gba",
      description: "Pack de ROMs de Game Boy Advance traducidos al español.",
      genre: "COLLECTION",
      platform: "GBA",
      developer: "Nintendo",
      releaseYear: 2001,
      coverImage: "/images/gba-collection.jpg",
      fileSize: "12 GB",
    },
  });

  await prisma.downloadLink.create({
    data: {
      gameId: gbaRoms.id,
      linkType: "direct",
      url: "https://www.mediafire.com/file/6g6kv452gfakhth/pack_gba_en_espa%25C3%25B1ol.rar/file",
      host: "mediafire",
      isActive: true,
      fileSize: "12 GB",
    },
  });
  console.log("✅ ROMs GBA (Español) - Mediafire");

  // 6. SNES ROMs
  const snesRoms = await prisma.game.upsert({
    where: { slug: "roms-snes" },
    update: {},
    create: {
      title: "Colección ROMs Super Nintendo",
      slug: "roms-snes",
      description: "Pack de ROMs para Super Nintendo.",
      genre: "COLLECTION",
      platform: "SNES",
      developer: "Nintendo",
      releaseYear: 1990,
      coverImage: "/images/snes-collection.jpg",
      fileSize: "6 GB",
    },
  });

  await prisma.downloadLink.create({
    data: {
      gameId: snesRoms.id,
      linkType: "direct",
      url: "https://drive.google.com/file/d/1WEQdgAR5Yp3f2UGOT5QF1pBORHy5IY4O/view",
      host: "gdrive",
      isActive: true,
      fileSize: "6 GB",
    },
  });
  console.log("✅ ROMs SNES - Google Drive");

  // 7. Google Drive - Games Folder
  const gdriveGames = await prisma.game.upsert({
    where: { slug: "pack-juegos-google-drive" },
    update: {},
    create: {
      title: "Pack de Juegos (Google Drive)",
      slug: "pack-juegos-google-drive",
      description: "Carpeta con múltiples juegos en Google Drive.",
      genre: "COLLECTION",
      platform: "PC",
      developer: "Varios",
      releaseYear: 2024,
      coverImage: "/images/gdrive-games.jpg",
      fileSize: "Variable",
    },
  });

  await prisma.downloadLink.create({
    data: {
      gameId: gdriveGames.id,
      linkType: "direct",
      url: "https://drive.google.com/drive/u/0/folders/1IG5y31hPNPc9qSnJCkqByYJ1KP-lhhOK",
      host: "gdrive",
      isActive: true,
      fileSize: "Variable",
    },
  });
  console.log("✅ Pack Juegos - Google Drive");

  // Resumen
  const totalGames = await prisma.game.count();
  const totalLinks = await prisma.downloadLink.count();
  const gamesWithLinks = await prisma.game.findMany({
    where: { downloadLinks: { some: {} } },
    select: { id: true },
  });

  console.log("\n=== Resumen ===");
  console.log(`Total juegos en DB: ${totalGames}`);
  console.log(`Total links en DB: ${totalLinks}`);
  console.log(`Juegos con al menos 1 link: ${gamesWithLinks.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

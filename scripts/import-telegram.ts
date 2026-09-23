import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();
const EXPORT_DIR = "C:\\Users\\USUARIO DELL\\Downloads\\Telegram Desktop";

const CHANNEL_PLATFORM: Record<string, string> = {
  "CIAS para 3DS (VIP)": "3ds",
  "PlayStation 2 (PS2) ROMs ISOs For Emulation": "ps2",
  "El Ruendo | Juegos de SWITCH en .nsp": "switch",
  "ElRuendo | Juegos para Wii en WBFS": "wii",
  "ElRuendo | Juegos ISO para PS2": "ps2",
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 80);
}

function cleanTitle(fileName: string): string {
  return fileName
    .replace(/\.7z\.\d+$/, "")
    .replace(/\.(7z|iso|zip|rar)$/i, "")
    .replace(/\((USA|EUR|JAP|World|Europe|Japan|USA, Europe)\)/gi, "")
    .replace(/\[.*?\]/g, "")
    .replace(/[._-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseJsonFile(jsonPath: string) {
  const content = fs.readFileSync(jsonPath, "utf-8");
  return JSON.parse(content);
}

async function main() {
  console.log("=== IMPORT TELEGRAM EXPORTS ===\n");

  const folders = fs.readdirSync(EXPORT_DIR).filter((f) =>
    fs.statSync(path.join(EXPORT_DIR, f)).isDirectory()
  );

  console.log(`Encontrados ${folders.length} exports:\n`);

  let totalFiles = 0;
  let createdGames = 0;
  let createdTelegramFiles = 0;
  let skipped = 0;

  // Pre-cache existing games by slug
  const existingGames = await prisma.game.findMany({
    select: { id: true, slug: true },
  });
  const gameBySlug = new Map(existingGames.map((g) => [g.slug, g.id]));
  console.log(`Cached ${gameBySlug.size} juegos existentes\n`);

  // Pre-cache existing telegram files
  const existingTf = await prisma.telegramFile.findMany({
    select: { channel: true, messageId: true, gameId: true },
  });
  const tfKey = (ch: string, mid: number) => `${ch}:${mid}`;
  const existingTfSet = new Set(existingTf.map((t) => tfKey(t.channel, t.messageId)));
  const tfByGameId = new Map(existingTf.map((t) => [t.gameId, true]));
  console.log(`Cached ${existingTfSet.size} TelegramFiles existentes\n`);

  for (const folder of folders) {
    const jsonPath = path.join(EXPORT_DIR, folder, "result.json");
    if (!fs.existsSync(jsonPath)) continue;

    const data = parseJsonFile(jsonPath);
    const channelName = data.name || folder;
    const platform = CHANNEL_PLATFORM[channelName] || "unknown";

    console.log(`\n📁 ${channelName} (${platform}) - ${data.messages?.length || 0} mensajes`);

    const messagesWithFiles = (data.messages || []).filter(
      (m: any) => m.file_name && m.file_size
    );

    console.log(`   Archivos ROM: ${messagesWithFiles.length}`);

    // Prepare batch data
    const gamesToCreate: any[] = [];
    const tfToCreate: any[] = [];
    const linksToCreate: any[] = [];

    for (const msg of messagesWithFiles) {
      const fileName = msg.file_name;
      const fileSize = BigInt(msg.file_size);
      const messageId = msg.id;
      const title = cleanTitle(fileName);
      const slug = slugify(title);

      if (!title || title.length < 2) {
        skipped++;
        continue;
      }

      const key = tfKey(channelName, messageId);
      if (existingTfSet.has(key)) {
        skipped++;
        continue;
      }

      let gameId = gameBySlug.get(slug);

      if (!gameId) {
        // Check if we're creating it in this batch
        const existing = gamesToCreate.find((g) => g.slug === slug);
        if (existing) {
          gameId = existing.id;
        } else {
          // Create new game
          gameId = `temp_${slug}_${Date.now()}_${Math.random()}`;
          gamesToCreate.push({
            id: gameId,
            title,
            slug,
            platform,
            description: `${title} - ROM from ${channelName}`,
            status: "active",
            source: "telegram",
          });
          gameBySlug.set(slug, gameId);
          createdGames++;
        }
      }

      tfToCreate.push({
        id: `tf_${channelName}_${messageId}`,
        gameId,
        channel: channelName,
        messageId,
        fileName,
        fileSize,
        platform,
      });
      existingTfSet.add(key);

      // Check if download link exists
      if (!tfByGameId.has(gameId)) {
        linksToCreate.push({
          gameId,
          linkType: "direct",
          url: `telegram:${channelName}:${messageId}`,
          host: "telegram",
          source: "telegram",
          isActive: true,
        });
        tfByGameId.set(gameId, true);
      }

      totalFiles++;
    }

    // Batch create games
    if (gamesToCreate.length > 0) {
      console.log(`   Creando ${gamesToCreate.length} juegos nuevos...`);
      for (const g of gamesToCreate) {
        try {
          await prisma.game.create({ data: g });
        } catch (e: any) {
          if (!e.message?.includes("Unique constraint")) {
            console.log(`   Error creando juego: ${e.message}`);
          }
        }
      }
    }

    // Batch create telegram files
    if (tfToCreate.length > 0) {
      console.log(`   Creando ${tfToCreate.length} TelegramFiles...`);
      await prisma.telegramFile.createMany({
        data: tfToCreate,
        skipDuplicates: true,
      });
      createdTelegramFiles += tfToCreate.length;
    }

    // Batch create download links
    if (linksToCreate.length > 0) {
      await prisma.downloadLink.createMany({
        data: linksToCreate,
        skipDuplicates: true,
      });
    }

    console.log(`   ✅ ${channelName}: ${tfToCreate.length} archivos, ${gamesToCreate.length} juegos nuevos`);
  }

  console.log(`\n=== RESUMEN ===`);
  console.log(`Total archivos procesados: ${totalFiles}`);
  console.log(`Juegos nuevos creados: ${createdGames}`);
  console.log(`TelegramFiles creados: ${createdTelegramFiles}`);
  console.log(`Saltados (duplicados/sin título): ${skipped}`);

  const totalGames = await prisma.game.count({ where: { status: "active" } });
  const totalTf = await prisma.telegramFile.count();
  const totalLinks = await prisma.downloadLink.count();
  console.log(`\nTotal juegos activos: ${totalGames}`);
  console.log(`Total TelegramFiles: ${totalTf}`);
  console.log(`Total DownloadLinks: ${totalLinks}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
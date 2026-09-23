import { db } from "../src/lib/db";

async function main() {
  const result = await db.$executeRaw`
    UPDATE TelegramFile SET channelId = CASE channel
      WHEN 'CIAS para 3DS (VIP)' THEN 4444207212
      WHEN 'PlayStation 2 (PS2) ROMs ISOs For Emulation' THEN 2378030552
      WHEN 'El Ruendo | Juegos de SWITCH en .nsp' THEN 2036229025
      WHEN 'ElRuendo | Juegos para Wii en WBFS' THEN 1769030661
      WHEN 'ElRuendo | Juegos ISO para PS2' THEN 1706509836
    END
    WHERE channelId IS NULL
  `;
  console.log(`✅ Filas actualizadas: ${result}`);

  const remaining = await db.telegramFile.count({ where: { channelId: null } });
  console.log(`Sin channelId: ${remaining}`);
}

main().then(() => process.exit(0));
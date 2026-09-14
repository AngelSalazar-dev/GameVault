import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const gameDownloadLinks: Record<string, { url: string; host: string }[]> = {
  "the-sims-4": [
    { url: "https://mega.nz/file/abc123#sims4", host: "mega" },
    { url: "https://mediafire.com/file/sims4", host: "mediafire" },
  ],
  "god-of-war-ragnarok": [
    { url: "https://mega.nz/file/gow2024", host: "mega" },
    { url: "https://gofile.io/d/gow2024", host: "gofile" },
  ],
  "elden-ring": [
    { url: "https://mega.nz/file/eldenring", host: "mega" },
    { url: "https://mediafire.com/file/eldenring", host: "mediafire" },
    { url: "https://gofile.io/d/eldenring", host: "gofile" },
  ],
  "cyberpunk-2077": [
    { url: "https://mega.nz/file/cyberpunk", host: "mega" },
    { url: "https://mediafire.com/file/cyberpunk", host: "mediafire" },
  ],
  "baldurs-gate-3": [
    { url: "https://mega.nz/file/bg3", host: "mega" },
    { url: "https://gofile.io/d/bg3", host: "gofile" },
  ],
  "forza-horizon-6": [
    { url: "https://mega.nz/file/forza6", host: "mega" },
    { url: "https://mediafire.com/file/forza6", host: "mediafire" },
  ],
  "alan-wake-2": [
    { url: "https://mega.nz/file/alanwake2", host: "mega" },
    { url: "https://gofile.io/d/alanwake2", host: "gofile" },
  ],
  "dying-light-2-stay-human": [
    { url: "https://mega.nz/file/dl2", host: "mega" },
    { url: "https://mediafire.com/file/dl2", host: "mediafire" },
  ],
  "palworld": [
    { url: "https://mega.nz/file/palworld", host: "mega" },
    { url: "https://gofile.io/d/palworld", host: "gofile" },
  ],
  "bloons-td-6": [
    { url: "https://mega.nz/file/bloons", host: "mega" },
  ],
  "metal-gear-solid": [
    { url: "https://vimm.net/vault/PS1/Metal+Gear+Solid", host: "vimm" },
  ],
  "final-fantasy-vii": [
    { url: "https://vimm.net/vault/PS1/Final+Fantasy+VII", host: "vimm" },
  ],
  "grand-theft-auto-san-andreas": [
    { url: "https://vimm.net/vault/PS2/Grand+Theft+Auto+San+Andreas", host: "vimm" },
  ],
  "super-mario-64": [
    { url: "https://vimm.net/vault/N64/Super+Mario+64", host: "vimm" },
  ],
  "pokemon-emerald": [
    { url: "https://vimm.net/vault/GBA/Pokemon+Emerald", host: "vimm" },
  ],
  "pokemon-heartgold": [
    { url: "https://vimm.net/vault/DS/Pokemon+HeartGold", host: "vimm" },
  ],
};

export async function POST() {
  try {
    const results: string[] = [];

    for (const [slug, links] of Object.entries(gameDownloadLinks)) {
      const game = await db.game.findUnique({
        where: { slug },
      });

      if (game) {
        // Delete existing links
        await db.downloadLink.deleteMany({
          where: { gameId: game.id },
        });

        // Add new links
        for (const link of links) {
          await db.downloadLink.create({
            data: {
              gameId: game.id,
              linkType: "direct",
              url: link.url,
              host: link.host,
              isActive: true,
            },
          });
        }
        results.push(`${game.title}: ${links.length} links added`);
      } else {
        results.push(`${slug}: game not found`);
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

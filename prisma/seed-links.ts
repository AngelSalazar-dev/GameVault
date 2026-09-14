import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const links = [
  // PC Games
  { gameSlug: "the-sims-4", url: "https://mega.nz/file/abc123#sims4", host: "mega", type: "direct" },
  { gameSlug: "the-sims-4", url: "https://mediafire.com/file/sims4", host: "mediafire", type: "direct" },
  { gameSlug: "god-of-war-ragnarok", url: "https://mega.nz/file/gow2024", host: "mega", type: "direct" },
  { gameSlug: "god-of-war-ragnarok", url: "https://gofile.io/d/gow2024", host: "gofile", type: "direct" },
  { gameSlug: "elden-ring", url: "https://mega.nz/file/eldenring", host: "mega", type: "direct" },
  { gameSlug: "elden-ring", url: "https://mediafire.com/file/eldenring", host: "mediafire", type: "direct" },
  { gameSlug: "elden-ring", url: "https://gofile.io/d/eldenring", host: "gofile", type: "direct" },
  { gameSlug: "cyberpunk-2077", url: "https://mega.nz/file/cyberpunk", host: "mega", type: "direct" },
  { gameSlug: "cyberpunk-2077", url: "https://mediafire.com/file/cyberpunk", host: "mediafire", type: "direct" },
  { gameSlug: "baldurs-gate-3", url: "https://mega.nz/file/bg3", host: "mega", type: "direct" },
  { gameSlug: "baldurs-gate-3", url: "https://gofile.io/d/bg3", host: "gofile", type: "direct" },
  { gameSlug: "forza-horizon-6", url: "https://mega.nz/file/forza6", host: "mega", type: "direct" },
  { gameSlug: "forza-horizon-6", url: "https://mediafire.com/file/forza6", host: "mediafire", type: "direct" },
  { gameSlug: "alan-wake-2", url: "https://mega.nz/file/alanwake2", host: "mega", type: "direct" },
  { gameSlug: "alan-wake-2", url: "https://gofile.io/d/alanwake2", host: "gofile", type: "direct" },
  { gameSlug: "dying-light-2-stay-human", url: "https://mega.nz/file/dl2", host: "mega", type: "direct" },
  { gameSlug: "dying-light-2-stay-human", url: "https://mediafire.com/file/dl2", host: "mediafire", type: "direct" },
  { gameSlug: "palworld", url: "https://mega.nz/file/palworld", host: "mega", type: "direct" },
  { gameSlug: "palworld", url: "https://gofile.io/d/palworld", host: "gofile", type: "direct" },
  { gameSlug: "bloons-td-6", url: "https://mega.nz/file/bloons", host: "mega", type: "direct" },
  // PS1 Games
  { gameSlug: "metal-gear-solid", url: "https://vimm.net/vault/PS1/Metal+Gear+Solid", host: "vimm", type: "direct" },
  { gameSlug: "final-fantasy-vii", url: "https://vimm.net/vault/PS1/Final+Fantasy+VII", host: "vimm", type: "direct" },
  // PS2 Games
  { gameSlug: "grand-theft-auto-san-andreas", url: "https://vimm.net/vault/PS2/Grand+Theft+Auto+San+Andreas", host: "vimm", type: "direct" },
  // N64 Games
  { gameSlug: "super-mario-64", url: "https://vimm.net/vault/N64/Super+Mario+64", host: "vimm", type: "direct" },
  // GBA Games
  { gameSlug: "pokemon-emerald", url: "https://vimm.net/vault/GBA/Pokemon+Emerald", host: "vimm", type: "direct" },
  // DS Games
  { gameSlug: "pokemon-heartgold", url: "https://vimm.net/vault/DS/Pokemon+HeartGold", host: "vimm", type: "direct" },
];

async function main() {
  console.log("Adding download links...");

  for (const link of links) {
    const game = await prisma.game.findUnique({
      where: { slug: link.gameSlug },
    });

    if (game) {
      await prisma.downloadLink.create({
        data: {
          gameId: game.id,
          linkType: link.type as "direct" | "torrent" | "mirror",
          url: link.url,
          host: link.host,
          isActive: true,
        },
      });
      console.log(`Added link for ${game.title}`);
    }
  }

  console.log("Done!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const sampleGames = [
  {
    title: "The Sims 4",
    description:
      "The Sims 4 is a life simulation video game developed by Maxis and published by Electronic Arts. Create unique Sims, build their homes, and explore diverse neighborhoods.",
    platform: "pc",
    genre: "Simulation",
    releaseYear: 2020,
    developer: "Maxis",
    publisher: "Electronic Arts",
    fileSize: "77.1 GB",
    rating: 8.5,
    totalRatings: 245,
    systemRequirements: {
      OS: "Windows 10 (64-bit)",
      CPU: "Intel Core i3-3220 / AMD Ryzen 3 1200",
      RAM: "4 GB",
      GPU: "NVIDIA GTX 660 / AMD Radeon HD 7870",
      Storage: "25 GB",
    },
  },
  {
    title: "God of War Ragnarok",
    description:
      "Embark on an epic and heartfelt journey as Kratos and Atreus struggle with holding on and letting go. Witness the changing dynamic of their relationship as they prepare for war.",
    platform: "pc",
    genre: "Action",
    releaseYear: 2024,
    developer: "Santa Monica Studio",
    publisher: "PlayStation PC LLC",
    fileSize: "94 GB",
    rating: 9.5,
    totalRatings: 892,
    systemRequirements: {
      OS: "Windows 10 (64-bit)",
      CPU: "Intel i5-8600 / AMD Ryzen 5 3600",
      RAM: "8 GB",
      GPU: "NVIDIA GTX 1070 / AMD RX 5600 XT",
      Storage: "190 GB",
    },
  },
  {
    title: "Elden Ring",
    description:
      "A new fantasy action RPG. Rise, Tarnished, and be guided by grace to brandish the power of the Elden Ring and become an Elden Lord in the Lands Between.",
    platform: "pc",
    genre: "RPG",
    releaseYear: 2022,
    developer: "FromSoftware",
    publisher: "Bandai Namco",
    fileSize: "67.4 GB",
    rating: 9.8,
    totalRatings: 1247,
    systemRequirements: {
      OS: "Windows 10 (64-bit)",
      CPU: "Intel Core i5-8400 / AMD Ryzen 3 3300X",
      RAM: "12 GB",
      GPU: "NVIDIA GTX 1060 3GB / AMD RX 580 4GB",
      Storage: "60 GB",
    },
  },
  {
    title: "Cyberpunk 2077",
    description:
      "Cyberpunk 2077 is an open-world action-adventure RPG set in the megalopolis of Night City, where you play as a cyberpunk mercenary wrapped up in a do-or-die fight for survival.",
    platform: "pc",
    genre: "RPG",
    releaseYear: 2020,
    developer: "CD Projekt Red",
    publisher: "CD Projekt",
    fileSize: "89.1 GB",
    rating: 8.2,
    totalRatings: 654,
    systemRequirements: {
      OS: "Windows 10 (64-bit)",
      CPU: "Intel Core i7-6700 / AMD Ryzen 5 1600",
      RAM: "8 GB",
      GPU: "NVIDIA GTX 1060 6GB / AMD RX 580 8GB",
      Storage: "70 GB",
    },
  },
  {
    title: "Baldur's Gate 3",
    description:
      "Gather your party and return to the Forgotten Realms in a tale of fellowship and betrayal, sacrifice and survival, and the lure of absolute power.",
    platform: "pc",
    genre: "RPG",
    releaseYear: 2023,
    developer: "Larian Studios",
    publisher: "Larian Studios",
    fileSize: "123 GB",
    rating: 9.7,
    totalRatings: 1589,
    systemRequirements: {
      OS: "Windows 10 (64-bit)",
      CPU: "Intel i5 4690 / AMD FX 8350",
      RAM: "8 GB",
      GPU: "NVIDIA GTX 970 / RX 480 (4GB+)",
      Storage: "150 GB",
    },
  },
  {
    title: "Forza Horizon 6",
    description:
      "Experience the most open-world, ever-evolving racing game. Explore stunning landscapes, collect hundreds of cars, and create your own racing adventure.",
    platform: "pc",
    genre: "Racing",
    releaseYear: 2026,
    developer: "Playground Games",
    publisher: "Xbox Game Studios",
    fileSize: "138 GB",
    rating: 9.0,
    totalRatings: 324,
    systemRequirements: {
      OS: "Windows 10 (64-bit)",
      CPU: "Intel i5-11600K / AMD Ryzen 5 5600X",
      RAM: "16 GB",
      GPU: "NVIDIA RTX 3060 / AMD RX 6600 XT",
      Storage: "110 GB",
    },
  },
  {
    title: "Alan Wake 2",
    description:
      "Alan Wake 2 is the next release from Remedy Entertainment, the creators of Max Payne and Control. A sequel to the action-adventure game Alan Wake.",
    platform: "pc",
    genre: "Horror",
    releaseYear: 2023,
    developer: "Remedy Entertainment",
    publisher: "Epic Games",
    fileSize: "97.5 GB",
    rating: 9.1,
    totalRatings: 456,
    systemRequirements: {
      OS: "Windows 10 (64-bit)",
      CPU: "Intel i5-10600K / AMD Ryzen 5 3600",
      RAM: "16 GB",
      GPU: "NVIDIA RTX 2060 / AMD RX 6600",
      Storage: "90 GB",
    },
  },
  {
    title: "Dying Light 2 Stay Human",
    description:
      "Over twenty years ago in Harran, we fought the virus and lost. Now, we're losing again. The City, one of the last large human settlements, is being torn apart by conflict.",
    platform: "pc",
    genre: "Action",
    releaseYear: 2020,
    developer: "Techland",
    publisher: "Techland",
    fileSize: "98.3 GB",
    rating: 8.3,
    totalRatings: 567,
    systemRequirements: {
      OS: "Windows 10 (64-bit)",
      CPU: "Intel i5-4670K / AMD Ryzen 5 1600X",
      RAM: "8 GB",
      GPU: "NVIDIA GTX 1050 Ti / AMD RX 570",
      Storage: "60 GB",
    },
  },
  {
    title: "Palworld",
    description:
      "Palworld is a multiplayer, open-world survival crafting game where you can befriend and collect mysterious creatures called Pals.",
    platform: "pc",
    genre: "Survival",
    releaseYear: 2024,
    developer: "Pocketpair",
    publisher: "Pocketpair",
    fileSize: "31.8 GB",
    rating: 8.0,
    totalRatings: 892,
    systemRequirements: {
      OS: "Windows 10 (64-bit)",
      CPU: "Intel i5-10400 / AMD Ryzen 5 3600",
      RAM: "16 GB",
      GPU: "NVIDIA GTX 1650 / AMD RX 5500 XT",
      Storage: "40 GB",
    },
  },
  {
    title: "Bloons TD 6",
    description:
      "Bloons TD 6 is a colorful and chaotic tower defense game where you strategically place monkey towers to pop incoming balloons before they reach the exit.",
    platform: "pc",
    genre: "Strategy",
    releaseYear: 2018,
    developer: "Ninja Kiwi",
    publisher: "Ninja Kiwi",
    fileSize: "2.1 GB",
    rating: 8.8,
    totalRatings: 1234,
    systemRequirements: {
      OS: "Windows 7 (64-bit)",
      CPU: "Intel Core 2 Duo E8400",
      RAM: "2 GB",
      GPU: "Intel HD Graphics 4000",
      Storage: "2 GB",
    },
  },
  // PS1 Games
  {
    title: "Metal Gear Solid",
    description:
      "The game follows Solid Snake, who is sent to infiltrate a nuclear weapons facility and neutralize the terrorist threat from FoxHound.",
    platform: "ps1",
    genre: "Action",
    releaseYear: 1998,
    developer: "Konami",
    publisher: "Konami",
    fileSize: "320 MB",
    rating: 9.5,
    totalRatings: 456,
  },
  {
    title: "Final Fantasy VII",
    description:
      "The story follows Cloud Strife, a former Shinra soldier who joins an eco-terrorist group to fight against the mega-corporation Shinra.",
    platform: "ps1",
    genre: "RPG",
    releaseYear: 1997,
    developer: "Square",
    publisher: "Sony",
    fileSize: "1.2 GB",
    rating: 9.8,
    totalRatings: 789,
  },
  // PS2 Games
  {
    title: "Grand Theft Auto: San Andreas",
    description:
      "The game follows former gang member Carl Johnson as he returns to Los Santos after his mother's murder to rebuild his life.",
    platform: "ps2",
    genre: "Action",
    releaseYear: 2004,
    developer: "Rockstar North",
    publisher: "Rockstar Games",
    fileSize: "4.7 GB",
    rating: 9.6,
    totalRatings: 1567,
  },
  // Nintendo 64
  {
    title: "Super Mario 64",
    description:
      "The first 3D Mario game, where Mario must rescue Princess Peach from Bowser by collecting Power Stars.",
    platform: "n64",
    genre: "Platformer",
    releaseYear: 1996,
    developer: "Nintendo",
    publisher: "Nintendo",
    fileSize: "8 MB",
    rating: 9.7,
    totalRatings: 2345,
  },
  // Game Boy Advance
  {
    title: "Pokemon Emerald",
    description:
      "An enhanced version of Pokemon Ruby and Sapphire, featuring the Battle Frontier and additional content.",
    platform: "gba",
    genre: "RPG",
    releaseYear: 2004,
    developer: "Game Freak",
    publisher: "Nintendo",
    fileSize: "16 MB",
    rating: 9.3,
    totalRatings: 1890,
  },
  // Nintendo DS
  {
    title: "Pokemon HeartGold",
    description:
      "A remake of Pokemon Gold for the Nintendo DS, featuring updated graphics and additional features.",
    platform: "ds",
    genre: "RPG",
    releaseYear: 2009,
    developer: "Game Freak",
    publisher: "Nintendo",
    fileSize: "256 MB",
    rating: 9.5,
    totalRatings: 1234,
  },
];

const collections = [
  { name: "Assassin's Creed", description: "All Assassin's Creed games" },
  { name: "Call of Duty", description: "All Call of Duty games" },
  { name: "Final Fantasy", description: "All Final Fantasy games" },
  { name: "Pokemon", description: "All Pokemon games" },
  { name: "Grand Theft Auto", description: "All GTA games" },
  { name: "Resident Evil", description: "All Resident Evil games" },
];

async function main() {
  console.log("Seeding database...");

  // Clear existing data
  await prisma.rating.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.request.deleteMany();
  await prisma.manual.deleteMany();
  await prisma.gameCollection.deleteMany();
  await prisma.collection.deleteMany();
  await prisma.downloadLink.deleteMany();
  await prisma.game.deleteMany();

  // Create collections
  const createdCollections = await Promise.all(
    collections.map((c) =>
      prisma.collection.create({
        data: {
          ...c,
          slug: slugify(c.name),
        },
      })
    )
  );
  console.log(`Created ${createdCollections.length} collections`);

  // Create games
  const createdGames = await Promise.all(
    sampleGames.map((g) =>
      prisma.game.create({
        data: {
          ...g,
          slug: slugify(g.title),
          status: "active",
          source: "manual",
        },
      })
    )
  );
  console.log(`Created ${createdGames.length} games`);

  // Add some games to collections
  const pokemonGames = createdGames.filter((g) =>
    g.title.toLowerCase().includes("pokemon")
  );
  const pokemonCollection = createdCollections.find(
    (c) => c.name === "Pokemon"
  );

  if (pokemonCollection && pokemonGames.length > 0) {
    await Promise.all(
      pokemonGames.map((game) =>
        prisma.gameCollection.create({
          data: {
            gameId: game.id,
            collectionId: pokemonCollection.id,
          },
        })
      )
    );
  }

  const gtaGames = createdGames.filter(
    (g) => g.title.toLowerCase().includes("grand theft auto") || g.title.toLowerCase().includes("gta")
  );
  const gtaCollection = createdCollections.find(
    (c) => c.name === "Grand Theft Auto"
  );

  if (gtaCollection && gtaGames.length > 0) {
    await Promise.all(
      gtaGames.map((game) =>
        prisma.gameCollection.create({
          data: {
            gameId: game.id,
            collectionId: gtaCollection.id,
          },
        })
      )
    );
  }

  console.log("Seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

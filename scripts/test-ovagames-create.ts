import axios from "axios";
import * as cheerio from "cheerio";
import { PrismaClient } from "@prisma/client";
import { normalizeGenre } from "./lib/normalize";

const prisma = new PrismaClient();
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";

async function main() {
  const url = "https://www.ovagames.com/dune-awakening-ultimate-edition-multi12-elamigos.html";
  const res = await axios.get(url, { headers: { "User-Agent": UA }, timeout: 30000 });
  const $ = cheerio.load(String(res.data));

  const title = $("h1").first().text().trim();
  const cover = $('meta[property="og:image"]').attr("content") || "";

  console.log("title:", title);
  console.log("cover length:", cover.length);

  const gameData = {
    title,
    slug: "test-dune-ovagames",
    description: "test",
    platform: "pc",
    genre: normalizeGenre("action"),
    coverImage: cover,
    status: "active" as const,
    source: "ovagames",
  };

  console.log("Game data:", JSON.stringify(gameData, null, 2));

  try {
    const g = await prisma.game.create({ data: gameData });
    console.log("CREATED:", g.id);
    await prisma.game.delete({ where: { id: g.id } });
    console.log("DELETED");
  } catch (e: any) {
    console.error("CREATE ERROR:");
    console.error("message:", e.message?.substring(0, 500));
    console.error("full:", JSON.stringify(e, null, 2)?.substring(0, 1500));
  }
}

main().finally(() => prisma.$disconnect());

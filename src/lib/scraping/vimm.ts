import axios from "axios";
import * as cheerio from "cheerio";

interface ScrapedGame {
  title: string;
  slug: string;
  platform: string;
  coverImage?: string;
  downloadLinks: { url: string; host: string }[];
}

export async function scrapeVimmVault(
  platform: string
): Promise<{ url: string; title: string }[]> {
  try {
    const platformMap: Record<string, string> = {
      ps1: "PS1",
      ps2: "PS2",
      ps3: "PS3",
      n64: "N64",
      gamecube: "GCN",
      wii: "Wii",
      gba: "GBA",
      ds: "DS",
      "3ds": "3DS",
      snes: "SNES",
      nes: "NES",
      gb: "GB",
      genesis: "GEN",
    };

    const vimmPlatform = platformMap[platform] || platform.toUpperCase();
    const url = `https://vimm.net/vault/${vimmPlatform}`;

    const { data } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      timeout: 15000,
    });

    const $ = cheerio.load(data);
    const games: { url: string; title: string }[] = [];

    // Vimm has a different structure
    $("a[href*='/vault/']").each((_, el) => {
      const href = $(el).attr("href") || "";
      const title = $(el).text().trim();
      if (href && title && !href.endsWith(`/${vimmPlatform}`)) {
        const fullUrl = href.startsWith("http") ? href : `https://vimm.net${href}`;
        games.push({ url: fullUrl, title });
      }
    });

    return games;
  } catch (error) {
    console.error(`Error scraping Vimm ${platform}:`, error);
    return [];
  }
}

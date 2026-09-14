import axios from "axios";
import * as cheerio from "cheerio";

interface ScrapedGame {
  title: string;
  slug: string;
  coverImage?: string;
  downloadLinks: { url: string; host: string }[];
}

export async function scrapeSteamRipPage(url: string): Promise<ScrapedGame | null> {
  try {
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      timeout: 15000,
    });

    const $ = cheerio.load(data);

    const title = $("h1.entry-title").text().trim() || $("h1").first().text().trim();
    const coverImage = $("article img").first().attr("src") || $(".entry-content img").first().attr("src");

    const downloadLinks: { url: string; host: string }[] = [];

    // Look for download links
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") || "";
      const text = $(el).text().toLowerCase();

      if (
        href.includes("mega.nz") ||
        href.includes("mediafire") ||
        href.includes("gofile") ||
        href.includes("buzzheavier") ||
        href.includes("1fichier") ||
        href.includes("uptobox") ||
        href.includes("racaty") ||
        text.includes("download") ||
        text.includes("link") ||
        text.includes("mirror")
      ) {
        let host = "unknown";
        if (href.includes("mega")) host = "mega";
        else if (href.includes("mediafire")) host = "mediafire";
        else if (href.includes("gofile")) host = "gofile";
        else if (href.includes("buzzheavier")) host = "buzzheavier";
        else if (href.includes("1fichier")) host = "1fichier";
        else if (href.includes("uptobox")) host = "uptobox";
        else if (href.includes("racaty")) host = "racaty";

        downloadLinks.push({ url: href, host });
      }
    });

    if (!title) return null;

    const slug = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    return {
      title,
      slug,
      coverImage,
      downloadLinks,
    };
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return null;
  }
}

export async function scrapeSteamRipList(
  page: number = 1
): Promise<{ url: string; title: string }[]> {
  try {
    const url = page === 1 ? "https://steamrip.com/" : `https://steamrip.com/page/${page}`;
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      timeout: 15000,
    });

    const $ = cheerio.load(data);
    const games: { url: string; title: string }[] = [];

    $(".entry-title a").each((_, el) => {
      const href = $(el).attr("href") || "";
      const title = $(el).text().trim();
      if (href && title) {
        games.push({ url: href, title });
      }
    });

    return games;
  } catch (error) {
    console.error(`Error scraping list page ${page}:`, error);
    return [];
  }
}

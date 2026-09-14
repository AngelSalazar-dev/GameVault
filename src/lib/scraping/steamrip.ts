import axios from "axios";
import * as cheerio from "cheerio";

const BASE_URL = "https://steamrip.com";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const DELAY_MS = 2000;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface SteamRipGame {
  title: string;
  slug: string;
  url: string;
  coverImage?: string;
  year?: number;
  fileSize?: string;
  genre?: string;
  developer?: string;
  publisher?: string;
  description?: string;
  version?: string;
  platform?: string;
  systemRequirements?: Record<string, string>;
  downloadLinks: { url: string; host: string }[];
}

export interface SteamRipListItem {
  title: string;
  url: string;
  coverImage?: string;
  year?: number;
  fileSize?: string;
}

/**
 * Scrape the SteamRip homepage/listing to get game entries
 */
export async function scrapeSteamRipList(
  page: number = 1
): Promise<SteamRipListItem[]> {
  try {
    const url =
      page === 1 ? BASE_URL : `${BASE_URL}/page/${page}`;
    const { data } = await axios.get(url, {
      headers: { "User-Agent": USER_AGENT },
      timeout: 20000,
    });

    const $ = cheerio.load(data);
    const games: SteamRipListItem[] = [];

    $("li.post-item").each((_, el) => {
      const $el = $(el);

      // Title and URL
      const $link = $el.find("a.post-thumb");
      const href = $link.attr("href") || "";
      const titleEl = $el.find("h2.the-post-title").text().trim() ||
        $el.find("div.post-details h2.post-title a").text().trim();
      const title = titleEl.replace(/\s*Free Download.*$/i, "").trim();

      // Cover image (lazy loaded)
      const coverImage =
        $el.find("img.thumbnail-image").attr("data-src") ||
        $el.find("noscript img.thumbnail-image").attr("src") ||
        undefined;

      // Year and file size from game-meta-line
      const metaText = $el.find("span.game-meta-line").text().trim();
      let year: number | undefined;
      let fileSize: string | undefined;
      if (metaText) {
        const parts = metaText.split("|").map((s: string) => s.trim());
        if (parts.length >= 1) {
          const y = parseInt(parts[0]);
          if (!isNaN(y)) year = y;
        }
        if (parts.length >= 2) {
          fileSize = parts[1];
        }
      }

      if (title && href) {
        const fullUrl = href.startsWith("http") ? href : `${BASE_URL}/${href}`;
        games.push({
          title,
          url: fullUrl,
          coverImage,
          year,
          fileSize,
        });
      }
    });

    return games;
  } catch (error) {
    console.error(`Error scraping SteamRip list page ${page}:`, error);
    return [];
  }
}

/**
 * Scrape a single SteamRip game detail page
 */
export async function scrapeSteamRipDetail(
  url: string
): Promise<SteamRipGame | null> {
  try {
    await sleep(DELAY_MS); // Rate limiting

    const { data } = await axios.get(url, {
      headers: { "User-Agent": USER_AGENT },
      timeout: 20000,
    });

    const $ = cheerio.load(data);

    // Title
    const rawTitle =
      $("h1.post-title.entry-title").text().trim() ||
      $("title").text().split("Free Download")[0].trim() ||
      $("h1").first().text().trim();
    const title = rawTitle.replace(/\s*Free Download.*$/i, "").trim();

    // Cover image
    const coverImage =
      $("figure.single-featured-image img.wp-post-image").attr("data-src") ||
      $("figure.single-featured-image img.wp-post-image").attr("srcset")?.split(",")[0]?.trim().split(" ")[0] ||
      $("img.wp-post-image").attr("data-src") ||
      undefined;

    // Game info from tie-list-shortcode
    const gameInfo: Record<string, string> = {};
    $("div.plus.tie-list-shortcode li").each((_, el) => {
      const text = $(el).text().trim();
      const match = text.match(/^([^:]+):\s*(.+)$/);
      if (match) {
        gameInfo[match[1].trim().toLowerCase()] = match[2].trim();
      }
    });

    // System requirements
    const systemRequirements: Record<string, string> = {};
    $("div.checklist.tie-list-shortcode li").each((_, el) => {
      const text = $(el).text().trim();
      const match = text.match(/^([^:]+):\s*(.+)$/);
      if (match) {
        systemRequirements[match[1].trim()] = match[2].trim();
      }
    });

    // Description (first 2 paragraphs)
    const descriptionParts: string[] = [];
    $("div.entry-content.entry p").each((i, el) => {
      if (i < 3) {
        const text = $(el).text().trim();
        if (text.length > 20) descriptionParts.push(text);
      }
    });

    // Download links - look for shortc-button links
    const downloadLinks: { url: string; host: string }[] = [];
    $("a.shortc-button").each((_, el) => {
      const $a = $(el);
      const href = $a.attr("href") || "";
      if (!href || href === "#") return;

      // Find the host name in the parent/sibling <strong>
      let host = "unknown";
      const $parent = $a.parent("p");
      const hostText = $parent.find("strong").first().text().trim().toLowerCase();
      
      if (hostText.includes("gofile")) host = "gofile";
      else if (hostText.includes("bzzhr") || hostText.includes("buzz")) host = "buzzheavier";
      else if (hostText.includes("fileditch")) host = "fileditch";
      else if (hostText.includes("1fichier")) host = "1fichier";
      else if (hostText.includes("mega")) host = "mega";
      else if (hostText.includes("mediafire")) host = "mediafire";
      else if (hostText.includes("katfile")) host = "katfile";
      else if (hostText.includes("drive")) host = "gdrive";
      else host = hostText || "unknown";

      // Normalize URL
      let fullUrl = href;
      if (href.startsWith("//")) fullUrl = `https:${href}`;
      else if (!href.startsWith("http")) fullUrl = `${BASE_URL}/${href}`;

      downloadLinks.push({ url: fullUrl, host });
    });

    // Also check for links with known host domains in href
    if (downloadLinks.length === 0) {
      $("a[href]").each((_, el) => {
        const href = $(el).attr("href") || "";
        let host = "";
        
        if (href.includes("gofile.io")) host = "gofile";
        else if (href.includes("bzzhr")) host = "buzzheavier";
        else if (href.includes("fileditch")) host = "fileditch";
        else if (href.includes("1fichier")) host = "1fichier";
        else if (href.includes("mega.nz") || href.includes("mega.co")) host = "mega";
        else if (href.includes("mediafire")) host = "mediafire";
        else if (href.includes("katfile")) host = "katfile";

        if (host) {
          let fullUrl = href;
          if (href.startsWith("//")) fullUrl = `https:${href}`;
          downloadLinks.push({ url: fullUrl, host });
        }
      });
    }

    const slug = slugify(title);
    const yearStr = gameInfo["year"] || gameInfo["release year"];
    const year = yearStr ? parseInt(yearStr) : undefined;

    return {
      title,
      slug,
      url,
      coverImage,
      year: year && !isNaN(year) ? year : undefined,
      fileSize: gameInfo["game size"] || gameInfo["size"],
      genre: gameInfo["genre"],
      developer: gameInfo["developer"],
      publisher: gameInfo["publisher"],
      description: descriptionParts.join("\n\n"),
      version: gameInfo["version"],
      platform: gameInfo["platform"] || "PC",
      systemRequirements,
      downloadLinks,
    };
  } catch (error) {
    console.error(`Error scraping SteamRip detail ${url}:`, error);
    return null;
  }
}

/**
 * Scrape multiple pages from SteamRip
 */
export async function scrapeSteamRipPages(
  maxPages: number = 3
): Promise<SteamRipListItem[]> {
  const allGames: SteamRipListItem[] = [];

  for (let page = 1; page <= maxPages; page++) {
    console.log(`Scraping SteamRip page ${page}...`);
    const games = await scrapeSteamRipList(page);
    allGames.push(...games);
    console.log(`Found ${games.length} games on page ${page}`);
    if (page < maxPages) await sleep(DELAY_MS);
  }

  return allGames;
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  scrapeSteamRipList,
  scrapeSteamRipDetail,
} from "@/lib/scraping/steamrip";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, url, page } = body;

    switch (action) {
      case "list": {
        // Scrape listing page
        const games = await scrapeSteamRipList(page || 1);
        return NextResponse.json({ success: true, count: games.length, games });
      }

      case "detail": {
        // Scrape single game detail
        if (!url) {
          return NextResponse.json(
            { success: false, error: "URL is required" },
            { status: 400 }
          );
        }
        const game = await scrapeSteamRipDetail(url);
        if (!game) {
          return NextResponse.json(
            { success: false, error: "Failed to scrape game" },
            { status: 404 }
          );
        }
        return NextResponse.json({ success: true, game });
      }

      case "seed-game": {
        // Scrape a game and add to database
        if (!url) {
          return NextResponse.json(
            { success: false, error: "URL is required" },
            { status: 400 }
          );
        }
        const scraped = await scrapeSteamRipDetail(url);
        if (!scraped) {
          return NextResponse.json(
            { success: false, error: "Failed to scrape game" },
            { status: 404 }
          );
        }

        // Check if game already exists
        const existing = await db.game.findUnique({
          where: { slug: scraped.slug },
        });

        if (existing) {
          // Update cover image if missing
          if (!existing.coverImage && scraped.coverImage) {
            await db.game.update({
              where: { id: existing.id },
              data: { coverImage: scraped.coverImage },
            });
          }

          // Add download links
          for (const link of scraped.downloadLinks) {
            const existingLink = await db.downloadLink.findFirst({
              where: { gameId: existing.id, url: link.url },
            });
            if (!existingLink) {
              await db.downloadLink.create({
                data: {
                  gameId: existing.id,
                  linkType: "direct",
                  url: link.url,
                  host: link.host,
                  isActive: true,
                },
              });
            }
          }

          return NextResponse.json({
            success: true,
            action: "updated",
            game: {
              id: existing.id,
              title: existing.title,
              linksAdded: scraped.downloadLinks.length,
            },
          });
        }

        // Create new game
        const newGame = await db.game.create({
          data: {
            title: scraped.title,
            slug: scraped.slug,
            description: scraped.description,
            platform: scraped.platform?.toLowerCase() || "pc",
            genre: scraped.genre,
            releaseYear: scraped.year,
            developer: scraped.developer,
            publisher: scraped.publisher,
            coverImage: scraped.coverImage,
            fileSize: scraped.fileSize,
            systemRequirements: scraped.systemRequirements || {},
            status: "active",
            source: "steamrip",
          },
        });

        // Add download links
        for (const link of scraped.downloadLinks) {
          await db.downloadLink.create({
            data: {
              gameId: newGame.id,
              linkType: "direct",
              url: link.url,
              host: link.host,
              isActive: true,
            },
          });
        }

        return NextResponse.json({
          success: true,
          action: "created",
          game: {
            id: newGame.id,
            title: newGame.title,
            linksAdded: scraped.downloadLinks.length,
          },
        });
      }

      case "seed-existing": {
        // Match scraped games to existing games by title similarity
        const games = await db.game.findMany({
          where: { source: { not: "steamrip" } },
          select: { id: true, title: true, slug: true, coverImage: true },
        });

        const results: string[] = [];

        for (const game of games) {
          // Search SteamRip for this game
          const searchUrl = `https://steamrip.com/?s=${encodeURIComponent(game.title)}`;
          const list = await scrapeSteamRipList(1);

          if (list.length > 0) {
            // Take first result
            const match = list[0];
            const detail = await scrapeSteamRipDetail(match.url);

            if (detail) {
              // Update game with SteamRip data
              await db.game.update({
                where: { id: game.id },
                data: {
                  coverImage: game.coverImage || detail.coverImage,
                  fileSize: detail.fileSize || undefined,
                  source: "steamrip",
                },
              });

              // Add download links
              let linksAdded = 0;
              for (const link of detail.downloadLinks) {
                const existing = await db.downloadLink.findFirst({
                  where: { gameId: game.id, url: link.url },
                });
                if (!existing) {
                  await db.downloadLink.create({
                    data: {
                      gameId: game.id,
                      linkType: "direct",
                      url: link.url,
                      host: link.host,
                      isActive: true,
                    },
                  });
                  linksAdded++;
                }
              }

              results.push(`${game.title}: updated, ${linksAdded} links`);
            } else {
              results.push(`${game.title}: no detail found`);
            }
          } else {
            results.push(`${game.title}: not found on SteamRip`);
          }
        }

        return NextResponse.json({ success: true, results });
      }

      default:
        return NextResponse.json(
          { success: false, error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Scrape API error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

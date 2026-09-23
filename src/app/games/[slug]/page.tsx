import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import {
  Star,
  Download,
  Monitor,
  Calendar,
  Building2,
  Globe,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { Decimal } from "@prisma/client/runtime/library";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

const platformLabels: Record<string, string> = {
  pc: "PC",
  ps1: "PlayStation 1",
  ps2: "PlayStation 2",
  ps3: "PlayStation 3",
  ps4: "PlayStation 4",
  ps5: "PlayStation 5",
  n64: "Nintendo 64",
  gamecube: "GameCube",
  wii: "Wii",
  wiiu: "Wii U",
  switch: "Nintendo Switch",
  genesis: "Sega Genesis",
  snes: "Super Nintendo",
  nes: "Nintendo",
  gb: "Game Boy",
  gba: "Game Boy Advance",
  ds: "Nintendo DS",
  "3ds": "Nintendo 3DS",
  xbox: "Xbox",
  xbox360: "Xbox 360",
  xboxone: "Xbox One",
  xboxseries: "Xbox Series",
};

export default async function GamePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let game: any = null;
  try {
    game = await db.game.findUnique({
      where: { slug },
      include: {
        downloadLinks: true,
      },
    });
  } catch (error) {
    console.error("Database error:", error);
    notFound();
  }

  if (!game) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Link
        href="/games"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Games
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="relative aspect-video overflow-hidden rounded-lg bg-card">
            {game.coverImage ? (
              <img
                src={game.coverImage}
                alt={game.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Monitor className="h-24 w-24 text-muted-foreground/30" />
              </div>
            )}
          </div>

          <div>
            <h1 className="text-3xl font-bold">{game.title}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <span className="inline-flex items-center rounded-md bg-accent/10 px-2.5 py-1 text-sm font-medium text-accent">
                {platformLabels[game.platform] || game.platform.toUpperCase()}
              </span>
              {game.genre && (
                <span className="inline-flex items-center rounded-md bg-card px-2.5 py-1 text-sm font-medium text-muted-foreground border border-border">
                  {game.genre}
                </span>
              )}
              {game.releaseYear && (
                <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {game.releaseYear}
                </span>
              )}
            </div>
          </div>

          {game.description && (
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="text-lg font-semibold mb-3">About</h2>
              <p className="text-muted-foreground leading-relaxed">
                {game.description}
              </p>
            </div>
          )}

          {game.systemRequirements && (
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="text-lg font-semibold mb-3">
                System Requirements
              </h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {Object.entries(
                  game.systemRequirements as Record<string, string>
                ).map(([key, value]) => (
                  <div key={key}>
                    <span className="text-muted-foreground">{key}: </span>
                    <span>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <h2 className="text-lg font-semibold">Download</h2>

            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-accent text-accent" />
                <span className="font-medium">
                  {Number(game.rating) > 0 ? Number(game.rating).toFixed(1) : "N/A"}
                </span>
                <span className="text-muted-foreground">
                  ({game.totalRatings} ratings)
                </span>
              </div>
              {game.fileSize && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Download className="h-4 w-4" />
                  {game.fileSize}
                </div>
              )}
            </div>

            {game.downloadLinks.length > 0 ? (
              <div className="space-y-2">
                {game.downloadLinks
                  .filter((link: { isActive: boolean }) => link.isActive)
                  .map((link: { id: string; url: string; host?: string; fileSize?: string; password?: string | null }) => (
                    <a
                      key={link.id}
                      href={`/download/${link.id}`}
                      className="flex items-center justify-between rounded-lg border border-border p-3 hover:border-accent hover:bg-accent/5 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <ExternalLink className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          {link.host || "Download"}
                        </span>
                        {(link.host === "hshop" || link.host === "filecrypt") && (
                          <span className="text-xs text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded">
                            captcha
                          </span>
                        )}
                        {link.password && (
                          <span className="text-xs text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded">
                            PW: {link.password}
                          </span>
                        )}
                      </div>
                      {link.fileSize && (
                        <span className="text-xs text-muted-foreground">
                          {link.fileSize}
                        </span>
                      )}
                    </a>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No download links available yet.
              </p>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <h2 className="text-lg font-semibold">Details</h2>
            <dl className="space-y-3 text-sm">
              {game.developer && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    Developer
                  </dt>
                  <dd>{game.developer}</dd>
                </div>
              )}
              {game.publisher && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground flex items-center gap-1">
                    <Globe className="h-4 w-4" />
                    Publisher
                  </dt>
                  <dd>{game.publisher}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground flex items-center gap-1">
                  <Monitor className="h-4 w-4" />
                  Platform
                </dt>
                <dd>
                  {platformLabels[game.platform] ||
                    game.platform.toUpperCase()}
                </dd>
              </div>
              {game.source && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Source</dt>
                  <dd className="capitalize">{game.source}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

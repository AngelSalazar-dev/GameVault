import { db } from "@/lib/db";
import { Download, ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function fetchWithReferrer(url: string, referrer: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Referer": referrer,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) return res.url;
    return null;
  } catch {
    return null;
  }
}

export default async function DownloadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const link = await db.downloadLink.findUnique({
    where: { id },
    include: { game: { select: { title: true, slug: true, coverImage: true } } },
  });

  if (!link || !link.isActive) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Link no disponible</h1>
          <p className="text-muted-foreground">Este enlace ya no existe o fue desactivado.</p>
          <Link href="/" className="inline-flex items-center gap-2 text-accent hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  const host = link.host?.toLowerCase() || "";
  let redirectUrl = link.url;
  let method = "direct";

  // MegaDB: try fetching server-side with SteamRip referrer
  if (host === "megadb") {
    method = "server-fetch-megadb";
    const resolved = await fetchWithReferrer(link.url, "https://steamrip.com/");
    if (resolved) {
      redirectUrl = resolved;
    }
  }

  // bzzhr: try fetching server-side with SteamRip referrer
  if (host === "bzzhr" || host === "buzzheavier") {
    method = "server-fetch-bzzhr";
    const resolved = await fetchWithReferrer(link.url, "https://steamrip.com/");
    if (resolved) {
      redirectUrl = resolved;
    }
  }

  return (
    <html>
      <head>
        <title>Descargando {link.game.title}...</title>
        <script dangerouslySetInnerHTML={{ __html: `
          window.onload = function() {
            window.location.href = ${JSON.stringify(redirectUrl)};
          }
        `}} />
      </head>
      <body className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
        <div className="text-center space-y-6 max-w-md mx-auto px-4">
          {link.game.coverImage && (
            <img
              src={link.game.coverImage}
              alt={link.game.title}
              className="w-32 h-44 object-cover rounded-lg mx-auto shadow-lg shadow-accent/10"
            />
          )}
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-white">{link.game.title}</h1>
            <p className="text-gray-400 text-sm">
              Descargando desde <span className="text-accent font-medium">{link.host || "servidor"}</span>
              {link.fileSize && <span className="text-gray-500"> &middot; {link.fileSize}</span>}
            </p>
          </div>

          <div className="flex flex-col items-center gap-3">
            <div className="animate-pulse flex items-center gap-2 text-accent">
              <Download className="h-5 w-5" />
              <span>Iniciando descarga...</span>
            </div>
            <p className="text-gray-500 text-xs">
              Si la descarga no inicia,{" "}
              <a href={redirectUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline inline-flex items-center gap-1">
                haz clic aqu&iacute; <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>

          <Link
            href={`/games/${link.game.slug}`}
            className="inline-flex items-center gap-2 text-gray-500 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al juego
          </Link>
        </div>
      </body>
    </html>
  );
}

import { db } from "@/lib/db";
import { ExternalLink, Download, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

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

  return (
    <html>
      <head>
        <meta name="referrer" content="no-referrer" />
        <title>Descargando {link.game.title}...</title>
        <script dangerouslySetInnerHTML={{ __html: `
          window.onload = function() {
            window.location.href = ${JSON.stringify(link.url)};
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
              <a href={link.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                haz clic aqu&iacute;
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

import { db } from "@/lib/db";
import { Download, ArrowLeft, ExternalLink, ArrowRight } from "lucide-react";
import Link from "next/link";
import CoverImage from "@/components/games/CoverImage";

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

  const host = link.host?.toLowerCase() || "";

  // hShop: show page URL — user completes Turnstile captcha on hShop
  if (host === "hshop") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] px-4">
        <div className="text-center space-y-6 max-w-md mx-auto">
          <CoverImage
            src={link.game.coverImage}
            alt={link.game.title}
            className="w-32 h-44 object-cover rounded-lg mx-auto shadow-lg shadow-accent/10"
            iconClassName="h-10 w-10"
          />
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-white">{link.game.title}</h1>
            <p className="text-gray-400 text-sm">
              Descarga disponible en <span className="text-accent font-medium">hShop</span>
              {link.fileSize && <span className="text-gray-500"> &middot; {link.fileSize}</span>}
            </p>
          </div>

          <div className="rounded-lg border border-accent/20 bg-accent/5 p-4 space-y-3">
            <p className="text-sm text-gray-300">
              Para descargar, abre la p&aacute;gina de hShop y completa la verificaci&oacute;n de seguridad (captcha). Despu&eacute;s ver&aacute;s el bot&oacute;n de descarga directa (.cia).
            </p>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-background hover:bg-accent-hover transition-colors"
            >
              Abrir hShop
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          <Link
            href={`/games/${link.game.slug}`}
            className="inline-flex items-center gap-2 text-gray-500 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al juego
          </Link>
        </div>
      </div>
    );
  }

  // Filecrypt: show URL + password for manual captcha solving
  if (host === "filecrypt") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] px-4">
        <div className="text-center space-y-6 max-w-md mx-auto">
          <CoverImage
            src={link.game.coverImage}
            alt={link.game.title}
            className="w-32 h-44 object-cover rounded-lg mx-auto shadow-lg shadow-accent/10"
            iconClassName="h-10 w-10"
          />
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-white">{link.game.title}</h1>
            <p className="text-gray-400 text-sm">
              Descarga disponible en <span className="text-accent font-medium">filecrypt.cc</span>
              {link.fileSize && <span className="text-gray-500"> &middot; {link.fileSize}</span>}
            </p>
          </div>

          {link.password && (
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
              <p className="text-sm text-yellow-400">
                <span className="font-bold">Contrase&ntilde;a:</span>{" "}
                <code className="bg-yellow-500/10 px-2 py-0.5 rounded text-yellow-300 font-mono">
                  {link.password}
                </code>
              </p>
            </div>
          )}

          <div className="rounded-lg border border-accent/20 bg-accent/5 p-4 space-y-3">
            <p className="text-sm text-gray-300">
              Para descargar, necesitas abrir el enlace de filecrypt.cc y resolver el captcha de verificaci&oacute;n.
            </p>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-background hover:bg-accent-hover transition-colors"
            >
              Abrir filecrypt.cc
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          <Link
            href={`/games/${link.game.slug}`}
            className="inline-flex items-center gap-2 text-gray-500 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al juego
          </Link>
        </div>
      </div>
    );
  }

  // MegaDB: redirect to SteamRip page (MegaDB requires SteamRip referrer)
  if (host === "megadb") {
    const steamripUrl = `https://steamrip.com/${link.game.slug}-free-download/`;

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] px-4">
        <div className="text-center space-y-6 max-w-md mx-auto">
          <CoverImage
            src={link.game.coverImage}
            alt={link.game.title}
            className="w-32 h-44 object-cover rounded-lg mx-auto shadow-lg shadow-accent/10"
            iconClassName="h-10 w-10"
          />
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-white">{link.game.title}</h1>
            <p className="text-gray-400 text-sm">
              Descarga disponible en <span className="text-accent font-medium">{link.host}</span>
              {link.fileSize && <span className="text-gray-500"> &middot; {link.fileSize}</span>}
            </p>
          </div>

          <div className="rounded-lg border border-accent/20 bg-accent/5 p-4 space-y-3">
            <p className="text-sm text-gray-300">
              Para descargar, ser&aacute;s redirigido a la p&aacute;gina oficial donde podr&aacute;s elegir el enlace de descarga.
            </p>
            <a
              href={steamripUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-background hover:bg-accent-hover transition-colors"
            >
              Ir a SteamRip
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          <Link
            href={`/games/${link.game.slug}`}
            className="inline-flex items-center gap-2 text-gray-500 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al juego
          </Link>
        </div>
      </div>
    );
  }

  // Other hosts: direct redirect
  return (
    <html>
      <head>
        <title>Descargando {link.game.title}...</title>
        <script dangerouslySetInnerHTML={{ __html: `
          window.onload = function() {
            window.location.href = ${JSON.stringify(link.url)};
          }
        `}} />
      </head>
      <body className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
        <div className="text-center space-y-6 max-w-md mx-auto px-4">
          <CoverImage
            src={link.game.coverImage}
            alt={link.game.title}
            className="w-32 h-44 object-cover rounded-lg mx-auto shadow-lg shadow-accent/10"
            iconClassName="h-10 w-10"
          />
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
              <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline inline-flex items-center gap-1">
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

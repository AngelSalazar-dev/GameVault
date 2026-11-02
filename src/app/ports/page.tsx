import Link from "next/link";
import { db } from "@/lib/db";
import { Monitor, Globe } from "lucide-react";

export const dynamic = "force-dynamic";

async function getPorts() {
  try {
    const ports = await db.game.findMany({
      where: { status: "active", platform: "browser" },
      select: { slug: true, title: true, coverImage: true, releaseYear: true },
      orderBy: { title: "asc" },
      take: 100,
    });
    return ports.map((p) => ({ ...p, coverImage: p.coverImage ?? undefined, releaseYear: p.releaseYear ?? undefined }));
  } catch (error) {
    console.error("Ports DB error:", error);
    return [];
  }
}

export default async function PortsPage() {
  const ports = await getPorts();
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Ports in Browser</h1>
        <p className="text-muted-foreground">Classic games ported to run in your browser. No download required.</p>
      </div>
      <section className="space-y-4">
        <h2 className="text-xl font-bold">Browser Ports</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {ports.length > 0 ? (
            ports.map((port) => (
              <Link key={port.slug} href={`/ports/${port.slug}`} className="group rounded-xl border border-border bg-card overflow-hidden hover:border-accent hover:shadow-lg transition-all">
                <div className="aspect-[4/5] overflow-hidden bg-gradient-to-br from-blue-500/20 to-cyan-500/20 relative">
                  {port.coverImage ? (
                    <img src={port.coverImage} alt={port.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Monitor className="h-12 w-12 text-muted-foreground/50" /></div>
                  )}
                </div>
                <div className="p-3 space-y-1">
                  <h3 className="font-semibold text-sm leading-tight group-hover:text-accent transition-colors line-clamp-2">{port.title}</h3>
                  {port.releaseYear && <span className="text-xs text-muted-foreground">{port.releaseYear}</span>}
                </div>
              </Link>
            ))
          ) : (
            <div className="col-span-full rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
              <Globe className="mx-auto h-10 w-10 mb-3 text-muted-foreground/40" />
              <p className="text-sm">No browser ports found.</p>
              <p className="text-xs mt-1">Run the scraper to import data from ported2browser.com.</p>
            </div>
          )}
        </div>
      </section>
      <section className="rounded-xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 p-6">
        <h3 className="font-bold text-lg mb-2">How it works</h3>
        <p className="text-sm text-muted-foreground mb-3">These are game ports compiled to WebAssembly or JavaScript, running directly in your browser without installation.</p>
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"><Monitor className="h-4 w-4" />Browse all games</Link>
      </section>
    </div>
  );
}

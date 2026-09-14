import Link from "next/link";
import { Gamepad2, HardDrive, BookOpen, Star, Download, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="space-y-16 py-8">
      <section className="mx-auto max-w-7xl px-4 text-center space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-sm text-accent">
          <Gamepad2 className="h-4 w-4" />
          Free Games Library
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
          Welcome to{" "}
          <span className="text-accent">GameVault</span>
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          Your ultimate vault for free PC games and classic console ROMs.
          Browse, download, and preserve gaming history.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/games"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-background hover:bg-accent-hover transition-colors"
          >
            Browse Games
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/platforms"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-semibold hover:bg-card transition-colors"
          >
            View Platforms
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-lg border border-border bg-card p-6 space-y-3">
            <div className="inline-flex rounded-lg bg-accent/10 p-3">
              <HardDrive className="h-6 w-6 text-accent" />
            </div>
            <h2 className="text-lg font-semibold">PC Games</h2>
            <p className="text-sm text-muted-foreground">
              Pre-installed PC games ready to play. No installation needed,
              just download and run.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-6 space-y-3">
            <div className="inline-flex rounded-lg bg-accent/10 p-3">
              <Gamepad2 className="h-6 w-6 text-accent" />
            </div>
            <h2 className="text-lg font-semibold">Console ROMs</h2>
            <p className="text-sm text-muted-foreground">
              Classic games from 34+ consoles. NES, SNES, PlayStation,
              Nintendo 64, and more.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-6 space-y-3">
            <div className="inline-flex rounded-lg bg-accent/10 p-3">
              <BookOpen className="h-6 w-6 text-accent" />
            </div>
            <h2 className="text-lg font-semibold">Manual Project</h2>
            <p className="text-sm text-muted-foreground">
              Full-color manual scans for thousands of games. Browse or
              contribute your own.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Recent Games</h2>
          <Link
            href="/games"
            className="text-sm text-accent hover:underline flex items-center gap-1"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="text-center py-16 rounded-lg border border-border bg-card">
          <p className="text-muted-foreground">
            Games will appear here once added to the vault.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 space-y-6">
        <h2 className="text-2xl font-bold">Supported Platforms</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {[
            "PC",
            "PS1",
            "PS2",
            "PS3",
            "PS4",
            "PS5",
            "N64",
            "GameCube",
            "Wii",
            "Switch",
            "Genesis",
            "SNES",
            "NES",
            "GB",
            "GBA",
            "DS",
            "3DS",
            "Xbox",
            "Xbox 360",
            "Xbox One",
          ].map((platform) => (
            <Link
              key={platform}
              href={`/platforms/${platform.toLowerCase().replace(/\s+/g, "")}`}
              className="rounded-lg border border-border bg-card p-3 text-center text-sm font-medium hover:border-accent hover:text-accent transition-colors"
            >
              {platform}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

import Link from "next/link";
import { Gamepad2 } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <Link href="/" className="flex items-center gap-2">
              <Gamepad2 className="h-6 w-6 text-accent" />
              <span className="text-lg font-bold">
                Game<span className="text-accent">Vault</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Your ultimate vault for free PC games and classic console ROMs.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Browse</h3>
            <nav className="flex flex-col gap-2">
              <Link
                href="/games"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                All Games
              </Link>
              <Link
                href="/platforms"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Platforms
              </Link>
              <Link
                href="/collections"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Collections
              </Link>
            </nav>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Community</h3>
            <nav className="flex flex-col gap-2">
              <Link
                href="/community"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Forum
              </Link>
              <Link
                href="/community/requests"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Request Games
              </Link>
            </nav>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Resources</h3>
            <nav className="flex flex-col gap-2">
              <Link
                href="/manuals"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Manual Project
              </Link>
            </nav>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-6 text-center text-sm text-muted-foreground">
          <p>GameVault - Preserving gaming history since 2026</p>
        </div>
      </div>
    </footer>
  );
}

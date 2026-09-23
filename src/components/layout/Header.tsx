"use client";

import Link from "next/link";
import { useState } from "react";
import { Search, Menu, X, Gamepad2, HardDrive, Grid3X3, Home, MessageSquare } from "lucide-react";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Gamepad2 className="h-8 w-8 text-accent" />
          <span className="text-xl font-bold">
            Game<span className="text-accent">Vault</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home className="h-4 w-4" />
            Home
          </Link>
          <Link
            href="/games"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <HardDrive className="h-4 w-4" />
            Games
          </Link>
          <Link
            href="/categories"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Grid3X3 className="h-4 w-4" />
            Categories
          </Link>
          <Link
            href="/platforms"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Platforms
          </Link>
          <Link
            href="/community"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
            Community
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/games"
            className="hidden sm:flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground hover:border-accent hover:text-accent transition-colors"
          >
            <Search className="h-4 w-4" />
            Search games...
          </Link>

          <button
            className="md:hidden p-2 text-muted-foreground hover:text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <nav className="flex flex-col p-4 gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-card transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Home className="h-4 w-4" />
              Home
            </Link>
            <Link
              href="/games"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-card transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              <HardDrive className="h-4 w-4" />
              Games
            </Link>
            <Link
              href="/categories"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-card transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Grid3X3 className="h-4 w-4" />
              Categories
            </Link>
            <Link
              href="/platforms"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-card transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Platforms
            </Link>
            <Link
              href="/community"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-card transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              <MessageSquare className="h-4 w-4" />
              Community
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

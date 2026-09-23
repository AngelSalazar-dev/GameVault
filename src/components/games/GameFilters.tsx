"use client";

import { useState } from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

interface GameFiltersProps {
  platforms: string[];
  genres: string[];
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

export default function GameFilters({ platforms, genres }: GameFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);

  const currentSearch = searchParams.get("search") || "";
  const currentPlatform = searchParams.get("platform") || "";
  const currentGenre = searchParams.get("genre") || "";
  const currentSort = searchParams.get("sort") || "newest";

  const updateParams = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/games?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search games..."
            defaultValue={currentSearch}
            onChange={(e) => updateParams("search", e.target.value)}
            className="w-full rounded-lg border border-border bg-card pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
          {currentSearch && (
            <button
              onClick={() => updateParams("search", "")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors ${
            showFilters || currentPlatform || currentGenre
              ? "border-accent bg-accent/10 text-accent"
              : "border-border bg-card text-muted-foreground hover:text-foreground"
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </button>
      </div>

      {showFilters && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Platform</label>
              <select
                value={currentPlatform}
                onChange={(e) => updateParams("platform", e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-accent"
              >
                <option value="">All Platforms</option>
                {platforms.map((p) => (
                  <option key={p} value={p}>
                    {platformLabels[p] || p.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Genre</label>
              <select
                value={currentGenre}
                onChange={(e) => updateParams("genre", e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-accent"
              >
                <option value="">All Genres</option>
                {genres.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Sort By</label>
              <select
                value={currentSort}
                onChange={(e) => updateParams("sort", e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-accent"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="rating">Highest Rated</option>
                <option value="title">A-Z</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {(currentPlatform || currentGenre) && (
        <div className="flex flex-wrap items-center gap-2">
          {currentPlatform && (
            <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs text-accent">
              {platformLabels[currentPlatform] || currentPlatform.toUpperCase()}
              <button
                onClick={() => updateParams("platform", "")}
                aria-label="Remove platform filter"
                className="hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {currentGenre && (
            <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs text-accent">
              {currentGenre}
              <button
                onClick={() => updateParams("genre", "")}
                aria-label="Remove genre filter"
                className="hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          <button
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.delete("platform");
              params.delete("genre");
              router.push(`/games?${params.toString()}`);
            }}
            className="text-xs text-muted-foreground hover:text-accent hover:underline"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

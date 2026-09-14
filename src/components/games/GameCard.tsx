"use client";

import Link from "next/link";
import { Star, Download, Monitor, Gamepad2 } from "lucide-react";

interface GameCardProps {
  id: string;
  title: string;
  slug: string;
  platform: string;
  coverImage?: string;
  rating: number;
  fileSize?: string;
  releaseYear?: number;
}

const platformColors: Record<string, string> = {
  pc: "bg-blue-500/20 text-blue-400",
  ps1: "bg-gray-500/20 text-gray-400",
  ps2: "bg-gray-500/20 text-gray-400",
  ps3: "bg-blue-500/20 text-blue-400",
  ps4: "bg-blue-600/20 text-blue-500",
  ps5: "bg-blue-700/20 text-blue-600",
  n64: "bg-red-500/20 text-red-400",
  gamecube: "bg-purple-500/20 text-purple-400",
  wii: "bg-blue-400/20 text-blue-300",
  wiiu: "bg-blue-400/20 text-blue-300",
  switch: "bg-red-600/20 text-red-500",
  genesis: "bg-blue-800/20 text-blue-700",
  snes: "bg-purple-600/20 text-purple-500",
  nes: "bg-red-600/20 text-red-500",
  gb: "bg-green-500/20 text-green-400",
  gba: "bg-purple-500/20 text-purple-400",
  ds: "bg-gray-500/20 text-gray-400",
  "3ds": "bg-red-500/20 text-red-400",
  xbox: "bg-green-600/20 text-green-500",
  xbox360: "bg-green-500/20 text-green-400",
  xboxone: "bg-green-600/20 text-green-500",
  xboxseries: "bg-green-700/20 text-green-600",
};

export default function GameCard({
  title,
  slug,
  platform,
  coverImage,
  rating,
  fileSize,
  releaseYear,
}: GameCardProps) {
  return (
    <Link href={`/games/${slug}`} className="group">
      <div className="relative overflow-hidden rounded-lg border border-border bg-card transition-all hover:border-accent hover:shadow-lg hover:shadow-accent/10">
        <div className="aspect-[3/4] relative overflow-hidden bg-muted">
          {coverImage ? (
            <img
              src={coverImage}
              alt={title}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Gamepad2 className="h-12 w-12 text-muted-foreground/30" />
            </div>
          )}
          <div className="absolute top-2 right-2">
            <span
              className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${platformColors[platform] || "bg-gray-500/20 text-gray-400"}`}
            >
              {platform.toUpperCase()}
            </span>
          </div>
        </div>
        <div className="p-3 space-y-2">
          <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-accent transition-colors">
            {title}
          </h3>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-accent text-accent" />
              <span>{rating > 0 ? rating.toFixed(1) : "N/A"}</span>
            </div>
            {fileSize && (
              <div className="flex items-center gap-1">
                <Download className="h-3 w-3" />
                <span>{fileSize}</span>
              </div>
            )}
          </div>
          {releaseYear && (
            <div className="text-xs text-muted-foreground">
              {releaseYear}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

"use client";

import Link from "next/link";
import { Star, Download } from "lucide-react";
import CoverImage from "./CoverImage";
import PlatformBadge from "./PlatformBadge";

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
          <CoverImage
            src={coverImage}
            alt={title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            iconClassName="h-12 w-12"
          />
          <div className="absolute top-2 right-2">
            <PlatformBadge platform={platform} />
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

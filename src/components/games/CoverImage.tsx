"use client";

import { useState } from "react";
import { Gamepad2 } from "lucide-react";

interface CoverImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  iconClassName?: string;
}

export default function CoverImage({
  src,
  alt,
  className = "",
  iconClassName = "h-8 w-8",
}: CoverImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = !src || failedSrc === src;

  if (failed) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-card to-card-hover ${className}`}
        role="img"
        aria-label={alt}
      >
        <Gamepad2 className={`${iconClassName} text-muted-foreground/30`} />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- external cover URLs need plain img + onError fallback
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailedSrc(src)}
    />
  );
}

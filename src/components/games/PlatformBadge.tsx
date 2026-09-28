import { Gamepad2, Monitor } from "lucide-react";
import {
  getPlatformKind,
  getPlatformLabel,
  getPlatformShort,
} from "@/lib/constants";

interface PlatformBadgeProps {
  platform: string;
  variant?: "sm" | "md";
  className?: string;
}

export default function PlatformBadge({
  platform,
  variant = "sm",
  className = "",
}: PlatformBadgeProps) {
  const isPc = getPlatformKind(platform) === "pc";
  const Icon = isPc ? Monitor : Gamepad2;

  const label =
    variant === "md"
      ? isPc
        ? "PC Game"
        : `ROM · ${getPlatformLabel(platform)}`
      : isPc
        ? "PC"
        : `ROM · ${getPlatformShort(platform)}`;

  const title = isPc
    ? `PC game — ${getPlatformLabel(platform)}`
    : `ROM — ${getPlatformLabel(platform)}`;

  const tone = isPc
    ? "bg-accent/15 text-accent border-accent/25"
    : "bg-purple-500/15 text-purple-300 border-purple-500/25";

  const sizing =
    variant === "md"
      ? "gap-1.5 px-2.5 py-1 text-sm [&_svg]:h-4 [&_svg]:w-4"
      : "gap-1 px-1.5 py-0.5 text-[10px] [&_svg]:h-3 [&_svg]:w-3";

  return (
    <span
      title={title}
      className={`inline-flex items-center rounded border font-medium backdrop-blur-sm ${tone} ${sizing} ${className}`}
    >
      <Icon aria-hidden />
      {label}
    </span>
  );
}

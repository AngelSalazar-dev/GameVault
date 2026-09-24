import type { DownloadLink } from "@prisma/client";

const SHORTENER_HOSTS = [
  "tpi.li",
  "oii.la",
  "shrinkme.click",
  "shrinkme.io",
  "srnky.com",
  "clksz.com",
  "bit.ly",
  "tinyurl.com",
  "adf.ly",
  "ouo.io",
  "linkvertise.com",
  "cuty.io",
];

const FRICTION_HOSTS = ["filecrypt", "hshop", "megadb"];

const TRUSTED_HOSTS = [
  "mega.nz",
  "mega.co",
  "mediafire.com",
  "gofile.io",
  "1fichier.com",
  "fileditch.com",
  "drive.google.com",
  "docs.google.com",
  "bzzhr",
  "buzzheavier",
  "datanodes",
  "filekeeper",
  "vimm.net",
  "archive.org",
];

const FILE_EXTENSIONS = /\.(zip|rar|7z|iso|cia|nsp|xci|wbfs|pkg|exe|dmg|apk|torrent)(\?|#|$)/i;

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isShortener(url: string, hostField: string | null): boolean {
  const host = hostnameOf(url);
  const label = (hostField || "").toLowerCase();
  return SHORTENER_HOSTS.some(
    (s) => host === s || host.endsWith(`.${s}`) || label === s
  );
}

function isFrictionHost(hostField: string | null, url: string): boolean {
  const label = (hostField || "").toLowerCase();
  const host = hostnameOf(url);
  return FRICTION_HOSTS.some(
    (f) => label === f || label.includes(f) || host.includes(f)
  );
}

function isTrustedOrDirectFile(url: string, hostField: string | null): boolean {
  const host = hostnameOf(url);
  const label = (hostField || "").toLowerCase();
  if (
    TRUSTED_HOSTS.some(
      (t) => host === t || host.endsWith(`.${t}`) || label === t || label.includes(t)
    )
  ) {
    return true;
  }
  return FILE_EXTENSIONS.test(url);
}

export function isRecommendedLink(link: Pick<DownloadLink, "isActive" | "linkType" | "url" | "host">): boolean {
  if (!link.isActive) return false;
  if (link.linkType !== "direct") return false;
  if (isShortener(link.url, link.host)) return false;
  if (isFrictionHost(link.host, link.url)) return false;
  return isTrustedOrDirectFile(link.url, link.host);
}

export function pickRecommendedId(links: DownloadLink[]): string | null {
  const active = links.filter((l) => l.isActive);
  const recommended = active.find(isRecommendedLink);
  return recommended?.id ?? null;
}

export function sortLinksWithRecommendedFirst(links: DownloadLink[]): DownloadLink[] {
  const recommendedId = pickRecommendedId(links);
  if (!recommendedId) return links;
  const recommended = links.filter((l) => l.id === recommendedId);
  const rest = links.filter((l) => l.id !== recommendedId);
  return [...recommended, ...rest];
}

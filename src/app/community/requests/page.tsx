import { db } from "@/lib/db";
import { ClipboardList } from "lucide-react";
import NewRequestForm from "@/components/community/NewRequestForm";
import VoteButton from "@/components/community/VoteButton";
import { PLATFORM_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  q?: string;
  status?: string;
  sort?: string;
  page?: string;
}>;

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "rejected", label: "Rejected" },
];

const SORT_OPTIONS = [
  { value: "votes", label: "Most votes" },
  { value: "recent", label: "Most recent" },
];

function buildPageUrl(params: { q?: string; status?: string; sort?: string; page?: number }): string {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.status) search.set("status", params.status);
  if (params.sort && params.sort !== "votes") search.set("sort", params.sort);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const qs = search.toString();
  return qs ? `?${qs}` : "?";
}

async function getRequests(q: string, status: string, sort: string, page: number) {
  try {
    const where: Record<string, unknown> = {};
    if (q) where.title = { contains: q };
    if (status && ["pending", "fulfilled", "rejected"].includes(status)) {
      where.status = status;
    }

    const pageSize = 20;
    const orderBy =
      sort === "recent" ? [{ createdAt: "desc" as const }] : [{ votes: "desc" as const }, { createdAt: "desc" as const }];

    const [total, requests] = await Promise.all([
      db.request.count({ where }),
      db.request.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { requests, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  } catch (error) {
    console.error("Database error:", error);
    return { requests: [], total: 0, totalPages: 1 };
  }
}

export default async function RequestsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = (params.q || "").trim().slice(0, 80);
  const status = params.status || "";
  const sort = params.sort === "recent" ? "recent" : "votes";
  const pageRaw = Number.parseInt(params.page || "1", 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  const { requests, total, totalPages } = await getRequests(q, status, sort, page);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ClipboardList className="h-8 w-8 text-accent" />
            Game Requests
          </h1>
          <p className="text-muted-foreground">
            Request games you want to see in the vault
          </p>
        </div>
        <NewRequestForm />
      </div>

      <form
        method="GET"
        action="/community/requests"
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        <div className="flex-1">
          <label htmlFor="req-search" className="sr-only">
            Search requests
          </label>
          <input
            id="req-search"
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search requests..."
            maxLength={80}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </div>
        <div className="flex gap-3">
          <label htmlFor="req-status" className="sr-only">
            Filter by status
          </label>
          <select
            id="req-status"
            name="status"
            defaultValue={status}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <label htmlFor="req-sort" className="sr-only">
            Sort
          </label>
          <select
            id="req-sort"
            name="sort"
            defaultValue={sort}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm text-muted-foreground hover:border-accent hover:text-accent transition-colors"
          >
            Filter
          </button>
        </div>
      </form>

      {requests.length === 0 ? (
        <div className="text-center py-16 rounded-lg border border-border bg-card">
          <ClipboardList className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold">
            {q || status ? "No matching requests" : "No requests yet"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {q || status ? "Try different filters" : "Be the first to request a game"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <div
              key={request.id}
              className="rounded-lg border border-border bg-card p-4 flex items-start gap-4"
            >
              <VoteButton requestId={request.id} votes={request.votes} />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="font-semibold">{request.title}</h3>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium shrink-0 ${
                      request.status === "fulfilled"
                        ? "bg-green-500/20 text-green-400"
                        : request.status === "rejected"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-yellow-500/20 text-yellow-400"
                    }`}
                  >
                    {request.status}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {request.platform && (
                    <span className="inline-flex items-center rounded bg-background px-1.5 py-0.5 text-xs text-muted-foreground border border-border">
                      {PLATFORM_LABELS[request.platform] || request.platform}
                    </span>
                  )}
                  {request.authorName && (
                    <span className="text-xs text-muted-foreground">
                      by {request.authorName}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground/70">
                    {new Date(request.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                {request.description && (
                  <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap break-words">
                    {request.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-2 pt-2" aria-label="Pagination">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <a
              key={n}
              href={buildPageUrl({ q, status, sort, page: n })}
              className={`min-w-9 h-9 px-2 inline-flex items-center justify-center rounded-lg border text-sm transition-colors ${
                n === page
                  ? "border-accent bg-accent text-background font-semibold"
                  : "border-border text-muted-foreground hover:border-accent hover:text-accent"
              }`}
              aria-current={n === page ? "page" : undefined}
            >
              {n}
            </a>
          ))}
          <span className="text-xs text-muted-foreground ml-2">
            {total} request{total === 1 ? "" : "s"}
          </span>
        </nav>
      )}
    </div>
  );
}

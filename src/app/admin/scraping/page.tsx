import { db } from "@/lib/db";
import {
  Bot,
  Check,
  X,
  Clock,
  ExternalLink,
} from "lucide-react";

export const dynamic = "force-dynamic";

async function getScrapingQueue() {
  try {
    const queue = await db.scrapingQueue.findMany({
      orderBy: { createdAt: "desc" },
    });

    return queue;
  } catch (error) {
    console.error("Database error:", error);
    return [];
  }
}

export default async function ScrapingPage() {
  const queue = await getScrapingQueue();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Bot className="h-8 w-8 text-accent" />
          Scraping Queue
        </h1>
        <p className="text-muted-foreground">
          Review and approve scraped game suggestions
        </p>
      </div>

      {queue.length === 0 ? (
        <div className="text-center py-16 rounded-lg border border-border bg-card">
          <Bot className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Queue is empty</h3>
          <p className="text-sm text-muted-foreground mt-1">
            No pending items in the scraping queue
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {queue.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-border bg-card p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Source: {item.source}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        item.status === "pending"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : item.status === "approved"
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-accent hover:underline flex items-center gap-1"
                  >
                    {item.url.substring(0, 60)}...
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                {item.status === "pending" && (
                  <div className="flex items-center gap-2">
                    <button className="inline-flex items-center gap-1 rounded-lg bg-green-500/20 px-3 py-1.5 text-sm font-medium text-green-400 hover:bg-green-500/30 transition-colors">
                      <Check className="h-4 w-4" />
                      Approve
                    </button>
                    <button className="inline-flex items-center gap-1 rounded-lg bg-red-500/20 px-3 py-1.5 text-sm font-medium text-red-400 hover:bg-red-500/30 transition-colors">
                      <X className="h-4 w-4" />
                      Reject
                    </button>
                  </div>
                )}
              </div>
              {item.suggestedData && (
                <div className="rounded-lg bg-background p-3 text-sm">
                  <pre className="text-xs text-muted-foreground overflow-auto">
                    {JSON.stringify(item.suggestedData, null, 2)}
                  </pre>
                </div>
              )}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Added {new Date(item.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

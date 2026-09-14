import { db } from "@/lib/db";
import { ClipboardList, Plus, ArrowUp } from "lucide-react";

async function getRequests() {
  const requests = await db.request.findMany({
    orderBy: [{ votes: "desc" }, { createdAt: "desc" }],
  });

  return requests;
}

export default async function RequestsPage() {
  const requests = await getRequests();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ClipboardList className="h-8 w-8 text-accent" />
            Game Requests
          </h1>
          <p className="text-muted-foreground">
            Request games you want to see in the vault
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background hover:bg-accent-hover transition-colors">
          <Plus className="h-4 w-4" />
          New Request
        </button>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-16 rounded-lg border border-border bg-card">
          <ClipboardList className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold">No requests yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Be the first to request a game
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <div
              key={request.id}
              className="rounded-lg border border-border bg-card p-4 flex items-start gap-4"
            >
              <div className="flex flex-col items-center gap-1">
                <button className="p-1 text-muted-foreground hover:text-accent transition-colors">
                  <ArrowUp className="h-5 w-5" />
                </button>
                <span className="text-sm font-semibold">{request.votes}</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{request.title}</h3>
                {request.platform && (
                  <span className="inline-flex items-center rounded bg-card px-1.5 py-0.5 text-xs text-muted-foreground border border-border mt-1">
                    {request.platform}
                  </span>
                )}
                {request.description && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {request.description}
                  </p>
                )}
              </div>
              <span
                className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
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
          ))}
        </div>
      )}
    </div>
  );
}

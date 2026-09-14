import { MessageSquare, Plus } from "lucide-react";
import Link from "next/link";

export default function CommunityPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <MessageSquare className="h-8 w-8 text-accent" />
          Community
        </h1>
        <p className="text-muted-foreground">
          Join the conversation about games
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Game Discussions</h2>
          <p className="text-sm text-muted-foreground">
            Discuss your favorite games, share tips, and connect with other gamers.
          </p>
          <div className="text-center py-8 text-muted-foreground text-sm">
            Coming soon
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Game Requests</h2>
          <p className="text-sm text-muted-foreground">
            Request games you want to see added to the vault.
          </p>
          <Link
            href="/community/requests"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background hover:bg-accent-hover transition-colors"
          >
            <Plus className="h-4 w-4" />
            View Requests
          </Link>
        </div>
      </div>
    </div>
  );
}

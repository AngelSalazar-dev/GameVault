"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp } from "lucide-react";

interface VoteButtonProps {
  requestId: string;
  votes: number;
}

const VOTED_KEY = "gv_voted_requests";

function readVotedIds(): string[] {
  try {
    const raw = localStorage.getItem(VOTED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function hasVotedCookie(id: string): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((c) => c === `gv_v_${id}=1`);
}

function getVotedSnapshot(id: string): boolean {
  return hasVotedCookie(id) || readVotedIds().includes(id);
}

function subscribeVoted() {
  const onChange = () => {};
  window.addEventListener("storage", onChange);
  window.addEventListener("focus", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("focus", onChange);
  };
}

function rememberVote(id: string) {
  try {
    const ids = readVotedIds();
    if (!ids.includes(id)) {
      localStorage.setItem(VOTED_KEY, JSON.stringify([...ids, id]));
    }
  } catch {
    // localStorage unavailable
  }
}

export default function VoteButton({ requestId, votes }: VoteButtonProps) {
  const router = useRouter();
  const voted = useSyncExternalStore(
    subscribeVoted,
    () => getVotedSnapshot(requestId),
    () => false
  );
  const [count, setCount] = useState(votes);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleVote = useCallback(async () => {
    if (voted || loading) return;
    setLoading(true);
    setError(false);

    try {
      const res = await fetch(`/api/requests/${requestId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (res.ok) {
        const data = await res.json();
        setCount(data.votes);
        rememberVote(requestId);
        router.refresh();
      } else if (res.status === 409) {
        rememberVote(requestId);
        router.refresh();
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [voted, loading, requestId, router]);

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={handleVote}
        disabled={voted || loading}
        aria-label={voted ? "Already voted" : "Upvote request"}
        title={error ? "Vote failed, try again" : voted ? "Already voted" : "Upvote"}
        className={`p-1 transition-colors disabled:cursor-not-allowed ${
          voted
            ? "text-accent"
            : error
            ? "text-red-400 hover:text-red-300"
            : "text-muted-foreground hover:text-accent"
        }`}
      >
        <ArrowUp className="h-5 w-5" />
      </button>
      <span className={`text-sm font-semibold ${voted ? "text-accent" : ""}`}>{count}</span>
    </div>
  );
}

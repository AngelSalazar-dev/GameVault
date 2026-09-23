import { db } from "@/lib/db";
import { ClipboardList } from "lucide-react";
import AdminRequestsClient from "@/components/admin/AdminRequestsClient";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "rejected", label: "Rejected" },
];

type SearchParams = Promise<{ status?: string }>;

async function getRequests(status: string) {
  try {
    const where =
      status && ["pending", "fulfilled", "rejected"].includes(status)
        ? { status: status as "pending" | "fulfilled" | "rejected" }
        : {};

    const requests = await db.request.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        platform: true,
        description: true,
        authorName: true,
        status: true,
        votes: true,
        createdAt: true,
      },
    });

    return requests.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    }));
  } catch (error) {
    console.error("Database error:", error);
    return [];
  }
}

export default async function AdminRequestsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const status = params.status || "";
  const requests = await getRequests(status);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <ClipboardList className="h-8 w-8 text-accent" />
          Manage Requests
        </h1>
        <p className="text-muted-foreground">Update status or remove community requests</p>
      </div>

      <form method="GET" action="/admin/requests" className="flex items-center gap-3">
        <label htmlFor="admin-req-status" className="text-sm text-muted-foreground">
          Status
        </label>
        <select
          id="admin-req-status"
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
        <button
          type="submit"
          className="rounded-lg border border-border bg-card px-4 py-2 text-sm text-muted-foreground hover:border-accent hover:text-accent transition-colors"
        >
          Filter
        </button>
      </form>

      <AdminRequestsClient requests={requests} />
    </div>
  );
}

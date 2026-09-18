import { db } from "@/lib/db";
import AdminScrapingClient from "@/components/admin/AdminScrapingClient";

export const dynamic = "force-dynamic";

async function getScrapingQueue() {
  try {
    const queue = await db.scrapingQueue.findMany({
      orderBy: { createdAt: "desc" },
    });

    return queue.map(item => ({
      id: item.id,
      source: item.source,
      url: item.url,
      status: item.status,
      suggestedData: item.suggestedData as Record<string, unknown> | null,
      createdAt: item.createdAt.toISOString(),
    }));
  } catch (error) {
    console.error("Database error:", error);
    return [];
  }
}

export default async function ScrapingPage() {
  const items = await getScrapingQueue();
  return <AdminScrapingClient items={items} />;
}

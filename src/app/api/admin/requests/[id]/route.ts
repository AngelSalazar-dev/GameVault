import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { RequestStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { validateToken } from "@/lib/auth";

const ALLOWED_STATUSES: readonly RequestStatus[] = ["pending", "fulfilled", "rejected"];

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token) return null;
  return validateToken(token);
}

async function logAdminAction(
  adminId: string | undefined,
  action: string,
  details: string
) {
  try {
    await db.adminLog.create({
      data: {
        adminId: adminId || undefined,
        action,
        details,
      },
    });
  } catch {
    // audit log must not break the request
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json({ error: "Invalid content type" }, { status: 415 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const status = (body as Record<string, unknown>).status;
    if (typeof status !== "string" || !ALLOWED_STATUSES.includes(status as RequestStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    const nextStatus = status as RequestStatus;

    const existing = await db.request.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    await db.request.update({ where: { id }, data: { status: nextStatus } });
    await logAdminAction(admin.adminId, "request_status", `${id} -> ${nextStatus}`);

    return NextResponse.json({ ok: true, status: nextStatus });
  } catch (error) {
    console.error("Update request status error:", error);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await db.request.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    await db.request.delete({ where: { id } });
    await logAdminAction(admin.adminId, "request_delete", id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete request error:", error);
    return NextResponse.json({ error: "Failed to delete request" }, { status: 500 });
  }
}

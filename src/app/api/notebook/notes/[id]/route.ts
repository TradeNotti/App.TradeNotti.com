import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/account";
import { getNoteById, updateNote, deleteNote, isValidDate } from "@/lib/notebook";

export const dynamic = "force-dynamic";

// GET /api/notebook/notes/:id — a single page.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No user" }, { status: 404 });

  const note = await getNoteById(user.id, id);
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ note });
}

// PUT /api/notebook/notes/:id — save title/content.
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No user" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as {
    title?: string;
    content?: unknown;
    date?: string;
  };
  if (body.date !== undefined && !isValidDate(body.date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const note = await updateNote(user.id, id, {
    title: body.title,
    content: body.content as never,
    date: body.date,
  });
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ note });
}

// DELETE /api/notebook/notes/:id — remove a page.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No user" }, { status: 404 });

  await deleteNote(user.id, id);
  return NextResponse.json({ ok: true });
}

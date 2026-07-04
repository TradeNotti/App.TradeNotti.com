import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/account";
import { getUserTags, deleteUserTag } from "@/lib/tags";

export const dynamic = "force-dynamic";

// GET /api/tags — the user's reusable tag pool.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No user" }, { status: 404 });
  return NextResponse.json({ tags: await getUserTags(user.id) });
}

// DELETE /api/tags?name=Breakout — remove a tag from the user's pool.
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No user" }, { status: 404 });

  const name = new URL(req.url).searchParams.get("name")?.trim();
  if (!name) return NextResponse.json({ error: "Missing name" }, { status: 400 });

  await deleteUserTag(user.id, name);
  return NextResponse.json({ ok: true });
}

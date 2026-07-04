import { prisma } from "./db";

// All distinct tag names the user has used across their accounts' trades —
// the reusable suggestion pool.
export async function getUserTags(userId: string): Promise<string[]> {
  const tags = await prisma.tag.findMany({
    where: { trades: { some: { trade: { account: { userId } } } } },
    select: { name: true },
    orderBy: { name: "asc" },
  });
  return tags.map((t) => t.name);
}

// Remove a tag from the user's pool: unlink it from all of the user's trades,
// then delete the tag itself if nothing else references it (keeps it out of
// other users' data).
export async function deleteUserTag(userId: string, name: string): Promise<void> {
  const tag = await prisma.tag.findUnique({
    where: { name },
    select: { id: true },
  });
  if (!tag) return;

  await prisma.tagsOnTrades.deleteMany({
    where: { tagId: tag.id, trade: { account: { userId } } },
  });

  const remaining = await prisma.tagsOnTrades.count({ where: { tagId: tag.id } });
  if (remaining === 0) {
    await prisma.tag.delete({ where: { id: tag.id } });
  }
}

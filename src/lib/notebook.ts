import { prisma } from "./db";
import { Prisma } from "@prisma/client";

export interface NoteData {
  id: string;
  date: string;
  title: string;
  content: Prisma.JsonValue | null;
  updatedAt: string;
}

export interface NoteSummary {
  id: string;
  date: string;
  title: string;
  updatedAt: string;
}

export interface TemplateData {
  id: string;
  name: string;
  content: Prisma.JsonValue | null;
  updatedAt: string;
}

const VALID_DATE = /^\d{4}-\d{2}-\d{2}$/;
export const isValidDate = (d: string) => VALID_DATE.test(d);

function toNoteData(n: {
  id: string;
  date: string;
  title: string;
  content: Prisma.JsonValue | null;
  updatedAt: Date;
}): NoteData {
  return {
    id: n.id,
    date: n.date,
    title: n.title,
    content: n.content,
    updatedAt: n.updatedAt.toISOString(),
  };
}

/** A single note by id (scoped to the user). */
export async function getNoteById(
  userId: string,
  id: string,
): Promise<NoteData | null> {
  const note = await prisma.note.findFirst({ where: { id, userId } });
  return note ? toNoteData(note) : null;
}

/** All pages on a given day, newest first. */
export async function getNotesForDate(
  userId: string,
  date: string,
): Promise<NoteSummary[]> {
  const rows = await prisma.note.findMany({
    where: { userId, date },
    orderBy: { createdAt: "asc" },
    select: { id: true, date: true, title: true, updatedAt: true },
  });
  return rows.map((n) => ({
    id: n.id,
    date: n.date,
    title: n.title,
    updatedAt: n.updatedAt.toISOString(),
  }));
}

/** Create a new page on a day. */
export async function createNote(
  userId: string,
  date: string,
  data: { title?: string; content?: Prisma.InputJsonValue },
): Promise<NoteData> {
  const note = await prisma.note.create({
    data: {
      userId,
      date,
      title: data.title ?? "",
      ...(data.content !== undefined ? { content: data.content } : {}),
    },
  });
  return toNoteData(note);
}

/** Update an existing page by id — title, content, and/or which day it's on. */
export async function updateNote(
  userId: string,
  id: string,
  data: { title?: string; content?: Prisma.InputJsonValue | null; date?: string },
): Promise<NoteData | null> {
  const existing = await prisma.note.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) return null;

  const content =
    data.content === null
      ? Prisma.JsonNull
      : (data.content as Prisma.InputJsonValue | undefined);

  const note = await prisma.note.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(content !== undefined ? { content } : {}),
      ...(data.date !== undefined ? { date: data.date } : {}),
    },
  });
  return toNoteData(note);
}

/** Delete a page by id. */
export async function deleteNote(userId: string, id: string): Promise<void> {
  await prisma.note.deleteMany({ where: { id, userId } });
}

export interface MonthNote {
  id: string;
  date: string;
  title: string;
}

/** Notes within a month (id + date + title) for calendar previews. */
export async function getMonthNotes(
  userId: string,
  ym: string, // "YYYY-MM"
): Promise<MonthNote[]> {
  const notes = await prisma.note.findMany({
    where: { userId, date: { startsWith: `${ym}-` } },
    orderBy: { createdAt: "asc" },
    select: { id: true, date: true, title: true },
  });
  return notes.map((n) => ({ id: n.id, date: n.date, title: n.title }));
}

export async function listTemplates(userId: string): Promise<TemplateData[]> {
  const rows = await prisma.noteTemplate.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map((t) => ({
    id: t.id,
    name: t.name,
    content: t.content,
    updatedAt: t.updatedAt.toISOString(),
  }));
}

export async function createTemplate(
  userId: string,
  name: string,
  content: Prisma.InputJsonValue,
): Promise<TemplateData> {
  const t = await prisma.noteTemplate.create({
    data: { userId, name, content },
  });
  return {
    id: t.id,
    name: t.name,
    content: t.content,
    updatedAt: t.updatedAt.toISOString(),
  };
}

export async function deleteTemplate(userId: string, id: string): Promise<void> {
  await prisma.noteTemplate.deleteMany({ where: { id, userId } });
}

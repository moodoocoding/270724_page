import { eq, inArray } from "drizzle-orm";
import { ensureDb, getDb } from "../../../db";
import { classes, participants, submissions } from "../../../db/schema";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const classCode = params.get("classCode")?.trim().toUpperCase();
  const adminCode = params.get("adminCode")?.trim();
  if (!classCode || !adminCode) return Response.json({ error: "클래스 코드와 강사 코드를 입력해 주세요." }, { status: 400 });
  await ensureDb();
  const db = getDb();
  const [workshop] = await db.select().from(classes).where(eq(classes.code, classCode)).limit(1);
  if (!workshop || workshop.adminCode !== adminCode) return Response.json({ error: "코드를 확인해 주세요." }, { status: 403 });
  const people = await db.select().from(participants).where(eq(participants.classId, workshop.id));
  const rows = people.length ? await db.select().from(submissions).where(inArray(submissions.participantId, people.map((p) => p.id))) : [];
  const summary: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const result = people.map((person) => {
    const own = rows.filter((row) => row.participantId === person.id);
    const mapped: Record<number, typeof own[number]> = {};
    for (const row of own) {
      mapped[row.step] = row;
      if (row.status === "submitted") summary[row.step] += 1;
    }
    return { ...person, submissions: mapped };
  });
  return Response.json({ className: workshop.name, participants: result, summary });
}

import { and, eq } from "drizzle-orm";
import { ensureDb, getDb } from "../../../db";
import { classes, participants } from "../../../db/schema";

export async function POST(request: Request) {
  const { school, name } = await request.json() as { school?: string; name?: string };
  const code = "AI-ONEDAY";
  const participantSchool = school?.trim();
  const participantName = name?.trim();
  if (!participantSchool || !participantName) return Response.json({ error: "학교명과 이름을 입력해 주세요." }, { status: 400 });

  await ensureDb();
  const db = getDb();
  let [workshop] = await db.select().from(classes).where(eq(classes.code, code)).limit(1);
  if (!workshop && code === "AI-ONEDAY") {
    [workshop] = await db.insert(classes).values({ name: "AI 원데이 클래스", code, adminCode: "260725" }).returning();
  }
  if (!workshop) return Response.json({ error: "클래스 코드를 확인해 주세요." }, { status: 404 });

  let [participant] = await db.select().from(participants).where(and(eq(participants.classId, workshop.id), eq(participants.school, participantSchool), eq(participants.name, participantName))).limit(1);
  if (!participant) [participant] = await db.insert(participants).values({ classId: workshop.id, school: participantSchool, name: participantName }).returning();

  return Response.json({ session: { participantId: participant.id, participantName: participant.name, school: participant.school, className: workshop.name, classCode: workshop.code } });
}

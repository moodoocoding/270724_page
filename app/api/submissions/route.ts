import { and, eq } from "drizzle-orm";
import { ensureDb, getDb } from "../../../db";
import { submissions } from "../../../db/schema";

export async function GET(request: Request) {
  const participantId = Number(new URL(request.url).searchParams.get("participantId"));
  if (!participantId) return Response.json({ error: "참여자 정보가 없습니다." }, { status: 400 });
  await ensureDb();
  const rows = await getDb().select().from(submissions).where(eq(submissions.participantId, participantId));
  return Response.json({ submissions: rows });
}

export async function POST(request: Request) {
  const { participantId, step, status, data } = await request.json() as { participantId?: number; step?: number; status?: string; data?: Record<string, string> };
  if (!participantId || !step || step < 1 || step > 4) return Response.json({ error: "저장할 차시 정보가 올바르지 않습니다." }, { status: 400 });
  const safeStatus = status === "submitted" ? "submitted" : "draft";
  const dataJson = JSON.stringify(data || {});
  const updatedAt = new Date().toISOString();
  await ensureDb();
  const db = getDb();
  const [existing] = await db.select().from(submissions).where(and(eq(submissions.participantId, participantId), eq(submissions.step, step))).limit(1);
  if (existing) await db.update(submissions).set({ status: safeStatus, dataJson, updatedAt }).where(eq(submissions.id, existing.id));
  else await db.insert(submissions).values({ participantId, step, status: safeStatus, dataJson, updatedAt });
  return Response.json({ ok: true, updatedAt });
}

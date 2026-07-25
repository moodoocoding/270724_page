import { getSupabase } from "../../../lib/supabase-server";
import { getParticipantId } from "../../../lib/participant-session";

const allowedKeys: Record<number, Set<string>> = {
  1: new Set(["factChoice1", "factChoice2", "factChoice3", "factChoice4", "firstJudgment", "additionalInfo", "blockPoint", "change"]),
  2: new Set(["gemCreatedAt", "grade", "subject", "difficultyCause", "difficultTask", "desiredAction", "gemPracticeRequest", "method1", "method2", "method3", "method4", "method5", "selectedMethodIndex", "selectedMethod", "criteriaLearning", "criteriaFeasible", "criteriaFits", "selectionReason"]),
  3: new Set(["gameId", "gameTitle", "playedAt", "studentAction", "feedbackMechanism", "changePlan", "contentTitle", "resultUrl", "contentPlan", "uploadedFileName", "uploadedFileSize"]),
  4: new Set(["revision", "finalUrl", "finalFileName", "finalFileSize"]),
};

export async function GET() {
  try {
    const participantId = await getParticipantId();
    if (!participantId) return Response.json({ error: "다시 입장해 주세요." }, { status: 401 });

    const { data, error } = await getSupabase()
      .from("submissions")
      .select("id,participant_id,step,status,data_json,updated_at")
      .eq("participant_id", participantId)
      .order("step");
    if (error) throw error;

    return Response.json({
      submissions: (data ?? []).map((row) => ({
        id: row.id,
        participantId: row.participant_id,
        step: row.step,
        status: row.status,
        dataJson: JSON.stringify(row.data_json ?? {}),
        updatedAt: row.updated_at,
      })),
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "작성 내용을 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const participantId = await getParticipantId();
    if (!participantId) return Response.json({ error: "다시 입장해 주세요." }, { status: 401 });
    const requestOrigin = request.headers.get("origin");
    if (requestOrigin && requestOrigin !== new URL(request.url).origin) {
      return Response.json({ error: "허용되지 않은 요청입니다." }, { status: 403 });
    }
    const { step, status, data } = await request.json() as {
      step?: number;
      status?: string;
      data?: Record<string, string>;
    };
    if (!step || step < 1 || step > 4 || (status !== "draft" && status !== "submitted")) {
      return Response.json({ error: "저장할 차시 정보가 올바르지 않습니다." }, { status: 400 });
    }
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return Response.json({ error: "저장할 내용의 형식을 확인해 주세요." }, { status: 400 });
    }
    const entries = Object.entries(data);
    const permitted = allowedKeys[step];
    if (
      !permitted ||
      entries.some(([, value]) => typeof value !== "string" || value.length > 4000) ||
      JSON.stringify(data ?? {}).length > 64_000
    ) {
      return Response.json({ error: "저장할 내용의 형식이나 길이를 확인해 주세요." }, { status: 400 });
    }
    const sanitizedData = Object.fromEntries(entries.filter(([key]) => permitted.has(key)));

    const updatedAt = new Date().toISOString();
    const { error } = await getSupabase()
      .from("submissions")
      .upsert(
        {
          participant_id: participantId,
          step,
          status: status === "submitted" ? "submitted" : "draft",
          data_json: sanitizedData,
          updated_at: updatedAt,
        },
        { onConflict: "participant_id,step" },
      );
    if (error) throw error;

    return Response.json({ ok: true, updatedAt });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "작성 내용을 저장하지 못했습니다." }, { status: 500 });
  }
}

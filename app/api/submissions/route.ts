import { getSupabase } from "../../../lib/supabase-server";

export async function GET(request: Request) {
  try {
    const participantId = Number(new URL(request.url).searchParams.get("participantId"));
    if (!participantId) return Response.json({ error: "참여자 정보가 없습니다." }, { status: 400 });

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
    const { participantId, step, status, data } = await request.json() as {
      participantId?: number;
      step?: number;
      status?: string;
      data?: Record<string, string>;
    };
    if (!participantId || !step || step < 1 || step > 4) {
      return Response.json({ error: "저장할 차시 정보가 올바르지 않습니다." }, { status: 400 });
    }

    const updatedAt = new Date().toISOString();
    const { error } = await getSupabase()
      .from("submissions")
      .upsert(
        {
          participant_id: participantId,
          step,
          status: status === "submitted" ? "submitted" : "draft",
          data_json: data ?? {},
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

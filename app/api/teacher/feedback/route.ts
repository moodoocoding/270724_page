import { getSupabase } from "../../../../lib/supabase-server";

export async function POST(request: Request) {
  try {
    const { classCode, adminCode, participantId, step, feedback } = await request.json() as {
      classCode?: string;
      adminCode?: string;
      participantId?: number;
      step?: number;
      feedback?: string;
    };

    const targetClassCode = classCode?.trim().toUpperCase();
    const targetAdminCode = adminCode?.trim();
    const targetParticipantId = Number(participantId);
    const targetStep = Number(step);
    const feedbackText = feedback?.trim() ?? "";

    if (!targetClassCode || !targetAdminCode || !targetParticipantId || !targetStep || targetStep < 1 || targetStep > 4) {
      return Response.json({ error: "올바르지 않은 요청 정보입니다." }, { status: 400 });
    }

    const supabase = getSupabase();

    // 1. Verify class code and admin code
    const { data: workshop, error: classError } = await supabase
      .from("classes")
      .select("id,admin_code")
      .eq("code", targetClassCode)
      .single();

    if (classError || !workshop || workshop.admin_code !== targetAdminCode) {
      return Response.json({ error: "강사 권한을 인증할 수 없습니다." }, { status: 403 });
    }

    // 2. Verify target participant belongs to the class
    const { data: participant, error: participantError } = await supabase
      .from("participants")
      .select("id,class_id")
      .eq("id", targetParticipantId)
      .single();

    if (participantError || !participant || participant.class_id !== workshop.id) {
      return Response.json({ error: "참여자를 찾을 수 없거나 해당 클래스 소속이 아닙니다." }, { status: 400 });
    }

    // 3. Read existing submission or setup defaults
    const { data: submission, error: submissionError } = await supabase
      .from("submissions")
      .select("id,data_json,status")
      .eq("participant_id", targetParticipantId)
      .eq("step", targetStep)
      .maybeSingle();

    if (submissionError) throw submissionError;

    const dataJson = submission ? (submission.data_json ?? {}) as Record<string, string> : {};
    
    // Update feedback inside data_json
    const updatedData: Record<string, string | undefined> = { ...dataJson, teacherFeedback: feedbackText };
    if (!feedbackText) delete updatedData.teacherFeedback;

    const { error: upsertError } = await supabase
      .from("submissions")
      .upsert({
        participant_id: targetParticipantId,
        step: targetStep,
        status: submission?.status ?? "draft",
        data_json: updatedData,
        updated_at: new Date().toISOString(),
      }, { onConflict: "participant_id,step" });

    if (upsertError) throw upsertError;

    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "피드백을 저장하지 못했습니다." }, { status: 500 });
  }
}

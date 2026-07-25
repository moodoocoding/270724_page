import { getSupabase } from "../../../lib/supabase-server";
import { clearParticipantSession, setParticipantSession } from "../../../lib/participant-session";
import { findWorkshopSession } from "../../../lib/workshops";

export async function POST(request: Request) {
  try {
    const { school, name, workshopCode } = await request.json() as { school?: string; name?: string; workshopCode?: string };
    const participantSchool = school?.trim();
    const participantName = name?.trim();
    const selectedWorkshop = findWorkshopSession(workshopCode?.trim().toUpperCase() || "");
    if (!selectedWorkshop) {
      return Response.json({ error: "지역과 연수 날짜를 선택해 주세요." }, { status: 400 });
    }
    if (!participantSchool || !participantName || participantSchool.length > 80 || participantName.length > 40) {
      return Response.json({ error: "학교명과 이름을 입력해 주세요." }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data: workshop, error: classError } = await supabase
      .from("classes")
      .select("id,name,code")
      .eq("code", selectedWorkshop.code)
      .single();
    if (classError || !workshop) {
      console.error(classError);
      return Response.json({ error: "선택한 연수 회차가 아직 준비되지 않았습니다." }, { status: 503 });
    }

    const { data: participant, error: participantError } = await supabase
      .from("participants")
      .upsert(
        { class_id: workshop.id, school: participantSchool, name: participantName },
        { onConflict: "class_id,school,name" },
      )
      .select("id,school,name")
      .single();
    if (participantError || !participant) throw participantError ?? new Error("참여자 정보를 저장하지 못했습니다.");
    await setParticipantSession(participant.id);

    return Response.json({
      session: {
        participantId: participant.id,
        participantName: participant.name,
        school: participant.school,
        className: workshop.name,
        classCode: workshop.code,
      },
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "입장 정보를 저장하지 못했습니다." }, { status: 500 });
  }
}

export async function DELETE() {
  await clearParticipantSession();
  return Response.json({ ok: true });
}

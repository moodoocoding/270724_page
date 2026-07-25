import { getSupabase } from "../../../lib/supabase-server";
import { findWorkshopSession } from "../../../lib/workshops";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const classCode = params.get("classCode")?.trim().toUpperCase();
    const adminCode = params.get("adminCode")?.trim();
    if (!classCode || !adminCode) {
      return Response.json({ error: "클래스 코드와 강사 코드를 입력해 주세요." }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data: workshop, error: classError } = await supabase
      .from("classes")
      .select("id,name,admin_code")
      .eq("code", classCode)
      .single();
    if (classError || !workshop || workshop.admin_code !== adminCode) {
      return Response.json({ error: "코드를 확인해 주세요." }, { status: 403 });
    }

    const { data: people, error: peopleError } = await supabase
      .from("participants")
      .select("id,class_id,school,name,created_at")
      .eq("class_id", workshop.id)
      .order("school")
      .order("name");
    if (peopleError) throw peopleError;

    const ids = (people ?? []).map((person) => person.id);
    const { data: rows, error: rowsError } = ids.length
      ? await supabase
          .from("submissions")
          .select("id,participant_id,step,status,data_json,updated_at")
          .in("participant_id", ids)
      : { data: [], error: null };
    if (rowsError) throw rowsError;

    const summary: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    const participants = (people ?? []).map((person) => {
      const mapped: Record<number, object> = {};
      for (const row of (rows ?? []).filter((item) => item.participant_id === person.id)) {
        mapped[row.step] = {
          id: row.id,
          participantId: row.participant_id,
          step: row.step,
          status: row.status,
          dataJson: JSON.stringify(row.data_json ?? {}),
          updatedAt: row.updated_at,
        };
        if (row.status === "submitted") summary[row.step] += 1;
      }
      return {
        id: person.id,
        classId: person.class_id,
        school: person.school,
        name: person.name,
        createdAt: person.created_at,
        submissions: mapped,
      };
    });

    const localSession = findWorkshopSession(classCode);
    const displayClassName = localSession ? localSession.className : workshop.name;

    return Response.json({ className: displayClassName, participants, summary });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "제출 현황을 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { classCode, adminCode, participantId } = await request.json() as {
      classCode?: string;
      adminCode?: string;
      participantId?: number;
    };
    const targetClassCode = classCode?.trim().toUpperCase();
    const targetAdminCode = adminCode?.trim();
    const targetParticipantId = Number(participantId);

    if (
      !targetClassCode ||
      !targetAdminCode ||
      !Number.isSafeInteger(targetParticipantId) ||
      targetParticipantId < 1
    ) {
      return Response.json({ error: "올바르지 않은 삭제 요청입니다." }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data: workshop, error: classError } = await supabase
      .from("classes")
      .select("id,admin_code")
      .eq("code", targetClassCode)
      .single();
    if (classError || !workshop || workshop.admin_code !== targetAdminCode) {
      return Response.json({ error: "강사 권한을 인증할 수 없습니다." }, { status: 403 });
    }

    const { data: participant, error: participantError } = await supabase
      .from("participants")
      .select("id,class_id,school,name")
      .eq("id", targetParticipantId)
      .single();
    if (participantError || !participant || participant.class_id !== workshop.id) {
      return Response.json({ error: "삭제할 참여자를 찾을 수 없습니다." }, { status: 404 });
    }

    const bucket = supabase.storage.from("workshop-final-results");
    const { data: storedFiles, error: listError } = await bucket.list(String(targetParticipantId), {
      limit: 100,
    });
    if (listError) throw listError;

    const storedPaths = (storedFiles ?? [])
      .filter((file) => file.id)
      .map((file) => `${targetParticipantId}/${file.name}`);
    if (storedPaths.length) {
      const { error: removeError } = await bucket.remove(storedPaths);
      if (removeError) throw removeError;
    }

    const { error: deleteError } = await supabase
      .from("participants")
      .delete()
      .eq("id", targetParticipantId)
      .eq("class_id", workshop.id);
    if (deleteError) throw deleteError;

    return Response.json({
      ok: true,
      participant: {
        id: participant.id,
        school: participant.school,
        name: participant.name,
      },
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "참여자 내역을 삭제하지 못했습니다." }, { status: 500 });
  }
}

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

import { getParticipantId } from "../../../lib/participant-session";
import { getSupabase } from "../../../lib/supabase-server";

type SubmissionRow = {
  participant_id: number;
  step: number;
  data_json: Record<string, string> | null;
  updated_at: string;
};

export async function GET() {
  try {
    const participantId = await getParticipantId();
    if (!participantId) return Response.json({ error: "다시 입장해 주세요." }, { status: 401 });

    const supabase = getSupabase();
    const { data: current, error: currentError } = await supabase
      .from("participants")
      .select("class_id")
      .eq("id", participantId)
      .single();
    if (currentError || !current) throw currentError ?? new Error("참여자 정보를 찾지 못했습니다.");

    const { data: people, error: peopleError } = await supabase
      .from("participants")
      .select("id,school,name")
      .eq("class_id", current.class_id)
      .neq("id", participantId)
      .limit(36);
    if (peopleError) throw peopleError;

    const ids = (people ?? []).map((person) => person.id);
    if (!ids.length) return Response.json({ items: [] });

    const { data: submissions, error: submissionError } = await supabase
      .from("submissions")
      .select("participant_id,step,data_json,updated_at")
      .in("participant_id", ids)
      .in("step", [2, 3])
      .eq("status", "submitted");
    if (submissionError) throw submissionError;

    const rows = (submissions ?? []) as SubmissionRow[];
    const items = (people ?? []).flatMap((person) => {
      const byStep = new Map(rows.filter((row) => row.participant_id === person.id).map((row) => [row.step, row]));
      const third = byStep.get(3);
      if (!third) return [];
      const second = byStep.get(2)?.data_json ?? {};
      const thirdData = third.data_json ?? {};
      return [{
        id: person.id,
        school: person.school,
        name: person.name,
        method: second.selectedMethod || second.aiResult || "",
        contentTitle: thirdData.contentTitle || thirdData.gameTitle || "",
        resultUrl: /^https?:\/\/\S+$/i.test(thirdData.resultUrl || "") ? thirdData.resultUrl : "",
        updatedAt: third.updated_at,
      }];
    });

    return Response.json({ items });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "갤러리를 불러오지 못했습니다." }, { status: 500 });
  }
}

import { randomUUID } from "node:crypto";
import { getParticipantId } from "../../../lib/participant-session";
import { getSupabase } from "../../../lib/supabase-server";

type GalleryComment = {
  id: string;
  authorId: number;
  authorSchool: string;
  authorName: string;
  body: string;
  createdAt: string;
};

type SubmissionRow = {
  participant_id: number;
  step: number;
  data_json: Record<string, string> | null;
  updated_at: string;
};

function parseComments(value: unknown): GalleryComment[] {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((comment): comment is GalleryComment => (
      typeof comment?.id === "string" &&
      typeof comment?.authorId === "number" &&
      typeof comment?.authorSchool === "string" &&
      typeof comment?.authorName === "string" &&
      typeof comment?.body === "string" &&
      typeof comment?.createdAt === "string"
    )).slice(-50);
  } catch {
    return [];
  }
}

async function findStoredResultUrl(participantId: number) {
  const supabase = getSupabase();
  const { data: files, error } = await supabase.storage
    .from("workshop-final-results")
    .list(String(participantId), {
      limit: 100,
      sortBy: { column: "created_at", order: "desc" },
    });
  if (error) {
    console.error(error);
    return "";
  }
  const latestFile = (files ?? []).find((file) => file.id);
  if (!latestFile) return "";
  return supabase.storage
    .from("workshop-final-results")
    .getPublicUrl(`${participantId}/${latestFile.name}`)
    .data.publicUrl;
}

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
      .limit(200);
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
    const itemResults = await Promise.all((people ?? []).map(async (person) => {
      const byStep = new Map(rows.filter((row) => row.participant_id === person.id).map((row) => [row.step, row]));
      const third = byStep.get(3);
      if (!third) return null;
      const second = byStep.get(2)?.data_json ?? {};
      const thirdData = third.data_json ?? {};
      const savedResultUrl = /^https?:\/\/\S+$/i.test(thirdData.resultUrl || "") ? thirdData.resultUrl : "";
      const recoveredResultUrl = !savedResultUrl && !thirdData.uploadCanceledAt
        ? await findStoredResultUrl(person.id)
        : "";
      return {
        id: person.id,
        school: person.school,
        name: person.name,
        method: second.selectedMethod || second.aiResult || "",
        contentTitle: thirdData.contentTitle || thirdData.gameTitle || "",
        resultUrl: savedResultUrl || recoveredResultUrl,
        updatedAt: third.updated_at,
        isMine: person.id === participantId,
        comments: parseComments(thirdData.galleryComments),
      };
    }));
    const items = itemResults
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => Number(b.isMine) - Number(a.isMine) || b.updatedAt.localeCompare(a.updatedAt));

    return Response.json({ items });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "갤러리를 불러오지 못했습니다." }, { status: 500 });
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

    const { targetParticipantId, body } = await request.json() as { targetParticipantId?: number; body?: string };
    const targetId = Number(targetParticipantId);
    const commentBody = body?.trim() || "";
    if (!Number.isSafeInteger(targetId) || targetId < 1 || !commentBody || commentBody.length > 300) {
      return Response.json({ error: "댓글은 300자 이내로 작성해 주세요." }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data: author, error: authorError } = await supabase
      .from("participants")
      .select("id,class_id,school,name")
      .eq("id", participantId)
      .single();
    if (authorError || !author) throw authorError ?? new Error("댓글 작성자 정보를 찾지 못했습니다.");

    const { data: target, error: targetError } = await supabase
      .from("participants")
      .select("id,class_id")
      .eq("id", targetId)
      .single();
    if (targetError || !target || target.class_id !== author.class_id) {
      return Response.json({ error: "같은 연수 회차의 작품에만 댓글을 남길 수 있습니다." }, { status: 403 });
    }

    const { data: submission, error: submissionError } = await supabase
      .from("submissions")
      .select("id,data_json,status")
      .eq("participant_id", targetId)
      .eq("step", 3)
      .single();
    if (submissionError || !submission || submission.status !== "submitted") {
      return Response.json({ error: "제출된 3차시 작품을 찾지 못했습니다." }, { status: 404 });
    }

    const dataJson = (submission.data_json ?? {}) as Record<string, string>;
    const comments = parseComments(dataJson.galleryComments);
    if (comments.length >= 50) {
      return Response.json({ error: "이 작품에는 댓글을 더 등록할 수 없습니다." }, { status: 409 });
    }

    const comment: GalleryComment = {
      id: randomUUID(),
      authorId: author.id,
      authorSchool: author.school,
      authorName: author.name,
      body: commentBody,
      createdAt: new Date().toISOString(),
    };
    const { error: updateError } = await supabase
      .from("submissions")
      .update({ data_json: { ...dataJson, galleryComments: JSON.stringify([...comments, comment]) } })
      .eq("id", submission.id);
    if (updateError) throw updateError;

    return Response.json({ comment });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "댓글을 저장하지 못했습니다." }, { status: 500 });
  }
}

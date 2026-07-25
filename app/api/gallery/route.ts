import { getParticipantId } from "../../../lib/participant-session";
import { getSupabase } from "../../../lib/supabase-server";

type SubmissionRow = {
  participant_id: number;
  step: number;
  data_json: Record<string, string> | null;
  updated_at: string;
};

type CommentRow = {
  id: string;
  target_participant_id: number;
  author_participant_id: number;
  body: string;
  created_at: string;
  updated_at: string;
};

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

    // 1. Fetch submissions of steps 2 and 3
    const { data: submissions, error: submissionError } = await supabase
      .from("submissions")
      .select("participant_id,step,data_json,updated_at")
      .in("participant_id", ids)
      .in("step", [2, 3])
      .eq("status", "submitted");
    if (submissionError) throw submissionError;

    // 2. Fetch comments for all participants in the class
    const { data: dbComments, error: commentsError } = await supabase
      .from("comments")
      .select("id, target_participant_id, author_participant_id, body, created_at, updated_at")
      .in("target_participant_id", ids)
      .order("created_at", { ascending: true });
    if (commentsError) throw commentsError;

    const commentsList = (dbComments ?? []) as CommentRow[];
    const peopleMap = new Map((people ?? []).map((p) => [p.id, p]));
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

      // Map comments for this participant
      const targetComments = commentsList
        .filter((c) => c.target_participant_id === person.id)
        .map((comment) => {
          const author = peopleMap.get(comment.author_participant_id);
          return {
            id: comment.id,
            authorId: comment.author_participant_id,
            authorSchool: author?.school ?? "알 수 없음",
            authorName: author?.name ?? "알 수 없음",
            body: comment.body,
            createdAt: comment.created_at,
            editedAt: comment.created_at !== comment.updated_at ? comment.updated_at : undefined,
            isMine: comment.author_participant_id === participantId,
          };
        });

      return {
        id: person.id,
        school: person.school,
        name: person.name,
        method: second.selectedMethod || second.aiResult || "",
        contentTitle: thirdData.contentTitle || thirdData.gameTitle || "",
        resultUrl: savedResultUrl || recoveredResultUrl,
        updatedAt: third.updated_at,
        isMine: person.id === participantId,
        comments: targetComments,
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

    // Limit check using SQL count
    const { count, error: countError } = await supabase
      .from("comments")
      .select("*", { count: "exact", head: true })
      .eq("target_participant_id", targetId);
    if (countError) throw countError;
    if (count !== null && count >= 50) {
      return Response.json({ error: "이 작품에는 댓글을 더 등록할 수 없습니다." }, { status: 409 });
    }

    // Insert comment into relations table
    const { data: newComment, error: insertError } = await supabase
      .from("comments")
      .insert({
        target_participant_id: targetId,
        author_participant_id: author.id,
        body: commentBody,
      })
      .select("id, target_participant_id, author_participant_id, body, created_at, updated_at")
      .single();
    if (insertError || !newComment) throw insertError ?? new Error("댓글을 저장하지 못했습니다.");

    return Response.json({
      comment: {
        id: newComment.id,
        authorId: author.id,
        authorSchool: author.school,
        authorName: author.name,
        body: newComment.body,
        createdAt: newComment.created_at,
        isMine: true,
      },
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "댓글을 저장하지 못했습니다." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const participantId = await getParticipantId();
    if (!participantId) return Response.json({ error: "다시 입장해 주세요." }, { status: 401 });

    const requestOrigin = request.headers.get("origin");
    if (requestOrigin && requestOrigin !== new URL(request.url).origin) {
      return Response.json({ error: "허용되지 않은 요청입니다." }, { status: 403 });
    }

    const { targetParticipantId, commentId, body } = await request.json() as {
      targetParticipantId?: number;
      commentId?: string;
      body?: string;
    };
    const targetId = Number(targetParticipantId);
    const normalizedCommentId = commentId?.trim() || "";
    const commentBody = body?.trim() || "";
    if (
      !Number.isSafeInteger(targetId) ||
      targetId < 1 ||
      !normalizedCommentId ||
      !commentBody ||
      commentBody.length > 300
    ) {
      return Response.json({ error: "수정할 댓글을 300자 이내로 작성해 주세요." }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data: author, error: authorError } = await supabase
      .from("participants")
      .select("id,class_id,school,name")
      .eq("id", participantId)
      .single();
    if (authorError || !author) throw authorError ?? new Error("댓글 작성자 정보를 찾지 못했습니다.");

    // Update in database directly
    const { data: updatedComment, error: updateError } = await supabase
      .from("comments")
      .update({
        body: commentBody,
        updated_at: new Date().toISOString(),
      })
      .eq("id", normalizedCommentId)
      .eq("author_participant_id", author.id)
      .select("id, target_participant_id, author_participant_id, body, created_at, updated_at")
      .single();

    if (updateError || !updatedComment) {
      console.error(updateError);
      return Response.json({ error: "댓글을 수정하지 못했습니다. 작성자 본인인지 확인해 주세요." }, { status: 403 });
    }

    return Response.json({
      comment: {
        id: updatedComment.id,
        authorId: author.id,
        authorSchool: author.school,
        authorName: author.name,
        body: updatedComment.body,
        createdAt: updatedComment.created_at,
        editedAt: updatedComment.updated_at,
        isMine: true,
      },
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "댓글을 수정하지 못했습니다." }, { status: 500 });
  }
}

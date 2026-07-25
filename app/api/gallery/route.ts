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
  editedAt?: string;
};

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

const PUBLIC_PATH_MARKER = "/storage/v1/object/public/workshop-final-results/";

function storagePathFromUrl(url: unknown) {
  if (typeof url !== "string" || !url) return "";
  try {
    const pathname = new URL(url).pathname;
    const markerIndex = pathname.indexOf(PUBLIC_PATH_MARKER);
    if (markerIndex < 0) return "";
    return decodeURIComponent(pathname.slice(markerIndex + PUBLIC_PATH_MARKER.length));
  } catch {
    return "";
  }
}

function previewUrl(path: string) {
  return /\.html?$/i.test(path)
    ? `/api/content-preview?path=${encodeURIComponent(path)}`
    : "";
}

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

function isMissingCommentsTable(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; message?: string };
  return candidate.code === "PGRST205" ||
    candidate.code === "42P01" ||
    candidate.message?.includes("public.comments") === true;
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
    if (commentsError && !isMissingCommentsTable(commentsError)) throw commentsError;

    const commentsList = (dbComments ?? []) as CommentRow[];
    const useLegacyComments = isMissingCommentsTable(commentsError);
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
      const resultUrl = savedResultUrl || recoveredResultUrl;
      const storagePath = thirdData.uploadedFilePath || storagePathFromUrl(resultUrl);

      // Map comments for this participant
      const targetComments = useLegacyComments
        ? parseComments(thirdData.galleryComments).map((comment) => ({
            ...comment,
            isMine: comment.authorId === participantId,
          }))
        : commentsList
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
        resultUrl,
        previewUrl: previewUrl(storagePath),
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
    if (countError && isMissingCommentsTable(countError)) {
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

      return Response.json({ comment: { ...comment, isMine: true } });
    }
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

    if (updateError && isMissingCommentsTable(updateError)) {
      const { data: target, error: targetError } = await supabase
        .from("participants")
        .select("id,class_id")
        .eq("id", targetId)
        .single();
      if (targetError || !target || target.class_id !== author.class_id) {
        return Response.json({ error: "같은 연수 회차의 작품에 있는 댓글만 수정할 수 있습니다." }, { status: 403 });
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
      const commentIndex = comments.findIndex((comment) => comment.id === normalizedCommentId);
      if (commentIndex < 0) {
        return Response.json({ error: "수정할 댓글을 찾지 못했습니다." }, { status: 404 });
      }
      if (comments[commentIndex].authorId !== author.id) {
        return Response.json({ error: "내가 작성한 댓글만 수정할 수 있습니다." }, { status: 403 });
      }

      const legacyComment: GalleryComment = {
        ...comments[commentIndex],
        body: commentBody,
        editedAt: new Date().toISOString(),
      };
      comments[commentIndex] = legacyComment;
      const { error: legacyUpdateError } = await supabase
        .from("submissions")
        .update({ data_json: { ...dataJson, galleryComments: JSON.stringify(comments) } })
        .eq("id", submission.id);
      if (legacyUpdateError) throw legacyUpdateError;

      return Response.json({ comment: { ...legacyComment, isMine: true } });
    }

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

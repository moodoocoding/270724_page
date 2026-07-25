import { randomUUID } from "node:crypto";
import { getParticipantId } from "../../../lib/participant-session";
import { getSupabase } from "../../../lib/supabase-server";

export const runtime = "nodejs";

const BUCKET = "workshop-final-results";
const MAX_FILE_SIZE = 4 * 1024 * 1024;
const allowedExtensions = new Set(["html", "htm", "zip", "png", "jpg", "jpeg", "gif", "webp", "pdf", "pptx"]);
const PUBLIC_PATH_MARKER = `/storage/v1/object/public/${BUCKET}/`;

type ErrorDetails = {
  message: string;
  status?: number;
  statusCode?: string;
};

class UploadStageError extends Error {
  stage: string;
  originalError: unknown;

  constructor(stage: string, error: unknown) {
    super(errorDetails(error).message);
    this.name = "UploadStageError";
    this.stage = stage;
    this.originalError = error;
  }
}

function errorDetails(error: unknown): ErrorDetails {
  if (!error || typeof error !== "object") {
    return { message: String(error || "Unknown upload error") };
  }

  const value = error as {
    message?: unknown;
    status?: unknown;
    statusCode?: unknown;
  };
  const status = typeof value.status === "number"
    ? value.status
    : Number.isFinite(Number(value.status))
      ? Number(value.status)
      : undefined;

  return {
    message: typeof value.message === "string" ? value.message : "Unknown upload error",
    status,
    statusCode: typeof value.statusCode === "string" ? value.statusCode : undefined,
  };
}

function isMissingBucket(error: unknown) {
  const details = errorDetails(error);
  return details.status === 404 || /bucket.*not found|not found.*bucket/i.test(details.message);
}

function isConflict(error: unknown) {
  const details = errorDetails(error);
  return details.status === 409 || /already exists|duplicate/i.test(details.message);
}

function uploadErrorResponse(error: unknown, requestId: string, operation: "upload" | "delete") {
  const stageError = error instanceof UploadStageError ? error : null;
  const details = errorDetails(stageError?.originalError ?? error);
  const message = details.message.toLowerCase();

  console.error(JSON.stringify({
    level: "error",
    message: `final result ${operation} failed`,
    route: "/api/final-upload",
    requestId,
    stage: stageError?.stage || "unknown",
    error: details.message,
    status: details.status,
    statusCode: details.statusCode,
  }));

  if (message.includes("환경변수")) {
    return Response.json({
      error: "파일 저장소 설정이 완료되지 않았습니다. 관리자에게 문의해 주세요.",
      errorId: requestId,
    }, { status: 503 });
  }
  if (details.status === 401 || details.status === 403 || /jwt|unauthorized|permission|policy/.test(message)) {
    return Response.json({
      error: "Supabase Storage 권한을 확인해 주세요. 관리자에게 오류 ID를 전달해 주세요.",
      errorId: requestId,
    }, { status: 503 });
  }
  if (details.status === 413 || /too large|payload|file size/.test(message)) {
    return Response.json({
      error: "파일은 4MB 이하만 업로드할 수 있습니다.",
      errorId: requestId,
    }, { status: 413 });
  }

  return Response.json({
    error: operation === "upload"
      ? "파일 저장소에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요."
      : "탑재한 파일을 취소하지 못했습니다.",
    errorId: requestId,
  }, { status: 502 });
}

async function ensureStorageBucket(supabase: ReturnType<typeof getSupabase>) {
  const { data: bucket, error: getError } = await supabase.storage.getBucket(BUCKET);
  if (getError && !isMissingBucket(getError)) {
    throw new UploadStageError("bucket-read", getError);
  }

  if (!bucket) {
    const { error: createError } = await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: MAX_FILE_SIZE,
    });
    if (createError && !isConflict(createError)) {
      throw new UploadStageError("bucket-create", createError);
    }
    return;
  }

  const fileSizeLimit = bucket.file_size_limit ?? 0;
  if (!bucket.public || fileSizeLimit < MAX_FILE_SIZE) {
    const { error: updateError } = await supabase.storage.updateBucket(BUCKET, {
      public: true,
      fileSizeLimit: Math.max(fileSizeLimit, MAX_FILE_SIZE),
    });
    if (updateError) {
      throw new UploadStageError("bucket-update", updateError);
    }
  }
}

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

function isOwnedPath(path: string, participantId: number) {
  return path.startsWith(`${participantId}/`) && !path.includes("..") && !path.includes("\\");
}

export async function POST(request: Request) {
  const requestId = request.headers.get("x-vercel-id") || randomUUID();
  const startedAt = Date.now();
  try {
    const participantId = await getParticipantId();
    if (!participantId) return Response.json({ error: "다시 입장해 주세요." }, { status: 401 });

    const requestOrigin = request.headers.get("origin");
    if (requestOrigin && requestOrigin !== new URL(request.url).origin) {
      return Response.json({ error: "허용되지 않은 요청입니다." }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const purpose = formData.get("purpose");
    if (!(file instanceof File)) {
      return Response.json({ error: "업로드할 파일을 선택해 주세요." }, { status: 400 });
    }
    if (!file.size || file.size > MAX_FILE_SIZE) {
      return Response.json({ error: "파일은 4MB 이하만 업로드할 수 있습니다." }, { status: 400 });
    }

    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    if (!allowedExtensions.has(extension)) {
      return Response.json({ error: "HTML, ZIP, 이미지, PDF, PPTX 파일만 업로드할 수 있습니다." }, { status: 400 });
    }

    const supabase = getSupabase();
    await ensureStorageBucket(supabase);

    const path = `${participantId}/${Date.now()}-${randomUUID()}.${extension}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, bytes, {
      contentType: file.type || "application/octet-stream",
      cacheControl: "3600",
      upsert: false,
    });
    if (uploadError) throw new UploadStageError("object-upload", uploadError);

    const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    if (purpose === "lesson3") {
      const { data: existing, error: existingError } = await supabase
        .from("submissions")
        .select("data_json")
        .eq("participant_id", participantId)
        .eq("step", 3)
        .maybeSingle();
      if (existingError) {
        await supabase.storage.from(BUCKET).remove([path]);
        throw new UploadStageError("lesson3-read", existingError);
      }

      const existingData = (existing?.data_json ?? {}) as Record<string, string>;
      const previousPath = existingData.uploadedFilePath || storagePathFromUrl(existingData.resultUrl);
      const updatedData: Record<string, string> = {
        ...existingData,
        uploadedFileName: file.name,
        uploadedFileSize: `${(file.size / 1024).toFixed(1)} KB`,
        uploadedFilePath: path,
        resultUrl: publicData.publicUrl,
      };
      delete updatedData.uploadCanceledAt;
      const updatedAt = new Date().toISOString();
      const { error: saveError } = await supabase
        .from("submissions")
        .upsert({
          participant_id: participantId,
          step: 3,
          status: "draft",
          data_json: updatedData,
          updated_at: updatedAt,
        }, { onConflict: "participant_id,step" });
      if (saveError) {
        await supabase.storage.from(BUCKET).remove([path]);
        throw new UploadStageError("lesson3-save", saveError);
      }
      if (previousPath && previousPath !== path && isOwnedPath(previousPath, participantId)) {
        await supabase.storage.from(BUCKET).remove([previousPath]);
      }
    }

    console.log(JSON.stringify({
      level: "info",
      message: "final result upload completed",
      route: "/api/final-upload",
      requestId,
      participantId,
      purpose: typeof purpose === "string" ? purpose : "final",
      bytes: file.size,
      durationMs: Date.now() - startedAt,
    }));

    return Response.json({
      ok: true,
      url: publicData.publicUrl,
      storagePath: path,
      fileName: file.name,
      fileSize: `${(file.size / 1024).toFixed(1)} KB`,
    });
  } catch (error) {
    return uploadErrorResponse(error, requestId, "upload");
  }
}

export async function DELETE(request: Request) {
  const requestId = request.headers.get("x-vercel-id") || randomUUID();
  try {
    const participantId = await getParticipantId();
    if (!participantId) return Response.json({ error: "다시 입장해 주세요." }, { status: 401 });

    const requestOrigin = request.headers.get("origin");
    if (requestOrigin && requestOrigin !== new URL(request.url).origin) {
      return Response.json({ error: "허용되지 않은 요청입니다." }, { status: 403 });
    }

    const { storagePath, url, purpose } = await request.json() as { storagePath?: string; url?: string; purpose?: string };
    const path = storagePath?.trim() || storagePathFromUrl(url);
    if (purpose !== "lesson3" || !path || !isOwnedPath(path, participantId)) {
      return Response.json({ error: "취소할 탑재 파일을 확인하지 못했습니다." }, { status: 400 });
    }

    const supabase = getSupabase();
    const { error: removeError } = await supabase.storage.from(BUCKET).remove([path]);
    if (removeError) throw new UploadStageError("object-delete", removeError);

    const { data: existing, error: existingError } = await supabase
      .from("submissions")
      .select("id,data_json")
      .eq("participant_id", participantId)
      .eq("step", 3)
      .maybeSingle();
    if (existingError) throw new UploadStageError("lesson3-read", existingError);
    if (existing) {
      const existingData = (existing.data_json ?? {}) as Record<string, string>;
      const remainingData = { ...existingData };
      delete remainingData.uploadedFileName;
      delete remainingData.uploadedFileSize;
      delete remainingData.uploadedFilePath;
      delete remainingData.resultUrl;
      remainingData.uploadCanceledAt = new Date().toISOString();
      const { error: updateError } = await supabase
        .from("submissions")
        .update({ status: "draft", data_json: remainingData, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (updateError) throw new UploadStageError("lesson3-save", updateError);
    }

    return Response.json({ ok: true });
  } catch (error) {
    return uploadErrorResponse(error, requestId, "delete");
  }
}

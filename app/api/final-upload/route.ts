import { randomUUID } from "node:crypto";
import { getParticipantId } from "../../../lib/participant-session";
import { getSupabase } from "../../../lib/supabase-server";

export const runtime = "nodejs";

const BUCKET = "workshop-final-results";
const MAX_FILE_SIZE = 4 * 1024 * 1024;
const allowedExtensions = new Set(["html", "htm", "zip", "png", "jpg", "jpeg", "gif", "webp", "pdf", "pptx"]);
const PUBLIC_PATH_MARKER = `/storage/v1/object/public/${BUCKET}/`;

function safeFileName(name: string) {
  return name
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}._-]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-120) || "result-file";
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
    const { data: bucket } = await supabase.storage.getBucket(BUCKET);
    if (!bucket) {
      const { error: createError } = await supabase.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: MAX_FILE_SIZE,
      });
      if (createError && !/already exists/i.test(createError.message)) throw createError;
    }

    const fileName = safeFileName(file.name);
    const path = `${participantId}/${Date.now()}-${randomUUID()}-${fileName}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, bytes, {
      contentType: file.type || "application/octet-stream",
      cacheControl: "3600",
      upsert: false,
    });
    if (uploadError) throw uploadError;

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
        throw existingError;
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
        throw saveError;
      }
      if (previousPath && previousPath !== path && isOwnedPath(previousPath, participantId)) {
        await supabase.storage.from(BUCKET).remove([previousPath]);
      }
    }

    return Response.json({
      ok: true,
      url: publicData.publicUrl,
      storagePath: path,
      fileName: file.name,
      fileSize: `${(file.size / 1024).toFixed(1)} KB`,
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "최종 결과물을 업로드하지 못했습니다." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
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
    if (removeError) throw removeError;

    const { data: existing, error: existingError } = await supabase
      .from("submissions")
      .select("id,data_json")
      .eq("participant_id", participantId)
      .eq("step", 3)
      .maybeSingle();
    if (existingError) throw existingError;
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
      if (updateError) throw updateError;
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "탑재한 파일을 취소하지 못했습니다." }, { status: 500 });
  }
}

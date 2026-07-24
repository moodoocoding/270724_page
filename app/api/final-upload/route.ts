import { randomUUID } from "node:crypto";
import { getParticipantId } from "../../../lib/participant-session";
import { getSupabase } from "../../../lib/supabase-server";

export const runtime = "nodejs";

const BUCKET = "workshop-final-results";
const MAX_FILE_SIZE = 4 * 1024 * 1024;
const allowedExtensions = new Set(["html", "htm", "zip", "png", "jpg", "jpeg", "gif", "webp", "pdf", "pptx"]);

function safeFileName(name: string) {
  return name
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}._-]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-120) || "result-file";
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
    return Response.json({
      ok: true,
      url: publicData.publicUrl,
      fileName: file.name,
      fileSize: `${(file.size / 1024).toFixed(1)} KB`,
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "최종 결과물을 업로드하지 못했습니다." }, { status: 500 });
  }
}

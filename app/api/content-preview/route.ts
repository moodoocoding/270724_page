import { getParticipantId } from "../../../lib/participant-session";
import { getSupabase } from "../../../lib/supabase-server";

export const runtime = "nodejs";

const BUCKET = "workshop-final-results";
const HTML_PATH_PATTERN = /^(\d+)\/[a-z0-9-]+\.html?$/i;

export async function GET(request: Request) {
  try {
    const participantId = await getParticipantId();
    if (!participantId) {
      return new Response("다시 입장해 주세요.", { status: 401 });
    }

    const path = new URL(request.url).searchParams.get("path")?.trim() || "";
    const pathMatch = path.match(HTML_PATH_PATTERN);
    if (!pathMatch || path.includes("..") || path.includes("\\")) {
      return new Response("체험할 HTML 파일을 확인하지 못했습니다.", { status: 400 });
    }

    const ownerId = Number(pathMatch[1]);
    const supabase = getSupabase();
    const { data: participants, error: participantsError } = await supabase
      .from("participants")
      .select("id,class_id")
      .in("id", [participantId, ownerId]);
    if (participantsError) throw participantsError;

    const currentParticipant = participants?.find((participant) => participant.id === participantId);
    const owner = participants?.find((participant) => participant.id === ownerId);
    if (!currentParticipant || !owner || currentParticipant.class_id !== owner.class_id) {
      return new Response("같은 연수 회차의 작품만 체험할 수 있습니다.", { status: 403 });
    }

    const { data: file, error: downloadError } = await supabase.storage
      .from(BUCKET)
      .download(path);
    if (downloadError || !file) {
      return new Response("작품 파일을 불러오지 못했습니다.", { status: 404 });
    }

    const html = await file.text();
    return new Response(html, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": 'inline; filename="workshop-content.html"',
        "Content-Security-Policy": [
          "sandbox allow-scripts allow-forms allow-modals allow-popups allow-pointer-lock",
          "default-src 'none'",
          "script-src 'unsafe-inline' 'unsafe-eval' https: blob:",
          "style-src 'unsafe-inline' https:",
          "img-src data: blob: https:",
          "font-src data: https:",
          "media-src data: blob: https:",
          "connect-src https:",
        ].join("; "),
        "Content-Type": "text/html; charset=utf-8",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error(error);
    return new Response("작품을 실행하지 못했습니다.", { status: 500 });
  }
}

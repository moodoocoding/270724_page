import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "oneday_participant";
const SESSION_AGE_SECONDS = 60 * 60 * 12;

function secret() {
  const value = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) throw new Error("세션 서명 키가 설정되지 않았습니다.");
  return value;
}

function signature(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export async function setParticipantSession(participantId: number) {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_AGE_SECONDS;
  const payload = `${participantId}:${expiresAt}`;
  const store = await cookies();
  store.set(COOKIE_NAME, `${payload}.${signature(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_AGE_SECONDS,
    path: "/",
  });
}

export async function clearParticipantSession() {
  const store = await cookies();
  store.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}

export async function getParticipantId() {
  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value;
  if (!value) return null;
  const separator = value.lastIndexOf(".");
  if (separator < 1) return null;
  const payload = value.slice(0, separator);
  const received = value.slice(separator + 1);
  const expected = signature(payload);
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  if (receivedBuffer.length !== expectedBuffer.length || !timingSafeEqual(receivedBuffer, expectedBuffer)) return null;
  const [idText, expiresText] = payload.split(":");
  const participantId = Number(idText);
  const expiresAt = Number(expiresText);
  if (!participantId || !expiresAt || expiresAt < Math.floor(Date.now() / 1000)) return null;
  return participantId;
}

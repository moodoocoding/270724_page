import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 원데이 클래스 | 수업 설계 워크북",
  description: "수업 문제를 발견하고 AI와 방법을 찾아 실제 수업 콘텐츠로 완성하는 4차시 워크북",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}

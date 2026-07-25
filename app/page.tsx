"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { workshopRegions, workshopSessions } from "../lib/workshops";
import { Brand } from "./components/Brand";
import { LessonOneActivity } from "./components/LessonOneActivity";
import { GemsLab } from "./components/GemsLab";
import { GameLab } from "./components/GameLab";
import { GalleryWalk } from "./components/GalleryWalk";
import { TeacherDashboard } from "./components/TeacherDashboard";

type Step = 1 | 2 | 3 | 4;

type Submission = {
  step: Step;
  status: "draft" | "submitted";
  data: Record<string, string>;
  dataJson?: string;
  updatedAt?: string;
};

type TeacherParticipant = {
  id: number;
  school: string;
  name: string;
  submissions: Partial<Record<Step, Submission>>;
};

type TeacherData = {
  className: string;
  participants: TeacherParticipant[];
  summary: Record<Step, number>;
};

type Session = {
  participantId: number;
  participantName: string;
  school: string;
  className: string;
  classCode: string;
};

const stepMeta = {
  1: { short: "문제 정의", title: "사실에서 수업 문제까지", hint: "분류하고, 확인하고, 한 문장으로 정리합니다." },
  2: { short: "수업 설계", title: "수업을 어떻게 설계할 것인가?", hint: "Gem을 만든 뒤 직접 실습하고 결과를 남깁니다." },
  3: { short: "콘텐츠 제작", title: "수업 웹게임 / 콘텐츠 개발 및 탑재", hint: "추천 웹게임을 연구하고, 직접 만든 수업 콘텐츠를 탑재해 테스트합니다." },
  4: { short: "갤러리워크", title: "갤러리워크와 최종 제출", hint: "동료 작품을 둘러보고, 의견을 반영한 최종 결과물을 제출합니다." },
} as const;

const emptySubmissions = (): Record<Step, Submission> => ({
  1: { step: 1, status: "draft", data: {} },
  2: { step: 2, status: "draft", data: {} },
  3: { step: 3, status: "draft", data: {} },
  4: { step: 4, status: "draft", data: {} },
});

export default function Home() {
  const [mode, setMode] = useState<"learner" | "teacher">("learner");
  const [session, setSession] = useState<Session | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem("oneday-session");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Session;
    } catch {
      return null;
    }
  });

  const [classCode, setClassCode] = useState<string>(workshopSessions[0].code);
  const [regionId, setRegionId] = useState<string>(workshopRegions[0].id);
  const [workshopCode, setWorkshopCode] = useState<string>(workshopRegions[0].sessions[0].code);
  const [school, setSchool] = useState("");
  const [name, setName] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [step, setStep] = useState<Step>(1);
  const [submissions, setSubmissions] = useState(emptySubmissions);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [teacherData, setTeacherData] = useState<TeacherData | null>(null);

  // 자동 저장 상태 관리 ("idle" | "saving" | "saved" | "error")
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const current = submissions[step];
  const availableDates = workshopRegions.find((region) => region.id === regionId)?.sessions ?? workshopRegions[0].sessions;
  const progress = useMemo(
    () => Object.values(submissions).filter((item) => item.status === "submitted").length,
    [submissions],
  );

  useEffect(() => {
    async function loadSubmissions(activeSession: Session) {
      let res = await fetch("/api/submissions", { cache: "no-store" });
      if (res.status === 401) {
        const renewed = await fetch("/api/session", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ school: activeSession.school, name: activeSession.participantName, workshopCode: activeSession.classCode }),
        });
        if (!renewed.ok) {
          window.localStorage.removeItem("oneday-session");
          setSession(null);
          return;
        }
        const renewedBody = await renewed.json();
        window.localStorage.setItem("oneday-session", JSON.stringify(renewedBody.session));
        res = await fetch("/api/submissions", { cache: "no-store" });
      }
      if (!res.ok) return;
      const body = await res.json();
      setSubmissions((prev) => {
        const next = { ...prev };
        for (const item of body.submissions as Submission[]) {
          next[item.step] = { ...item, data: JSON.parse(item.dataJson || "{}") };
        }
        return next;
      });
    }
    if (session) void loadSubmissions(session);
  }, [session]);

  async function enterClass(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || !school.trim()) return;
    setBusy(true);
    setMessage("");
    const res = await fetch("/api/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ school, name, workshopCode }),
    });
    const body = await res.json();
    setBusy(false);
    if (!res.ok) return setMessage(body.error || "입장할 수 없습니다.");
    setSession(body.session);
    window.localStorage.setItem("oneday-session", JSON.stringify(body.session));
  }

  // 디바운싱 자동 저장 로직
  async function autoSave(currentStep: Step, stepData: Record<string, string>) {
    if (!session) return;
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ step: currentStep, status: "draft", data: stepData }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "자동 저장 중 오류 발생");
      setSubmissions((prev) => ({
        ...prev,
        [currentStep]: { ...prev[currentStep], status: "draft", updatedAt: body.updatedAt },
      }));
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 3000);
    } catch {
      setSaveState("error");
    }
  }

  function updateField(key: string, value: string) {
    const updatedData = { ...submissions[step].data, [key]: value };
    setSubmissions((prev) => ({
      ...prev,
      [step]: { ...prev[step], data: updatedData, status: "draft" },
    }));
    setSaveState("saving");

    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(() => {
      void autoSave(step, updatedData);
    }, 1500);
  }

  async function save(status: "draft" | "submitted") {
    if (!session) return;
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    setBusy(true);
    setMessage("");
    setSaveState("saving");
    const res = await fetch("/api/submissions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ step, status, data: current.data }),
    });
    const body = await res.json();
    setBusy(false);
    if (!res.ok) {
      setSaveState("error");
      return setMessage(body.error || "저장하지 못했습니다.");
    }
    setSubmissions((prev) => ({ ...prev, [step]: { ...prev[step], status, updatedAt: body.updatedAt } }));
    setSaveState("saved");
    setMessage(status === "submitted" ? "제출했습니다. 언제든 수정해 다시 제출할 수 있어요." : "임시 저장했습니다.");
    setTimeout(() => setSaveState("idle"), 3000);
  }

  function leaveClass() {
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    void fetch("/api/session", { method: "DELETE" });
    window.localStorage.removeItem("oneday-session");
    setSession(null);
  }

  async function openTeacher(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const res = await fetch(`/api/teacher?classCode=${encodeURIComponent(classCode)}&adminCode=${encodeURIComponent(adminCode)}`);
    const body = await res.json();
    setBusy(false);
    if (!res.ok) return setMessage(body.error || "강사 화면을 열 수 없습니다.");
    setTeacherData(body);
  }

  if (mode === "teacher" && teacherData) {
    return (
      <TeacherDashboard
        data={teacherData}
        classCode={classCode}
        adminCode={adminCode}
        onBack={() => setTeacherData(null)}
      />
    );
  }

  if (mode === "teacher") {
    return (
      <main className="entry-shell">
        <section className="entry-card">
          <Brand />
          <p className="eyebrow">강사 보기</p>
          <h1>제출 현황을 한눈에 확인하세요.</h1>
          <p className="lead">클래스 코드와 강사 코드를 입력하면 참여자별 진행 상황과 작성 결과를 볼 수 있습니다.</p>
          <form onSubmit={openTeacher} className="entry-form">
            <label>연수 회차<select value={classCode} onChange={(e) => setClassCode(e.target.value)}>
              {workshopRegions.map((region) => <optgroup key={region.id} label={region.label}>
                {region.sessions.map((session) => <option key={session.code} value={session.code}>{session.dateLabel}</option>)}
              </optgroup>)}
            </select></label>
            <label>강사 코드<input type="password" value={adminCode} onChange={(e) => setAdminCode(e.target.value)} placeholder="강사 코드 입력" /></label>
            {message && <p className="form-message">{message}</p>}
            <button className="primary" disabled={busy}>{busy ? "확인 중…" : "강사 화면 열기"}</button>
          </form>
          <button className="text-button" onClick={() => { setMode("learner"); setMessage(""); }}>참여자 화면으로</button>
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="entry-shell">
        <section className="entry-card">
          <Brand />
          <div className="hero-mark">4차시 · 하나의 결과물</div>
          <h1>생각을 수업으로<br />옮기는 작은 워크북</h1>
          <p className="lead">문제를 먼저 발견하고, AI와 방법을 찾고, 실제 수업 콘텐츠로 완성하세요.</p>
          <form onSubmit={enterClass} className="entry-form">
            <label>지역<select value={regionId} onChange={(event) => {
              const nextRegion = workshopRegions.find((region) => region.id === event.target.value) ?? workshopRegions[0];
              setRegionId(nextRegion.id);
              setWorkshopCode(nextRegion.sessions[0].code);
            }}>
              {workshopRegions.map((region) => <option key={region.id} value={region.id}>{region.label}</option>)}
            </select></label>
            <label>날짜<select value={workshopCode} onChange={(event) => setWorkshopCode(event.target.value)}>
              {availableDates.map((session) => <option key={session.code} value={session.code}>{session.dateLabel}</option>)}
            </select></label>
            <label>학교명<input value={school} onChange={(e) => setSchool(e.target.value)} placeholder="예: 한빛초등학교" /></label>
            <label>이름<input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 김태호" /></label>
            {message && <p className="form-message">{message}</p>}
            <button className="primary" disabled={busy}>{busy ? "입장 중…" : "워크북 시작하기"}</button>
          </form>
          <button className="text-button" onClick={() => { setMode("teacher"); setMessage(""); }}>강사이신가요?</button>
        </section>
        <aside className="entry-note"><span>오늘의 원칙</span><strong>문제 먼저,<br />AI는 그다음.</strong></aside>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <Brand />
        <div className="user-chip"><span>{session.className} · {session.school}</span><strong>{session.participantName}</strong></div>
      </header>
      <div className="workspace">
        <aside className="sidebar">
          <div className="progress-copy"><span>오늘의 여정</span><strong>{progress}/4 제출</strong></div>
          <div className="progress-track"><i style={{ width: `${progress * 25}%` }} /></div>
          <nav aria-label="차시 선택">
            {([1, 2, 3, 4] as Step[]).map((item) => (
              <button key={item} aria-current={step === item ? "step" : undefined} className={step === item ? "active" : ""} onClick={() => { setStep(item); setMessage(""); setSaveState("idle"); }}>
                <span>{String(item).padStart(2, "0")}</span>
                <div><strong>{stepMeta[item].short}</strong><small>{submissions[item].status === "submitted" ? "제출 완료" : "작성 중"}</small></div>
              </button>
            ))}
          </nav>
          <button className="logout" onClick={leaveClass}>나가기</button>
        </aside>

        <section className="work-area">
          <div className="step-heading">
            <p>{step}차시</p>
            <h1>{stepMeta[step].title}</h1>
            <span>{stepMeta[step].hint}</span>
          </div>

          {current?.data?.teacherFeedback && (
            <div className="student-feedback-banner">
              <strong>💡 강사의 실시간 피드백</strong>
              <p>{current.data.teacherFeedback}</p>
            </div>
          )}

          {step === 1 && <LessonOneActivity data={current.data} onChange={updateField} />}
          {step === 2 && <GemsLab data={current.data} fromStep1={submissions[1].data} onChange={updateField} />}
          {step === 3 && <GameLab data={current.data} onChange={updateField} />}

          {step === 4 && <GalleryWalk data={current.data} onChange={updateField} onReturnToUpload={() => {
            setStep(3);
            setMessage("3차시에서 결과물 파일을 다시 탑재해 주세요. 탑재가 끝나면 갤러리에 자동으로 연결됩니다.");
          }} />}

          <footer className="actionbar">
            <p role="status" aria-live="polite">
              {saveState === "saving" && "✍️ 작성 중 (자동 저장 중...)"}
              {saveState === "saved" && "✓ 변경 사항이 실시간으로 자동 저장되었습니다."}
              {saveState === "error" && "❌ 자동 저장 실패. 인터넷 연결을 확인해 주세요."}
              {saveState === "idle" && (message || (current.status === "submitted" ? "제출 완료 · 수정 후 다시 제출할 수 있어요." : "아직 제출하지 않은 초안입니다."))}
            </p>
            <div>
              <button className="secondary" onClick={() => save("draft")} disabled={busy}>임시 저장</button>
              <button className="primary compact" onClick={() => save("submitted")} disabled={busy}>{current.status === "submitted" ? "다시 제출" : "제출하기"}</button>
            </div>
          </footer>
        </section>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { findWorkshopSession, workshopRegions, workshopSessions } from "../lib/workshops";
import { Brand } from "./components/Brand";
import { LessonOneActivity, type LessonOneStage } from "./components/LessonOneActivity";
import { GemsLab, type DesignStage } from "./components/GemsLab";
import { GameLab, type LessonThreeStage } from "./components/GameLab";
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
  1: { short: "문제 정의", title: "배움에서 수업 문제까지", hint: "남길 배움과 현재 장면을 연결하고, AI가 필요한 이유를 결정합니다." },
  2: { short: "수업 설계", title: "수업을 어떻게 설계할 것인가?", hint: "1차시 문제를 바탕으로 AI 제안을 검토하고 교사의 최종 설계안을 완성합니다." },
  3: { short: "콘텐츠 제작", title: "수업 웹게임 / 콘텐츠 개발 및 탑재", hint: "추천 웹게임을 연구하고, 직접 만든 수업 콘텐츠를 탑재해 테스트합니다." },
  4: { short: "갤러리워크", title: "갤러리워크와 최종 제출", hint: "동료 작품을 둘러보고, 의견을 반영한 최종 결과물을 제출합니다." },
} as const;

const chapterMeta = {
  1: [
    { id: "A", mark: "A", label: "남길 배움" },
    { id: "B", mark: "B", label: "현재 장면" },
    { id: "C", mark: "C", label: "확인 기준" },
    { id: "D", mark: "D", label: "AI 활용 결정" },
  ],
  2: [
    { id: "1", mark: "01", label: "AI에게 요청하기" },
    { id: "2", mark: "02", label: "방법 비교하기" },
    { id: "3", mark: "03", label: "선택·설계하기" },
    { id: "0", mark: "+", label: "Gem 만들기", optional: true },
  ],
  3: [
    { id: "step1", mark: "01", label: "콘텐츠 체험" },
    { id: "prompt", mark: "02", label: "프롬프트 연습" },
    { id: "step2", mark: "03", label: "결과물 탑재" },
  ],
} as const;

const emptySubmissions = (): Record<Step, Submission> => ({
  1: { step: 1, status: "draft", data: {} },
  2: { step: 2, status: "draft", data: {} },
  3: { step: 3, status: "draft", data: {} },
  4: { step: 4, status: "draft", data: {} },
});

export default function Home() {
  const [mode, setMode] = useState<"learner" | "teacher">("learner");
  const [session, setSession] = useState<Session | null>(null);
  const [clientReady, setClientReady] = useState(false);

  const [classCode, setClassCode] = useState<string>(workshopSessions[0].code);
  const [regionId, setRegionId] = useState<string>(workshopRegions[0].id);
  const [workshopCode, setWorkshopCode] = useState<string>(workshopRegions[0].sessions[0].code);
  const [school, setSchool] = useState("");
  const [name, setName] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [step, setStep] = useState<Step>(1);
  const [lessonOneStage, setLessonOneStage] = useState<LessonOneStage>("A");
  const [lessonTwoStage, setLessonTwoStage] = useState<DesignStage>(1);
  const [lessonThreeStage, setLessonThreeStage] = useState<LessonThreeStage>("step1");
  const [submissions, setSubmissions] = useState(emptySubmissions);
  const submissionsRef = useRef(submissions);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [teacherData, setTeacherData] = useState<TeacherData | null>(null);
  const [loadingWorkbook, setLoadingWorkbook] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  // 자동 저장 상태 관리 ("idle" | "saving" | "saved" | "error")
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const current = submissions[step];
  const availableDates = workshopRegions.find((region) => region.id === regionId)?.sessions ?? workshopRegions[0].sessions;
  const progress = useMemo(
    () => Object.values(submissions).filter((item) => item.status === "submitted").length,
    [submissions],
  );
  const activeChapterId = step === 1
    ? lessonOneStage
    : step === 2
    ? String(lessonTwoStage)
    : step === 3
    ? lessonThreeStage
    : "";
  const activeChapters = step <= 3 ? chapterMeta[step as 1 | 2 | 3] : [];

  function selectChapter(id: string) {
    if (step === 1) setLessonOneStage(id as LessonOneStage);
    if (step === 2) setLessonTwoStage(Number(id) as DesignStage);
    if (step === 3) setLessonThreeStage(id as LessonThreeStage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    const raw = window.localStorage.getItem("oneday-session");
    if (raw) {
      try {
        setLoadingWorkbook(true);
        setSession(JSON.parse(raw) as Session);
      } catch {
        window.localStorage.removeItem("oneday-session");
      }
    }
    setClientReady(true);
  }, []);

  useEffect(() => {
    submissionsRef.current = submissions;
  }, [submissions]);

  useEffect(() => {
    async function loadSubmissions(activeSession: Session) {
      setLoadingWorkbook(true);
      const sessionResponse = await fetch("/api/session", { cache: "no-store" });
      if (sessionResponse.ok) {
        const sessionBody = await sessionResponse.json() as { session: Session };
        const refreshedSession = sessionBody.session;
        window.localStorage.setItem("oneday-session", JSON.stringify(refreshedSession));
        if (JSON.stringify(refreshedSession) !== JSON.stringify(activeSession)) {
          setSession(refreshedSession);
          activeSession = refreshedSession;
        }
      }

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
          setLoadingWorkbook(false);
          return;
        }
        const renewedBody = await renewed.json();
        window.localStorage.setItem("oneday-session", JSON.stringify(renewedBody.session));
        setSession(renewedBody.session);
        res = await fetch("/api/submissions", { cache: "no-store" });
      }
      if (!res.ok) {
        setLoadingWorkbook(false);
        return;
      }
      const body = await res.json();
      setSubmissions((prev) => {
        const next = { ...prev };
        for (const item of body.submissions as Submission[]) {
          next[item.step] = { ...item, data: JSON.parse(item.dataJson || "{}") };
        }
        return next;
      });
      setLoadingWorkbook(false);
    }
    if (session) {
      void loadSubmissions(session).catch(() => {
        setLoadingWorkbook(false);
        setSaveState("error");
      });
    }
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
    setLoadingWorkbook(true);
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
      setLastSavedAt(body.updatedAt || new Date().toISOString());
      setTimeout(() => setSaveState("idle"), 3000);
    } catch {
      setSaveState("error");
    }
  }

  function updateField(key: string, value: string) {
    const latestSubmissions = submissionsRef.current;
    const updatedData = { ...latestSubmissions[step].data, [key]: value };
    const nextSubmissions = {
      ...latestSubmissions,
      [step]: { ...latestSubmissions[step], data: updatedData, status: "draft" as const },
    };
    submissionsRef.current = nextSubmissions;
    setSubmissions(nextSubmissions);
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
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ step, status, data: current.data }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "저장하지 못했습니다.");
      setSubmissions((prev) => ({ ...prev, [step]: { ...prev[step], status, updatedAt: body.updatedAt } }));
      setSaveState("saved");
      setLastSavedAt(body.updatedAt || new Date().toISOString());
      setMessage(status === "submitted" ? "제출했습니다. 언제든 수정해 다시 제출할 수 있어요." : "임시 저장했습니다.");
      setTimeout(() => setSaveState("idle"), 3000);
    } catch (error) {
      setSaveState("error");
      setMessage(error instanceof Error ? error.message : "저장하지 못했습니다. 다시 저장해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  function leaveClass() {
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    void fetch("/api/session", { method: "DELETE" });
    window.localStorage.removeItem("oneday-session");
    setSession(null);
    setLoadingWorkbook(false);
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

  if (!clientReady) {
    return (
      <main className="entry-shell entry-loading-shell">
        <section className="workbook-loading" role="status" aria-live="polite">
          <i />
          <strong>워크북을 준비하고 있습니다.</strong>
          <span>잠시만 기다려 주세요.</span>
        </section>
      </main>
    );
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
            {message && <p className="form-message" role="alert">{message}</p>}
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
            {message && <p className="form-message" role="alert">{message}</p>}
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
        <div className="topbar-actions">
          <div className={`save-chip ${saveState}`} role="status" aria-live="polite">
            {saveState === "saving" && "저장 중…"}
            {saveState === "error" && "저장 실패"}
            {saveState === "saved" && "저장됨"}
            {saveState === "idle" && (lastSavedAt
              ? `${new Date(lastSavedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} 저장됨`
              : "자동 저장")}
          </div>
          {saveState === "error" && <button type="button" className="save-retry" onClick={() => void save("draft")} disabled={busy}>다시 저장</button>}
          <div className="user-chip">
            <span>{findWorkshopSession(session.classCode)?.className ?? session.className} · {session.school}</span>
            <strong>{session.participantName} 선생님</strong>
          </div>
          <button type="button" className="secondary small-button" onClick={leaveClass}>나가기</button>
        </div>
      </header>

      {/* Modern Horizontal Stepper Navigation */}
      <div className="horizontal-stepper-wrapper">
        <nav className="horizontal-stepper" aria-label="차시 네비게이션">
          {([1, 2, 3, 4] as Step[]).map((item) => {
            const isCompleted = submissions[item].status === "submitted";
            const isActive = step === item;
            return (
              <button
                key={item}
                type="button"
                className={`stepper-btn ${isActive ? "active" : ""} ${isCompleted ? "completed" : ""}`}
                aria-current={isActive ? "step" : undefined}
                onClick={() => { setStep(item); setMessage(""); setSaveState("idle"); }}
              >
                <span className="step-badge">{isCompleted ? "✓" : item}</span>
                <div className="stepper-btn-content">
                  <strong>{item}차시 · {stepMeta[item].short}</strong>
                  <small>{isCompleted ? "제출 완료" : isActive ? "작성 중" : "미작성"}</small>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sub-Chapter Pill Switcher Bar */}
      {step <= 3 && activeChapters.length > 0 && (
        <div className="subchapter-bar-wrapper">
          <nav className="subchapter-bar" aria-label={`${step}차시 세부 단계`}>
            {activeChapters.map((chapter) => (
              <button
                type="button"
                key={chapter.id}
                className={`subchapter-pill ${activeChapterId === chapter.id ? "active" : ""}`}
                onClick={() => selectChapter(chapter.id)}
              >
                <b>{chapter.mark}</b>
                <span>{chapter.label}</span>
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Centered Spacious Work Area Canvas */}
      <div className="workspace-centered">
        <section className="work-area-wide">
          <header className="step-heading-wide">
            <div className="step-heading-info">
              <h1>{step}차시 · {stepMeta[step].title}</h1>
              <p>{stepMeta[step].hint}</p>
            </div>
            <span className="step-heading-badge">전체 진행률 {progress} / 4</span>
          </header>

          {loadingWorkbook ? (
            <section className="workbook-loading" role="status" aria-live="polite">
              <i />
              <strong>저장된 워크북을 불러오고 있습니다.</strong>
              <span>이전 작성 내용을 확인한 뒤 안전하게 시작할게요.</span>
            </section>
          ) : (
            <>
              {step === 1 && <LessonOneActivity data={current.data} onChange={updateField} stage={lessonOneStage} />}
              {step === 2 && <GemsLab data={current.data} fromStep1={submissions[1].data} onChange={updateField} stage={lessonTwoStage} />}
              {step === 3 && <GameLab data={current.data} onChange={updateField} stage={lessonThreeStage} />}

              {step === 4 && <GalleryWalk data={current.data} onChange={updateField} onReturnToUpload={() => {
                setStep(3);
                setMessage("3차시에서 결과물 파일을 다시 탑재해 주세요. 탑재가 끝나면 갤러리에 자동으로 연결됩니다.");
              }} />}

              <footer className="actionbar">
                <p>{message || (current.status === "submitted" ? "제출 완료 · 언제든 수정 후 다시 제출할 수 있어요." : "작성 내용은 자동으로 저장됩니다.")}</p>
                <div>
                  <button type="button" className="secondary compact" onClick={() => save("draft")} disabled={busy}>임시 저장</button>
                  <button type="button" className="primary compact" onClick={() => save("submitted")} disabled={busy}>{current.status === "submitted" ? "다시 제출" : "제출하기"}</button>
                </div>
              </footer>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { workshopRegions, workshopSessions } from "../lib/workshops";

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

const fields: Record<Step, { key: string; label: string; placeholder: string; long?: boolean }[]> = {
  1: [
    { key: "firstJudgment", label: "처음 한 판단", placeholder: "예: 학습 의욕이 낮다고 생각했다." },
    { key: "additionalInfo", label: "새롭게 확인한 정보", placeholder: "학생의 행동, 말, 질문, 조건이 달라졌을 때의 변화를 적어 주세요.", long: true },
    { key: "blockPoint", label: "배움을 막았을 가능성이 있는 요인", placeholder: "예: 핵심 어휘와 답을 쓰는 방법을 이해하지 못했다." },
    { key: "change", label: "바꿔 볼 수업 조건", placeholder: "예: 핵심 어휘를 쉬운 말과 사례로 설명한다." },
  ],
  2: [
    { key: "grade", label: "학년", placeholder: "예: 5" },
    { key: "subject", label: "교과", placeholder: "예: 사회" },
    { key: "difficultyCause", label: "어려움의 원인", placeholder: "예: 핵심 어휘가 낯설기" },
    { key: "difficultTask", label: "학생이 어려워하는 것", placeholder: "예: 자료의 의미 설명하기" },
    { key: "desiredAction", label: "원하는 학생 행동", placeholder: "예: 근거를 찾아 자기 말로 설명하기" },
    { key: "gemPracticeRequest", label: "완성한 AI 요청문", placeholder: "입력한 내용으로 자동 완성됩니다.", long: true },
    { key: "method1", label: "AI가 제안한 방법 1", placeholder: "첫 번째 방법" },
    { key: "method2", label: "AI가 제안한 방법 2", placeholder: "두 번째 방법" },
    { key: "method3", label: "AI가 제안한 방법 3", placeholder: "세 번째 방법" },
    { key: "method4", label: "AI가 제안한 방법 4", placeholder: "네 번째 방법" },
    { key: "method5", label: "AI가 제안한 방법 5", placeholder: "다섯 번째 방법" },
    { key: "selectedMethod", label: "내가 선택한 방법", placeholder: "선택한 방법이 자동으로 기록됩니다." },
    { key: "selectionReason", label: "선택한 이유", placeholder: "왜 이 방법을 선택했는지 적어 주세요.", long: true },
  ],
  3: [
    { key: "gameTitle", label: "체험한 게임", placeholder: "게임을 선택하면 자동으로 기록됩니다." },
    { key: "studentAction", label: "내가 해 본 결과", placeholder: "예: 3단계까지 진행했고 740점을 얻었다.", long: true },
    { key: "feedbackMechanism", label: "어떤 피드백을 바로 받나요?", placeholder: "예: 정답 여부, 점수, 다시 시도할 기회를 받는다.", long: true },
    { key: "changePlan", label: "내 수업에 맞게 무엇을 바꿀까요?", placeholder: "학년, 내용, 난이도, 규칙 중 바꿀 것만 적으세요.", long: true },
    { key: "contentTitle", label: "내가 만든 콘텐츠 제목", placeholder: "예: 5학년 사회 핵심어휘 퀴즈" },
    { key: "resultUrl", label: "탑재한 결과물", placeholder: "파일을 탑재하면 자동으로 기록됩니다." },
    { key: "contentPlan", label: "수업에서 어떻게 활용할까요?", placeholder: "언제, 누구와, 어떻게 사용할지 짧게 적어 주세요.", long: true },
  ],
  4: [
    { key: "revision", label: "반영한 의견과 수정 내용", placeholder: "어떤 의견을 반영해 무엇을 수정했는지 적어 주세요.", long: true },
    { key: "finalUrl", label: "최종 결과물 업로드", placeholder: "업로드한 최종 결과물의 주소" },
  ],
};

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

  function updateField(key: string, value: string) {
    setSubmissions((prev) => ({
      ...prev,
      [step]: { ...prev[step], data: { ...prev[step].data, [key]: value }, status: "draft" },
    }));
  }

  async function save(status: "draft" | "submitted") {
    if (!session) return;
    setBusy(true);
    setMessage("");
    const res = await fetch("/api/submissions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ step, status, data: current.data }),
    });
    const body = await res.json();
    setBusy(false);
    if (!res.ok) return setMessage(body.error || "저장하지 못했습니다.");
    setSubmissions((prev) => ({ ...prev, [step]: { ...prev[step], status, updatedAt: body.updatedAt } }));
    setMessage(status === "submitted" ? "제출했습니다. 언제든 수정해 다시 제출할 수 있어요." : "임시 저장했습니다.");
  }

  function leaveClass() {
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
    return <TeacherDashboard data={teacherData} onBack={() => setTeacherData(null)} />;
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
              <button key={item} aria-current={step === item ? "step" : undefined} className={step === item ? "active" : ""} onClick={() => { setStep(item); setMessage(""); }}>
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

          {step === 1 && <LessonOneActivity data={current.data} onChange={updateField} />}
          {step === 2 && <GemsLab data={current.data} fromStep1={submissions[1].data} onChange={updateField} />}
          {step === 3 && <GameLab data={current.data} onChange={updateField} />}

          {step === 4 && <GalleryWalk data={current.data} onChange={updateField} />}

          <footer className="actionbar">
            <p role="status" aria-live="polite">{message || (current.status === "submitted" ? "제출 완료 · 수정 후 다시 제출할 수 있어요." : "아직 제출하지 않은 초안입니다.")}</p>
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

function Brand() {
  return <div className="brand"><span>AI</span><div><strong>원데이 클래스</strong><small>수업 설계 워크북</small></div></div>;
}

const factQuestions = [
  "학생이 토의 시간 동안 한 번도 말하지 않았다.",
  "이 학생은 토의에 참여할 의지도 없고 생각도 없다.",
  "학생이 활동 중 교과서의 앞뒤 쪽을 계속 넘겼다.",
  "쓸데없는 짓을 하며 집중하지 않는다.",
] as const;
const factAnswers = ["사실", "해석", "사실", "해석"] as const;

const lessonOneExtraLabels: Record<string, string> = {
  factChoice1: "문장 1 분류",
  factChoice2: "문장 2 분류",
  factChoice3: "문장 3 분류",
  factChoice4: "문장 4 분류",
  infoToKnow: "추가로 알고 싶은 학생의 행동이나 말",
  infoToObserve: "다음 수업에서 확인해 볼 정보",
  gemPracticeRequest: "Gem에 입력한 실습 요청",
  criteriaLearning: "배움 문제에 도움이 되는가?",
  criteriaFeasible: "학생이 실제로 할 수 있는가?",
  criteriaFits: "기존 수업에 넣을 수 있는가?",
  gameTitle: "체험한 게임",
  studentAction: "내가 해 본 결과",
  feedbackMechanism: "즉시 받는 피드백",
  changePlan: "수업 적용 변경 계획",
  playedAt: "게임 체험 완료",
  finalFileName: "최종 결과물 파일",
  finalFileSize: "파일 크기",
};

function LessonOneActivity({ data, onChange }: { data: Record<string, string>; onChange: (key: string, value: string) => void }) {
  return <div className="lesson-one-grid">
    <section className="activity-panel">
      <header className="panel-title"><b>1</b><div><h2>사실과 해석</h2><p>읽고 선택하세요.</p></div></header>
    <div className="concept-pair">
      <section><strong>사실</strong><p>눈이나 귀로 확인할 수 있는 행동이나 말</p></section>
      <section><strong>해석</strong><p>행동의 이유에 대해 교사가 붙인 설명</p></section>
    </div>
    <div className="classification-list">
      {factQuestions.map((question, index) => {
        const key = `factChoice${index + 1}`;
        return <div className="classification-row" key={key}>
          <p id={`${key}-label`}><i>{index + 1}</i>{question}</p>
          <div role="radiogroup" aria-labelledby={`${key}-label`}>
            {(["사실", "해석"] as const).map((choice) => <label key={choice} className={data[key] === choice ? "selected" : ""}><input type="radio" name={key} value={choice} checked={data[key] === choice} onChange={() => onChange(key, choice)} /><span>{choice}</span></label>)}
          </div>
          {data[key] && <em aria-live="polite" className={data[key] === factAnswers[index] ? "correct" : "retry"}>{data[key] === factAnswers[index] ? "맞아요" : "다시 확인"}</em>}
        </div>;
      })}
    </div>
      <p className="remember-note">행동은 사실, 행동의 이유에 대한 판단은 해석입니다.</p>
    </section>
    <section className="activity-panel">
      <header className="panel-title"><b>2</b><div><h2>내 수업에 적용</h2><p>확인할 정보와 바꿀 조건만 적으세요.</p></div></header>
      <SentencePreview data={data} />
      <div className="compact-form lesson-one-form">
        <label><span>처음 한 판단</span><input value={data.firstJudgment || ""} onChange={(e) => onChange("firstJudgment", e.target.value)} placeholder="학습 의욕이 낮다고 생각했다." /></label>
        <label><span>새롭게 확인한 정보</span><textarea value={data.additionalInfo || ""} onChange={(e) => onChange("additionalInfo", e.target.value)} placeholder="학생의 행동·말·조건 변화를 적으세요." /></label>
        <label><span>배움을 막았을 가능성이 있는 요인</span><input value={data.blockPoint || ""} onChange={(e) => onChange("blockPoint", e.target.value)} placeholder="핵심 어휘와 작성 방법을 이해하지 못했다." /></label>
        <label><span>바꿔 볼 수업 조건</span><input value={data.change || ""} onChange={(e) => onChange("change", e.target.value)} placeholder="쉬운 설명과 짧은 예시를 먼저 제시한다." /></label>
      </div>
    </section>
  </div>;
}

function SentencePreview({ data }: { data: Record<string, string> }) {
  return <div className="result-strip"><span>완성 문장</span><p>처음에는 <b>{data.firstJudgment || "______"}</b>고 판단했다. 그러나 <b>{data.additionalInfo || "______"}</b>을 확인한 뒤, <b>{data.blockPoint || "______"}</b>이 배움을 막았을 가능성이 있다고 보았다. 따라서 수업에서 <b>{data.change || "______"}</b>을 해 볼 필요가 있다.</p></div>;
}

function GemsLab({ data, fromStep1, onChange }: { data: Record<string, string>; fromStep1: Record<string, string>; onChange: (key: string, value: string) => void }) {
  const [subStep, setSubStep] = useState<1 | 2 | 3>(1);
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [showMetaModal, setShowMetaModal] = useState(false);
  const [metaText, setMetaText] = useState("");

  useEffect(() => {
    fetch("/meta-prompt.md")
      .then((res) => res.text())
      .then((text) => setMetaText(text))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!showMetaModal) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowMetaModal(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showMetaModal]);

  const copyMetaPrompt = async () => {
    try {
      const textToCopy = metaText || (await (await fetch("/meta-prompt.md")).text());
      await navigator.clipboard.writeText(textToCopy);
      setCopyToast("메타 프롬프트 전체를 복사했습니다.");
      setTimeout(() => setCopyToast(null), 3500);
    } catch {
      setCopyToast("복사에 실패했습니다.");
    }
  };

  const openMetaModal = async () => {
    if (!metaText) {
      try {
        const text = await (await fetch("/meta-prompt.md")).text();
        setMetaText(text);
      } catch {}
    }
    setShowMetaModal(true);
  };

  const startSentence = `따라서 수업에서 ${fromStep1.change || "________________"}을 해 볼 필요가 있다.`;
  const buildRequest = (values: Record<string, string>) => [
    `나의 출발 문장: ${startSentence}`,
    `나는 ${values.grade || "___"}학년 ${values.subject || "___"} 교과를 가르칩니다.`,
    `학생들은 ${values.difficultyCause || "________________"} 때문에 ${values.difficultTask || "________________"}을 어려워합니다.`,
    `수업에서 학생이 ${values.desiredAction || "________________"}하도록 돕고 싶습니다.`,
    "서로 다른 수업 방법 5가지를 제안해 주세요.",
  ].join("\n");
  const requestText = buildRequest(data);
  const methodFields = [1, 2, 3, 4, 5] as const;

  const updateRequestField = (key: string, value: string) => {
    const next = { ...data, [key]: value };
    onChange(key, value);
    onChange("gemPracticeRequest", buildRequest(next));
  };

  const copyRequest = async () => {
    try {
      onChange("gemPracticeRequest", requestText);
      await navigator.clipboard.writeText(requestText);
      setCopyToast("AI에게 요청할 내용을 복사했습니다.");
      setTimeout(() => setCopyToast(null), 3000);
    } catch {
      setCopyToast("복사에 실패했습니다.");
    }
  };

  const updateMethod = (index: number, value: string) => {
    onChange(`method${index}`, value);
    if (data.selectedMethodIndex === String(index)) onChange("selectedMethod", value);
  };

  const selectMethod = (index: number) => {
    const value = data[`method${index}`] || "";
    if (!value.trim()) return;
    onChange("selectedMethodIndex", String(index));
    onChange("selectedMethod", value);
  };

  return (
    <div className="lesson-two-flow">
      {copyToast && (
        <div className="copy-toast" role="status" aria-live="polite">
          {copyToast}
        </div>
      )}

      <nav className="lesson-two-tabs" aria-label="2차시 활동 단계">
        {[
          [1, "Gem 만들기"],
          [2, "AI에게 요청하기"],
          [3, "방법 비교·선택하기"],
        ].map(([value, label]) => (
          <button key={value} className={subStep === value ? "active" : ""} aria-current={subStep === value ? "step" : undefined} onClick={() => setSubStep(value as 1 | 2 | 3)}>
            <span>{value}</span>{label}
          </button>
        ))}
      </nav>

      {subStep === 1 && (
        <section className="lesson-two-panel gem-create-panel">
          <div className="guide-head">
            <div><span className="section-kicker">1단계</span><h2>Gem 만들기</h2><p>메타 프롬프트를 복사해 나의 수업 설계 Gem을 만드세요.</p></div>
            <div className="guide-actions">
              <button className="secondary small-button" onClick={copyMetaPrompt}>메타 프롬프트 복사</button>
              <a className="primary small-button" href="https://gemini.google.com/gems" target="_blank" rel="noreferrer" onClick={() => onChange("gemCreatedAt", new Date().toISOString())}>Gemini 열기 ↗</a>
            </div>
          </div>

          <section className="meta-prompt-preview" aria-label="Gem에 넣을 메타 프롬프트">
            <div>
              <strong>Gem 요청 사항에 아래 메타 프롬프트 전체를 붙여 넣으세요.</strong>
              <button className="text-button" onClick={openMetaModal}>크게 보기</button>
            </div>
            <pre>{metaText || "메타 프롬프트를 불러오는 중입니다."}</pre>
          </section>

          <ol className="guide-steps">
            <li>
              <a className="guide-image" href="/gems/step-1.png" target="_blank" rel="noreferrer" aria-label="Gem 관리자에서 새 Gem 열기 안내 이미지">
                <Image src="/gems/step-1.png" width={640} height={390} alt="Gem 관리자에서 새 Gem 버튼 위치" />
              </a>
              <div><b>01</b><strong>새 Gem을 여세요</strong><p>Gem 관리자에서 ‘새 Gem’을 누릅니다.</p></div>
            </li>
            <li>
              <a className="guide-image" href="/gems/step-2.png" target="_blank" rel="noreferrer" aria-label="메타 프롬프트 입력 안내 이미지">
                <Image src="/gems/step-2.png" width={640} height={390} alt="Gem 요청 사항에 메타 프롬프트를 붙여 넣는 위치" />
              </a>
              <div><b>02</b><strong>메타 프롬프트를 넣으세요</strong><p>요청 사항에 붙여 넣고 저장합니다.</p></div>
            </li>
            <li>
              <a className="guide-image" href="/gems/step-3.png" target="_blank" rel="noreferrer" aria-label="Gem 채팅 시작 안내 이미지">
                <Image src="/gems/step-3.png" width={640} height={390} alt="저장된 Gem에서 채팅 시작 버튼 위치" />
              </a>
              <div><b>03</b><strong>채팅을 시작하세요</strong><p>완성한 Gem에서 새 대화를 시작합니다.</p></div>
            </li>
          </ol>
          <div className="flow-actions"><span /><button className="primary" onClick={() => { onChange("gemCreatedAt", data.gemCreatedAt || new Date().toISOString()); setSubStep(2); }}>다음: AI에게 요청하기 →</button></div>
        </section>
      )}

      {subStep === 2 && (
        <section className="lesson-two-panel">
          <header className="panel-title"><b>2</b><div><h2>AI에게 요청할 내용 작성하기</h2><p>활동지의 빈칸을 채우면 요청문이 자동으로 완성됩니다.</p></div></header>
          <div className="request-layout">
            <div className="request-form-card">
              <div className="starter-box compact-starter"><span>1차시 나의 출발 문장</span><p>{startSentence}</p></div>
              <div className="request-fields">
                <label><span>학년</span><input value={data.grade || ""} onChange={(event) => updateRequestField("grade", event.target.value)} placeholder="예: 5" /></label>
                <label><span>교과</span><input value={data.subject || ""} onChange={(event) => updateRequestField("subject", event.target.value)} placeholder="예: 사회" /></label>
                <label><span>학생들이 어려운 이유</span><input value={data.difficultyCause || ""} onChange={(event) => updateRequestField("difficultyCause", event.target.value)} placeholder="예: 핵심 어휘가 낯설기" /></label>
                <label><span>어려워하는 학습 행동</span><input value={data.difficultTask || ""} onChange={(event) => updateRequestField("difficultTask", event.target.value)} placeholder="예: 자료의 의미 설명하기" /></label>
                <label className="wide"><span>수업에서 원하는 학생 행동</span><input value={data.desiredAction || ""} onChange={(event) => updateRequestField("desiredAction", event.target.value)} placeholder="예: 근거를 찾아 자기 말로 설명하기" /></label>
              </div>
            </div>
            <aside className="request-preview-card">
              <span>완성된 요청문</span>
              <pre>{requestText}</pre>
              <div><button className="secondary" onClick={copyRequest}>요청문 복사</button><a className="primary" href="https://gemini.google.com/app" target="_blank" rel="noreferrer" onClick={() => onChange("gemPracticeRequest", requestText)}>Gemini에서 실행 ↗</a></div>
            </aside>
          </div>
          <div className="flow-actions"><button className="secondary" onClick={() => setSubStep(1)}>← Gem 만들기</button><button className="primary" onClick={() => { onChange("gemPracticeRequest", requestText); setSubStep(3); }}>다음: 방법 비교·선택하기 →</button></div>
        </section>
      )}

      {subStep === 3 && (
        <section className="lesson-two-panel">
          <header className="panel-title"><b>3</b><div><h2>AI가 제안한 방법 비교·선택하기</h2><p>방법 5개를 짧게 적고, 수업에 적용할 한 가지를 선택하세요.</p></div></header>
          <div className="method-choice-layout">
            <div className="method-list">
              <div className="method-list-head"><span>번호</span><span>AI가 제안한 방법</span><span>선택</span></div>
              {methodFields.map((index) => (
                <div className={data.selectedMethodIndex === String(index) ? "method-row selected" : "method-row"} key={index}>
                  <span>{index}</span>
                  <input value={data[`method${index}`] || ""} onChange={(event) => updateMethod(index, event.target.value)} placeholder={`${index}번째 방법을 짧게 적으세요.`} />
                  <button type="button" className={data.selectedMethodIndex === String(index) ? "picked" : ""} aria-pressed={data.selectedMethodIndex === String(index)} disabled={!data[`method${index}`]?.trim()} onClick={() => selectMethod(index)}>
                    {data.selectedMethodIndex === String(index) ? "선택됨" : "선택"}
                  </button>
                </div>
              ))}
            </div>
            <aside className="selection-card">
              <span>한 가지 방법 선택하기</span>
              <div className="selected-method"><small>내가 선택한 방법</small><strong>{data.selectedMethod || "왼쪽에서 방법 하나를 선택하세요."}</strong></div>
              <fieldset>
                <legend>선택 기준 확인</legend>
                <label><input type="checkbox" checked={data.criteriaLearning === "yes"} onChange={(event) => onChange("criteriaLearning", event.target.checked ? "yes" : "")} />배움 문제에 도움이 되는가?</label>
                <label><input type="checkbox" checked={data.criteriaFeasible === "yes"} onChange={(event) => onChange("criteriaFeasible", event.target.checked ? "yes" : "")} />학생이 실제로 할 수 있는가?</label>
                <label><input type="checkbox" checked={data.criteriaFits === "yes"} onChange={(event) => onChange("criteriaFits", event.target.checked ? "yes" : "")} />기존 수업에 넣을 수 있는가?</label>
              </fieldset>
              <label className="selection-reason"><span>선택한 이유</span><textarea value={data.selectionReason || ""} onChange={(event) => onChange("selectionReason", event.target.value)} placeholder="이 방법을 선택한 이유를 한두 문장으로 적어 주세요." /></label>
            </aside>
          </div>
          <div className="flow-actions"><button className="secondary" onClick={() => setSubStep(2)}>← AI 요청문 수정</button><span /></div>
        </section>
      )}

      {showMetaModal && (
        <div className="meta-backdrop" onClick={() => setShowMetaModal(false)}>
          <div className="meta-modal" role="dialog" aria-modal="true" aria-labelledby="meta-prompt-title" onClick={(event) => event.stopPropagation()}>
            <div className="meta-modal-head">
              <h2 id="meta-prompt-title">메타 프롬프트</h2>
              <div className="guide-actions">
                <button className="primary small-button" onClick={copyMetaPrompt}>전체 복사</button>
                <button className="secondary small-button" onClick={() => setShowMetaModal(false)}>닫기</button>
              </div>
            </div>
            <pre>{metaText}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

const gameCatalog = [
  { id: "spacing", rank: 1, title: "띄어쓰기 킹", tag: "국어 · 맞춤법", task: "문장을 보고 띄어쓰기 고치기", src: "/games/kingsmath/띄어쓰기 킹 (국어 맞춤법).html" },
  { id: "arithmetic", rank: 2, title: "사칙연산 계산킹", tag: "수학 · 연산", task: "제한 시간 안에 계산 문제 풀기", src: "/games/kingsmath/사칙연산 계산킹 (타임어택).html" },
  { id: "kind-words", rank: 3, title: "예쁜 말 킹", tag: "인성 · 언어", task: "상황에 맞는 따뜻한 말 고르기", src: "/games/kingsmath/예쁜 말 킹 (인성 교육).html" },
  { id: "magnet-defense", rank: 4, title: "자석 디펜스 킹", tag: "과학 · 자석", task: "자석의 성질로 목표 지키기", src: "/games/kingsmath/자석 디펜스 킹 (과학 자석).html" },
] as const;

function GameLab({ data, onChange }: { data: Record<string, string>; onChange: (key: string, value: string) => void }) {
  const [subTab, setSubTab] = useState<"step1" | "step2">("step1");
  const [selected, setSelected] = useState(() => gameCatalog.some((game) => game.id === data.gameId) ? data.gameId : "spacing");
  const [uploadPreview, setUploadPreview] = useState<{ kind: "html" | "image" | "file"; content: string } | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);

  const chooseGame = (id: string, title: string) => {
    setSelected(id);
    onChange("gameId", id);
    onChange("gameTitle", title);
  };

  const activeGame = gameCatalog.find((game) => game.id === selected) || gameCatalog[0];
  const step1Fields = fields[3].filter((field) => ["gameTitle", "studentAction", "feedbackMechanism", "changePlan"].includes(field.key));
  const step2Fields = fields[3].filter((field) => ["contentTitle", "contentPlan"].includes(field.key));
  const contentUrl = data.resultUrl?.trim() || "";
  const canPreviewContent = /^https?:\/\/\S+$/i.test(contentUrl);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadError("");

    if (file.size > 4 * 1024 * 1024) {
      setUploadError("4MB 이하 파일을 선택해 주세요.");
      event.target.value = "";
      return;
    }

    const lowerName = file.name.toLowerCase();
    if (lowerName.endsWith(".html") || lowerName.endsWith(".htm") || file.type === "text/html") {
      const reader = new FileReader();
      reader.onload = () => setUploadPreview({ kind: "html", content: String(reader.result || "") });
      reader.onerror = () => setUploadError("HTML 파일을 읽지 못했습니다.");
      reader.readAsText(file);
    } else if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setUploadPreview({ kind: "image", content: String(reader.result || "") });
      reader.onerror = () => setUploadError("이미지 파일을 읽지 못했습니다.");
      reader.readAsDataURL(file);
    } else {
      setUploadPreview({ kind: "file", content: "" });
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await fetch("/api/final-upload", { method: "POST", body: formData });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "파일을 탑재하지 못했습니다.");
      onChange("uploadedFileName", body.fileName);
      onChange("uploadedFileSize", body.fileSize);
      onChange("resultUrl", body.url);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "파일을 탑재하지 못했습니다.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  return (
    <div className="game-lab">
      <nav className="subtab-bar" aria-label="3차시 단계 선택">
        <button className={subTab === "step1" ? "primary" : "secondary"} aria-pressed={subTab === "step1"} onClick={() => setSubTab("step1")}>
          🎮 1단계: 추천 웹게임 체험 및 연구
        </button>
        <button className={subTab === "step2" ? "primary" : "secondary"} aria-pressed={subTab === "step2"} onClick={() => setSubTab("step2")}>
          🚀 2단계: 직접 개발한 콘텐츠 탑재 & 라이브 테스트
        </button>
      </nav>

      {subTab === "step1" && <div className="game-layout">
          <section className="game-browser">
            <div className="guide-head">
              <div>
                <h2>추천 웹게임 4종</h2>
                <p>하나를 골라 플레이하고 수업 아이디어를 찾아보세요.</p>
              </div>
              <a className="secondary small-button portal-link" href="/games/kingsmath/kingsmath-library.html" target="_blank" rel="noreferrer">
                🚀 킹수학 웹게임 원본 포털 ↗
              </a>
            </div>
            <div className="game-cards">
              {gameCatalog.map((game) => (
                <button
                  key={game.id}
                  aria-pressed={selected === game.id}
                  className={selected === game.id ? "selected" : ""}
                  onClick={() => chooseGame(game.id, game.title)}
                >
                  <span>TOP {game.rank} · {game.tag}</span>
                  <strong>{game.title}</strong>
                  <small>{game.task}</small>
                </button>
              ))}
            </div>
            <div className="game-launcher">
              <span>선택한 게임 · TOP {activeGame.rank}</span>
              <h3>{activeGame.title}</h3>
              <p>{activeGame.task}</p>
              <a
                className="game-start"
                href={activeGame.src}
                target="_blank"
                rel="noreferrer"
                onClick={() => {
                  onChange("playedAt", new Date().toISOString());
                  onChange("gameId", activeGame.id);
                  onChange("gameTitle", activeGame.title);
                }}
              >
                새 창에서 게임 시작 ↗
              </a>
            </div>
            <p className="license-note">
              추적 코드와 외부 폰트만 제거한 연수용 사본 · Powered by <a href="https://kingsmath.com" target="_blank" rel="noreferrer">킹수학</a> · CC BY-NC 4.0
            </p>
          </section>

          <section className="reflection-panel">
            <header className="panel-title">
              <b>1단계</b>
              <div>
                <h2>체험 기록 & 아이디어</h2>
                <p>해 보고 느낀 점과 바꿀 점을 남기세요.</p>
              </div>
            </header>
            <div className="compact-form">
              {step1Fields.map((field) => (
                <label key={field.key}>
                  <span>{field.label}</span>
                  {field.long ? (
                    <textarea
                      value={data[field.key] || ""}
                      onChange={(e) => onChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                    />
                  ) : (
                    <input
                      value={data[field.key] || ""}
                      onChange={(e) => onChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      readOnly={field.key === "gameTitle"}
                    />
                  )}
                </label>
              ))}
            </div>
            <button className="primary next-step-button" onClick={() => setSubTab("step2")}>
              다음: 2단계 내가 개발한 콘텐츠 탑재하기 →
            </button>
          </section>
      </div>}

      {subTab === "step2" && <div className="game-layout">
        <section className="reflection-panel">
          <header className="panel-title">
            <b>2단계</b>
            <div>
              <h2>개발한 파일 직접 탑재하기</h2>
              <p>완성한 HTML, ZIP 또는 이미지 파일을 바로 탑재하세요.</p>
            </div>
          </header>
          <div className="file-upload-box">
            <label className={`file-upload-button ${uploading ? "disabled" : ""}`}>
              {uploading ? "파일 탑재 중…" : "📁 개발한 파일 직접 탑재하기"}
              <input type="file" accept=".html,.htm,.zip,image/*" onChange={handleFileUpload} disabled={uploading} />
            </label>
            <p>.html, .zip, PNG, JPG 등 · 최대 4MB</p>
            <small>HTML과 이미지는 우측 라이브 플레이어에서 바로 확인할 수 있습니다.</small>
            {uploadError && <div className="upload-error" role="alert">{uploadError}</div>}
            {data.uploadedFileName && (
              <div className="uploaded-file">
                <span>📄 {data.uploadedFileName} <small>{data.uploadedFileSize}</small></span>
                <button
                  type="button"
                  onClick={() => {
                    onChange("uploadedFileName", "");
                    onChange("uploadedFileSize", "");
                    onChange("resultUrl", "");
                    setUploadPreview(null);
                    setUploadError("");
                  }}
                >
                  삭제
                </button>
              </div>
            )}
          </div>
          <div className="compact-form">
            {step2Fields.map((field) => (
              <label key={field.key}>
                <span>{field.label}</span>
                {field.long ? (
                  <textarea value={data[field.key] || ""} onChange={(event) => onChange(field.key, event.target.value)} placeholder={field.placeholder} />
                ) : (
                  <input value={data[field.key] || ""} onChange={(event) => onChange(field.key, event.target.value)} placeholder={field.placeholder} />
                )}
              </label>
            ))}
          </div>
        </section>

        <section className="game-browser">
          <div className="guide-head">
            <div>
              <h2>🚀 라이브 플레이어</h2>
              <p>탑재한 콘텐츠를 이곳에서 바로 테스트합니다.</p>
            </div>
            {canPreviewContent && <a className="primary small-button" href={contentUrl} target="_blank" rel="noreferrer">새 창에서 열기</a>}
          </div>
          {uploadPreview?.kind === "html" ? (
            <iframe className="game-frame" srcDoc={uploadPreview.content} title="업로드한 HTML 콘텐츠 라이브 테스트" sandbox="allow-scripts" />
          ) : uploadPreview?.kind === "image" ? (
            <div className="image-preview">
              <Image src={uploadPreview.content} alt="업로드한 콘텐츠 미리 보기" width={1200} height={800} unoptimized />
            </div>
          ) : uploadPreview?.kind === "file" ? (
            <div className="demo-stage">
              <h3>파일 탑재 완료</h3>
              <p>ZIP 파일이 저장되었습니다. 실시간 실행을 확인하려면 압축을 푼 HTML 파일을 탑재해 주세요.</p>
            </div>
          ) : canPreviewContent ? (
            <iframe className="game-frame" src={contentUrl} title="내가 만든 콘텐츠 미리 보기" sandbox="allow-scripts" loading="lazy" />
          ) : (
            <div className="demo-stage"><h3>콘텐츠를 탑재해 주세요</h3><p>왼쪽에서 HTML, ZIP 또는 이미지 파일을 선택하세요.</p></div>
          )}
          <div className="player-footer">
            <span>{data.uploadedFileName || data.contentTitle || "아직 탑재한 콘텐츠가 없습니다."}</span>
            <button className="secondary small-button" onClick={() => setSubTab("step1")}>← 1단계 게임 다시 보기</button>
          </div>
        </section>
      </div>}
    </div>
  );
}

type GalleryItem = {
  id: number;
  school: string;
  name: string;
  method: string;
  contentTitle: string;
  resultUrl: string;
  updatedAt: string;
  isExample?: boolean;
};

const galleryExample: GalleryItem = {
  id: -1,
  school: "예시 작품",
  name: "워크숍 예시",
  method: "학생이 문장의 띄어쓰기를 선택하면 정답 여부와 점수를 바로 확인합니다.",
  contentTitle: "띄어쓰기 킹 수업 활용 예시",
  resultUrl: "/games/kingsmath/띄어쓰기 킹 (국어 맞춤법).html",
  updatedAt: "",
  isExample: true,
};

function GalleryWalk({ data, onChange }: { data: Record<string, string>; onChange: (key: string, value: string) => void }) {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/gallery", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("갤러리를 불러오지 못했습니다.");
        return response.json() as Promise<{ items: GalleryItem[] }>;
      })
      .then((body) => { if (active) setItems(body.items); })
      .catch(() => { if (active) setLoadError("동료 결과물을 불러오지 못했습니다. 잠시 후 다시 열어 보세요."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const uploadFinalResult = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");

    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await fetch("/api/final-upload", { method: "POST", body: formData });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "업로드하지 못했습니다.");
      onChange("finalUrl", body.url);
      onChange("finalFileName", body.fileName);
      onChange("finalFileSize", body.fileSize);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "업로드하지 못했습니다.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  return <div className="gallery-work">
    <section className="gallery-showcase" aria-live="polite">
      <header className="gallery-intro">
        <div><b>갤러리워크</b><h2>동료 작품 둘러보기</h2></div>
        <p>작품을 열어 보고, 내 결과물에 반영할 의견을 정해 보세요.</p>
      </header>
      <div className="gallery-grid" aria-label={`예시 작품 1개와 동료 작품 ${items.length}개`}>
        {[galleryExample, ...items].map((item) => <article key={item.id} className={item.isExample ? "gallery-card example" : "gallery-card"}>
          <header className="gallery-meta"><span>{item.school}</span><strong>{item.isExample ? item.name : `${item.name} 선생님`}</strong></header>
          <div className="gallery-piece content"><small>3차시 콘텐츠</small><strong>{item.contentTitle || "제목을 정리 중입니다."}</strong></div>
          <div className="gallery-piece"><small>선택한 수업 설계</small><p>{item.method || "수업 설계를 정리 중입니다."}</p></div>
          <div className="gallery-actions">
            {item.resultUrl ? (
              <a className="primary small-button" href={item.resultUrl} target="_blank" rel="noreferrer" aria-label={`${item.name} 선생님의 결과물 새 창에서 보기`}>결과물 보기 ↗</a>
            ) : (
              <span>공유된 결과물 링크가 없습니다.</span>
            )}
          </div>
        </article>)}
      </div>
      {loading && <p className="gallery-note">동료 결과물을 불러오는 중입니다.</p>}
      {loadError && <p className="gallery-note error">{loadError}</p>}
      {!loading && !loadError && !items.length && <p className="gallery-note">아직 제출된 동료 작품이 없습니다. 제출되면 예시 작품 옆에 나타납니다.</p>}
    </section>

    <section className="reflection-panel gallery-final">
      <header className="panel-title"><b>최종</b><div><h2>의견을 반영해 최종본을 제출하세요.</h2><p>아래 두 항목만 작성하면 4차시가 끝납니다.</p></div></header>
      <div className="gallery-final-grid">
        <label className="revision-card">
          <span><i>1</i>반영한 의견과 수정 내용</span>
          <textarea value={data.revision || ""} onChange={(event) => onChange("revision", event.target.value)} placeholder="어떤 의견을 반영해 무엇을 수정했는지 적어 주세요." />
        </label>
        <div className="final-upload-card">
          <div className="field-title"><i>2</i><div><strong>최종 결과물 업로드</strong><small>HTML, ZIP, 이미지, PDF, PPTX · 최대 4MB</small></div></div>
          <label className={`final-upload-button ${uploading ? "disabled" : ""}`}>
            {uploading ? "업로드 중…" : data.finalUrl ? "파일 교체하기" : "파일 선택하기"}
            <input type="file" accept=".html,.htm,.zip,.png,.jpg,.jpeg,.gif,.webp,.pdf,.pptx" onChange={uploadFinalResult} disabled={uploading} />
          </label>
          <div className="upload-status" role="status">
            {data.finalUrl ? (
              <><span>{data.finalFileName || "최종 결과물"} <small>{data.finalFileSize}</small></span><a href={data.finalUrl} target="_blank" rel="noreferrer">열어보기 ↗</a></>
            ) : (
              <span>아직 업로드한 최종 결과물이 없습니다.</span>
            )}
          </div>
          {uploadError && <p className="upload-error" role="alert">{uploadError}</p>}
        </div>
      </div>
    </section>
  </div>;
}

function TeacherDashboard({ data, onBack }: { data: TeacherData; onBack: () => void }) {
  const [selected, setSelected] = useState<TeacherParticipant | null>(null);
  return (
    <main className="teacher-shell">
      <header className="teacher-head">
        <div><Brand /><p>{data.className} · 참여자 {data.participants.length}명</p></div>
        <button className="secondary" onClick={onBack}>다른 클래스 보기</button>
      </header>
      <section className="teacher-summary">
        {([1, 2, 3, 4] as Step[]).map((step) => <div key={step}><span>{step}차시</span><strong>{data.summary[step] || 0}</strong><small>제출</small></div>)}
      </section>
      <section className="roster">
        <div className="roster-head"><h1>제출 현황</h1><p>이름을 누르면 작성 내용을 확인할 수 있습니다.</p></div>
        {data.participants.map((person) => (
          <button className="person-row" key={person.id} onClick={() => setSelected(person)}>
            <strong>{person.school}<small>{person.name}</small></strong>
            {([1, 2, 3, 4] as Step[]).map((step) => <span key={step} className={person.submissions[step]?.status === "submitted" ? "done" : ""}>{step}차시</span>)}
            <i>보기 →</i>
          </button>
        ))}
        {!data.participants.length && <div className="empty">아직 입장한 참여자가 없습니다.</div>}
      </section>
      {selected && <div className="modal-backdrop" onClick={() => setSelected(null)}><article className="modal" role="dialog" aria-modal="true" aria-labelledby="workbook-dialog-title" onClick={(e) => e.stopPropagation()}><button className="modal-close" autoFocus onClick={() => setSelected(null)}>닫기</button><h2 id="workbook-dialog-title">{selected.name}님의 워크북</h2>{([1,2,3,4] as Step[]).map((step) => { const sub = selected.submissions[step]; const parsed = sub ? JSON.parse(sub.dataJson || "{}") : {}; const visibleEntries = Object.entries(parsed).filter(([key]) => !["scene", "strength", "improvement", "finalNote", "generatedPrompt", "aiResult", "gemCreatedAt", "selectedMethodIndex", "contentTool"].includes(key)); return <section key={step}><h3>{step}차시 · {stepMeta[step].title}</h3>{sub ? visibleEntries.map(([k,v]) => <p key={k}><span>{fields[step].find(f => f.key === k)?.label || lessonOneExtraLabels[k] || k}</span>{String(v) || "—"}</p>) : <p className="muted">작성 내용이 없습니다.</p>}</section>; })}</article></div>}
    </main>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

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
  4: { short: "검토·수정", title: "동료 검토와 최종 수정", hint: "직접 사용한 장면을 근거로 가장 중요한 한 가지를 고칩니다." },
} as const;

const fields: Record<Step, { key: string; label: string; placeholder: string; long?: boolean }[]> = {
  1: [
    { key: "firstJudgment", label: "처음 한 판단", placeholder: "예: 학습 의욕이 낮다고 생각했다." },
    { key: "additionalInfo", label: "새롭게 확인한 정보", placeholder: "학생의 행동, 말, 질문, 조건이 달라졌을 때의 변화를 적어 주세요.", long: true },
    { key: "blockPoint", label: "배움을 막았을 가능성이 있는 요인", placeholder: "예: 핵심 어휘와 답을 쓰는 방법을 이해하지 못했다." },
    { key: "change", label: "바꿔 볼 수업 조건", placeholder: "예: 핵심 어휘를 쉬운 말과 사례로 설명한다." },
  ],
  2: [
    { key: "gemPracticeRequest", label: "Gem에 입력한 실습 요청", placeholder: "예: 5학년 사회 핵심 어휘 활동을 만들고 싶다.", long: true },
    { key: "generatedPrompt", label: "Gem이 완성한 프롬프트", placeholder: "Gem이 만들어 준 완성형 프롬프트를 붙여 넣으세요.", long: true },
    { key: "aiResult", label: "프롬프트 실행 결과", placeholder: "새 대화에서 실행한 AI의 제안 중 중요한 내용을 붙여 넣으세요.", long: true },
    { key: "selectedMethod", label: "우리 수업에서 선택할 방법", placeholder: "실제로 적용할 방법 하나와 선택 이유를 적으세요.", long: true },
  ],
  3: [
    { key: "gameTitle", label: "체험한 게임", placeholder: "게임을 선택하면 자동으로 기록됩니다." },
    { key: "studentAction", label: "내가 해 본 결과", placeholder: "예: 3단계까지 진행했고 740점을 얻었다.", long: true },
    { key: "feedbackMechanism", label: "어떤 피드백을 바로 받나요?", placeholder: "예: 정답 여부, 점수, 다시 시도할 기회를 받는다.", long: true },
    { key: "changePlan", label: "내 수업에 맞게 무엇을 바꿀까요?", placeholder: "학년, 내용, 난이도, 규칙 중 바꿀 것만 적으세요.", long: true },
    { key: "contentTitle", label: "내가 만든 콘텐츠 제목", placeholder: "예: 5학년 사회 핵심어휘 퀴즈" },
    { key: "contentTool", label: "만든 도구", placeholder: "예: Gemini Canvas, Canva, 코딩 도구" },
    { key: "resultUrl", label: "내가 만든 결과 링크", placeholder: "Gemini Canvas 등에서 만든 결과의 공유 URL" },
    { key: "contentPlan", label: "수업에서 어떻게 활용할까요?", placeholder: "언제, 누구와, 어떻게 사용할지 짧게 적어 주세요.", long: true },
  ],
  4: [
    { key: "strength", label: "동료가 말한 살릴 점", placeholder: "구체적으로 도움이 된 부분을 적어 주세요.", long: true },
    { key: "improvement", label: "동료가 말한 바꿀 점", placeholder: "사용 중 확인한 장면과 바꾸면 좋을 부분을 적어 주세요.", long: true },
    { key: "revision", label: "반영한 의견과 수정 내용", placeholder: "무엇을 왜 수정했는지 적어 주세요.", long: true },
    { key: "finalUrl", label: "최종 결과물 링크", placeholder: "최종 파일 또는 콘텐츠의 공유 URL을 붙여 넣어 주세요." },
    { key: "finalNote", label: "최종 수업 적용 문장", placeholder: "나는 수업의 ___에서 학생이 ___하도록 ___을 활용하겠다.", long: true },
  ],
};

const emptySubmissions = (): Record<Step, Submission> => ({
  1: { step: 1, status: "draft", data: {} },
  2: { step: 2, status: "draft", data: {} },
  3: { step: 3, status: "draft", data: {} },
  4: { step: 4, status: "draft", data: {} },
});

const requiredKeys: Record<Step, string[]> = {
  1: ["factChoice1", "factChoice2", "factChoice3", "factChoice4", "firstJudgment", "additionalInfo", "blockPoint", "change"],
  2: ["gemPracticeRequest", "generatedPrompt", "aiResult", "selectedMethod"],
  3: ["gameTitle", "playedAt", "studentAction", "feedbackMechanism", "changePlan", "resultUrl"],
  4: ["strength", "improvement", "revision", "finalUrl", "finalNote"],
};

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
  const [classCode, setClassCode] = useState("AI-ONEDAY");
  const [school, setSchool] = useState("");
  const [name, setName] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [step, setStep] = useState<Step>(1);
  const [submissions, setSubmissions] = useState(emptySubmissions);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [teacherData, setTeacherData] = useState<TeacherData | null>(null);

  const current = submissions[step];
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
          body: JSON.stringify({ school: activeSession.school, name: activeSession.participantName }),
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
      body: JSON.stringify({ school, name }),
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
    if (status === "submitted") {
      const missing = requiredKeys[step].filter((key) => !current.data[key]?.trim());
      if (missing.length) {
        setMessage(`아직 ${missing.length}개 항목이 비어 있어요. 활동을 마친 뒤 제출해 주세요.`);
        return;
      }
    }
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
            <label>클래스 코드<input value={classCode} onChange={(e) => setClassCode(e.target.value.toUpperCase())} /></label>
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
        <div className="user-chip"><span>{session.school}</span><strong>{session.participantName}</strong></div>
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
  generatedPrompt: "Gem이 완성한 프롬프트",
  aiResult: "프롬프트 실행 결과",
  gameTitle: "체험한 게임",
  studentAction: "내가 해 본 결과",
  feedbackMechanism: "즉시 받는 피드백",
  changePlan: "수업 적용 변경 계획",
  playedAt: "게임 체험 완료",
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

  const practiceStarter = `초등학교 5학년 수업에서 ${fromStep1.change || "학생의 배움을 돕는 활동"}을 찾고 싶습니다. 학생이 직접 생각하고 말하는 활동이면 좋겠습니다.`;

  return (
    <div className="gems-layout">
      {copyToast && (
        <div className="copy-toast" role="status" aria-live="polite">
          {copyToast}
        </div>
      )}

      <section className="gems-guide">
        <div className="guide-head">
          <h2>Gem 만들기</h2>
          <div className="guide-actions">
            <button className="secondary small-button" onClick={openMetaModal}>메타 프롬프트 크게 보기</button>
            <a className="primary small-button" href="https://gemini.google.com/gems" target="_blank" rel="noreferrer">Gemini 열기 ↗</a>
          </div>
        </div>

        <ol className="guide-steps">
          <li>
            <a className="guide-image" href="/gems/step-1.png" target="_blank" rel="noreferrer" aria-label="1단계 안내 이미지 크게 보기">
              <Image src="/gems/step-1.png" width={640} height={390} alt="Gem 관리자에서 새 Gem 버튼 위치" />
            </a>
            <div>
              <b>01</b>
              <strong>새 Gem을 여세요</strong>
              <p>Gem 관리자에서 ‘새 Gem’을 누릅니다.</p>
            </div>
          </li>
          <li>
            <a className="guide-image" href="/gems/step-2.png" target="_blank" rel="noreferrer" aria-label="2단계 안내 이미지 크게 보기">
              <Image src="/gems/step-2.png" width={640} height={390} alt="Gem 요청 사항에 메타 프롬프트를 붙여 넣는 위치" />
            </a>
            <div>
              <b>02</b>
              <strong>메타 프롬프트를 넣으세요</strong>
              <p>요청 사항에 붙여 넣고 저장합니다.</p>
              <button className="inline-action" onClick={copyMetaPrompt}>메타 프롬프트 복사</button>
            </div>
          </li>
          <li>
            <a className="guide-image" href="/gems/step-3.png" target="_blank" rel="noreferrer" aria-label="3단계 안내 이미지 크게 보기">
              <Image src="/gems/step-3.png" width={640} height={390} alt="저장된 Gem에서 채팅 시작 버튼 위치" />
            </a>
            <div>
              <b>03</b>
              <strong>채팅을 시작하세요</strong>
              <p>짧은 요청을 입력해 완성형 프롬프트를 받습니다.</p>
            </div>
          </li>
        </ol>
      </section>
      <section className="practice-panel">
        <header className="panel-title">
          <b>실습</b>
          <div>
            <h2>결과 남기기</h2>
            <p>Gem에서 만든 결과물이나 작성 프롬프트를 붙여 넣으세요.</p>
          </div>
        </header>
        <div className="starter-box">
          <span>1차시에서 이어가기</span>
          <p>{practiceStarter}</p>
          <button onClick={() => {
            navigator.clipboard.writeText(practiceStarter);
            setCopyToast("1차시 내용을 복사했습니다.");
            setTimeout(() => setCopyToast(null), 3000);
          }}>복사</button>
        </div>
        <div className="compact-form">
          {fields[2].map((field) => (
            <label key={field.key}>
              <span>{field.label}</span>
              <textarea
                value={data[field.key] || ""}
                onChange={(e) => onChange(field.key, e.target.value)}
                placeholder={field.placeholder}
              />
            </label>
          ))}
        </div>
      </section>

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
  { id: "spacing", title: "띄어쓰기 킹", tag: "국어 · 맞춤법", task: "문장을 보고 띄어쓰기 고치기", src: "/games/spacing.html" },
  { id: "alphabet", title: "알파벳 매칭 킹", tag: "영어 · 기초", task: "대문자와 소문자 연결하기", src: "/games/alphabet.html" },
  { id: "kind-words", title: "예쁜 말 킹", tag: "인성 · 언어", task: "상황에 맞는 따뜻한 말 고르기", src: "/games/kind-words.html" },
  { id: "magnet", title: "자석 디펜스 킹", tag: "과학 · 자석", task: "자석의 성질로 목표 지키기", src: "/games/magnet.html" },
] as const;

function GameLab({ data, onChange }: { data: Record<string, string>; onChange: (key: string, value: string) => void }) {
  const [subTab, setSubTab] = useState<"step1" | "step2">("step1");
  const [selected, setSelected] = useState(data.gameId || "spacing");

  const chooseGame = (id: string, title: string) => {
    setSelected(id);
    onChange("gameId", id);
    onChange("gameTitle", title);
  };

  const activeGame = gameCatalog.find((game) => game.id === selected) || gameCatalog[0];
  const step1Fields = fields[3].filter((field) => ["gameTitle", "studentAction", "feedbackMechanism", "changePlan"].includes(field.key));
  const step2Fields = fields[3].filter((field) => ["contentTitle", "contentTool", "resultUrl", "contentPlan"].includes(field.key));
  const contentUrl = data.resultUrl?.trim() || "";
  const canPreviewContent = /^https?:\/\/\S+$/i.test(contentUrl);

  return (
    <div className="game-lab">
      <nav className="subtab-bar" aria-label="3차시 단계 선택">
        <button className={subTab === "step1" ? "primary" : "secondary"} aria-pressed={subTab === "step1"} onClick={() => setSubTab("step1")}>
          1단계 · 추천 웹게임 체험
        </button>
        <button className={subTab === "step2" ? "primary" : "secondary"} aria-pressed={subTab === "step2"} onClick={() => setSubTab("step2")}>
          2단계 · 내 콘텐츠 탑재
        </button>
      </nav>

      {subTab === "step1" && <div className="game-layout">
          <section className="game-browser">
            <div className="guide-head">
              <div>
                <h2>추천 게임 4개</h2>
                <p>하나를 골라 3분만 해 보세요.</p>
              </div>
              <span className="source-note">270725_webgame 원본</span>
            </div>
            <div className="game-cards">
              {gameCatalog.map((game) => (
                <button
                  key={game.id}
                  aria-pressed={selected === game.id}
                  className={selected === game.id ? "selected" : ""}
                  onClick={() => chooseGame(game.id, game.title)}
                >
                  <span>{game.tag}</span>
                  <strong>{game.title}</strong>
                  <small>{game.task}</small>
                </button>
              ))}
            </div>
            <iframe
              key={activeGame.id}
              className="game-frame"
              src={activeGame.src}
              title={`${activeGame.title} 체험`}
              sandbox="allow-scripts"
              loading="lazy"
            />
            <button
              className={`experience-done ${data.playedAt ? "done" : ""}`}
              onClick={() => {
                onChange("playedAt", new Date().toISOString());
                onChange("gameId", activeGame.id);
                onChange("gameTitle", activeGame.title);
              }}
            >
              {data.playedAt ? "체험 완료" : "게임을 해 봤어요"}
            </button>
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
          </section>
      </div>}

      {subTab === "step2" && <div className="game-layout">
        <section className="reflection-panel">
          <header className="panel-title">
            <b>2단계</b>
            <div>
              <h2>내 콘텐츠 탑재하기</h2>
              <p>직접 만든 결과물의 공유 링크와 활용 계획을 남기세요.</p>
            </div>
          </header>
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
              <h2>콘텐츠 미리 보기</h2>
              <p>공유 링크를 넣으면 이곳에서 안전하게 확인할 수 있어요.</p>
            </div>
            {canPreviewContent && <a className="primary small-button" href={contentUrl} target="_blank" rel="noreferrer">새 창에서 열기</a>}
          </div>
          {canPreviewContent ? (
            <iframe className="game-frame" src={contentUrl} title="내가 만든 콘텐츠 미리 보기" sandbox="allow-scripts" loading="lazy" />
          ) : (
            <div className="demo-stage"><h3>결과물 링크를 넣어 주세요</h3><p>Gemini Canvas, Canva, 웹게임 등 공개된 공유 링크를 넣으면 여기에서 확인합니다.</p></div>
          )}
          <button className="secondary small-button" onClick={() => setSubTab("step1")}>← 1단계 게임 다시 보기</button>
        </section>
      </div>}
    </div>
  );
}

type GalleryItem = {
  id: number;
  school: string;
  name: string;
  problem: string;
  method: string;
  contentTitle: string;
  resultUrl: string;
  updatedAt: string;
};

function GalleryWalk({ data, onChange }: { data: Record<string, string>; onChange: (key: string, value: string) => void }) {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

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

  const applyFeedback = (item: GalleryItem) => {
    onChange("strength", `${item.name} 선생님의 수업에서 살리고 싶은 점: ${item.method || item.contentTitle}`);
    onChange("improvement", `${item.name} 선생님의 결과물을 보고 더 궁금한 점 또는 제안: `);
  };

  return <div className="gallery-work">
    <section className="gallery-intro">
      <b>갤러리 워크</b>
      <h2>동료의 수업 설계와 콘텐츠를 둘러보세요.</h2>
      <p>3차시를 제출한 동료의 결과물이 자동으로 모입니다. 한 작품을 보고, 살리고 싶은 점과 더 궁금한 점을 내 기록에 남겨 보세요.</p>
    </section>

    <section aria-live="polite">
      {loading && <div className="gallery-empty">동료 결과물을 불러오는 중입니다.</div>}
      {loadError && <div className="gallery-empty">{loadError}</div>}
      {!loading && !loadError && !items.length && <div className="gallery-empty">아직 3차시를 제출한 동료가 없습니다. 첫 번째 작품이 올라오면 이곳에 나타납니다.</div>}
      {!loading && !loadError && items.length > 0 && <div className="gallery-grid">
        {items.map((item) => <article key={item.id} className="gallery-card">
          <header className="gallery-meta"><span>{item.school}</span><strong>{item.name} 선생님</strong></header>
          <div className="gallery-piece"><small>수업 문제</small><p>{item.problem || "수업 문제를 정리 중입니다."}</p></div>
          <div className="gallery-piece"><small>수업 설계</small><p>{item.method || "수업 설계를 정리 중입니다."}</p></div>
          <div className="gallery-piece content"><small>3차시 콘텐츠</small><strong>{item.contentTitle || "콘텐츠 제목을 정리 중입니다."}</strong></div>
          <div className="gallery-actions">
            {item.resultUrl && <a className="primary small-button" href={item.resultUrl} target="_blank" rel="noreferrer">결과물 보기</a>}
            <button className="secondary small-button" onClick={() => applyFeedback(item)}>의견 기록에 가져오기</button>
          </div>
        </article>)}
      </div>}
    </section>

    <section className="reflection-panel gallery-reflection">
      <header className="panel-title"><b>기록</b><div><h2>동료 피드백과 최종 적용</h2><p>한 작품을 보고 내 수업에 반영할 점을 정리하세요.</p></div></header>
      <div className="form-grid">
        {fields[4].map((field, index) => <label key={field.key} className={field.long ? "wide" : ""}>
          <span><i>{index + 1}</i>{field.label}</span>
          {field.long ? <textarea value={data[field.key] || ""} onChange={(event) => onChange(field.key, event.target.value)} placeholder={field.placeholder} /> : <input value={data[field.key] || ""} onChange={(event) => onChange(field.key, event.target.value)} placeholder={field.placeholder} />}
        </label>)}
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
      {selected && <div className="modal-backdrop" onClick={() => setSelected(null)}><article className="modal" role="dialog" aria-modal="true" aria-labelledby="workbook-dialog-title" onClick={(e) => e.stopPropagation()}><button className="modal-close" autoFocus onClick={() => setSelected(null)}>닫기</button><h2 id="workbook-dialog-title">{selected.name}님의 워크북</h2>{([1,2,3,4] as Step[]).map((step) => { const sub = selected.submissions[step]; const parsed = sub ? JSON.parse(sub.dataJson || "{}") : {}; const visibleEntries = Object.entries(parsed).filter(([key]) => key !== "scene"); return <section key={step}><h3>{step}차시 · {stepMeta[step].title}</h3>{sub ? visibleEntries.map(([k,v]) => <p key={k}><span>{fields[step].find(f => f.key === k)?.label || lessonOneExtraLabels[k] || k}</span>{String(v) || "—"}</p>) : <p className="muted">작성 내용이 없습니다.</p>}</section>; })}</article></div>}
    </main>
  );
}

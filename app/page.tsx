"use client";

import { useEffect, useMemo, useState } from "react";

type Step = 1 | 2 | 3 | 4;
type LessonOneStep = 1 | 2 | 3;
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
  1: { short: "문제 정의", title: "판단을 수업 조건으로 바꾸기", hint: "학생에 대한 판단을 다시 보고, 다음 수업에서 바꿀 조건을 정합니다." },
  2: { short: "방법 탐색", title: "수업 방법 탐색", hint: "AI에 전달할 요청을 만들고 우리 수업에 맞는 방법을 고릅니다." },
  3: { short: "콘텐츠 제작", title: "수업 콘텐츠 제작", hint: "제작 조건을 정리하고 완성한 결과물 링크를 남깁니다." },
  4: { short: "검토·수정", title: "동료 검토와 최종 제출", hint: "받은 의견을 바탕으로 실제 수업에서 쓸 수 있게 다듬습니다." },
} as const;

const fields: Record<Step, { key: string; label: string; placeholder: string; long?: boolean }[]> = {
  1: [
    { key: "firstJudgment", label: "처음 한 판단", placeholder: "예: 학습 의욕이 낮다고 생각했다." },
    { key: "additionalInfo", label: "새롭게 확인한 정보", placeholder: "학생의 행동, 말, 질문, 조건이 달라졌을 때의 변화를 적어 주세요.", long: true },
    { key: "blockPoint", label: "배움을 막았을 가능성이 있는 요인", placeholder: "예: 핵심 어휘와 답을 쓰는 방법을 이해하지 못했다." },
    { key: "change", label: "바꿔 볼 수업 조건", placeholder: "예: 핵심 어휘를 쉬운 말과 사례로 설명한다." },
  ],
  2: [
    { key: "gradeSubject", label: "학년과 교과", placeholder: "예: 초등학교 5학년 사회" },
    { key: "difficulty", label: "학생의 어려움", placeholder: "1차시 결과를 바탕으로 구체적으로 적어 주세요." },
    { key: "desiredActivity", label: "학생이 하기를 바라는 활동", placeholder: "예: 핵심 어휘를 자신의 말로 설명하고 활용하기" },
    { key: "conditions", label: "수업 조건", placeholder: "시간, 인원, 기기 환경, 피하고 싶은 방식 등을 적어 주세요.", long: true },
    { key: "candidates", label: "AI가 제안한 방법 후보", placeholder: "후보 1, 후보 2, 후보 3과 간단한 장단점을 적어 주세요.", long: true },
    { key: "selectedMethod", label: "선택한 방법", placeholder: "우리 반에서 실행할 방법 하나를 적어 주세요." },
  ],
  3: [
    { key: "contentType", label: "만들 콘텐츠", placeholder: "예: 전자칠판용 단어 맞추기 게임" },
    { key: "tool", label: "사용할 도구", placeholder: "예: Gemini Canvas" },
    { key: "environment", label: "사용 환경", placeholder: "예: 교실 전자칠판, 2~4명 참여" },
    { key: "features", label: "꼭 필요한 기능", placeholder: "학생이 실제로 사용할 핵심 기능만 적어 주세요.", long: true },
    { key: "resultUrl", label: "결과물 링크", placeholder: "공유 가능한 URL을 붙여 넣어 주세요." },
    { key: "usage", label: "수업에서 사용하는 방법", placeholder: "언제, 누가, 무엇을 하는지 한두 문장으로 적어 주세요.", long: true },
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
  const [lessonOneStep, setLessonOneStep] = useState<LessonOneStep>(1);
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
    if (session) void loadSubmissions(session.participantId);
  }, [session]);

  async function loadSubmissions(participantId: number) {
    const res = await fetch(`/api/submissions?participantId=${participantId}`);
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
    await loadSubmissions(body.session.participantId);
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
      body: JSON.stringify({ participantId: session.participantId, step, status, data: current.data }),
    });
    const body = await res.json();
    setBusy(false);
    if (!res.ok) return setMessage(body.error || "저장하지 못했습니다.");
    setSubmissions((prev) => ({ ...prev, [step]: { ...prev[step], status, updatedAt: body.updatedAt } }));
    setMessage(status === "submitted" ? "제출했습니다. 언제든 수정해 다시 제출할 수 있어요." : "임시 저장했습니다.");
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
          <button className="logout" onClick={() => { window.localStorage.removeItem("oneday-session"); setSession(null); }}>나가기</button>
        </aside>

        <section className="work-area">
          <div className="step-heading">
            <p>{step}차시 {step === 1 ? `· ${lessonOneStep}/3단계` : "결과물"}</p>
            <h1>{step === 1 && lessonOneStep === 1 ? "사실과 해석 구분하기" : step === 1 && lessonOneStep === 2 ? "해석을 확인할 정보 찾기" : stepMeta[step].title}</h1>
            <span>{step === 1 && lessonOneStep === 1 ? "눈이나 귀로 확인한 사실과 그 이유에 대한 해석을 구분해 봅니다." : step === 1 && lessonOneStep === 2 ? "내 해석이 맞는지 확인하려면 무엇을 더 알아야 할지 생각해 봅니다." : stepMeta[step].hint}</span>
          </div>

          {step === 1 && <LessonOneProgress current={lessonOneStep} onSelect={setLessonOneStep} />}
          {step === 1 && lessonOneStep === 1 && <FactOrInterpretation data={current.data} onChange={updateField} />}
          {step === 1 && lessonOneStep === 2 && <MoreInformation data={current.data} onChange={updateField} />}
          {step === 1 && lessonOneStep === 3 && <SentencePreview data={current.data} />}
          {step === 2 && <PromptPreview data={current.data} fromStep1={submissions[1].data} />}
          {step === 3 && <PlanPreview data={current.data} fromStep2={submissions[2].data} />}

          {(step !== 1 || lessonOneStep === 3) && <div className="form-grid">
            {fields[step].map((field, index) => (
              <label key={field.key} className={field.long ? "wide" : ""}>
                <span><i>{index + 1}</i>{field.label}</span>
                {field.long ? (
                  <textarea value={current.data[field.key] || ""} onChange={(e) => updateField(field.key, e.target.value)} placeholder={field.placeholder} />
                ) : (
                  <input value={current.data[field.key] || ""} onChange={(e) => updateField(field.key, e.target.value)} placeholder={field.placeholder} />
                )}
              </label>
            ))}
          </div>}

          <footer className="actionbar">
            <p role="status" aria-live="polite">{message || (current.status === "submitted" ? "제출 완료 · 수정 후 다시 제출할 수 있어요." : "아직 제출하지 않은 초안입니다.")}</p>
            <div>
              {step === 1 && lessonOneStep > 1 && <button className="secondary" onClick={() => setLessonOneStep((lessonOneStep - 1) as LessonOneStep)}>이전</button>}
              <button className="secondary" onClick={() => save("draft")} disabled={busy}>임시 저장</button>
              {step === 1 && lessonOneStep < 3
                ? <button className="primary compact" onClick={() => { setLessonOneStep((lessonOneStep + 1) as LessonOneStep); setMessage(""); }}>다음 단계</button>
                : <button className="primary compact" onClick={() => save("submitted")} disabled={busy}>{current.status === "submitted" ? "다시 제출" : "제출하기"}</button>}
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

const lessonOneExtraLabels: Record<string, string> = {
  factChoice1: "문장 1 분류",
  factChoice2: "문장 2 분류",
  factChoice3: "문장 3 분류",
  factChoice4: "문장 4 분류",
  infoToKnow: "추가로 알고 싶은 학생의 행동이나 말",
  infoToObserve: "다음 수업에서 확인해 볼 정보",
};

function LessonOneProgress({ current, onSelect }: { current: LessonOneStep; onSelect: (step: LessonOneStep) => void }) {
  const labels = ["사실과 해석", "추가 정보", "문제 정의"];
  return <nav className="inner-steps" aria-label="1차시 활동 단계">{labels.map((label, index) => {
    const item = (index + 1) as LessonOneStep;
    return <button key={label} className={current === item ? "active" : ""} aria-current={current === item ? "step" : undefined} onClick={() => onSelect(item)}><i>{item}</i><span>{label}</span></button>;
  })}</nav>;
}

function FactOrInterpretation({ data, onChange }: { data: Record<string, string>; onChange: (key: string, value: string) => void }) {
  return <div className="lesson-activity">
    <div className="concept-pair">
      <section><strong>사실</strong><p>눈이나 귀로 확인할 수 있는 행동이나 말</p></section>
      <section><strong>해석</strong><p>행동의 이유에 대해 교사가 붙인 설명</p></section>
    </div>
    <div className="activity-heading"><span>활동</span><h2>각 문장은 사실일까요, 해석일까요?</h2></div>
    <div className="classification-list">
      {factQuestions.map((question, index) => {
        const key = `factChoice${index + 1}`;
        return <div className="classification-row" key={key}><p id={`${key}-label`}><i>{index + 1}</i>{question}</p><div role="radiogroup" aria-labelledby={`${key}-label`}>
          {(["사실", "해석"] as const).map((choice) => <label key={choice} className={data[key] === choice ? "selected" : ""}><input type="radio" name={key} value={choice} checked={data[key] === choice} onChange={() => onChange(key, choice)} /><span>{choice}</span></label>)}
        </div></div>;
      })}
    </div>
    <p className="remember-note">학생의 행동은 사실이지만, 그 이유에 대한 판단은 해석일 수 있습니다.</p>
  </div>;
}

function MoreInformation({ data, onChange }: { data: Record<string, string>; onChange: (key: string, value: string) => void }) {
  return <div className="lesson-activity">
    <div className="form-grid information-grid">
      <label className="wide"><span><i>1</i>추가로 알고 싶은 학생의 행동이나 말</span><textarea value={data.infoToKnow || ""} onChange={(e) => onChange("infoToKnow", e.target.value)} placeholder="예: 어떤 질문에서 멈췄는지, 친구의 설명에는 어떻게 반응했는지" /></label>
      <label className="wide"><span><i>2</i>다음 수업에서 확인해 볼 정보</span><textarea value={data.infoToObserve || ""} onChange={(e) => onChange("infoToObserve", e.target.value)} placeholder="예: 핵심 어휘를 설명한 뒤 학생이 과제를 시작하는지 관찰한다." /></label>
    </div>
    <p className="remember-note">추측을 더하는 대신, 판단을 확인할 수 있는 행동과 말을 찾아보세요.</p>
  </div>;
}

function SentencePreview({ data }: { data: Record<string, string> }) {
  return <div className="preview"><span>작성 중인 문제 정의</span><p>처음에는 <b>{data.firstJudgment || "______"}</b>고 판단했다. 그러나 <b>{data.additionalInfo || "______"}</b>을 확인한 뒤, <b>{data.blockPoint || "______"}</b>이 배움을 막았을 가능성이 있다고 보았다. 따라서 수업에서 <b>{data.change || "______"}</b>을 해 볼 필요가 있다.</p></div>;
}

function PromptPreview({ data, fromStep1 }: { data: Record<string, string>; fromStep1: Record<string, string> }) {
  const prompt = `나는 ${data.gradeSubject || "___ 학년 ___ 교과"}를 가르칩니다. 학생들은 ${data.difficulty || fromStep1.blockPoint || "___"} 때문에 어려움을 겪습니다. 수업에서 학생이 ${data.desiredActivity || "___"}하도록 돕고 싶습니다. ${data.conditions || "우리 수업에서 실행 가능한"} 서로 다른 방법을 제안해 주세요.`;
  return <div className="preview prompt"><span>AI에 복사할 요청문</span><p>{prompt}</p><button onClick={() => navigator.clipboard.writeText(prompt)}>복사하기</button></div>;
}

function PlanPreview({ data, fromStep2 }: { data: Record<string, string>; fromStep2: Record<string, string> }) {
  return <div className="preview"><span>콘텐츠 개발 계획</span><p>나는 수업에서 학생이 <b>{fromStep2.desiredActivity || "______"}</b>하도록 <b>{data.contentType || fromStep2.selectedMethod || "______"}</b>을 만들겠다.</p></div>;
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

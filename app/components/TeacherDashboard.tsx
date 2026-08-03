import React, { useState, useEffect, useCallback, useRef } from "react";
import { Brand } from "./Brand";

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

const stepMeta = {
  1: { short: "문제 정의", title: "배움에서 수업 문제까지", hint: "남길 배움과 현재 장면을 연결하고, AI가 필요한 이유를 결정합니다." },
  2: { short: "수업 설계", title: "수업을 어떻게 설계할 것인가?", hint: "Gem을 만든 뒤 직접 실습하고 결과를 남깁니다." },
  3: { short: "콘텐츠 제작", title: "수업 웹게임 / 콘텐츠 개발 및 탑재", hint: "추천 웹게임을 연구하고, 직접 만든 수업 콘텐츠를 탑재해 테스트합니다." },
  4: { short: "갤러리워크", title: "갤러리워크와 최종 제출", hint: "동료 작품을 둘러보고, 의견을 반영한 최종 결과물을 제출합니다." },
} as const;

const fields: Record<Step, { key: string; label: string }[]> = {
  1: [
    { key: "gradeLevel", label: "학교급·학년" },
    { key: "subjectUnit", label: "교과·단원" },
    { key: "lessonScene", label: "돌아볼 수업 장면" },
    { key: "learningGoal", label: "남길 배움" },
    { key: "observedSpeech", label: "학생이 한 말" },
    { key: "observedAction", label: "학생이 한 행동" },
    { key: "observedMissing", label: "학생이 멈추거나 하지 못한 행동" },
    { key: "observedResult", label: "학생이 만든 결과물" },
    { key: "possibleInterpretation1", label: "가능한 해석 1" },
    { key: "possibleInterpretation2", label: "가능한 해석 2" },
    { key: "unknownInfo", label: "아직 모르는 것" },
    { key: "nextCheck", label: "다음에 확인할 방법" },
    { key: "learningEvidence1", label: "배움 확인 기준 1" },
    { key: "learningEvidence2", label: "배움 확인 기준 2" },
    { key: "problemStatement", label: "내 수업의 문제" },
    { key: "aiDirection", label: "AI 활용 방향" },
    { key: "aiSupport", label: "AI가 도울 부분" },
    { key: "teacherJudgment1", label: "교사가 판단할 부분 1" },
    { key: "teacherJudgment2", label: "교사가 판단할 부분 2" },
  ],
  2: [
    { key: "grade", label: "학년" },
    { key: "subject", label: "교과" },
    { key: "difficultyCause", label: "어려움의 원인" },
    { key: "difficultTask", label: "학생이 어려워하는 것" },
    { key: "desiredAction", label: "원하는 학생 행동" },
    { key: "gemPracticeRequest", label: "완성한 AI 요청문" },
    { key: "method1", label: "AI가 제안한 방법 1" },
    { key: "method2", label: "AI가 제안한 방법 2" },
    { key: "method3", label: "AI가 제안한 방법 3" },
    { key: "method4", label: "AI가 제안한 방법 4" },
    { key: "method5", label: "AI가 제안한 방법 5" },
    { key: "selectedMethod", label: "내가 선택한 방법" },
    { key: "selectionReason", label: "선택한 이유" },
  ],
  3: [
    { key: "gameTitle", label: "체험한 게임" },
    { key: "studentAction", label: "내가 해 본 결과" },
    { key: "feedbackMechanism", label: "어떤 피드백을 바로 받나요?" },
    { key: "changePlan", label: "내 수업에 맞게 무엇을 바꿀까요?" },
    { key: "contentTitle", label: "내가 만든 콘텐츠 제목" },
    { key: "resultUrl", label: "탑재한 결과물" },
    { key: "contentPlan", label: "수업에서 어떻게 활용할까요?" },
  ],
  4: [
    { key: "revision", label: "반영한 의견과 수정 내용" },
    { key: "finalUrl", label: "최종 결과물 업로드" },
  ],
};

const lessonOneExtraLabels: Record<string, string> = {
  aiHelpExplore: "AI 도움: 관점·대안 탐색",
  aiHelpDraft: "AI 도움: 초안 제작",
  aiHelpCompare: "AI 도움: 비교·검토",
  aiHelpObserve: "AI 도움: 추가 관찰",
  aiHelpHold: "AI 활용 이유가 불분명함",
  reviewGoalClear: "마지막 점검: 배움 목표",
  reviewAiUseful: "마지막 점검: AI 활용",
  reviewEvidenceClear: "마지막 점검: 확인 기준",
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

interface TeacherDashboardProps {
  data: TeacherData;
  classCode: string;
  adminCode: string;
  onBack: () => void;
}

export function TeacherDashboard({ data, classCode, adminCode, onBack }: TeacherDashboardProps) {
  const [rosterData, setRosterData] = useState<TeacherData>(data);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "not-started" | "in-progress" | "completed">("all");
  const returnFocusRef = useRef<HTMLButtonElement | null>(null);
  
  // Real-time synchronization states
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [isSyncing, setIsSyncing] = useState(false);

  // Compute selected participant dynamically to avoid synchronization side-effects
  const selected = selectedId !== null 
    ? rosterData.participants.find((p) => p.id === selectedId) || null 
    : null;
  const visibleParticipants = rosterData.participants.filter((participant) => {
    const keyword = searchQuery.trim().toLowerCase();
    const matchesKeyword = !keyword || `${participant.school} ${participant.name}`.toLowerCase().includes(keyword);
    const submissionCount = ([1, 2, 3, 4] as Step[]).filter((step) => participant.submissions[step]?.status === "submitted").length;
    const started = ([1, 2, 3, 4] as Step[]).some((step) => Boolean(participant.submissions[step]));
    const matchesStatus = statusFilter === "all"
      || (statusFilter === "not-started" && !started)
      || (statusFilter === "in-progress" && started && submissionCount < 4)
      || (statusFilter === "completed" && submissionCount === 4);
    return matchesKeyword && matchesStatus;
  });

  const closeParticipant = useCallback(() => {
    setSelectedId(null);
    window.requestAnimationFrame(() => returnFocusRef.current?.focus());
  }, []);

  const fetchUpdates = useCallback(async () => {
    setIsSyncing(true);
    try {
      const res = await fetch(
        `/api/teacher?classCode=${encodeURIComponent(classCode)}&adminCode=${encodeURIComponent(adminCode)}`
      );
      if (res.ok) {
        const updated = (await res.json()) as TeacherData;
        setRosterData(updated);
      }
    } catch (err) {
      console.error("Auto sync failed", err);
    } finally {
      setIsSyncing(false);
    }
  }, [classCode, adminCode]);

  // Polling hook
  useEffect(() => {
    if (!autoRefresh) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          void fetchUpdates();
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRefresh, fetchUpdates]);

  useEffect(() => {
    if (selectedId === null) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeParticipant();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedId, closeParticipant]);

  // CSV Spreadsheet Export ( 한글 깨짐 방지 UTF-8 BOM 탑재 )
  const exportToCsv = () => {
    const participants = rosterData.participants;
    const csvRows = [];

    // Header definition
    const headers = [
      "학교명", "이름",
      "1차시 학교급·학년", "1차시 교과·단원", "1차시 돌아볼 수업 장면", "1차시 남길 배움", "1차시 현재 장면", "1차시 가능한 해석", "1차시 배움 확인 기준", "1차시 수업 문제", "1차시 AI 활용 방향", "1차시 AI가 도울 부분",
      "2차시 학년", "2차시 교과", "2차시 학생 어려움 이유", "2차시 학생 어려워하는 것", "2차시 원하는 학생 행동", "2차시 선택한 방법", "2차시 선택한 이유",
      "3차시 체험한 게임", "3차시 내가 해 본 결과", "3차시 즉시 받은 피드백", "3차시 내 수업 적용 변경 계획", "3차시 내가 만든 콘텐츠 제목", "3차시 탑재 결과물 URL", "3차시 수업 활용 계획",
      "4차시 반영한 의견/수정 내용", "4차시 최종 결과물 URL"
    ];
    csvRows.push(headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(","));

    for (const p of participants) {
      const p1 = p.submissions[1] ? JSON.parse(p.submissions[1].dataJson || "{}") : {};
      const p2 = p.submissions[2] ? JSON.parse(p.submissions[2].dataJson || "{}") : {};
      const p3 = p.submissions[3] ? JSON.parse(p.submissions[3].dataJson || "{}") : {};
      const p4 = p.submissions[4] ? JSON.parse(p.submissions[4].dataJson || "{}") : {};

      const row = [
        p.school,
        p.name,
        p1.gradeLevel ?? "", p1.subjectUnit ?? "", p1.lessonScene ?? "", p1.learningGoal ?? "",
        p1.observedMissing ?? p1.observedResult ?? p1.observedAction ?? p1.additionalInfo ?? "",
        p1.possibleInterpretation1 ?? p1.firstJudgment ?? "",
        p1.learningEvidence1 ?? p1.learningEvidence2 ?? "",
        p1.problemStatement ?? "", p1.aiDirection ?? "", p1.aiSupport ?? p1.change ?? "",
        p2.grade ?? "", p2.subject ?? "", p2.difficultyCause ?? "", p2.difficultTask ?? "", p2.desiredAction ?? "", p2.selectedMethod ?? "", p2.selectionReason ?? "",
        p3.gameTitle ?? "", p3.studentAction ?? "", p3.feedbackMechanism ?? "", p3.changePlan ?? "", p3.contentTitle ?? "", p3.resultUrl ?? "", p3.contentPlan ?? "",
        p4.revision ?? "", p4.finalUrl ?? ""
      ];
      csvRows.push(row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","));
    }

    const csvContent = "\uFEFF" + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `AI_원데이클래스_결과물_${classCode}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (step: Step, participant: TeacherParticipant) => {
    const sub = participant.submissions[step];
    if (!sub) return <span className="status-badge status-none">미시작</span>;
    if (sub.status === "submitted") return <span className="status-badge status-submitted">제출완료</span>;
    return <span className="status-badge status-draft">작성중</span>;
  };

  return (
    <main className="teacher-shell">
      <header className="teacher-head">
        <div>
          <Brand />
          <p>
            {rosterData.className} · 참여자 {rosterData.participants.length}명
          </p>
        </div>
        <div className="teacher-controls">
          {/* Auto Refresh Toggle Switch */}
          <div className="toggle-container">
            <span className="sync-indicator">
              {isSyncing ? (
                <span className="syncing-icon">🔄 동기화 중...</span>
              ) : autoRefresh ? (
                <span className="sync-countdown">⏱️ {countdown}초 후 자동 갱신</span>
              ) : (
                "자동 갱신 꺼짐"
              )}
            </span>
            <label className="switch">
              <input
                type="checkbox"
                aria-label="자동 갱신"
                checked={autoRefresh}
                onChange={(e) => {
                  setAutoRefresh(e.target.checked);
                  if (e.target.checked) setCountdown(10);
                }}
              />
              <span className="slider round"></span>
            </label>
            <span className="toggle-label">자동 갱신</span>
          </div>

          <button type="button" className="secondary compact" onClick={() => void fetchUpdates()} disabled={isSyncing}>
            {isSyncing ? "갱신 중…" : "지금 새로고침"}
          </button>

          <button type="button" className="secondary compact" onClick={exportToCsv}>
            📊 엑셀 내보내기 (CSV)
          </button>
          <button type="button" className="secondary compact" onClick={onBack}>
            다른 클래스 보기
          </button>
        </div>
      </header>

      {/* Roster stats summary cards */}
      <section className="teacher-summary">
        {([1, 2, 3, 4] as Step[]).map((step) => {
          const totalCount = rosterData.participants.length;
          const submittedCount = rosterData.summary[step] || 0;
          const percent = totalCount > 0 ? Math.round((submittedCount / totalCount) * 100) : 0;
          return (
            <div key={step} className="summary-card">
              <span>{step}차시 · {stepMeta[step].short}</span>
              <strong>{submittedCount} / {totalCount} 명</strong>
              <div
                className="card-progress"
                role="progressbar"
                aria-label={`${step}차시 제출률`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
              >
                <div className="progress-bar" style={{ width: `${percent}%` }}></div>
                <small>{percent}% 제출</small>
              </div>
            </div>
          );
        })}
      </section>

      {/* Roster listing grid */}
      <section className="roster">
        <div className="roster-head">
          <div>
            <h1>제출 현황판</h1>
            <p>검색하거나 상태를 골라 참여자의 핵심 작성 내용을 확인하세요.</p>
          </div>
          <div className="roster-filters">
            <label>
              <span>참여자 검색</span>
              <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="학교명 또는 이름" />
            </label>
            <label>
              <span>진행 상태</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
                <option value="all">전체</option>
                <option value="not-started">미시작</option>
                <option value="in-progress">진행 중</option>
                <option value="completed">4차시 완료</option>
              </select>
            </label>
          </div>
        </div>
        
        {rosterData.participants.length > 0 ? (
          <div className="table-responsive">
            <table className="roster-table">
              <thead>
                <tr>
                  <th>소속 학교</th>
                  <th>이름</th>
                  <th>1차시</th>
                  <th>2차시</th>
                  <th>3차시</th>
                  <th>4차시</th>
                  <th style={{ textAlign: "right" }}>상세</th>
                </tr>
              </thead>
              <tbody>
                {visibleParticipants.map((person) => (
                  <tr key={person.id} className="roster-row">
                    <td>{person.school}</td>
                    <td><strong>{person.name}</strong></td>
                    <td>{getStatusBadge(1, person)}</td>
                    <td>{getStatusBadge(2, person)}</td>
                    <td>{getStatusBadge(3, person)}</td>
                    <td>{getStatusBadge(4, person)}</td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className="view-detail-link"
                        onClick={(event) => {
                          returnFocusRef.current = event.currentTarget;
                          setSelectedId(person.id);
                        }}
                      >
                        보기 ↗
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visibleParticipants.length === 0 && <div className="empty">조건에 맞는 참여자가 없습니다.</div>}
          </div>
        ) : (
          <div className="empty">아직 입장한 참여자가 없습니다.</div>
        )}
      </section>

      {/* Participant Workbook Detail Modal */}
      {selected && (
        <div className="modal-backdrop" onClick={closeParticipant}>
          <article
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="workbook-dialog-title"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key !== "Tab") return;
              const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"))
                .filter((element) => !element.hasAttribute("disabled"));
              if (!focusable.length) return;
              const first = focusable[0];
              const last = focusable[focusable.length - 1];
              if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
              }
            }}
            style={{ width: "min(860px, 100%)" }}
          >
            <button
              type="button"
              className="modal-close"
              autoFocus
              onClick={closeParticipant}
            >
              닫기
            </button>
            <h2 id="workbook-dialog-title" style={{ display: "flex", gap: "10px", alignItems: "baseline" }}>
              {selected.name} 선생님의 워크북
              <small style={{ fontSize: "14px", fontWeight: "normal", color: "#66706a" }}>
                ({selected.school})
              </small>
            </h2>

            {([1, 2, 3, 4] as Step[]).map((step) => {
              const sub = selected.submissions[step];
              const parsed = sub ? JSON.parse(sub.dataJson || "{}") : {};
              const visibleEntries = Object.entries(parsed).filter(
                ([key]) =>
                  ![
                    "scene",
                    "strength",
                    "improvement",
                    "finalNote",
                    "generatedPrompt",
                    "aiResult",
                    "gemCreatedAt",
                    "selectedMethodIndex",
                    "contentTool",
                    "galleryComments",
                    "teacherFeedback", // Hide feedback saved by older versions
                  ].includes(key)
              );

              return (
                <section key={step} className="modal-step-section" style={{ borderTop: "2px solid #edf2ed", padding: "20px 0" }}>
                  <h3 style={{ color: "var(--green)", fontSize: "16px", fontWeight: "700", marginBottom: "14px" }}>
                    {step}차시 · {stepMeta[step].title}
                  </h3>

                  {sub ? (
                    <div className="submitted-answers" style={{ display: "grid", gap: "10px", marginBottom: "18px" }}>
                      {visibleEntries.map(([k, v]) => (
                        <p key={k} style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: "14px", margin: "0", fontSize: "14px" }}>
                          <span style={{ color: "#66706a", fontWeight: "600" }}>
                            {fields[step].find((f) => f.key === k)?.label ||
                              lessonOneExtraLabels[k] ||
                              k}
                          </span>
                          <span style={{ color: "var(--ink)", whiteSpace: "pre-wrap" }}>
                            {k === "resultUrl" || k === "finalUrl" ? (
                              <a href={String(v)} target="_blank" rel="noreferrer" style={{ color: "var(--green)", textDecoration: "underline", fontWeight: "700" }}>
                                {k === "finalUrl" ? "최종 결과물 다운로드/확인 ↗" : "3차시 탑재물 확인 ↗"}
                              </a>
                            ) : (
                              String(v) || "—"
                            )}
                          </span>
                        </p>
                      ))}

                      {/* 1차시 완성문장 특별 미리보기 제공 */}
                      {step === 1 && (parsed.problemStatement || parsed.firstJudgment) && (
                        <div className="sentence-special-preview" style={{ marginTop: "10px", padding: "10px 14px", background: "#f2f8f4", border: "1px solid #b8d8c5", borderRadius: "5px", fontSize: "13.5px" }}>
                          <strong>수업 문제 문장:</strong>
                          <p style={{ margin: "5px 0 0", color: "var(--green)" }}>
                            {parsed.problemStatement || <>처음에는 <b>{parsed.firstJudgment}</b>라고 판단했다. 그러나 <b>{parsed.additionalInfo}</b>을 확인한 뒤, <b>{parsed.blockPoint}</b>이 배움을 막았을 가능성이 있다고 보았다. 따라서 수업에서 <b>{parsed.change}</b>을 해 볼 필요가 있다.</>}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="muted" style={{ fontSize: "13.5px", fontStyle: "italic", marginBottom: "18px" }}>
                      아직 진행하지 않았거나 임시저장 상태입니다.
                    </p>
                  )}
                </section>
              );
            })}
          </article>
        </div>
      )}
    </main>
  );
}

import React, { useState } from "react";

const factQuestions = [
  "학생이 토의 시간 동안 한 번도 말하지 않았다.",
  "이 학생은 토의에 참여할 의지도 없고 생각도 없다.",
  "학생이 활동 중 교과서의 앞뒤 쪽을 계속 넘겼다.",
  "쓸데없는 짓을 하며 집중하지 않는다.",
] as const;
const factAnswers = ["사실", "해석", "사실", "해석"] as const;

type LessonStage = 1 | 2 | 3;

const stages: { id: LessonStage; label: string; short: string }[] = [
  { id: 1, label: "배움 정하기", short: "01" },
  { id: 2, label: "장면·확인 기준", short: "02" },
  { id: 3, label: "문제·AI 결정", short: "03" },
];

interface LessonOneActivityProps {
  data: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

function cleanSentence(value: string) {
  return value.trim().replace(/[.!?。！？]+$/u, "").replace(/\s+/g, " ");
}

function asObservedSentence(value: string) {
  const cleaned = cleanSentence(value)
    .replace(/^(학생은|학생이)\s*현재\s*/u, "$1 ")
    .replace(/^현재\s*/u, "");
  return cleaned || "학생의 현재 모습이 구체적으로 확인되지 않았다";
}

function asAbilityQuestion(value: string) {
  const cleaned = cleanSentence(value);
  if (!cleaned) return "목표한 배움이 실제로 나타났는지";
  if (/(는지|은지|인지|했는지|있는지|없는지)$/u.test(cleaned)) return cleaned;
  if (cleaned.endsWith("할 수 있다")) return `${cleaned.slice(0, -6)}할 수 있는지`;
  if (cleaned.endsWith("한다")) return `${cleaned.slice(0, -2)}할 수 있는지`;
  if (cleaned.endsWith("된다")) return `${cleaned.slice(0, -2)}될 수 있는지`;
  if (cleaned.endsWith("이다")) return `${cleaned.slice(0, -2)}인지`;
  if (cleaned.endsWith("있다")) return `${cleaned.slice(0, -2)}있는지`;
  if (cleaned.endsWith("없다")) return `${cleaned.slice(0, -2)}없는지`;
  return `‘${cleaned}’라는 배움이 실제로 나타났는지`;
}

function asEvidenceQuestion(value: string) {
  const cleaned = cleanSentence(value);
  if (!cleaned) return "학생의 말과 행동에서 배움이 나타나는지";
  if (/(는지|은지|인지|했는지|있는지|없는지)$/u.test(cleaned)) return cleaned;
  if (cleaned.endsWith("할 수 있다")) return `${cleaned.slice(0, -6)}할 수 있는지`;
  if (cleaned.endsWith("한다")) return `${cleaned.slice(0, -2)}하는지`;
  if (cleaned.endsWith("된다")) return `${cleaned.slice(0, -2)}되는지`;
  if (cleaned.endsWith("이다")) return `${cleaned.slice(0, -2)}인지`;
  if (cleaned.endsWith("있다")) return `${cleaned.slice(0, -2)}있는지`;
  if (cleaned.endsWith("없다")) return `${cleaned.slice(0, -2)}없는지`;
  return `‘${cleaned}’라는 반응이 나타나는지`;
}

export function LessonOneActivity({ data, onChange }: LessonOneActivityProps) {
  const [stage, setStage] = useState<LessonStage>(1);

  const goToStage = (nextStage: LessonStage) => {
    setStage(nextStage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const buildProblemStatement = () => {
    const observed = asObservedSentence(data.observedMissing || data.observedResult || data.observedAction || data.additionalInfo || "");
    const learning = asAbilityQuestion(data.learningGoal || "");
    const evidence = [data.learningEvidence1, data.learningEvidence2]
      .filter(Boolean)
      .map(asEvidenceQuestion)
      .join(", 또 ") || asEvidenceQuestion("");
    onChange(
      "problemStatement",
      `현재 수업에서는 ${observed}. 그러나 ${learning} 아직 확인하지 못했다. 다음 수업에서는 ${evidence} 확인할 필요가 있다.`,
    );
  };

  return (
    <div className="lesson-one-flow">
      <nav className="stage-tabs lesson-one-tabs" aria-label="1차시 활동 단계">
        {stages.map((item) => (
          <button
            key={item.id}
            type="button"
            className={stage === item.id ? "active" : ""}
            aria-current={stage === item.id ? "step" : undefined}
            onClick={() => goToStage(item.id)}
          >
            <span>{item.short}</span>
            <strong>{item.label}</strong>
          </button>
        ))}
      </nav>

      {stage === 1 && (
        <section className="lesson-one-stage">
          <StageHeader number="A" title="남길 배움" description="활동명 대신, 학생이 이해하고 할 수 있어야 할 일을 한 문장으로 적습니다." />
          <div className="lesson-context-grid">
            <SingleLineField label="학교급·학년" value={data.gradeLevel || ""} onValue={(value) => onChange("gradeLevel", value)} placeholder="예: 초등학교 6학년" />
            <SingleLineField label="교과·단원" value={data.subjectUnit || ""} onValue={(value) => onChange("subjectUnit", value)} placeholder="예: 사회 · 지속 가능한 생활" />
            <SingleLineField label="돌아볼 수업 장면" value={data.lessonScene || ""} onValue={(value) => onChange("lessonScene", value)} placeholder="예: 에너지 절약 방안 제안 수업" />
          </div>
          <div className={`lesson-one-focus ${data.learningGoal?.trim() ? "is-filled" : ""}`}>
            <label>
              <span className="writing-field-head">
                <strong>이 수업에서 학생이 무엇을 이해하고 할 수 있어야 했나요?</strong>
                <em>{data.learningGoal?.trim() ? "작성됨" : "핵심 작성"}</em>
              </span>
              <textarea value={data.learningGoal || ""} onChange={(event) => onChange("learningGoal", event.target.value)} placeholder="학생이 자료를 근거로 두 가지 이상의 방안을 비교하고, 적절한 방안을 선택해 그 이유를 설명한다." />
            </label>
            <p><b>작성 힌트</b> 설명한다 · 비교한다 · 선택한다 · 수정한다 · 적용한다</p>
          </div>
        </section>
      )}

      {stage === 2 && (
        <section className="lesson-one-stage">
          <StageHeader number="02" title="현재 장면과 확인 기준" description="핵심 장면 한 가지와 다음 수업에서 확인할 반응만 정합니다." />
          <details className="fact-check-practice">
            <summary>사실과 해석, 1분 확인하기</summary>
            <div className="concept-pair">
              <section><strong>사실</strong><p>직접 보거나 들은 말·행동·결과물</p></section>
              <section><strong>해석</strong><p>그 행동의 이유에 대해 붙인 설명</p></section>
            </div>
            <div className="classification-list">
              {factQuestions.map((question, index) => {
                const key = `factChoice${index + 1}`;
                return (
                  <div className="classification-row" key={key}>
                    <p id={`${key}-label`}><i>{index + 1}</i>{question}</p>
                    <div role="radiogroup" aria-labelledby={`${key}-label`}>
                      {(["사실", "해석"] as const).map((choice) => (
                        <label key={choice} className={data[key] === choice ? "selected" : ""}>
                          <input type="radio" name={key} value={choice} checked={data[key] === choice} onChange={() => onChange(key, choice)} />
                          <span>{choice}</span>
                        </label>
                      ))}
                    </div>
                    {data[key] && <em className={data[key] === factAnswers[index] ? "correct" : "retry"}>{data[key] === factAnswers[index] ? "맞아요" : "다시 확인"}</em>}
                  </div>
                );
              })}
            </div>
          </details>
          <div className="lesson-one-section essential-scene">
            <h3>현재 확인한 핵심 장면</h3>
            <p>평가하지 말고, 카메라에 담길 수 있는 장면 한 가지만 적습니다.</p>
            <TextArea label="학생이 멈추거나 하지 못한 행동" value={data.observedMissing || ""} onValue={(value) => onChange("observedMissing", value)} placeholder="예: 두 방안을 비교하는 모습은 확인하지 못했다." />
          </div>

          <div className="carry-card"><span>A에서 정한 남길 배움</span><p>{data.learningGoal || "아직 남길 배움을 작성하지 않았습니다."}</p></div>
          <div className="lesson-one-evidence-grid">
            <TextArea label="확인 기준 1" value={data.learningEvidence1 || ""} onValue={(value) => onChange("learningEvidence1", value)} placeholder="학생이 자료의 수치를 근거로 두 가지 이상의 방안을 비교한다." />
            <TextArea label="확인 기준 2" value={data.learningEvidence2 || ""} onValue={(value) => onChange("learningEvidence2", value)} placeholder="학생이 선택한 방안이 적절한 이유를 자신의 말로 설명한다." />
          </div>
          <details className="optional-detail">
            <summary>선택 기록 · 장면을 더 자세히 분석하기</summary>
            <div className="optional-detail-body lesson-scene-layout">
              <div className="lesson-one-section lesson-scene-facts">
                <h3>말·행동·결과물</h3>
                <div className="lesson-field-grid">
                  <TextArea label="학생이 한 말" value={data.observedSpeech || ""} onValue={(value) => onChange("observedSpeech", value)} placeholder="예: ‘전등을 끄는 게 가장 쉬워요.’라고 말했다." />
                  <TextArea label="학생이 한 행동" value={data.observedAction || data.additionalInfo || ""} onValue={(value) => onChange("observedAction", value)} placeholder="예: 모든 모둠이 한 가지 방안을 선택해 제출했다." />
                  <TextArea label="학생이 만든 결과물" value={data.observedResult || ""} onValue={(value) => onChange("observedResult", value)} placeholder="예: 여섯 제안서 중 다섯 개가 같은 방안을 선택했다." />
                </div>
              </div>
              <div className="lesson-one-section">
                <h3>가능한 해석과 추가 확인</h3>
                <TextArea label="가능한 해석" value={data.possibleInterpretation1 || data.firstJudgment || ""} onValue={(value) => onChange("possibleInterpretation1", value)} placeholder="자료의 수치를 방안과 연결하는 방법이 익숙하지 않았을 수 있다." />
                <TextArea label="아직 모르는 것" value={data.unknownInfo || ""} onValue={(value) => onChange("unknownInfo", value)} placeholder="학생들이 다른 방안을 검토했는지 아직 모른다." />
                <TextArea label="다음에 확인할 방법" value={data.nextCheck || ""} onValue={(value) => onChange("nextCheck", value)} placeholder="비교 기록을 살피고 선택 이유를 질문한다." />
              </div>
            </div>
          </details>
        </section>
      )}

      {stage === 3 && (
        <section className="lesson-one-stage">
          <StageHeader number="03" title="수업 문제와 AI 역할" description="A·B·C를 한 문장으로 연결하고, AI가 도울 일만 짧게 정합니다." />
          <div className="problem-source-grid">
            <div><span>A · 남길 배움</span><p>{data.learningGoal || "—"}</p></div>
            <div><span>B · 현재 장면</span><p>{data.observedMissing || data.observedResult || data.observedAction || "—"}</p></div>
            <div><span>C · 확인 기준</span><p>{[data.learningEvidence1, data.learningEvidence2].filter(Boolean).join(" / ") || "—"}</p></div>
          </div>
          <div className={`problem-editor ${data.problemStatement?.trim() ? "is-filled" : ""}`}>
            <div>
              <span className="writing-field-head"><strong>내 수업의 문제</strong><em>{data.problemStatement?.trim() ? "작성됨" : "핵심 작성"}</em></span>
              <button type="button" className="secondary small-button" onClick={buildProblemStatement}>A·B·C 자연스럽게 연결</button>
            </div>
            <textarea value={data.problemStatement || ""} onChange={(event) => onChange("problemStatement", event.target.value)} placeholder="학생은 현재 [B]를 보였지만, [A]를 할 수 있는지는 아직 확인하지 못했다. 다음 수업에서 [C]를 통해 확인할 필요가 있다." />
            <p>해결책을 미리 정하지 않아야 다음 단계에서 여러 수업 방법을 비교할 수 있습니다.</p>
          </div>
          <div className="lesson-one-section essential-ai-role">
            <h3>AI가 도울 부분</h3>
            <TextArea label="AI에게 맡길 일 한 가지" value={data.aiSupport || data.change || ""} onValue={(value) => onChange("aiSupport", value)} placeholder="예: 서로 다른 수업 방법 세 가지를 제안하고 차이와 예상 부담을 비교한다." />
          </div>
          <details className="optional-detail">
            <summary>선택 기록 · AI와 교사의 역할 더 구체화하기</summary>
            <div className="optional-detail-body">
              <div className="direction-options" role="radiogroup" aria-label="AI 활용 방향">
                {["가능성 확장", "초안 제작·변환", "비교·검토·수정", "AI 활용 보류"].map((option) => (
                  <label key={option} className={data.aiDirection === option ? "selected" : ""}><input type="radio" name="aiDirection" checked={data.aiDirection === option} onChange={() => onChange("aiDirection", option)} /><span>{option}</span></label>
                ))}
              </div>
              <div className="choice-list compact-choice-list">
                <Checkbox label="새로운 관점·조건·대안 탐색" checked={data.aiHelpExplore === "true"} onToggle={(checked) => onChange("aiHelpExplore", String(checked))} />
                <Checkbox label="발문·자료·지원 자료 초안" checked={data.aiHelpDraft === "true"} onToggle={(checked) => onChange("aiHelpDraft", String(checked))} />
                <Checkbox label="여러 방법 비교·검토" checked={data.aiHelpCompare === "true"} onToggle={(checked) => onChange("aiHelpCompare", String(checked))} />
                <Checkbox label="추가 관찰과 확인" checked={data.aiHelpObserve === "true"} onToggle={(checked) => onChange("aiHelpObserve", String(checked))} />
              </div>
              <div className="lesson-one-evidence-grid">
                <TextArea label="교사가 판단할 부분 1" value={data.teacherJudgment1 || ""} onValue={(value) => onChange("teacherJudgment1", value)} placeholder="제안된 방법이 수업 자료와 정확히 연결되는지 판단한다." />
                <TextArea label="교사가 판단할 부분 2" value={data.teacherJudgment2 || ""} onValue={(value) => onChange("teacherJudgment2", value)} placeholder="학생이 실제로 수행할 수 있고 수업 시간 안에 가능한지 판단한다." />
              </div>
            </div>
          </details>
        </section>
      )}

    </div>
  );
}

function StageHeader({ number, title, description }: { number: string; title: string; description: string }) {
  return <header className="lesson-one-stage-head"><b>{number}</b><div><h2>{title}</h2><p>{description}</p></div></header>;
}

function SingleLineField({ label, value, onValue, placeholder }: { label: string; value: string; onValue: (value: string) => void; placeholder: string }) {
  return (
    <label className="lesson-context-field">
      <span>{label}</span>
      <input value={value} onChange={(event) => onValue(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

function TextArea({ label, value, onValue, placeholder }: { label: string; value: string; onValue: (value: string) => void; placeholder: string }) {
  return (
    <label className="lesson-textarea">
      <span>{label}</span>
      <textarea value={value} onChange={(event) => onValue(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

function Checkbox({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: (checked: boolean) => void }) {
  return <label className={checked ? "checked" : ""}><input type="checkbox" checked={checked} onChange={(event) => onToggle(event.target.checked)} /><span>{label}</span></label>;
}

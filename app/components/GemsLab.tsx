import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";

interface GemsLabProps {
  data: Record<string, string>;
  fromStep1: Record<string, string>;
  onChange: (key: string, value: string) => void;
  stage: DesignStage;
}

export type DesignStage = 0 | 1 | 2 | 3;
type ParsedMethod = { index: number; name: string; lessonStage: string; activity: string; evidence: string; burden: string };
type ClassificationState = { kind: "idle" | "success" | "partial" | "error"; message: string };

const defaultResponseFormat = [
  "각 방법은 반드시 아래 네 제목을 그대로 사용해 정리해 주세요.",
  "- 적용할 수업 단계:",
  "- 학생이 하게 될 활동:",
  "- 교사가 확인할 학생 반응:",
  "- 예상 시간·부담:",
].join("\n");

function cleanMarkdownLine(value: string) {
  return value
    .replace(/^\s*#{1,6}\s*/u, "")
    .replace(/^\s*[-*•]\s+/u, "")
    .replace(/\*\*|__/gu, "")
    .replace(/^`+|`+$/gu, "")
    .trim();
}

const methodDetailPatterns = {
  lessonStage: /^적용할\s*수업\s*단계\s*(?:[：:\-]\s*)?/u,
  activity: /^(?:(?:핵심\s*)?학생\s*활동|학생이\s*하게\s*될\s*활동)\s*(?:[：:\-]\s*)?/u,
  evidence: /^(?:교사가\s*)?(?:확인할\s*)?학생(?:의)?\s*반응\s*(?:[：:\-]\s*)?/u,
  burden: /^(?:예상\s*)?(?:시간\s*(?:·|및|과)\s*부담|시간|준비\s*부담)\s*(?:[：:\-]\s*)?/u,
} as const;

function extractMethodDetail(lines: string[], key: keyof typeof methodDetailPatterns) {
  const normalized = lines.map((line) => line.replace(/^\d+\s*[.)]\s*/u, "").trim());
  const pattern = methodDetailPatterns[key];
  const start = normalized.findIndex((line) => pattern.test(line));
  if (start < 0) return "";

  const parts: string[] = [];
  const first = normalized[start].replace(pattern, "").trim();
  if (first) parts.push(first);
  for (const line of normalized.slice(start + 1)) {
    if (Object.values(methodDetailPatterns).some((candidate) => candidate.test(line))) break;
    if (/^(?:방법\s*이름|방법명|제목|준비물|장점|주의점|평가|피드백|교사\s*검토)\s*(?:[：:\-]|$)/u.test(line)) break;
    parts.push(line);
    if (parts.length >= 3) break;
  }
  return parts.join(" ").trim();
}

function parseAiMethods(raw: string): ParsedMethod[] {
  const lines = raw.replace(/\r\n?/gu, "\n").split("\n");
  const labeledHeadings: { line: number; index: number; title: string }[] = [];
  const numberedHeadings: { line: number; index: number; title: string }[] = [];
  const ordinalIndex: Record<string, number> = { "첫 번째": 1, "첫번째": 1, "두 번째": 2, "두번째": 2, "세 번째": 3, "세번째": 3 };

  lines.forEach((line, lineIndex) => {
    const cleaned = cleanMarkdownLine(line);
    const methodMatch = cleaned.match(/^(?:수업\s*)?방법\s*([1-3])(?:\s*(?:번|안))?(?:\s*[.)：:\-–—]\s*(.*)|\s*)$/iu);
    if (methodMatch) {
      labeledHeadings.push({ line: lineIndex, index: Number(methodMatch[1]), title: cleanMarkdownLine(methodMatch[2] || "") });
      return;
    }
    const ordinalMatch = cleaned.match(/^(첫\s*번째|첫번째|두\s*번째|두번째|세\s*번째|세번째)\s*(?:수업\s*)?방법(?:\s*[.)：:\-–—]\s*(.*)|\s*)$/u);
    if (ordinalMatch) {
      labeledHeadings.push({ line: lineIndex, index: ordinalIndex[ordinalMatch[1]], title: cleanMarkdownLine(ordinalMatch[2] || "") });
      return;
    }
    const numberMatch = cleaned.match(/^([1-3])\s*[.)：:\-]\s+(.+)$/u);
    if (numberMatch) numberedHeadings.push({ line: lineIndex, index: Number(numberMatch[1]), title: cleanMarkdownLine(numberMatch[2]) });
  });

  const numberedIndexes = new Set(numberedHeadings.map((heading) => heading.index));
  const headings = labeledHeadings.length > 0
    ? labeledHeadings
    : numberedIndexes.size === 3 ? numberedHeadings : [];
  const uniqueHeadings = headings
    .filter((heading, index, all) => all.findIndex((candidate) => candidate.index === heading.index) === index)
    .sort((a, b) => a.line - b.line);

  return uniqueHeadings.map((heading, position) => {
    const nextLine = uniqueHeadings[position + 1]?.line ?? lines.length;
    const blockLines = lines.slice(heading.line + 1, nextLine).map(cleanMarkdownLine).filter(Boolean);
    const nameLine = blockLines.find((line) => /^(?:방법\s*이름|방법명|제목)\s*[：:\-]/u.test(line));
    const name = (heading.title || nameLine?.replace(/^(?:방법\s*이름|방법명|제목)\s*[：:\-]\s*/u, "") || `방법 ${heading.index}`)
      .replace(/^(?:방법\s*이름|방법명|제목)\s*[：:\-]\s*/u, "")
      .trim();

    const lessonStage = extractMethodDetail(blockLines, "lessonStage");
    let activity = extractMethodDetail(blockLines, "activity");
    const evidence = extractMethodDetail(blockLines, "evidence");
    const burden = extractMethodDetail(blockLines, "burden");

    if (!activity) {
      const fallback = blockLines.filter((line) =>
        !/^(?:방법\s*이름|방법명|제목|적용할 수업 단계|학생이 하게 될 활동|교사가 확인할 학생 반응|확인할 학생 반응|예상 시간|시간·부담|교사 검토|준비물|장점|주의점|평가|피드백)\s*[：:\-]/u.test(line),
      );
      activity = fallback.slice(0, 2).join(" ").trim();
    }

    return { index: heading.index, name, lessonStage, activity, evidence, burden };
  }).sort((a, b) => a.index - b.index);
}

export function GemsLab({ data, fromStep1, onChange, stage }: GemsLabProps) {
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [showMetaModal, setShowMetaModal] = useState(false);
  const [metaText, setMetaText] = useState("");
  const [metaCopied, setMetaCopied] = useState(false);
  const [gemOpened, setGemOpened] = useState(false);
  const metaReturnFocusRef = useRef<HTMLElement | null>(null);
  const [classificationState, setClassificationState] = useState<ClassificationState>({
    kind: "idle",
    message: "답변을 붙여 넣으면 세 방법의 적용 단계·학생 활동·학생 반응·시간과 부담을 자동으로 나눕니다.",
  });

  useEffect(() => {
    fetch("/meta-prompt.md")
      .then((res) => res.text())
      .then((text) => setMetaText(text))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!showMetaModal) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowMetaModal(false);
        window.requestAnimationFrame(() => metaReturnFocusRef.current?.focus());
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showMetaModal]);

  const context = [fromStep1.gradeLevel, fromStep1.subjectUnit, fromStep1.lessonScene]
    .filter(Boolean)
    .join(" · ");
  const studentEvidence = [fromStep1.learningEvidence1, fromStep1.learningEvidence2]
    .filter(Boolean)
    .map((value, index) => `${index + 1}. ${value}`)
    .join("\n");
  const linkedConditions = fromStep1.actualConditions
    || [fromStep1.teacherJudgment1, fromStep1.teacherJudgment2].filter(Boolean).join(" · ");
  const aiSupport = fromStep1.aiSupport || fromStep1.aiDirection || "";
  const actualConditions = data.actualConditions || linkedConditions;
  const buildRequest = (conditions = actualConditions) => [
    `나는 ${context || "[1차시 수업 맥락]"}을 가르칩니다.`,
    fromStep1.problemStatement || "[1차시에서 정리한 수업 문제]",
    "",
    "다음 수업에서 확인할 학생 반응:",
    studentEvidence || "[1차시에서 정한 배움 확인 기준]",
    "",
    `AI가 도울 일: ${aiSupport || "서로 다른 수업 방법을 제안하고 비교할 수 있도록 정리합니다."}`,
    `실제 수업 조건: ${conditions || "[수업 시간, 사용할 자료, 학생의 AI 사용 여부 등을 입력하세요.]"}`,
    "",
    "학생의 사고 과정이 서로 다른 수업 방법 세 가지를 제안해 주세요. 활동 이름이나 모둠 형태만 바꾸지 말아 주세요.",
    defaultResponseFormat,
    "학생이 왜 그렇게 행동했는지는 단정하지 말아 주세요.",
  ].join("\n");
  const requestText = buildRequest();

  const buildConditionPrompt = (conditions = data.newConditions || "") => [
    "앞서 제안한 세 가지 방법을 아래에서 새로 확인한 조건에 맞게 수정해 주세요.",
    `새로 확인한 조건: ${conditions || "[새로 확인한 시간·자료·운영 조건]"}`,
    `반드시 유지할 핵심 배움: ${fromStep1.learningGoal || "[1차시에서 정한 남길 배움]"}`,
    "각 방법에서 수정된 학생 활동, 유지한 사고 과정, 줄이거나 바꾼 단계, 시간 배분과 교사 준비를 정리해 주세요.",
    "추천 순위는 정하지 말아 주세요.",
  ].join("\n");
  const conditionPrompt = buildConditionPrompt();

  useEffect(() => {
    if (stage >= 2 && data.gemPracticeRequest !== requestText) {
      onChange("gemPracticeRequest", requestText);
    }
    if (stage >= 3 && data.conditionPrompt !== conditionPrompt) {
      onChange("conditionPrompt", conditionPrompt);
    }
  }, [conditionPrompt, data.conditionPrompt, data.gemPracticeRequest, onChange, requestText, stage]);

  const showToast = (message: string) => {
    setCopyToast(message);
    window.setTimeout(() => setCopyToast(null), 3200);
  };

  const copyText = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(successMessage);
    } catch {
      showToast("복사에 실패했습니다.");
    }
  };

  const copyMetaPrompt = async () => {
    const text = metaText || (await (await fetch("/meta-prompt.md")).text());
    await copyText(text, "메타 프롬프트 전체를 복사했습니다.");
    setMetaCopied(true);
  };

  const openMetaModal = async () => {
    if (!metaText) {
      try {
        setMetaText(await (await fetch("/meta-prompt.md")).text());
      } catch {}
    }
    metaReturnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setShowMetaModal(true);
  };

  const closeMetaModal = () => {
    setShowMetaModal(false);
    window.requestAnimationFrame(() => metaReturnFocusRef.current?.focus());
  };

  const saveRequestAndCopy = () => {
    onChange("gemPracticeRequest", requestText);
    void copyText(requestText, "첫 AI 요청을 복사했습니다.");
  };

  const updateActualConditions = (value: string) => {
    onChange("actualConditions", value);
    onChange("gemPracticeRequest", buildRequest(value));
  };

  const selectMethod = (index: string) => {
    const selectedName = index ? (data[`method${index}Name`] || data[`method${index}`] || "") : "";
    onChange("selectedMethodIndex", index);
    onChange("selectedMethod", selectedName);
  };

  const updateSelectionReason = (value: string) => {
    onChange("selectionReason", value);
  };

  const classifyAiResponse = (text: string) => {
    const parsed = parseAiMethods(text);
    if (parsed.length === 0) {
      setClassificationState({ kind: "error", message: "방법 구분을 찾지 못했습니다. 원문은 보존했으니 아래 카드를 직접 작성해 주세요." });
      return;
    }

    [1, 2, 3].forEach((index) => {
      onChange(`method${index}Name`, "");
      onChange(`method${index}`, "");
      onChange(`method${index}LessonStage`, "");
      onChange(`method${index}Activity`, "");
      onChange(`method${index}Evidence`, "");
      onChange(`method${index}Burden`, "");
    });
    parsed.forEach((method) => {
      onChange(`method${method.index}Name`, method.name);
      onChange(`method${method.index}`, method.name);
      onChange(`method${method.index}LessonStage`, method.lessonStage);
      onChange(`method${method.index}Activity`, method.activity);
      onChange(`method${method.index}Evidence`, method.evidence);
      onChange(`method${method.index}Burden`, method.burden);
    });

    const missingDetails = parsed.reduce((total, method) => total + [method.lessonStage, method.activity, method.evidence, method.burden].filter((value) => !value).length, 0);
    if (parsed.length === 3 && missingDetails === 0) {
      setClassificationState({ kind: "success", message: "세 방법과 네 가지 세부 항목을 모두 자동 분류했습니다. 아래 카드에서 확인만 해 주세요." });
    } else {
      setClassificationState({ kind: "partial", message: `${parsed.length}개 방법을 찾았고, 세부 항목 ${missingDetails}칸은 구분하지 못했습니다. 비어 있는 칸만 확인해 주세요.` });
    }
  };

  return (
    <div className="lesson-two-flow">
      {copyToast && <div className="copy-toast" role="status" aria-live="polite">{copyToast}</div>}

      {stage === 0 && (
        <section className="bonus-mission bonus-mission-page" aria-label="추가 미션 · 나만의 수업 설계 Gem 만들기">
          <BonusGemMission
            data={data}
            metaText={metaText}
            metaCopied={metaCopied}
            gemOpened={gemOpened}
            onCopy={copyMetaPrompt}
            onOpenMeta={openMetaModal}
            onOpenGem={() => setGemOpened(true)}
            onComplete={(completed) => onChange("gemCreatedAt", completed ? new Date().toISOString() : "")}
          />
        </section>
      )}

      {stage === 1 && (
        <details className="linked-source-detail">
          <summary>
            <b>1차시 내용 자동 연결됨</b>
            <span>{fromStep1.problemStatement || "1차시 수업 문제를 작성하면 여기에 자동으로 연결됩니다."}</span>
          </summary>
          <div className="linked-source-body">
            <div className="carry-over-grid">
              <CarryField label="수업 맥락" value={context} />
              <CarryField label="해결할 수업 문제" value={fromStep1.problemStatement} wide />
              <CarryField label="확인할 학생 반응" value={studentEvidence} wide />
              <CarryField label="AI가 도울 부분" value={aiSupport} />
              <CarryField label="실제 수업 조건" value={linkedConditions} />
              <CarryField label="유지할 핵심 배움" value={fromStep1.learningGoal} wide />
            </div>
            <p className="linked-data-note">내용을 바꾸려면 1차시에서 수정하세요. 수정한 값은 이 화면에도 바로 반영됩니다.</p>
          </div>
        </details>
      )}

      {stage === 1 && (
        <DesignPanel number="01" title="AI에게 요청하기" description="1차시 내용은 이미 연결했습니다. 실제 수업 조건 한 가지만 더해 요청을 완성하세요." workload="핵심 입력 1개">
          <div className="request-layout lesson-design-request">
            <div className="request-form-card">
              <FormTextArea
                label="실제 수업 조건"
                value={actualConditions}
                onChange={updateActualConditions}
                placeholder="예: 한 차시 40분 · 교사가 준비한 자료 사용 · 학생은 AI를 사용하지 않음"
              />
            </div>
            <aside className="request-preview-card">
              <span>AI에 입력할 프롬프트</span>
              <pre>{requestText}</pre>
              <div>
                <button type="button" className="secondary" onClick={saveRequestAndCopy}>요청문 복사</button>
                <a className="primary" href="https://gemini.google.com/app" target="_blank" rel="noreferrer" onClick={() => onChange("gemPracticeRequest", requestText)}>Gemini에서 실행 ↗</a>
              </div>
            </aside>
          </div>
        </DesignPanel>
      )}

      {stage === 2 && (
        <DesignPanel number="02" title="세 방법 비교하기" description="AI 답변을 붙여 넣으면 방법별 네 항목을 자동으로 나눕니다. 교사는 결과만 확인하세요." workload="자동 분류 · 카드 3개 확인">
          <div className="method-review-source">
            <FormTextArea
              label="AI 답변 전체 붙여넣기 · 자동 분류"
              value={data.aiResponseRaw || ""}
              onChange={(value) => onChange("aiResponseRaw", value)}
              onPaste={classifyAiResponse}
              placeholder="Gemini가 제안한 답변 전체를 붙여 넣으면 세 방법으로 자동 분류됩니다."
            />
            <div className="method-classification-actions">
              <p className={`method-classification-status ${classificationState.kind}`} role="status" aria-live="polite">{classificationState.message}</p>
              <button type="button" className="secondary small-button" disabled={!data.aiResponseRaw?.trim()} onClick={() => classifyAiResponse(data.aiResponseRaw || "")}>다시 자동 분류</button>
            </div>
          </div>
          <div className="ai-method-review-list">
            {[1, 2, 3].map((index) => (
              <article className="ai-method-review" key={index}>
                <header><b>{index}</b><input value={data[`method${index}Name`] || data[`method${index}`] || ""} onChange={(event) => { onChange(`method${index}Name`, event.target.value); onChange(`method${index}`, event.target.value); }} placeholder={`방법 ${index}의 이름`} /></header>
                <div>
                  <FormTextArea label="적용할 수업 단계" value={data[`method${index}LessonStage`] || ""} onChange={(value) => onChange(`method${index}LessonStage`, value)} placeholder="자동 분류된 수업 적용 단계를 확인하세요." />
                  <FormTextArea label="학생이 하게 될 활동" value={data[`method${index}Activity`] || ""} onChange={(value) => onChange(`method${index}Activity`, value)} placeholder="자동 분류된 학생 활동을 확인하세요." />
                  <FormTextArea label="교사가 확인할 학생 반응" value={data[`method${index}Evidence`] || ""} onChange={(value) => onChange(`method${index}Evidence`, value)} placeholder="자동 분류된 학생의 말·행동·결과물을 확인하세요." />
                  <FormTextArea label="예상 시간·부담" value={data[`method${index}Burden`] || ""} onChange={(value) => onChange(`method${index}Burden`, value)} placeholder="자동 분류된 시간과 준비 부담을 확인하세요." />
                </div>
              </article>
            ))}
          </div>

          <details className="inline-option condition-option">
            <summary>선택 · 새로 확인한 수업 조건 반영하기</summary>
            <div className="condition-option-body">
              <div className="request-layout lesson-design-request">
                <div className="request-form-card">
                  <FormTextArea label="새로 확인한 수업 운영 조건" value={data.newConditions || ""} onChange={(value) => { onChange("newConditions", value); onChange("conditionPrompt", buildConditionPrompt(value)); }} placeholder="예: 활동에 사용할 수 있는 시간은 12분이다." />
                </div>
                <aside className="request-preview-card">
                  <span>AI에 추가로 입력할 프롬프트</span>
                  <pre>{conditionPrompt}</pre>
                  <div>
                    <button type="button" className="secondary" onClick={() => { onChange("conditionPrompt", conditionPrompt); void copyText(conditionPrompt, "추가 요청을 복사했습니다."); }}>추가 요청 복사</button>
                    <a className="primary" href="https://gemini.google.com/app" target="_blank" rel="noreferrer" onClick={() => onChange("conditionPrompt", conditionPrompt)}>Gemini에서 실행 ↗</a>
                  </div>
                </aside>
              </div>
              <FormTextArea label="조건을 반영한 AI 답변" value={data.revisedAiResponse || ""} onChange={(value) => onChange("revisedAiResponse", value)} placeholder="수정된 답변 전체를 한 번만 붙여 넣으세요." />
            </div>
          </details>
        </DesignPanel>
      )}

      {stage === 3 && (
        <DesignPanel number="03" title="한 가지 선택해 설계 완성하기" description="교사가 방법을 고르고, 선택 이유와 수정할 내용, 만들 콘텐츠만 적으면 끝납니다." workload="핵심 입력 4개">
          <div className="final-design-autofill">
            <p><b>교사 기록</b> AI 답변 전체가 아니라 교사가 선택하고 수정한 내용만 남깁니다.</p>
          </div>
          <div className="teacher-choice-grid">
            <label className="design-field">
              <span>선택한 방법</span>
              <select value={data.selectedMethodIndex || ""} onChange={(event) => selectMethod(event.target.value)}>
                <option value="">방법을 선택하세요</option>
                {[1, 2, 3].map((index) => <option key={index} value={String(index)}>방법 {index} · {data[`method${index}Name`] || data[`method${index}`] || "이름 미입력"}</option>)}
              </select>
            </label>
            <FormTextArea label="선택 이유" value={data.selectionReason || ""} onChange={updateSelectionReason} placeholder="수업 문제에 도움이 되고 실제 수업에서 실행 가능한 이유를 적으세요." />
            <FormTextArea label="교사가 수정한 내용" value={data.teacherRevision || ""} onChange={(value) => onChange("teacherRevision", value)} placeholder="자료, 판단 기준, 활동량, 기록 방법 등을 어떻게 수정했는지 적으세요." />
            <FormTextArea label="3차시에서 만들 콘텐츠" value={data.contentToBuild || ""} onChange={(value) => onChange("contentToBuild", value)} placeholder="예: 두 방안을 비교하고 선택 이유를 기록하는 웹 활동" />
          </div>
        </DesignPanel>
      )}

      {showMetaModal && (
        <div className="meta-backdrop" onClick={closeMetaModal}>
          <div
            className="meta-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="meta-prompt-title"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key !== "Tab") return;
              const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), [href], input:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])"));
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
          >
            <div className="meta-modal-head">
              <h2 id="meta-prompt-title">메타 프롬프트</h2>
              <div className="guide-actions">
                <button className="primary small-button" onClick={copyMetaPrompt}>전체 복사</button>
                <button className="secondary small-button" onClick={closeMetaModal} autoFocus>닫기</button>
              </div>
            </div>
            <pre>{metaText}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

function DesignPanel({ number, title, description, workload, children }: { number: string; title: string; description: string; workload: string; children: React.ReactNode }) {
  return (
    <section className="lesson-two-panel lesson-design-panel">
      <header className="panel-title"><b>{number}</b><div><h2>{title}</h2><p>{description}</p></div><span className="panel-workload">{workload}</span></header>
      {children}
    </section>
  );
}

function CarryField({ label, value, wide = false }: { label: string; value?: string; wide?: boolean }) {
  return <section className={`carry-field ${wide ? "wide" : ""}`}><span>{label}</span><p>{value || "1차시에 작성된 내용이 없습니다."}</p></section>;
}

function FormTextArea({ label, value, onChange, onPaste, placeholder }: { label: string; value: string; onChange: (value: string) => void; onPaste?: (text: string) => void; placeholder: string }) {
  return <label className="design-field"><span>{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} onPaste={(event) => { const text = event.clipboardData.getData("text"); if (text && onPaste) onPaste(text); }} placeholder={placeholder} /></label>;
}

function BonusGemMission({ data, metaText, metaCopied, gemOpened, onCopy, onOpenMeta, onOpenGem, onComplete }: { data: Record<string, string>; metaText: string; metaCopied: boolean; gemOpened: boolean; onCopy: () => void; onOpenMeta: () => void; onOpenGem: () => void; onComplete: (completed: boolean) => void }) {
  return (
    <div className="bonus-mission-body">
      <div className="guide-head">
        <div><span className="section-kicker">선택 활동</span><h2>Gem 만들기</h2><p>반복해서 사용할 수업 설계 도우미가 필요할 때 진행하세요.</p></div>
        <a className="primary small-button" href="https://gemini.google.com/gems/create" target="_blank" rel="noreferrer" onClick={onOpenGem}>새 Gem 만들기 ↗</a>
      </div>
      <div className="gem-progress" aria-label="Gem 만들기 진행 상태">
        <span className={metaCopied ? "done" : ""}><i>01</i>메타 프롬프트 복사</span>
        <span className={gemOpened ? "done" : ""}><i>02</i>Gemini에서 Gem 열기</span>
        <label className={data.gemCreatedAt ? "done" : ""}><input type="checkbox" checked={Boolean(data.gemCreatedAt)} onChange={(event) => onComplete(event.target.checked)} /><i>03</i>Gem 생성 완료</label>
      </div>
      <div className="gem-create-workspace">
        <section className="meta-prompt-preview" aria-label="Gem에 넣을 메타 프롬프트">
          <div><strong>요청 사항에 메타 프롬프트 전체를 붙여 넣으세요.</strong><div className="meta-prompt-actions"><button className="secondary small-button" onClick={onCopy}>메타 프롬프트 복사</button><button className="text-button" onClick={onOpenMeta}>크게 보기</button></div></div>
          <pre>{metaText || "메타 프롬프트를 불러오는 중입니다."}</pre>
        </section>
        <aside className="gem-build-guide" aria-labelledby="gem-build-guide-title">
          <header><span>제작 안내</span><h3 id="gem-build-guide-title">3단계로 끝내기</h3><p>새 Gem을 열고, 프롬프트를 넣고, 채팅을 시작하세요.</p></header>
          <ol className="guide-steps">
            {[
              ["/gems/step-1.png", "새 Gem을 여세요", "Gem 관리자에서 ‘새 Gem’을 누릅니다."],
              ["/gems/step-2.png", "메타 프롬프트를 넣으세요", "요청 사항에 붙여 넣고 저장합니다."],
              ["/gems/step-3.png", "채팅을 시작하세요", "완성한 Gem에서 새 대화를 시작합니다."],
            ].map(([src, title, body], index) => (
              <li key={src}><a className="guide-image" href={src} target="_blank" rel="noreferrer"><Image src={src} width={640} height={390} alt={`${title} 안내 화면`} /></a><div><b>{String(index + 1).padStart(2, "0")}</b><strong>{title}</strong><p>{body}</p></div></li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import Image from "next/image";

interface GemsLabProps {
  data: Record<string, string>;
  fromStep1: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

type DesignStage = 1 | 2 | 3;

const stages: { id: DesignStage; label: string }[] = [
  { id: 1, label: "AI 요청 만들기" },
  { id: 2, label: "응답 검토·조건 반영" },
  { id: 3, label: "선택·최종 설계" },
];

const defaultResponseFormat = "각 방법의 적용할 수업 단계, 학생 활동, 확인할 학생 반응, 예상 시간·부담, 교사가 검토할 점을 정리해 주세요.";

export function GemsLab({ data, fromStep1, onChange }: GemsLabProps) {
  const [stage, setStage] = useState<DesignStage>(1);
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [showMetaModal, setShowMetaModal] = useState(false);
  const [metaText, setMetaText] = useState("");
  const [metaCopied, setMetaCopied] = useState(false);
  const [gemOpened, setGemOpened] = useState(false);

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
  const responseFormat = data.responseFormat || defaultResponseFormat;

  const buildRequest = (conditions = actualConditions, format = responseFormat) => [
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
    format,
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
    setShowMetaModal(true);
  };

  const saveRequestAndCopy = () => {
    onChange("gemPracticeRequest", requestText);
    void copyText(requestText, "첫 AI 요청을 복사했습니다.");
  };

  const updateRequestSetting = (key: "actualConditions" | "responseFormat", value: string) => {
    onChange(key, value);
    const nextConditions = key === "actualConditions" ? value : actualConditions;
    const nextFormat = key === "responseFormat" ? value : responseFormat;
    onChange("gemPracticeRequest", buildRequest(nextConditions, nextFormat));
  };

  const fillFinalDesign = () => {
    const selectedIndex = data.selectedMethodIndex || "";
    const selectedName = data.selectedMethod
      || data[`method${selectedIndex}Name`]
      || data[`method${selectedIndex}`]
      || "";
    const selectedActivity = data[`revisedMethod${selectedIndex}`]
      || data[`method${selectedIndex}Activity`]
      || "";
    const selectedEvidence = data[`method${selectedIndex}Evidence`] || studentEvidence;
    if (!data.finalMethodReason && (selectedName || data.selectionReason)) {
      onChange("finalMethodReason", [selectedName, data.selectionReason && `선택 이유: ${data.selectionReason}`].filter(Boolean).join("\n"));
    }
    if (!data.finalStudentActivity && selectedActivity) onChange("finalStudentActivity", selectedActivity);
    if (!data.finalStudentEvidence && selectedEvidence) onChange("finalStudentEvidence", selectedEvidence);
  };

  const changeStage = (next: DesignStage) => {
    if (next >= 2) onChange("gemPracticeRequest", requestText);
    if (next >= 3) onChange("conditionPrompt", conditionPrompt);
    setStage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="lesson-two-flow">
      {copyToast && <div className="copy-toast" role="status" aria-live="polite">{copyToast}</div>}

      <details className="bonus-mission">
        <summary>
          <span>추가 미션</span>
          <strong>나만의 수업 설계 Gem 만들기</strong>
          <small>필요한 분만 열어서 진행하세요.</small>
        </summary>
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
      </details>

      <nav className="stage-tabs subtab-bar lesson-two-stage-nav" aria-label="2차시 수업 설계 단계">
        {stages.map((item) => (
          <button
            key={item.id}
            type="button"
            className={stage === item.id ? "primary" : "secondary"}
            aria-current={stage === item.id ? "step" : undefined}
            aria-pressed={stage === item.id}
            onClick={() => changeStage(item.id)}
          >
            <b>{String(item.id).padStart(2, "0")}</b>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

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
        <DesignPanel number="02" title="첫 AI 요청" description="자동으로 연결된 1차시 내용에 실제 수업 조건만 더해 첫 요청을 완성하세요.">
          <div className="request-layout lesson-design-request">
            <div className="request-form-card">
              <FormTextArea
                label="실제 수업 조건"
                value={actualConditions}
                onChange={(value) => updateRequestSetting("actualConditions", value)}
                placeholder="예: 한 차시 40분 · 교사가 준비한 자료 사용 · 학생은 AI를 사용하지 않음"
              />
              <details className="inline-option">
                <summary>선택 · AI 응답 형식 바꾸기</summary>
                <FormTextArea
                  label="AI 응답 형식"
                  value={responseFormat}
                  onChange={(value) => updateRequestSetting("responseFormat", value)}
                  placeholder={defaultResponseFormat}
                />
              </details>
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
        <DesignPanel number="03" title="실제 AI 응답 검토" description="답변 전체를 옮기지 말고, 세 방법의 차이와 교사가 확인할 점만 정리하세요.">
          <div className="ai-method-review-list">
            {[1, 2, 3].map((index) => (
              <article className="ai-method-review" key={index}>
                <header><b>{index}</b><input value={data[`method${index}Name`] || data[`method${index}`] || ""} onChange={(event) => { onChange(`method${index}Name`, event.target.value); onChange(`method${index}`, event.target.value); }} placeholder={`방법 ${index}의 이름`} /></header>
                <div>
                  <FormTextArea label="학생 활동" value={data[`method${index}Activity`] || ""} onChange={(value) => onChange(`method${index}Activity`, value)} placeholder="학생이 실제로 하게 될 활동을 적으세요." />
                  <FormTextArea label="확인할 학생 반응" value={data[`method${index}Evidence`] || ""} onChange={(value) => onChange(`method${index}Evidence`, value)} placeholder="교사가 확인할 말·행동·결과물을 적으세요." />
                  <FormTextArea label="예상 시간·부담" value={data[`method${index}Burden`] || ""} onChange={(value) => onChange(`method${index}Burden`, value)} placeholder="예상 시간과 준비 부담을 적으세요." />
                  <FormTextArea label="교사 검토" value={data[`method${index}Review`] || ""} onChange={(value) => onChange(`method${index}Review`, value)} placeholder="자료의 정확성, 실행 가능성, AI가 놓친 점을 적으세요." />
                </div>
              </article>
            ))}
          </div>
        </DesignPanel>
      )}

      {stage === 2 && (
        <DesignPanel number="04" title="실제 조건 반영" description="수업 시간과 자료 조건을 다시 확인한 뒤 AI에게 세 방법의 수정을 요청하세요.">
          <div className="request-layout lesson-design-request">
            <div className="request-form-card">
              <FormTextArea label="새로 확인한 수업 운영 조건" value={data.newConditions || ""} onChange={(value) => { onChange("newConditions", value); onChange("conditionPrompt", buildConditionPrompt(value)); }} placeholder="예: 수업 방법 활동에 사용할 수 있는 시간은 12분이다." />
              <FormTextArea label="조건 변경 메모" value={data.conditionChangeMemo || ""} onChange={(value) => onChange("conditionChangeMemo", value)} placeholder="무엇을 줄이거나 바꾸었고, 어떤 사고 과정은 유지했는지 적으세요." />
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
          <div className="revised-methods">
            {[1, 2, 3].map((index) => <FormTextArea key={index} label={`수정된 방법 ${index}`} value={data[`revisedMethod${index}`] || ""} onChange={(value) => onChange(`revisedMethod${index}`, value)} placeholder="수정된 학생 활동과 유지한 사고 과정을 짧게 정리하세요." />)}
          </div>
        </DesignPanel>
      )}

      {stage === 3 && (
        <DesignPanel number="05" title="교사 선택과 수정" description="AI의 추천이 아니라, 확인한 자료와 수업 조건을 근거로 한 가지 방법을 결정하세요.">
          <div className="teacher-choice-grid">
            <FormTextArea label="자료 확인 결과" value={data.evidenceCheck || ""} onChange={(value) => onChange("evidenceCheck", value)} placeholder="자료 출처, 계산 근거, 실행 조건 등 교사가 확인한 내용을 적으세요." />
            <label className="design-field">
              <span>선택한 방법</span>
              <select value={data.selectedMethodIndex || ""} onChange={(event) => { const index = event.target.value; onChange("selectedMethodIndex", index); onChange("selectedMethod", index ? (data[`method${index}Name`] || data[`method${index}`] || data[`revisedMethod${index}`] || "") : ""); }}>
                <option value="">방법을 선택하세요</option>
                {[1, 2, 3].map((index) => <option key={index} value={String(index)}>방법 {index} · {data[`method${index}Name`] || data[`method${index}`] || "이름 미입력"}</option>)}
              </select>
            </label>
            <FormTextArea label="선택 이유" value={data.selectionReason || ""} onChange={(value) => onChange("selectionReason", value)} placeholder="수업 문제를 어떻게 다루며 실제 조건에서 왜 실행 가능한지 적으세요." />
            <FormTextArea label="교사가 수정한 내용" value={data.teacherRevision || ""} onChange={(value) => onChange("teacherRevision", value)} placeholder="자료, 판단 기준, 활동량, 기록 방법 등을 어떻게 수정했는지 적으세요." />
          </div>
        </DesignPanel>
      )}

      {stage === 3 && (
        <DesignPanel number="06" title="최종 수업 방법 설계안" description="3차시 콘텐츠 제작으로 바로 이어질 수 있도록 최종 방법을 한 장으로 정리하세요.">
          <div className="final-design-autofill">
            <p>앞에서 선택한 방법·이유·학생 반응을 다시 쓰지 않아도 됩니다.</p>
            <button type="button" className="secondary small-button" onClick={fillFinalDesign}>선택 내용 자동 채우기</button>
          </div>
          <div className="final-design-grid">
            <FormTextArea label="1. 사용할 수업 방법과 선택 이유" value={data.finalMethodReason || ""} onChange={(value) => onChange("finalMethodReason", value)} placeholder="사용할 방법과 선택 이유를 함께 적으세요." />
            <FormTextArea label="2. 적용할 수업 단계" value={data.finalLessonStage || ""} onChange={(value) => onChange("finalLessonStage", value)} placeholder="예: 자료를 읽은 뒤 방안을 결정하는 단계" />
            <FormTextArea label="3. 학생이 하게 될 활동" value={data.finalStudentActivity || ""} onChange={(value) => onChange("finalStudentActivity", value)} placeholder="학생이 무엇을 보고, 비교하고, 만들거나 설명하는지 적으세요." />
            <FormTextArea label="4. 교사가 확인할 학생 반응" value={data.finalStudentEvidence || ""} onChange={(value) => onChange("finalStudentEvidence", value)} placeholder="배움을 확인할 학생의 말·행동·결과물을 적으세요." />
            <FormTextArea label="5. 3차시에서 만들 콘텐츠" value={data.contentToBuild || ""} onChange={(value) => onChange("contentToBuild", value)} placeholder="예: 비교 자료 카드와 선택 이유를 기록하는 웹 활동" />
          </div>
          <fieldset className="final-design-checks">
            <legend>최종 확인</legend>
            <CheckField label="1차시에서 찾은 수업 문제를 직접 다룬다." checked={data.finalCheckProblem === "yes"} onChange={(checked) => onChange("finalCheckProblem", checked ? "yes" : "")} />
            <CheckField label="학생이 하게 될 활동이 구체적으로 보인다." checked={data.finalCheckConcrete === "yes"} onChange={(checked) => onChange("finalCheckConcrete", checked ? "yes" : "")} />
            <CheckField label="학생이 배웠다는 것을 확인할 말과 행동이 정해져 있다." checked={data.finalCheckEvidence === "yes"} onChange={(checked) => onChange("finalCheckEvidence", checked ? "yes" : "")} />
            <CheckField label="AI 제안에 교사의 자료 확인·선택·수정이 들어갔다." checked={data.finalCheckTeacherRevision === "yes"} onChange={(checked) => onChange("finalCheckTeacherRevision", checked ? "yes" : "")} />
          </fieldset>
        </DesignPanel>
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

function DesignPanel({ number, title, description, children }: { number: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="lesson-two-panel lesson-design-panel">
      <header className="panel-title"><b>{number}</b><div><h2>{title}</h2><p>{description}</p></div></header>
      {children}
    </section>
  );
}

function CarryField({ label, value, wide = false }: { label: string; value?: string; wide?: boolean }) {
  return <section className={`carry-field ${wide ? "wide" : ""}`}><span>{label}</span><p>{value || "1차시에 작성된 내용이 없습니다."}</p></section>;
}

function FormTextArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label className="design-field"><span>{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>;
}

function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className={checked ? "checked" : ""}><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span>{label}</span></label>;
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

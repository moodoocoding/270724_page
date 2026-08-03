import React, { useEffect, useState } from "react";
import Image from "next/image";

interface GemsLabProps {
  data: Record<string, string>;
  fromStep1: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export function GemsLab({ data, fromStep1, onChange }: GemsLabProps) {
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

  const startSentence = fromStep1.problemStatement
    ? fromStep1.problemStatement
    : `따라서 수업에서 ${fromStep1.aiSupport || fromStep1.change || "________________"}을 해 볼 필요가 있다.`;
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

      <nav className="subtab-bar lesson-two-stage-nav" aria-label="2차시 단계 선택">
        {[
          [1, "🧩 1단계: Gem 만들기"],
          [2, "✍️ 2단계: AI에게 요청하기"],
          [3, "✅ 3단계: 방법 비교·선택하기"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={subStep === value ? "primary" : "secondary"}
            aria-current={subStep === value ? "step" : undefined}
            aria-pressed={subStep === value}
            onClick={() => {
              if (value === 2) {
                onChange("gemCreatedAt", data.gemCreatedAt || new Date().toISOString());
              }
              if (value === 3) {
                onChange("gemPracticeRequest", requestText);
              }
              setSubStep(value as 1 | 2 | 3);
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      {subStep === 1 && (
        <section className="lesson-two-panel gem-create-panel">
          <div className="guide-head">
            <div>
              <span className="section-kicker">1단계</span>
              <h2>Gem 만들기</h2>
              <p>메타 프롬프트를 복사해 나의 수업 설계 Gem을 만드세요.</p>
            </div>
            <div className="guide-actions">
              <a
                className="primary small-button"
                href="https://gemini.google.com/gems/create"
                target="_blank"
                rel="noreferrer"
                onClick={() => onChange("gemCreatedAt", new Date().toISOString())}
              >
                새 Gem 만들기 ↗
              </a>
            </div>
          </div>

          <div className="gem-create-workspace">
            <section className="meta-prompt-preview" aria-label="Gem에 넣을 메타 프롬프트">
              <div>
                <strong>Gem 요청 사항에 아래 메타 프롬프트 전체를 붙여 넣으세요.</strong>
                <div className="meta-prompt-actions">
                  <button className="secondary small-button" onClick={copyMetaPrompt}>
                    메타 프롬프트 복사
                  </button>
                  <button className="text-button" onClick={openMetaModal}>
                    크게 보기
                  </button>
                </div>
              </div>
              <pre>{metaText || "메타 프롬프트를 불러오는 중입니다."}</pre>
            </section>

            <aside className="gem-build-guide" aria-labelledby="gem-build-guide-title">
              <header>
                <span>제작 안내</span>
                <h3 id="gem-build-guide-title">메타 프롬프트를 만드는 방법</h3>
                <p>새 Gem을 열고 프롬프트를 입력한 뒤 저장하세요.</p>
              </header>
              <ol className="guide-steps">
                <li>
                  <a
                    className="guide-image"
                    href="/gems/step-1.png"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Gem 관리자에서 새 Gem 열기 안내 이미지"
                  >
                    <Image src="/gems/step-1.png" width={640} height={390} alt="Gem 관리자에서 새 Gem 버튼 위치" />
                  </a>
                  <div>
                    <b>01</b>
                    <strong>새 Gem을 여세요</strong>
                    <p>Gem 관리자에서 ‘새 Gem’을 누릅니다.</p>
                  </div>
                </li>
                <li>
                  <a
                    className="guide-image"
                    href="/gems/step-2.png"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="메타 프롬프트 입력 안내 이미지"
                  >
                    <Image
                      src="/gems/step-2.png"
                      width={640}
                      height={390}
                      alt="Gem 요청 사항에 메타 프롬프트를 붙여 넣는 위치"
                    />
                  </a>
                  <div>
                    <b>02</b>
                    <strong>메타 프롬프트를 넣으세요</strong>
                    <p>요청 사항에 붙여 넣고 저장합니다.</p>
                  </div>
                </li>
                <li>
                  <a
                    className="guide-image"
                    href="/gems/step-3.png"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Gem 채팅 시작 안내 이미지"
                  >
                    <Image
                      src="/gems/step-3.png"
                      width={640}
                      height={390}
                      alt="저장된 Gem에서 채팅 시작 버튼 위치"
                    />
                  </a>
                  <div>
                    <b>03</b>
                    <strong>채팅을 시작하세요</strong>
                    <p>완성한 Gem에서 새 대화를 시작합니다.</p>
                  </div>
                </li>
              </ol>
            </aside>
          </div>
        </section>
      )}

      {subStep === 2 && (
        <section className="lesson-two-panel">
          <header className="panel-title">
            <b>2</b>
            <div>
              <h2>AI에게 요청할 내용 작성하기</h2>
              <p>활동지의 빈칸을 채우면 요청문이 자동으로 완성됩니다.</p>
            </div>
          </header>
          <div className="request-layout">
            <div className="request-form-card">
              <div className="starter-box compact-starter">
                <span>1차시 나의 출발 문장</span>
                <p>{startSentence}</p>
              </div>
              <div className="request-fields">
                <label>
                  <span>학년</span>
                  <input
                    value={data.grade || ""}
                    onChange={(event) => updateRequestField("grade", event.target.value)}
                    placeholder="예: 5"
                  />
                </label>
                <label>
                  <span>교과</span>
                  <input
                    value={data.subject || ""}
                    onChange={(event) => updateRequestField("subject", event.target.value)}
                    placeholder="예: 사회"
                  />
                </label>
                <label>
                  <span>학생들이 어려운 이유</span>
                  <input
                    value={data.difficultyCause || ""}
                    onChange={(event) => updateRequestField("difficultyCause", event.target.value)}
                    placeholder="예: 핵심 어휘가 낯설기"
                  />
                </label>
                <label>
                  <span>어려워하는 학습 행동</span>
                  <input
                    value={data.difficultTask || ""}
                    onChange={(event) => updateRequestField("difficultTask", event.target.value)}
                    placeholder="예: 자료의 의미 설명하기"
                  />
                </label>
                <label className="wide">
                  <span>수업에서 원하는 학생 행동</span>
                  <input
                    value={data.desiredAction || ""}
                    onChange={(event) => updateRequestField("desiredAction", event.target.value)}
                    placeholder="예: 근거를 찾아 자기 말로 설명하기"
                  />
                </label>
              </div>
            </div>
            <aside className="request-preview-card">
              <span>완성된 요청문</span>
              <pre>{requestText}</pre>
              <div>
                <button className="secondary" onClick={copyRequest}>
                  요청문 복사
                </button>
                <a
                  className="primary"
                  href="https://gemini.google.com/app"
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => onChange("gemPracticeRequest", requestText)}
                >
                  Gemini에서 실행 ↗
                </a>
              </div>
            </aside>
          </div>
        </section>
      )}

      {subStep === 3 && (
        <section className="lesson-two-panel">
          <header className="panel-title">
            <b>3</b>
            <div>
              <h2>AI가 제안한 방법 비교·선택하기</h2>
              <p>방법 5개를 짧게 적고, 수업에 적용할 한 가지를 선택하세요.</p>
            </div>
          </header>
          <div className="method-choice-layout">
            <div className="method-list">
              <div className="method-list-head">
                <span>번호</span>
                <span>AI가 제안한 방법</span>
                <span>선택</span>
              </div>
              {methodFields.map((index) => (
                <div
                  className={
                    data.selectedMethodIndex === String(index) ? "method-row selected" : "method-row"
                  }
                  key={index}
                >
                  <span>{index}</span>
                  <input
                    value={data[`method${index}`] || ""}
                    onChange={(event) => updateMethod(index, event.target.value)}
                    placeholder={`${index}번째 방법을 짧게 적으세요.`}
                  />
                  <button
                    type="button"
                    className={data.selectedMethodIndex === String(index) ? "picked" : ""}
                    aria-pressed={data.selectedMethodIndex === String(index)}
                    disabled={!data[`method${index}`]?.trim()}
                    onClick={() => selectMethod(index)}
                  >
                    {data.selectedMethodIndex === String(index) ? "선택됨" : "선택"}
                  </button>
                </div>
              ))}
            </div>
            <aside className="selection-card">
              <span>한 가지 방법 선택하기</span>
              <div className="selected-method">
                <small>내가 선택한 방법</small>
                <strong>{data.selectedMethod || "왼쪽에서 방법 하나를 선택하세요."}</strong>
              </div>
              <fieldset>
                <legend>선택 기준 확인</legend>
                <label>
                  <input
                    type="checkbox"
                    checked={data.criteriaLearning === "yes"}
                    onChange={(event) =>
                      onChange("criteriaLearning", event.target.checked ? "yes" : "")
                    }
                  />
                  배움 문제에 도움이 되는가?
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={data.criteriaFeasible === "yes"}
                    onChange={(event) =>
                      onChange("criteriaFeasible", event.target.checked ? "yes" : "")
                    }
                  />
                  학생이 실제로 할 수 있는가?
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={data.criteriaFits === "yes"}
                    onChange={(event) =>
                      onChange("criteriaFits", event.target.checked ? "yes" : "")
                    }
                  />
                  기존 수업에 넣을 수 있는가?
                </label>
              </fieldset>
              <label className="selection-reason">
                <span>선택한 이유</span>
                <textarea
                  value={data.selectionReason || ""}
                  onChange={(event) => onChange("selectionReason", event.target.value)}
                  placeholder="이 방법을 선택한 이유를 한두 문장으로 적어 주세요."
                />
              </label>
            </aside>
          </div>
        </section>
      )}

      {showMetaModal && (
        <div className="meta-backdrop" onClick={() => setShowMetaModal(false)}>
          <div
            className="meta-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="meta-prompt-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="meta-modal-head">
              <h2 id="meta-prompt-title">메타 프롬프트</h2>
              <div className="guide-actions">
                <button className="primary small-button" onClick={copyMetaPrompt}>
                  전체 복사
                </button>
                <button className="secondary small-button" onClick={() => setShowMetaModal(false)}>
                  닫기
                </button>
              </div>
            </div>
            <pre>{metaText}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

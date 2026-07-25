import React from "react";

const factQuestions = [
  "학생이 토의 시간 동안 한 번도 말하지 않았다.",
  "이 학생은 토의에 참여할 의지도 없고 생각도 없다.",
  "학생이 활동 중 교과서의 앞뒤 쪽을 계속 넘겼다.",
  "쓸데없는 짓을 하며 집중하지 않는다.",
] as const;
const factAnswers = ["사실", "해석", "사실", "해석"] as const;

export function SentencePreview({ data }: { data: Record<string, string> }) {
  return (
    <div className="result-strip">
      <span>완성 문장</span>
      <p>
        처음에는 <b>{data.firstJudgment || "______"}</b>고 판단했다. 그러나{" "}
        <b>{data.additionalInfo || "______"}</b>을 확인한 뒤,{" "}
        <b>{data.blockPoint || "______"}</b>이 배움을 막았을 가능성이 있다고 보았다.
        따라서 수업에서 <b>{data.change || "______"}</b>을 해 볼 필요가 있다.
      </p>
    </div>
  );
}

interface LessonOneActivityProps {
  data: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export function LessonOneActivity({ data, onChange }: LessonOneActivityProps) {
  return (
    <div className="lesson-one-grid">
      <section className="activity-panel">
        <header className="panel-title">
          <b>1</b>
          <div>
            <h2>사실과 해석</h2>
            <p>읽고 선택하세요.</p>
          </div>
        </header>
        <div className="concept-pair">
          <section>
            <strong>사실</strong>
            <p>눈이나 귀로 확인할 수 있는 행동이나 말</p>
          </section>
          <section>
            <strong>해석</strong>
            <p>행동의 이유에 대해 교사가 붙인 설명</p>
          </section>
        </div>
        <div className="classification-list">
          {factQuestions.map((question, index) => {
            const key = `factChoice${index + 1}`;
            return (
              <div className="classification-row" key={key}>
                <p id={`${key}-label`}>
                  <i>{index + 1}</i>
                  {question}
                </p>
                <div role="radiogroup" aria-labelledby={`${key}-label`}>
                  {(["사실", "해석"] as const).map((choice) => (
                    <label key={choice} className={data[key] === choice ? "selected" : ""}>
                      <input
                        type="radio"
                        name={key}
                        value={choice}
                        checked={data[key] === choice}
                        onChange={() => onChange(key, choice)}
                      />
                      <span>{choice}</span>
                    </label>
                  ))}
                </div>
                {data[key] && (
                  <em
                    aria-live="polite"
                    className={data[key] === factAnswers[index] ? "correct" : "retry"}
                  >
                    {data[key] === factAnswers[index] ? "맞아요" : "다시 확인"}
                  </em>
                )}
              </div>
            );
          })}
        </div>
        <p className="remember-note">행동은 사실, 행동의 이유에 대한 판단은 해석입니다.</p>
      </section>
      <section className="activity-panel">
        <header className="panel-title">
          <b>2</b>
          <div>
            <h2>내 수업에 적용</h2>
            <p>확인할 정보와 바꿀 조건만 적으세요.</p>
          </div>
        </header>
        <SentencePreview data={data} />
        <div className="compact-form lesson-one-form">
          <label>
            <span>처음 한 판단</span>
            <input
              value={data.firstJudgment || ""}
              onChange={(e) => onChange("firstJudgment", e.target.value)}
              placeholder="학습 의욕이 낮다고 생각했다."
            />
          </label>
          <label>
            <span>새롭게 확인한 정보</span>
            <textarea
              value={data.additionalInfo || ""}
              onChange={(e) => onChange("additionalInfo", e.target.value)}
              placeholder="학생의 행동·말·조건 변화를 적으세요."
            />
          </label>
          <label>
            <span>배움을 막았을 가능성이 있는 요인</span>
            <input
              value={data.blockPoint || ""}
              onChange={(e) => onChange("blockPoint", e.target.value)}
              placeholder="핵심 어휘와 작성 방법을 이해하지 못했다."
            />
          </label>
          <label>
            <span>바꿔 볼 수업 조건</span>
            <input
              value={data.change || ""}
              onChange={(e) => onChange("change", e.target.value)}
              placeholder="쉬운 설명과 짧은 예시를 먼저 제시한다."
            />
          </label>
        </div>
      </section>
    </div>
  );
}

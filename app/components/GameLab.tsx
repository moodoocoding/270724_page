import React, { useState } from "react";
import Image from "next/image";

const gameCatalog = [
  { id: "spacing", rank: 1, title: "띄어쓰기 킹", tag: "국어 · 맞춤법", task: "문장을 보고 띄어쓰기 고치기", src: "/games/kingsmath/띄어쓰기 킹 (국어 맞춤법).html" },
  { id: "arithmetic", rank: 2, title: "사칙연산 계산킹", tag: "수학 · 연산", task: "제한 시간 안에 계산 문제 풀기", src: "/games/kingsmath/사칙연산 계산킹 (타임어택).html" },
  { id: "kind-words", rank: 3, title: "예쁜 말 킹", tag: "인성 · 언어", task: "상황에 맞는 따뜻한 말 고르기", src: "/games/kingsmath/예쁜 말 킹 (인성 교육).html" },
  { id: "magnet-defense", rank: 4, title: "자석 디펜스 킹", tag: "과학 · 자석", task: "자석의 성질로 목표 지키기", src: "/games/kingsmath/자석 디펜스 킹 (과학 자석).html" },
] as const;

const vibeServiceCatalog = [
  {
    id: "school-story",
    title: "학교에서 일어난 일",
    tag: "생활 · 관계",
    task: "학교생활 속 갈등 상황을 살펴보는 서비스",
    href: "https://script.google.com/macros/s/AKfycbyPg6QHAVPAStKDHHu_Sh1kKwsKHjNiKKA0ateoo0ikMH053ICntq5v6netHmY9o5-X/exec",
  },
  {
    id: "soro",
    title: "SORO 학생 공모전",
    tag: "학생 · 공모전",
    task: "학생의 생각과 작품을 모아 공유하는 서비스",
    href: "https://26soro.vercel.app/",
  },
  {
    id: "tpo-rescue",
    title: "TPO 스타일 구조대",
    tag: "실과 · 생활",
    task: "상황에 알맞은 옷차림을 판단하는 체험",
    href: "https://playtpo-six.vercel.app/",
  },
  {
    id: "population-balance",
    title: "인구 불균형 체험",
    tag: "사회 · 인구",
    task: "지역별 인구 문제를 탐색하는 사회과 체험",
    href: "https://society-0512.vercel.app/",
  },
  {
    id: "school-pet",
    title: "잎새여우와 함께",
    tag: "학급 · 돌봄",
    task: "가상 반려동물과 함께하는 학급 활동",
    href: "https://schoolpet.vercel.app/",
  },
] as const;

const experienceCatalog = [
  ...gameCatalog.map((item) => ({
    id: item.id,
    kind: "웹게임" as const,
    title: item.title,
    tag: item.tag,
    task: item.task,
    href: item.src,
    rank: item.rank,
  })),
  ...vibeServiceCatalog.map((item) => ({
    id: item.id,
    kind: "바이브코딩 사례" as const,
    title: item.title,
    tag: item.tag,
    task: item.task,
    href: item.href,
    rank: null,
  })),
];

const lessonThreeStages = [
  { id: "step1", number: "01", label: "콘텐츠 체험" },
  { id: "prompt", number: "02", label: "프롬프트 연습" },
  { id: "step2", number: "03", label: "결과물 탑재" },
] as const;

export type LessonThreeStage = (typeof lessonThreeStages)[number]["id"];

const promptPracticeCatalog = [
  {
    id: "vibe-step-1",
    group: "초보를 위한 바이브 코딩 3단계",
    title: "1단계 · 첫 웹앱 만들기",
    description: "학생 뽑기 프로그램부터 시작합니다.",
    prompt: `#역할
나는 대한민국의 초등학교 선생님이야.

#지시사항
- 우리반 학생은 20명인데, 학생의 이름이 축하메시지와 함께 뜨는 간단한 뽑기 프로그램을 만들고 싶어.
- 우리반 친구들 이름은 "고윤정, 김고은, 김지원, 김태희, 박은빈, 배수지, 송혜교, 아이규, 안유진, 윈터, 윤아, 이세영, 이영지, 장원영, 전소미, 전지현, 제니, 카리나, 태연, 한소희"야.
- "뽑기 버튼"을 클릭하면 메시지와 함께 해당 학생이 랜덤으로 뽑히고, 아래에는 남은 학생의 숫자를 표현해줘.
- 밑에 초기화 버튼을 하나 둬서 누르면 리셋되게 해줘.

#코드를 작성해줘`,
  },
  {
    id: "vibe-step-2",
    group: "초보를 위한 바이브 코딩 3단계",
    title: "2단계 · 기능 하나 더하기",
    description: "첫 결과에 선착순 기능을 추가합니다.",
    prompt: `#오, 첫번째 웹 앱을 잘 만들어줬어. 고마워.
- 그런데 나는 기능을 추가 하고 싶어.
- 지금 나타나는 화면을 반으로 나눠서, 왼쪽에는 기존의 뽑기 프로그램을 배치하고 오른쪽에는 학생의 이름 버튼이 나타나 있고, 그 버튼을 누르면 이름 밑에 선착순 번호가 나타나는 선착순 번호 프로그램을 만들고 싶어.
- 이름 버튼을 눌렀을때 반드시 이름도 유지되고, 번호가 나와야되.

# 코드를 작성해줘.`,
  },
  {
    id: "vibe-step-3",
    group: "초보를 위한 바이브 코딩 3단계",
    title: "3단계 · 타이머 더하기",
    description: "같은 대화에서 타이머 기능을 이어 붙입니다.",
    prompt: `#두 번째도 잘 만들어줬어.

#그런데 나는 기능을 또 하나 더 추가하고 싶어.
- 화면은 3등분해서 왼쪽에는 기존의 뽑기 프로그램, 중앙에는 선착순 프로그램을 배치하고, 오른쪽에는 타이머를 만들고 싶어.
- 5분의 시간이 나와 있고 원한다면 시간을 조정할 수 있어.
- 시간 밑에는 시작을 나타내는 긴 버튼이 있어서, 이 버튼을 누르면 타이머가 시작되면서 일시정지와 초기화를 나타내는 두 버튼으로 나뉘어.

# 코드를 작성해줘.`,
  },
  {
    id: "math-garden",
    group: "게임 제작",
    title: "수학정원 만들기",
    description: "학습 진도에 따라 식물이 자라는 수학 웹페이지입니다.",
    prompt: `초등학교 5학년 1학기 수학 학습 웹페이지를 단일 HTML 파일로 만들어줘.

요구사항:
- 이름과 반/번호 입력
- 단원 및 주제 선택
- 객관식·주관식 문제와 자동 채점
- 오답 시 힌트, 정답 시 해설 표시
- 전체 학습 진도와 식물 성장 화면
- 그림을 그릴 수 있는 연습장
- Tailwind CSS와 반응형 디자인 사용
- 새로고침하면 학습 내용이 초기화되도록 구성
- localStorage, 쿠키, 데이터베이스를 사용하지 말 것
- Google Apps Script, fetch, API 등 외부 데이터 전송 기능을 넣지 말 것
- 모든 코드를 하나의 HTML 파일에 작성할 것`,
  },
  {
    id: "frog-jump",
    group: "게임 제작",
    title: "개구리 점프 탈출 킹",
    description: "경로를 찾아 출구까지 이동하는 퍼즐 게임입니다.",
    prompt: `교실에서 사용할 "개구리 점프 탈출 킹 (경로 퍼즐)" 교육용 웹게임을 단일 HTML 파일로 만들어줘.

요구사항:
- 격자 위 개구리가 정해진 점프 규칙으로 이동
- 장애물을 피해 출구까지 가는 퍼즐 단계 구성
- 이동 가능 칸 표시와 성공·실패 피드백 제공
- 시작·다시 시작 버튼과 즉시 이해할 수 있는 피드백
- Tailwind CSS를 활용한 전자칠판·PC·모바일 반응형 디자인
- 새로고침하면 모든 내용이 초기화되도록 구성
- localStorage, 쿠키, 데이터베이스를 사용하지 말 것
- Google Apps Script, fetch, API 등 외부 데이터 전송 기능을 넣지 말 것
- 이미지나 효과가 필요하면 이모지, CSS, Web Audio API를 활용
- 모든 HTML, CSS, JavaScript 코드를 하나의 HTML 파일에 작성할 것`,
  },
  {
    id: "reverse-multiplication",
    group: "게임 제작",
    title: "거꾸로 빈칸 구구단 킹",
    description: "두 수를 연결해 목표 숫자를 만드는 연산 게임입니다.",
    prompt: `# 거꾸로 빈칸 구구단 킹 (수학 연산)

교실에서 사용할 "거꾸로 빈칸 구구단 킹 (수학 연산)" 교육용 웹게임을 단일 HTML 파일로 만들어줘.

요구사항:
- 숫자를 보여준다
- 화면 아래쪽에는 좌우에 세로로 숫자가 2부터 9까지 있다.
- 두 수를 선을 그어 연결해서 곱해서 화면에 제시한 숫자랑 같으면 점수를 받는다
- 시작·다시 시작 버튼과 즉시 이해할 수 있는 피드백
- Tailwind CSS를 활용한 전자칠판·PC·모바일 반응형 디자인
- 새로고침하면 모든 내용이 초기화되도록 구성
- localStorage, 쿠키, 데이터베이스를 사용하지 말 것
- Google Apps Script, fetch, API 등 외부 데이터 전송 기능을 넣지 말 것
- 이미지나 효과가 필요하면 이모지, CSS, Web Audio API를 활용
- 모든 HTML, CSS, JavaScript 코드를 하나의 HTML 파일에 작성할 것`,
  },
  {
    id: "space-sorting",
    group: "게임 제작",
    title: "분류 킹 우주 대청소",
    description: "우주 쓰레기를 기준에 따라 나누는 분류 게임입니다.",
    prompt: `교실에서 사용할 "분류 킹 우주 대청소 (분류 개념)" 교육용 웹게임을 단일 HTML 파일로 만들어줘.

요구사항:
- 여러가지 도형, 숫자, 동물, 과일이 우주 쓰레기 로 나옴.
- 우주 쓰레기 카드를 기준에 맞는 구역으로 드래그
- 색·모양·크기 등 분류 기준을 라운드마다 변경
- 분류 결과 즉시 피드백과 점수 제공
- 시작·다시 시작 버튼과 즉시 이해할 수 있는 피드백
- Tailwind CSS를 활용한 전자칠판·PC·모바일 반응형 디자인
- 새로고침하면 모든 내용이 초기화되도록 구성
- localStorage, 쿠키, 데이터베이스를 사용하지 말 것
- Google Apps Script, fetch, API 등 외부 데이터 전송 기능을 넣지 말 것
- 이미지나 효과가 필요하면 이모지, CSS, Web Audio API를 활용
- 모든 HTML, CSS, JavaScript 코드를 하나의 HTML 파일에 작성할 것`,
  },
] as const;

const MAX_UPLOAD_SIZE = 4 * 1024 * 1024;
const allowedUploadExtensions = new Set(["html", "htm", "zip", "png", "jpg", "jpeg", "gif", "webp", "pdf", "pptx"]);

function uploadFileError(file: File) {
  if (!file.size || file.size > MAX_UPLOAD_SIZE) {
    return "파일은 4MB 이하만 업로드할 수 있습니다.";
  }
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  if (!allowedUploadExtensions.has(extension)) {
    return "HTML, ZIP, 이미지, PDF, PPTX 파일만 업로드할 수 있습니다.";
  }
  return "";
}

interface GameLabProps {
  data: Record<string, string>;
  onChange: (key: string, value: string) => void;
  stage: LessonThreeStage;
}

export function GameLab({ data, onChange, stage: subTab }: GameLabProps) {
  const [selected, setSelected] = useState(() =>
    experienceCatalog.some((item) => item.id === (data.experienceId || data.gameId))
      ? (data.experienceId || data.gameId)
      : "spacing"
  );
  const [uploadPreview, setUploadPreview] = useState<{ kind: "html" | "image" | "file"; content: string } | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [cancelingUpload, setCancelingUpload] = useState(false);
  const [selectedPromptId, setSelectedPromptId] = useState(() =>
    promptPracticeCatalog.some((item) => item.id === data.promptPracticeId)
      ? data.promptPracticeId
      : promptPracticeCatalog[0].id
  );
  const [copyMessage, setCopyMessage] = useState("");

  const chooseExperience = (id: string, title: string, kind: string) => {
    setSelected(id);
    onChange("experienceId", id);
    onChange("experienceTitle", title);
    onChange("experienceKind", kind);
    if (kind === "웹게임") {
      onChange("gameId", id);
      onChange("gameTitle", title);
    }
  };

  const activeExperience = experienceCatalog.find((item) => item.id === selected) || experienceCatalog[0];
  const activePrompt = promptPracticeCatalog.find((item) => item.id === selectedPromptId) || promptPracticeCatalog[0];
  const contentUrl = data.resultUrl?.trim() || "";
  const canPreviewContent = /^https?:\/\/\S+$/i.test(contentUrl);
  const handleExperienceKeys = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const currentIndex = experienceCatalog.findIndex((item) => item.id === selected);
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
      ? experienceCatalog.length - 1
      : Math.min(
          experienceCatalog.length - 1,
          Math.max(0, currentIndex + (event.key === "ArrowDown" ? 1 : -1))
        );
    const nextItem = experienceCatalog[nextIndex];
    chooseExperience(nextItem.id, nextItem.title, nextItem.kind);
    window.setTimeout(() => document.getElementById(`experience-option-${nextItem.id}`)?.focus(), 20);
  };

  const handlePromptKeys = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const currentIndex = promptPracticeCatalog.findIndex((item) => item.id === selectedPromptId);
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
      ? promptPracticeCatalog.length - 1
      : Math.min(
          promptPracticeCatalog.length - 1,
          Math.max(0, currentIndex + (event.key === "ArrowDown" ? 1 : -1))
        );
    const nextItem = promptPracticeCatalog[nextIndex];
    setSelectedPromptId(nextItem.id);
    window.setTimeout(() => document.getElementById(`prompt-option-${nextItem.id}`)?.focus(), 20);
  };

  const copyPracticePrompt = async () => {
    try {
      await navigator.clipboard.writeText(activePrompt.prompt);
      setCopyMessage(`‘${activePrompt.title}’ 프롬프트를 복사했습니다.`);
      onChange("promptPracticeId", activePrompt.id);
      onChange("promptPracticeTitle", activePrompt.title);
      onChange("promptPracticedAt", new Date().toISOString());
      window.setTimeout(() => setCopyMessage(""), 2200);
    } catch {
      setCopyMessage("복사하지 못했습니다. 프롬프트를 직접 선택해 복사해 주세요.");
    }
  };

  const step2Fields = [
    { key: "contentTitle", label: "내가 만든 콘텐츠 제목", placeholder: "예: 5학년 사회 핵심어휘 퀴즈" },
    { key: "contentPlan", label: "수업에서 어떻게 활용할까요?", placeholder: "언제, 누구와, 어떻게 사용할지 짧게 적어 주세요.", long: true }
  ];

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadError("");

    const validationError = uploadFileError(file);
    if (validationError) {
      setUploadError(validationError);
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
    formData.append("purpose", "lesson3");
    try {
      const response = await fetch("/api/final-upload", { method: "POST", body: formData });
      const body = await response.json();
      if (!response.ok) {
        const errorMessage = body.error || "파일을 탑재하지 못했습니다.";
        throw new Error(body.errorId ? `${errorMessage} (오류 ID: ${body.errorId})` : errorMessage);
      }
      onChange("uploadedFileName", body.fileName);
      onChange("uploadedFileSize", body.fileSize);
      onChange("uploadedFilePath", body.storagePath);
      onChange("resultUrl", body.url);
      onChange("uploadCanceledAt", "");
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "파일을 탑재하지 못했습니다.");
      setUploadPreview(null);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const cancelUploadedFile = async () => {
    if (!data.resultUrl && !data.uploadedFilePath) return;
    setCancelingUpload(true);
    setUploadError("");
    try {
      const response = await fetch("/api/final-upload", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          storagePath: data.uploadedFilePath,
          url: data.resultUrl,
          purpose: "lesson3",
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "탑재를 취소하지 못했습니다.");
      onChange("uploadedFileName", "");
      onChange("uploadedFileSize", "");
      onChange("uploadedFilePath", "");
      onChange("resultUrl", "");
      onChange("uploadCanceledAt", new Date().toISOString());
      setUploadPreview(null);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "탑재를 취소하지 못했습니다.");
    } finally {
      setCancelingUpload(false);
    }
  };

  return (
    <div className="game-lab">
      <div className="lesson-three-stage-viewport">
        <div
          key={subTab}
          id={`lesson-three-panel-${subTab}`}
          className="lesson-three-stage-slide slide-forward"
          role="region"
          aria-label={`3차시 ${lessonThreeStages.find((item) => item.id === subTab)?.label || "활동"}`}
          tabIndex={-1}
        >

      {subTab === "step1" && (
        <section className="game-experience" aria-labelledby="game-experience-title">
          <header className="prompt-practice-head">
            <div>
              <span>사례 살펴보기</span>
              <h2 id="game-experience-title">추천 콘텐츠를 직접 체험해 보세요.</h2>
              <p>게임을 하나 선택해 실행한 뒤, 다른 수업 웹서비스도 둘러봅니다.</p>
            </div>
          </header>

          <div className="experience-browser">
            <div
              className="experience-side-list"
              role="listbox"
              aria-label="체험할 콘텐츠 선택"
              onKeyDown={handleExperienceKeys}
            >
              {experienceCatalog.map((item, index) => (
                <button
                  key={item.id}
                  id={`experience-option-${item.id}`}
                  type="button"
                  role="option"
                  className={selected === item.id ? "selected" : ""}
                  aria-selected={selected === item.id}
                  aria-controls="experience-preview"
                  tabIndex={selected === item.id ? 0 : -1}
                  onClick={() => chooseExperience(item.id, item.title, item.kind)}
                >
                  <b>{String(index + 1).padStart(2, "0")}</b>
                  <span>
                    <small>{item.kind} · {item.tag}</small>
                    <strong>{item.title}</strong>
                  </span>
                </button>
              ))}
            </div>

            <article key={activeExperience.id} id="experience-preview" className="experience-preview" aria-live="polite">
              <div className="experience-preview-copy">
                <span>{activeExperience.kind}{activeExperience.rank ? ` · TOP ${activeExperience.rank}` : ""}</span>
                <h3>{activeExperience.title}</h3>
                <p>{activeExperience.task}</p>
              </div>
              <div className="experience-preview-actions">
                <a
                  className="game-start"
                  href={activeExperience.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${activeExperience.title} 새 창에서 열기`}
                  onClick={() => {
                    onChange("experiencedAt", new Date().toISOString());
                    onChange("experienceId", activeExperience.id);
                    onChange("experienceTitle", activeExperience.title);
                    onChange("experienceKind", activeExperience.kind);
                    if (activeExperience.kind === "웹게임") {
                      onChange("playedAt", new Date().toISOString());
                      onChange("gameId", activeExperience.id);
                      onChange("gameTitle", activeExperience.title);
                    }
                  }}
                >
                  {activeExperience.kind === "웹게임" ? "게임 시작" : "사례 체험"} ↗
                </a>
                {activeExperience.kind === "웹게임" && (
                  <a
                    className="secondary small-button"
                    href="/games/kingsmath/kingsmath-library.html"
                    target="_blank"
                    rel="noreferrer"
                  >
                    킹수학 게임 더 보기
                  </a>
                )}
              </div>
              <small className="experience-position">
                {experienceCatalog.findIndex((item) => item.id === activeExperience.id) + 1} / {experienceCatalog.length}
              </small>
            </article>
          </div>
        </section>
      )}

      {subTab === "prompt" && (
        <section className="prompt-practice" aria-labelledby="prompt-practice-title">
          <header className="prompt-practice-head">
            <div>
              <span>따라 해 보기</span>
              <h2 id="prompt-practice-title">프롬프트를 복사해 결과를 만들어 보세요.</h2>
              <p>왼쪽에서 하나를 고른 뒤 복사하고, Gemini의 새 대화에 붙여 넣습니다.</p>
            </div>
          </header>

          <div className="prompt-practice-flow" aria-label="프롬프트 연습 순서">
            <span><b>1</b> 예시 선택</span>
            <span><b>2</b> 프롬프트 복사</span>
            <span><b>3</b> Gemini에 붙여넣기</span>
          </div>

          <div className="prompt-practice-layout">
            <div
              className="prompt-practice-list"
              role="listbox"
              aria-label="연습할 프롬프트 선택"
              onKeyDown={handlePromptKeys}
            >
              {promptPracticeCatalog.map((item) => (
                <button
                  key={item.id}
                  id={`prompt-option-${item.id}`}
                  type="button"
                  role="option"
                  className={selectedPromptId === item.id ? "selected" : ""}
                  aria-selected={selectedPromptId === item.id}
                  aria-controls="prompt-practice-preview"
                  tabIndex={selectedPromptId === item.id ? 0 : -1}
                  onClick={() => setSelectedPromptId(item.id)}
                >
                  <small>{item.group}</small>
                  <strong>{item.title}</strong>
                  <span>{item.description}</span>
                </button>
              ))}
            </div>

            <article key={activePrompt.id} id="prompt-practice-preview" className="prompt-practice-preview" aria-live="polite">
              <header>
                <div>
                  <small>{activePrompt.group}</small>
                  <h3>{activePrompt.title}</h3>
                </div>
                <span>{activePrompt.prompt.length.toLocaleString("ko-KR")}자</span>
              </header>
              <textarea
                readOnly
                value={activePrompt.prompt}
                aria-label={`${activePrompt.title} 프롬프트 원문`}
                onFocus={(event) => event.currentTarget.select()}
              />
              <div className="prompt-practice-actions">
                <button type="button" className="secondary" onClick={() => void copyPracticePrompt()}>
                  프롬프트 복사
                </button>
                <a
                  className="primary"
                  href="https://gemini.google.com/app"
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => {
                    onChange("promptPracticeId", activePrompt.id);
                    onChange("promptPracticeTitle", activePrompt.title);
                    onChange("promptPracticedAt", new Date().toISOString());
                  }}
                >
                  Gemini에서 실행 ↗
                </a>
              </div>
              <p className="prompt-copy-help">복사한 뒤 Gemini의 입력창에 붙여 넣으세요.</p>
              <p className="prompt-copy-status" role="status" aria-live="polite">{copyMessage}</p>
            </article>
          </div>
        </section>
      )}

      {subTab === "step2" && (
        <div className="game-layout">
          <section className="reflection-panel">
            <header className="panel-title">
              <b>탑재</b>
              <div>
                <h2>개발한 파일 직접 탑재하기</h2>
                <p>완성한 HTML, ZIP 또는 이미지 파일을 바로 탑재하세요.</p>
              </div>
            </header>
            <div className="file-upload-box">
              <label className={`file-upload-button ${uploading ? "disabled" : ""}`}>
                {uploading
                  ? "파일 탑재 중…"
                  : data.uploadedFileName
                  ? "📁 다른 파일로 교체하기"
                  : "📁 개발한 파일 직접 탑재하기"}
                <input
                  type="file"
                  accept=".html,.htm,.zip,image/*,.pdf,.pptx"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </label>
              <p>실행 가능: HTML·이미지 · 저장 가능: ZIP·PDF·PPTX · 최대 4MB</p>
              <small>HTML과 이미지만 우측 라이브 플레이어에서 바로 확인할 수 있습니다.</small>
              {uploading && (
                <div className="upload-progress" role="status">
                  <i />
                  <span>Supabase에 파일을 탑재하고 있습니다. 잠시만 기다려 주세요.</span>
                </div>
              )}
              {uploadError && <div className="upload-error" role="alert">{uploadError}</div>}
              {data.uploadedFileName && (
                <div className="uploaded-file" role="status">
                  <div>
                    <strong>✓ 탑재 완료</strong>
                    <span>
                      📄 {data.uploadedFileName} <small>{data.uploadedFileSize}</small>
                    </span>
                  </div>
                  <div className="uploaded-file-actions">
                    {data.resultUrl && (
                      <a href={data.resultUrl} target="_blank" rel="noreferrer">
                        파일 열기 ↗
                      </a>
                    )}
                    <button type="button" onClick={cancelUploadedFile} disabled={cancelingUpload}>
                      {cancelingUpload ? "취소 중…" : "탑재 취소"}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="compact-form">
              {step2Fields.map((field) => (
                <label key={field.key}>
                  <span>{field.label}</span>
                  {field.long ? (
                    <textarea
                      value={data[field.key] || ""}
                      onChange={(event) => onChange(field.key, event.target.value)}
                      placeholder={field.placeholder}
                    />
                  ) : (
                    <input
                      value={data[field.key] || ""}
                      onChange={(event) => onChange(field.key, event.target.value)}
                      placeholder={field.placeholder}
                    />
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
              {canPreviewContent && (
                <a className="primary small-button" href={contentUrl} target="_blank" rel="noreferrer">
                  새 창에서 열기
                </a>
              )}
            </div>
            {uploadPreview?.kind === "html" ? (
              <iframe
                className="game-frame"
                srcDoc={uploadPreview.content}
                title="업로드한 HTML 콘텐츠 라이브 테스트"
                sandbox="allow-scripts"
              />
            ) : uploadPreview?.kind === "image" ? (
              <div className="image-preview">
                <Image
                  src={uploadPreview.content}
                  alt="업로드한 콘텐츠 미리 보기"
                  width={1200}
                  height={800}
                  unoptimized
                />
              </div>
            ) : uploadPreview?.kind === "file" ? (
              <div className="demo-stage">
                <h3>파일 저장 완료</h3>
                <p>ZIP, PDF, PPTX는 저장만 가능합니다. 실시간 실행은 HTML 또는 이미지를 탑재해 주세요.</p>
              </div>
            ) : canPreviewContent ? (
              <iframe
                className="game-frame"
                src={contentUrl}
                title="내가 만든 콘텐츠 미리 보기"
                sandbox="allow-scripts"
                loading="lazy"
              />
            ) : (
              <div className="demo-stage">
                <h3>콘텐츠를 탑재해 주세요</h3>
                <p>왼쪽에서 HTML, ZIP 또는 이미지 파일을 선택하세요.</p>
              </div>
            )}
            <div className="player-footer">
              <span>{data.uploadedFileName || data.contentTitle || "아직 탑재한 콘텐츠가 없습니다."}</span>
            </div>
          </section>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}

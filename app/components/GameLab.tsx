import React, { useState } from "react";
import Image from "next/image";

const gameCatalog = [
  { id: "spacing", rank: 1, title: "띄어쓰기 킹", tag: "국어 · 맞춤법", task: "문장을 보고 띄어쓰기 고치기", src: "/games/kingsmath/띄어쓰기 킹 (국어 맞춤법).html" },
  { id: "arithmetic", rank: 2, title: "사칙연산 계산킹", tag: "수학 · 연산", task: "제한 시간 안에 계산 문제 풀기", src: "/games/kingsmath/사칙연산 계산킹 (타임어택).html" },
  { id: "kind-words", rank: 3, title: "예쁜 말 킹", tag: "인성 · 언어", task: "상황에 맞는 따뜻한 말 고르기", src: "/games/kingsmath/예쁜 말 킹 (인성 교육).html" },
  { id: "magnet-defense", rank: 4, title: "자석 디펜스 킹", tag: "과학 · 자석", task: "자석의 성질로 목표 지키기", src: "/games/kingsmath/자석 디펜스 킹 (과학 자석).html" },
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
}

export function GameLab({ data, onChange }: GameLabProps) {
  const [subTab, setSubTab] = useState<"step1" | "step2">(
    () => (data.contentTitle && !data.resultUrl ? "step2" : "step1")
  );
  const [selected, setSelected] = useState(() =>
    gameCatalog.some((game) => game.id === data.gameId) ? data.gameId : "spacing"
  );
  const [uploadPreview, setUploadPreview] = useState<{ kind: "html" | "image" | "file"; content: string } | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [cancelingUpload, setCancelingUpload] = useState(false);

  const chooseGame = (id: string, title: string) => {
    setSelected(id);
    onChange("gameId", id);
    onChange("gameTitle", title);
  };

  const activeGame = gameCatalog.find((game) => game.id === selected) || gameCatalog[0];
  const contentUrl = data.resultUrl?.trim() || "";
  const canPreviewContent = /^https?:\/\/\S+$/i.test(contentUrl);

  const step1Fields = [
    { key: "gameTitle", label: "체험한 게임", placeholder: "게임을 선택하면 자동으로 기록됩니다." },
    { key: "studentAction", label: "내가 해 본 결과", placeholder: "예: 3단계까지 진행했고 740점을 얻었다.", long: true },
    { key: "feedbackMechanism", label: "어떤 피드백을 바로 받나요?", placeholder: "예: 정답 여부, 점수, 다시 시도할 기회를 받는다.", long: true },
    { key: "changePlan", label: "내 수업에 맞게 무엇을 바꿀까요?", placeholder: "학년, 내용, 난이도, 규칙 중 바꿀 것만 적으세요.", long: true }
  ];

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
      <nav className="subtab-bar" aria-label="3차시 단계 선택">
        <button
          className={subTab === "step1" ? "primary" : "secondary"}
          aria-pressed={subTab === "step1"}
          onClick={() => setSubTab("step1")}
        >
          🎮 1단계: 추천 웹게임 체험 및 연구
        </button>
        <button
          className={subTab === "step2" ? "primary" : "secondary"}
          aria-pressed={subTab === "step2"}
          onClick={() => setSubTab("step2")}
        >
          🚀 2단계: 직접 개발한 콘텐츠 탑재 & 라이브 테스트
        </button>
      </nav>

      {subTab === "step1" && (
        <div className="game-layout">
          <section className="game-browser">
            <div className="guide-head">
              <div>
                <h2>추천 웹게임 4종</h2>
                <p>하나를 골라 플레이하고 수업 아이디어를 찾아보세요.</p>
              </div>
              <a
                className="secondary small-button portal-link"
                href="/games/kingsmath/kingsmath-library.html"
                target="_blank"
                rel="noreferrer"
              >
                🚀 킹수학 웹게임 원본 포털 ↗
              </a>
            </div>
            <div className="game-cards">
              {gameCatalog.map((game) => (
                <button
                  key={game.id}
                  type="button"
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
              추적 코드와 외부 폰트만 제거한 연수용 사본 · Powered by{" "}
              <a href="https://kingsmath.com" target="_blank" rel="noreferrer">
                킹수학
              </a>{" "}
              · CC BY-NC 4.0
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
            <button
              type="button"
              className="primary next-step-button"
              onClick={() => setSubTab("step2")}
            >
              다음: 2단계 내가 개발한 콘텐츠 탑재하기 →
            </button>
          </section>
        </div>
      )}

      {subTab === "step2" && (
        <div className="game-layout">
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
                {uploading
                  ? "파일 탑재 중…"
                  : data.uploadedFileName
                  ? "📁 다른 파일로 교체하기"
                  : "📁 개발한 파일 직접 탑재하기"}
                <input
                  type="file"
                  accept=".html,.htm,.zip,image/*"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </label>
              <p>.html, .zip, PNG, JPG 등 · 최대 4MB</p>
              <small>HTML과 이미지는 우측 라이브 플레이어에서 바로 확인할 수 있습니다.</small>
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
                <h3>파일 탑재 완료</h3>
                <p>ZIP 파일이 저장되었습니다. 실시간 실행을 확인하려면 압축을 푼 HTML 파일을 탑재해 주세요.</p>
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
              <button type="button" className="secondary small-button" onClick={() => setSubTab("step1")}>
                ← 1단계 게임 다시 보기
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

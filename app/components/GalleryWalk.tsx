import React, { useCallback, useEffect, useState } from "react";

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

export type GalleryComment = {
  id: string;
  authorId: number;
  authorSchool: string;
  authorName: string;
  body: string;
  createdAt: string;
  editedAt?: string;
  isMine?: boolean;
};

export type GalleryItem = {
  id: number;
  school: string;
  name: string;
  method: string;
  contentTitle: string;
  resultUrl: string;
  updatedAt: string;
  isExample?: boolean;
  isMine?: boolean;
  comments: GalleryComment[];
};

const galleryExample: GalleryItem = {
  id: -1,
  school: "예시 작품",
  name: "워크숍 예시",
  method: "학생이 문장의 띄어쓰기를 선택하면 정답 여부와 점수를 바로 확인합니다.",
  contentTitle: "띄어쓰기 킹 수업 활용 예시",
  resultUrl: "/games/kingsmath/띄어쓰기 킹 (국어 맞춤법).html",
  updatedAt: "",
  isExample: true,
  comments: [],
};

interface GalleryWalkProps {
  data: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onReturnToUpload: () => void;
}

export function GalleryWalk({ data, onChange, onReturnToUpload }: GalleryWalkProps) {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({});
  const [commentBusy, setCommentBusy] = useState<number | null>(null);
  const [commentErrors, setCommentErrors] = useState<Record<number, string>>({});
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentBody, setEditingCommentBody] = useState("");
  const [editingCommentBusy, setEditingCommentBusy] = useState(false);

  const loadGallery = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await fetch("/api/gallery", { cache: "no-store", signal });
      const body = await response.json() as { items?: GalleryItem[]; error?: string };
      if (!response.ok || !Array.isArray(body.items)) {
        throw new Error(body.error || "갤러리를 불러오지 못했습니다.");
      }
      setItems(body.items.map((item) => ({
        ...item,
        comments: Array.isArray(item.comments) ? item.comments : [],
      })));
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setLoadError(
        error instanceof Error
          ? error.message
          : "동료 결과물을 불러오지 못했습니다. 잠시 후 다시 열어 보세요.",
      );
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadGallery(controller.signal);
    return () => controller.abort();
  }, [loadGallery]);

  const uploadFinalResult = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadError("");

    const validationError = uploadFileError(file);
    if (validationError) {
      setUploadError(validationError);
      event.target.value = "";
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await fetch("/api/final-upload", { method: "POST", body: formData });
      const body = await response.json();
      if (!response.ok) {
        const errorMessage = body.error || "업로드하지 못했습니다.";
        throw new Error(body.errorId ? `${errorMessage} (오류 ID: ${body.errorId})` : errorMessage);
      }
      onChange("finalUrl", body.url);
      onChange("finalFileName", body.fileName);
      onChange("finalFileSize", body.fileSize);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "업로드하지 못했습니다.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const submitComment = async (event: React.FormEvent, targetParticipantId: number) => {
    event.preventDefault();
    const body = (commentDrafts[targetParticipantId] || "").trim();
    if (!body) return;
    setCommentBusy(targetParticipantId);
    setCommentErrors((previous) => ({ ...previous, [targetParticipantId]: "" }));
    try {
      const response = await fetch("/api/gallery", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetParticipantId, body }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "댓글을 저장하지 못했습니다.");
      setItems((previous) =>
        previous.map((item) =>
          item.id === targetParticipantId
            ? { ...item, comments: [...(item.comments || []), result.comment] }
            : item
        )
      );
      setCommentDrafts((previous) => ({ ...previous, [targetParticipantId]: "" }));
    } catch (error) {
      setCommentErrors((previous) => ({
        ...previous,
        [targetParticipantId]: error instanceof Error ? error.message : "댓글을 저장하지 못했습니다.",
      }));
    } finally {
      setCommentBusy(null);
    }
  };

  const startEditingComment = (comment: GalleryComment) => {
    setEditingCommentId(comment.id);
    setEditingCommentBody(comment.body);
  };

  const cancelEditingComment = () => {
    setEditingCommentId(null);
    setEditingCommentBody("");
  };

  const updateComment = async (event: React.FormEvent, targetParticipantId: number, commentId: string) => {
    event.preventDefault();
    const body = editingCommentBody.trim();
    if (!body) return;
    setEditingCommentBusy(true);
    setCommentErrors((previous) => ({ ...previous, [targetParticipantId]: "" }));
    try {
      const response = await fetch("/api/gallery", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetParticipantId, commentId, body }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "댓글을 수정하지 못했습니다.");
      setItems((previous) =>
        previous.map((item) =>
          item.id === targetParticipantId
            ? {
                ...item,
                comments: item.comments.map((comment) =>
                  comment.id === commentId ? result.comment : comment
                ),
              }
            : item
        )
      );
      cancelEditingComment();
    } catch (error) {
      setCommentErrors((previous) => ({
        ...previous,
        [targetParticipantId]: error instanceof Error ? error.message : "댓글을 수정하지 못했습니다.",
      }));
    } finally {
      setEditingCommentBusy(false);
    }
  };

  return (
    <div className="gallery-work">
      <section className="gallery-showcase" aria-live="polite">
        <header className="gallery-intro">
          <div>
            <b>갤러리워크</b>
            <h2>동료 작품 둘러보기</h2>
          </div>
          <p>작품을 열어 보고, 내 결과물에 반영할 의견을 정해 보세요.</p>
        </header>
        <div className="gallery-grid" aria-label={`예시 작품 1개와 동료 작품 ${items.length}개`}>
          {[galleryExample, ...items].map((item) => (
            <article
              key={item.id}
              className={item.isExample ? "gallery-card example" : "gallery-card"}
            >
              <header className="gallery-meta">
                <span>{item.isMine ? "내 작품" : item.school}</span>
                <strong>{item.isExample ? item.name : `${item.name} 선생님`}</strong>
              </header>
              <div className="gallery-piece content">
                <small>3차시 콘텐츠</small>
                <strong>{item.contentTitle || "제목을 정리 중입니다."}</strong>
              </div>
              <div className="gallery-piece">
                <small>선택한 수업 설계</small>
                <p>{item.method || "수업 설계를 정리 중입니다."}</p>
              </div>
              <div className="gallery-actions">
                {item.resultUrl ? (
                  <a
                    className="primary small-button"
                    href={item.resultUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`${item.name} 선생님의 작품 새 창에서 체험하기`}
                  >
                    작품 체험하기 ↗
                  </a>
                ) : item.isMine ? (
                  <button
                    type="button"
                    className="secondary small-button"
                    onClick={onReturnToUpload}
                  >
                    3차시 파일 다시 탑재하기
                  </button>
                ) : (
                  <span>3차시 제출 완료 · 체험 파일 준비 중</span>
                )}
              </div>
              {!item.isExample && (
                <section className="gallery-comments">
                  <div className="gallery-comments-head">
                    <strong>댓글로 의견 남기기</strong>
                    <span>{item.comments?.length || 0}</span>
                  </div>
                  {!!item.comments?.length && (
                    <div className="gallery-comment-list">
                      {item.comments.map((comment) => (
                        <article key={comment.id}>
                          <header>
                            <strong>
                              {comment.authorName} 선생님{" "}
                              {comment.editedAt && <small>수정됨</small>}
                            </strong>
                            {comment.isMine && editingCommentId !== comment.id && (
                              <button type="button" onClick={() => startEditingComment(comment)}>
                                수정
                              </button>
                            )}
                          </header>
                          {editingCommentId === comment.id ? (
                            <form
                              className="gallery-comment-edit"
                              onSubmit={(event) => updateComment(event, item.id, comment.id)}
                            >
                              <input
                                aria-label="댓글 수정"
                                value={editingCommentBody}
                                onChange={(event) => setEditingCommentBody(event.target.value)}
                                maxLength={300}
                                autoFocus
                              />
                              <div>
                                <button
                                  type="button"
                                  onClick={cancelEditingComment}
                                  disabled={editingCommentBusy}
                                >
                                  취소
                                </button>
                                <button
                                  type="submit"
                                  className="secondary"
                                  disabled={editingCommentBusy || !editingCommentBody.trim()}
                                >
                                  {editingCommentBusy ? "저장 중…" : "저장"}
                                </button>
                              </div>
                            </form>
                          ) : (
                            <p>{comment.body}</p>
                          )}
                        </article>
                      ))}
                    </div>
                  )}
                  <form onSubmit={(event) => submitComment(event, item.id)}>
                    <input
                      aria-label={`${item.name} 선생님 작품에 남길 댓글`}
                      value={commentDrafts[item.id] || ""}
                      onChange={(event) =>
                        setCommentDrafts((previous) => ({
                          ...previous,
                          [item.id]: event.target.value,
                        }))
                      }
                      placeholder="좋았던 점이나 제안을 남겨 주세요."
                      maxLength={300}
                    />
                    <button
                      type="submit"
                      className="secondary small-button"
                      disabled={commentBusy === item.id || !(commentDrafts[item.id] || "").trim()}
                    >
                      {commentBusy === item.id ? "저장 중…" : "등록"}
                    </button>
                  </form>
                  {commentErrors[item.id] && (
                    <p className="gallery-comment-error" role="alert">
                      {commentErrors[item.id]}
                    </p>
                  )}
                </section>
              )}
            </article>
          ))}
        </div>
        {loading && <p className="gallery-note">동료 결과물을 불러오는 중입니다.</p>}
        {loadError && (
          <div className="gallery-load-error" role="alert">
            <p className="gallery-note error">{loadError}</p>
            <button type="button" className="secondary small-button" onClick={() => void loadGallery()}>
              다시 불러오기
            </button>
          </div>
        )}
        {!loading && !loadError && !items.length && (
          <p className="gallery-note">
            아직 제출된 동료 작품이 없습니다. 제출되면 예시 작품 옆에 나타납니다.
          </p>
        )}
      </section>

      <section className="reflection-panel gallery-final">
        <header className="panel-title">
          <b>최종</b>
          <div>
            <h2>의견을 반영해 최종본을 제출하세요.</h2>
            <p>아래 두 항목만 작성하면 4차시가 끝납니다.</p>
          </div>
        </header>
        <div className="gallery-final-grid">
          <label className="revision-card">
            <span>
              <i>1</i>반영한 의견과 수정 내용
            </span>
            <textarea
              value={data.revision || ""}
              onChange={(event) => onChange("revision", event.target.value)}
              placeholder="어떤 의견을 반영해 무엇을 수정했는지 적어 주세요."
            />
          </label>
          <div className="final-upload-card">
            <div className="field-title">
              <i>2</i>
              <div>
                <strong>최종 결과물 업로드</strong>
                <small>HTML, ZIP, 이미지, PDF, PPTX · 최대 4MB</small>
              </div>
            </div>
            <label className={`final-upload-button ${uploading ? "disabled" : ""}`}>
              {uploading ? "업로드 중…" : data.finalUrl ? "파일 교체하기" : "파일 선택하기"}
              <input
                type="file"
                accept=".html,.htm,.zip,.png,.jpg,.jpeg,.gif,.webp,.pdf,.pptx"
                onChange={uploadFinalResult}
                disabled={uploading}
              />
            </label>
            <div className="upload-status" role="status">
              {data.finalUrl ? (
                <>
                  <span>
                    {data.finalFileName || "최종 결과물"} <small>{data.finalFileSize}</small>
                  </span>
                  <a href={data.finalUrl} target="_blank" rel="noreferrer">
                    열어보기 ↗
                  </a>
                </>
              ) : (
                <span>아직 업로드한 최종 결과물이 없습니다.</span>
              )}
            </div>
            {uploadError && (
              <p className="upload-error" role="alert">
                {uploadError}
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

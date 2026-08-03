import { chromium } from "file:///C:/Users/panth/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import { mkdir } from "node:fs/promises";

const baseUrl = "https://ai-oneday-workbook.vercel.app";
const outputDir = "C:/Users/panth/Documents/vibecoding/270724_page/tmp/pdfs/screenshots";
const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: chromePath,
});
const context = await browser.newContext({
  viewport: { width: 1600, height: 1000 },
  deviceScaleFactor: 1,
  locale: "ko-KR",
});
const page = await context.newPage();
const peerContext = await browser.newContext({
  viewport: { width: 1600, height: 1000 },
  locale: "ko-KR",
});

async function settle() {
  await page.waitForTimeout(450);
}

async function capture(name, target = page.locator("body")) {
  await target.screenshot({
    path: `${outputDir}/${name}.png`,
    animations: "disabled",
  });
}

async function selectSidebar(label) {
  await page.locator(".sidebar nav button").filter({ hasText: label }).click();
  await settle();
}

try {
  await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 60000 });
  await capture("00-entry", page);

  const peerSession = await peerContext.request.post(`${baseUrl}/api/session`, {
    data: {
      school: "연수안내 예시학교",
      name: "동료 예시",
      workshopCode: "NB-2026-10-02",
    },
  });
  if (!peerSession.ok()) throw new Error(`동료 예시 입장 실패: ${peerSession.status()}`);
  const peerSubmission = await peerContext.request.post(`${baseUrl}/api/submissions`, {
    data: {
      step: 3,
      status: "submitted",
      data: {
        contentTitle: "동료의 핵심어휘 설명 게임",
        contentPlan: "짝 활동에서 핵심어휘를 설명하고 즉시 피드백을 받는 콘텐츠",
        resultUrl: `${baseUrl}/games/kingsmath/10%20만들기%20텐팡%20킹%20(수학%20연산).html`,
      },
    },
  });
  if (!peerSubmission.ok()) throw new Error(`동료 예시 제출 실패: ${peerSubmission.status()}`);

  await page.getByLabel("지역").selectOption("north");
  await page.getByLabel("날짜").selectOption("NB-2026-10-02");
  await page.getByLabel("학교명").fill("연수안내 예시학교");
  await page.getByLabel("이름").fill("연수생 예시");
  await page.getByRole("button", { name: "워크북 시작하기" }).click();
  await page.waitForSelector(".app-shell", { timeout: 30000 });

  const workArea = page.locator(".work-area");
  const rows = page.locator(".classification-row");
  await rows.nth(0).getByText("사실", { exact: true }).click();
  await rows.nth(1).getByText("해석", { exact: true }).click();
  await rows.nth(2).getByText("사실", { exact: true }).click();
  await rows.nth(3).getByText("해석", { exact: true }).click();
  await page.getByPlaceholder("학습 의욕이 낮다고 생각했다.").fill("학생이 과제에 관심이 없다고 판단했다.");
  await page.getByPlaceholder("학생의 행동·말·조건 변화를 적으세요.").fill("활동 방법을 다시 설명하자 질문하고 과제에 참여했다.");
  await page.getByPlaceholder("핵심 어휘와 작성 방법을 이해하지 못했다.").fill("활동 순서와 핵심 어휘를 충분히 이해하지 못했다.");
  await page.getByPlaceholder("쉬운 설명과 짧은 예시를 먼저 제시한다.").fill("짧은 예시와 단계별 안내를 먼저 제시한다.");
  await settle();
  await capture("01-lesson1", workArea);

  await selectSidebar("수업 설계");
  await page.waitForSelector(".meta-prompt-preview pre");
  await settle();
  await capture("02-lesson2-step1-gem", workArea);

  await page.getByRole("button", { name: /2단계.*AI에게 요청하기/ }).click();
  await page.getByPlaceholder("예: 5").fill("5");
  await page.getByPlaceholder("예: 사회").fill("사회");
  await page.getByPlaceholder("예: 핵심 어휘가 낯설기").fill("핵심 어휘가 낯설기");
  await page.getByPlaceholder("예: 자료의 의미 설명하기").fill("자료의 의미를 자기 말로 설명하기");
  await page.getByPlaceholder("예: 근거를 찾아 자기 말로 설명하기").fill("근거를 찾아 짝과 설명을 주고받기");
  await settle();
  await capture("03-lesson2-step2-request", workArea);

  await page.getByRole("button", { name: /3단계.*방법 비교.*선택하기/ }).click();
  const methodInputs = page.locator(".method-row input");
  const methods = [
    "핵심어 카드 짝 맞추기",
    "자료에 질문 꼬리표 붙이기",
    "짝 설명 후 한 문장 요약하기",
    "예시와 비예시 비교하기",
    "모둠별 근거 찾기 릴레이",
  ];
  for (let index = 0; index < methods.length; index += 1) {
    await methodInputs.nth(index).fill(methods[index]);
  }
  await page.locator(".method-row").nth(2).getByRole("button", { name: "선택", exact: true }).click();
  await page.getByLabel("배움 문제에 도움이 되는가?").check();
  await page.getByLabel("학생이 실제로 할 수 있는가?").check();
  await page.getByLabel("기존 수업에 넣을 수 있는가?").check();
  await page.getByPlaceholder("이 방법을 선택한 이유를 한두 문장으로 적어 주세요.").fill("학생이 말로 설명하며 이해 정도를 바로 확인할 수 있기 때문입니다.");
  await settle();
  await capture("04-lesson2-step3-method", workArea);

  await selectSidebar("콘텐츠 제작");
  await page.locator(".game-cards button").first().click();
  await page.getByPlaceholder("예: 3단계까지 진행했고 740점을 얻었다.").fill("여러 상황에서 알맞은 표현을 선택하며 활동을 마쳤다.");
  await page.getByPlaceholder("예: 정답 여부, 점수, 다시 시도할 기회를 받는다.").fill("선택 직후 정답과 점수를 확인하고 다시 시도했다.");
  await page.getByPlaceholder("학년, 내용, 난이도, 규칙 중 바꿀 것만 적으세요.").fill("우리 반 사례를 넣고 문장 난이도를 한 단계 낮춘다.");
  await settle();
  await capture("05-lesson3-step1-game", workArea);

  await page.locator(".subtab-bar button").filter({ hasText: "2단계" }).click();
  await page.getByPlaceholder("예: 5학년 사회 핵심어휘 퀴즈").fill("우리 반 핵심어휘 설명 게임");
  await page.getByPlaceholder("언제, 누구와, 어떻게 사용할지 짧게 적어 주세요.").fill("도입에서 짝 활동으로 실행하고 결과를 함께 확인한다.");
  await settle();
  await capture("06-lesson3-step2-upload", workArea);

  const lessonThreeFileInput = page.locator(".file-upload-button input[type=file]");
  await lessonThreeFileInput.setInputFiles("C:/Users/panth/Documents/vibecoding/270724_page/tmp/pdfs/sample-content.html");
  await page.getByText("탑재 완료").waitFor({ timeout: 30000 });
  await settle();
  await capture("07-lesson3-uploaded", workArea);

  await page.getByRole("button", { name: "제출하기" }).click();
  await page.getByText("제출했습니다.").waitFor({ timeout: 30000 });

  await page.locator(".sidebar nav button").nth(3).click();
  await settle();
  await page.getByText("동료 예시 선생님").waitFor({ timeout: 30000 });
  const peerCard = page.locator(".gallery-card").filter({ hasText: "동료 예시 선생님" });
  await page.getByPlaceholder("어떤 의견을 반영해 무엇을 수정했는지 적어 주세요.").fill("동료 의견을 반영해 도움말과 다시 시도 버튼을 더 분명하게 수정했습니다.");
  await settle();
  await capture("08-lesson4-gallery", workArea);

  const commentToggle = peerCard.getByRole("button", { name: /댓글 보기/ });
  if (await commentToggle.count()) {
    await commentToggle.click();
    await settle();
  }
  const commentComposer = peerCard.locator("input, textarea").last();
  if (await commentComposer.count()) {
    await commentComposer.fill("즉시 피드백이 있어 학생이 스스로 다시 시도할 수 있겠습니다.");
    const registerComment = peerCard.getByRole("button", { name: /등록|댓글/ }).last();
    if (await registerComment.count()) {
      await registerComment.click();
      await peerCard.getByText("즉시 피드백이 있어").waitFor({ timeout: 30000 });
      const editComment = peerCard.getByRole("button", { name: "수정" });
      if (await editComment.count()) {
        await editComment.click();
        await settle();
        await capture("09-lesson4-comment-edit", workArea);
        await peerCard.getByRole("button", { name: "취소" }).click();
      }
    }
  }

  await selectSidebar("콘텐츠 제작");
  await page.locator(".subtab-bar button").filter({ hasText: "2단계" }).click();
  const cancelButton = page.getByRole("button", { name: "탑재 취소" });
  if (await cancelButton.isVisible()) {
    await cancelButton.click();
    await settle();
  }
  console.log(JSON.stringify({
    ok: true,
    screenshots: [
      "00-entry",
      "01-lesson1",
      "02-lesson2-step1-gem",
      "03-lesson2-step2-request",
      "04-lesson2-step3-method",
      "05-lesson3-step1-game",
      "06-lesson3-step2-upload",
      "07-lesson3-uploaded",
      "08-lesson4-gallery",
      "09-lesson4-comment-edit",
    ],
  }));
} finally {
  try {
    await peerContext.request.post(`${baseUrl}/api/submissions`, {
      data: { step: 3, status: "draft", data: {} },
    });
  } catch {}
  try {
    const submissionsResponse = await context.request.get(`${baseUrl}/api/submissions`);
    if (submissionsResponse.ok()) {
      const submissionBody = await submissionsResponse.json();
      const lessonThree = (submissionBody.submissions || []).find((item) => item.step === 3);
      const lessonThreeData = lessonThree ? JSON.parse(lessonThree.dataJson || "{}") : {};
      if (lessonThreeData.uploadedFilePath || lessonThreeData.resultUrl) {
        await context.request.delete(`${baseUrl}/api/final-upload`, {
          data: {
            storagePath: lessonThreeData.uploadedFilePath,
            url: lessonThreeData.resultUrl,
            purpose: "lesson3",
          },
        });
      }
    }
  } catch {}
  await peerContext.close();
  await context.close();
  await browser.close();
}

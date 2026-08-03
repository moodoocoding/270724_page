import { chromium } from "file:///C:/Users/panth/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const baseUrl = "https://ai-oneday-workbook.vercel.app";
const outputDir = "C:/Users/panth/Documents/vibecoding/270724_page/tmp/pdfs/screenshots";
const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
const viewerContext = await browser.newContext({
  viewport: { width: 1600, height: 1000 },
  locale: "ko-KR",
});
const peerContext = await browser.newContext({
  viewport: { width: 1600, height: 1000 },
  locale: "ko-KR",
});
const page = await viewerContext.newPage();

try {
  const peerLogin = await peerContext.request.post(`${baseUrl}/api/session`, {
    data: {
      school: "연수안내 예시학교",
      name: "동료 예시",
      workshopCode: "NB-2026-10-02",
    },
  });
  if (!peerLogin.ok()) throw new Error(`동료 입장 실패: ${peerLogin.status()}`);
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
  if (!peerSubmission.ok()) throw new Error(`동료 제출 실패: ${peerSubmission.status()}`);

  const viewerLogin = await viewerContext.request.post(`${baseUrl}/api/session`, {
    data: {
      school: "연수안내 예시학교",
      name: "연수생 예시",
      workshopCode: "NB-2026-10-02",
    },
  });
  if (!viewerLogin.ok()) throw new Error(`연수생 입장 실패: ${viewerLogin.status()}`);
  const viewerSession = (await viewerLogin.json()).session;

  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.evaluate((session) => {
    window.localStorage.setItem("oneday-session", JSON.stringify(session));
  }, viewerSession);
  await page.reload({ waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector(".app-shell");
  await page.locator(".sidebar nav button").nth(3).click();
  await page.getByText("동료 예시 선생님").waitFor({ timeout: 30000 });

  const peerCard = page.locator(".gallery-card").filter({ hasText: "동료 예시 선생님" });
  const toggle = peerCard.getByRole("button", { name: /댓글 보기/ });
  if (await toggle.count()) await toggle.click();
  await page.waitForTimeout(500);
  await page.locator(".work-area").screenshot({
    path: `${outputDir}/09-lesson4-comments-open.png`,
    animations: "disabled",
  });

  let editButton = page.getByRole("button", { name: "수정" }).last();
  if (!(await editButton.count())) {
    const composer = page.getByPlaceholder("좋았던 점이나 제안을 남겨 주세요.");
    if (await composer.count()) {
      await composer.fill("즉시 피드백이 있어 학생이 스스로 다시 시도할 수 있겠습니다.");
      const register = page.getByRole("button", { name: "등록", exact: true });
      if (await register.count() && await register.isEnabled()) {
        await register.click();
        await page.getByText("즉시 피드백이 있어").last().waitFor({ timeout: 30000 });
        await page.waitForTimeout(1500);
      }
    }
    editButton = page.getByRole("button", { name: "수정" }).last();
  }

  if (await editButton.count()) await editButton.click();
  await page.waitForTimeout(500);
  await page.locator(".work-area").screenshot({
    path: `${outputDir}/09-lesson4-comment-edit.png`,
    animations: "disabled",
  });

  console.log(JSON.stringify({
    ok: true,
    screenshot: "09-lesson4-comment-edit.png",
    controls: await page.locator("input, textarea, button").evaluateAll((elements) => elements.map((element) => ({
      tag: element.tagName,
      text: element.textContent?.trim(),
      placeholder: element.getAttribute("placeholder"),
      disabled: "disabled" in element ? element.disabled : false,
    })).filter((item) => item.placeholder || item.text === "등록" || item.text === "수정")),
  }));
} finally {
  try {
    await peerContext.request.post(`${baseUrl}/api/submissions`, {
      data: { step: 3, status: "draft", data: {} },
    });
  } catch {}
  await peerContext.close();
  await viewerContext.close();
  await browser.close();
}

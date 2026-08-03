from pathlib import Path

from PIL import Image
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph


ROOT = Path(r"C:\Users\panth\Documents\vibecoding\270724_page")
SCREEN_DIR = ROOT / "tmp" / "pdfs" / "screenshots"
OUTPUT_DIR = ROOT / "output" / "pdf"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_PDF = OUTPUT_DIR / "원데이클래스_연수생_사용안내.pdf"
ENTRY_CROP = SCREEN_DIR / "00-entry-crop.png"

with Image.open(SCREEN_DIR / "00-entry.png") as entry_image:
    entry_image.crop((330, 165, 1275, 835)).save(ENTRY_CROP)

PAGE_W, PAGE_H = landscape(A4)
GREEN = colors.HexColor("#126548")
DARK = colors.HexColor("#10271D")
LIME = colors.HexColor("#D5FF24")
INK = colors.HexColor("#18221D")
MUTED = colors.HexColor("#667169")
LINE = colors.HexColor("#D8DED9")
SOFT = colors.HexColor("#F3F7F4")
PALE = colors.HexColor("#EAF5EE")
WHITE = colors.white

pdfmetrics.registerFont(TTFont("Malgun", r"C:\Windows\Fonts\malgun.ttf"))
pdfmetrics.registerFont(TTFont("Malgun-Bold", r"C:\Windows\Fonts\malgunbd.ttf"))
pdfmetrics.registerFontFamily(
    "Malgun",
    normal="Malgun",
    bold="Malgun-Bold",
)


def paragraph(text, size=9.4, color=INK, bold=False, leading=None, align=TA_LEFT):
    style = ParagraphStyle(
        "guide",
        fontName="Malgun-Bold" if bold else "Malgun",
        fontSize=size,
        leading=leading or size * 1.52,
        textColor=color,
        alignment=align,
        spaceAfter=0,
        wordWrap="CJK",
    )
    return Paragraph(text, style)


def draw_paragraph(c, text, x, y_top, width, max_height, **kwargs):
    item = paragraph(text, **kwargs)
    w, h = item.wrap(width, max_height)
    item.drawOn(c, x, y_top - h)
    return h


def page_footer(c, page_no, section):
    c.setStrokeColor(LINE)
    c.setLineWidth(0.6)
    c.line(12 * mm, 10 * mm, PAGE_W - 12 * mm, 10 * mm)
    c.setFont("Malgun", 7.8)
    c.setFillColor(MUTED)
    c.drawString(12 * mm, 5.7 * mm, "AI 원데이 클래스 - 연수생 사용 안내")
    c.drawRightString(PAGE_W - 12 * mm, 5.7 * mm, f"{section}   {page_no}")


def page_header(c, kicker, title, subtitle, page_no):
    c.setFillColor(GREEN)
    c.setFont("Malgun-Bold", 9)
    c.drawString(12 * mm, PAGE_H - 13 * mm, kicker)
    c.setFillColor(INK)
    c.setFont("Malgun-Bold", 22)
    c.drawString(12 * mm, PAGE_H - 25 * mm, title)
    c.setFillColor(MUTED)
    c.setFont("Malgun", 9.3)
    c.drawString(12 * mm, PAGE_H - 32 * mm, subtitle)
    page_footer(c, page_no, kicker)


def draw_image_fit(c, image_path, x, y, width, height):
    with Image.open(image_path) as image:
        image_w, image_h = image.size
    scale = min(width / image_w, height / image_h)
    draw_w = image_w * scale
    draw_h = image_h * scale
    draw_x = x + (width - draw_w) / 2
    draw_y = y + (height - draw_h) / 2
    c.setFillColor(WHITE)
    c.roundRect(x, y, width, height, 3 * mm, fill=1, stroke=0)
    c.setStrokeColor(LINE)
    c.setLineWidth(0.7)
    c.roundRect(draw_x - 1.5, draw_y - 1.5, draw_w + 3, draw_h + 3, 2.2 * mm, fill=0, stroke=1)
    c.drawImage(str(image_path), draw_x, draw_y, draw_w, draw_h, preserveAspectRatio=True, mask="auto")


def draw_steps_panel(c, x, y, width, height, steps, tip=None):
    c.setFillColor(SOFT)
    c.setStrokeColor(LINE)
    c.setLineWidth(0.7)
    c.roundRect(x, y, width, height, 3 * mm, fill=1, stroke=1)
    top = y + height - 8 * mm
    for index, step in enumerate(steps, start=1):
        c.setFillColor(GREEN)
        c.roundRect(x + 6 * mm, top - 5.1 * mm, 7 * mm, 7 * mm, 1.4 * mm, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont("Malgun-Bold", 8.5)
        c.drawCentredString(x + 9.5 * mm, top - 2.6 * mm, str(index))
        used = draw_paragraph(
            c,
            step,
            x + 16 * mm,
            top + 1.1 * mm,
            width - 22 * mm,
            40 * mm,
            size=9.2,
            leading=13.7,
        )
        top -= max(14 * mm, used + 5 * mm)
    if tip:
        tip_height = 24 * mm
        c.setFillColor(PALE)
        c.setStrokeColor(colors.HexColor("#B9D9C5"))
        c.roundRect(x + 5 * mm, y + 5 * mm, width - 10 * mm, tip_height, 2.5 * mm, fill=1, stroke=1)
        c.setFillColor(GREEN)
        c.setFont("Malgun-Bold", 8.4)
        c.drawString(x + 9 * mm, y + 21 * mm, "기억하세요")
        draw_paragraph(
            c,
            tip,
            x + 9 * mm,
            y + 18 * mm,
            width - 18 * mm,
            14 * mm,
            size=8.3,
            color=INK,
            leading=12.2,
        )


def screenshot_page(c, page_no, kicker, title, subtitle, screenshot, steps, tip=None, reinforce_panel_labels=False):
    page_header(c, kicker, title, subtitle, page_no)
    image_x = 12 * mm
    image_y = 18 * mm
    image_w = 196 * mm
    image_h = 151 * mm
    panel_x = 214 * mm
    panel_y = 18 * mm
    panel_w = PAGE_W - panel_x - 12 * mm
    panel_h = 151 * mm
    draw_image_fit(c, SCREEN_DIR / screenshot, image_x, image_y, image_w, image_h)
    draw_steps_panel(c, panel_x, panel_y, panel_w, panel_h, steps, tip)
    if reinforce_panel_labels:
        first_top = panel_y + panel_h - 8 * mm
        c.setFillColor(GREEN)
        c.roundRect(panel_x + 6 * mm, first_top - 5.1 * mm, 7 * mm, 7 * mm, 1.4 * mm, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont("Malgun-Bold", 8.5)
        c.drawCentredString(panel_x + 9.5 * mm, first_top - 2.6 * mm, "1")
        if tip:
            c.setFillColor(GREEN)
            c.setFont("Malgun-Bold", 8.4)
            c.drawString(panel_x + 9 * mm, panel_y + 21 * mm, "기억하세요")
    c.showPage()


def cover_page(c):
    c.setFillColor(DARK)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    c.setFillColor(LIME)
    c.roundRect(18 * mm, PAGE_H - 29 * mm, 33 * mm, 10 * mm, 3 * mm, fill=1, stroke=0)
    c.setFillColor(DARK)
    c.setFont("Malgun-Bold", 9)
    c.drawCentredString(34.5 * mm, PAGE_H - 25.5 * mm, "연수생 안내")

    c.setFillColor(WHITE)
    c.setFont("Malgun-Bold", 31)
    c.drawString(18 * mm, PAGE_H - 53 * mm, "AI 원데이 클래스")
    c.setFont("Malgun-Bold", 23)
    c.drawString(18 * mm, PAGE_H - 68 * mm, "웹 워크북 사용 안내")
    draw_paragraph(
        c,
        "입장부터 수업 문제 정의, AI 수업 설계, 콘텐츠 탑재, 갤러리워크와 최종 제출까지 화면을 보며 따라가는 안내서입니다.",
        18 * mm,
        PAGE_H - 79 * mm,
        150 * mm,
        28 * mm,
        size=11,
        color=colors.HexColor("#DCE9E1"),
        leading=17,
    )

    stages = [
        ("입장", "지역·날짜·학교·이름"),
        ("1차시", "사실과 해석 - 문제 정의"),
        ("2차시", "Gem - 요청 - 방법 선택"),
        ("3차시", "게임 체험 - 파일 탑재"),
        ("4차시", "동료 작품 - 댓글 - 최종본"),
    ]
    start_x = 18 * mm
    box_y = 43 * mm
    box_w = 49 * mm
    gap = 5 * mm
    for idx, (stage, desc) in enumerate(stages):
        x = start_x + idx * (box_w + gap)
        c.setFillColor(colors.HexColor("#183A2C"))
        c.setStrokeColor(colors.HexColor("#3F6554"))
        c.roundRect(x, box_y, box_w, 32 * mm, 3 * mm, fill=1, stroke=1)
        c.setFillColor(LIME if idx else WHITE)
        c.setFont("Malgun-Bold", 12)
        c.drawString(x + 5 * mm, box_y + 20 * mm, stage)
        draw_paragraph(
            c,
            desc,
            x + 5 * mm,
            box_y + 15 * mm,
            box_w - 10 * mm,
            11 * mm,
            size=8.3,
            color=colors.HexColor("#DCE9E1"),
            leading=11.5,
        )

    c.setFillColor(colors.HexColor("#AFC4B8"))
    c.setFont("Malgun", 8.5)
    c.drawString(18 * mm, 20 * mm, "기준 화면: 2026-07-27 배포 서비스")
    c.drawRightString(PAGE_W - 18 * mm, 20 * mm, "https://ai-oneday-workbook.vercel.app")
    c.showPage()


def checklist_page(c, page_no):
    page_header(
        c,
        "마무리",
        "제출 전 마지막 확인",
        "작성 내용은 비어 있어도 제출할 수 있지만, 갤러리 체험에는 3차시 파일 탑재가 필요합니다.",
        page_no,
    )

    cards = [
        (
            "저장과 제출",
            [
                "<b>임시 저장</b>: 작성 중인 내용을 초안으로 보관합니다.",
                "<b>제출하기</b>: 해당 차시를 제출 완료 상태로 바꿉니다.",
                "수정한 뒤에는 <b>다시 제출</b>할 수 있습니다.",
            ],
        ),
        (
            "3차시 파일",
            [
                "파일 선택 후 <b>탑재 완료</b> 문구를 확인합니다.",
                "4차시에 체험 버튼이 없으면 3차시에서 다시 탑재합니다.",
                "교체하거나 취소할 때는 탑재 파일 옆 버튼을 사용합니다.",
            ],
        ),
        (
            "4차시 갤러리",
            [
                "작품 체험 후 관찰한 장면을 댓글로 남깁니다.",
                "내 댓글은 <b>수정</b>할 수 있고 다른 사람 댓글은 수정할 수 없습니다.",
                "반영한 의견과 수정 내용, 최종 파일을 확인합니다.",
            ],
        ),
        (
            "문제가 생겼을 때",
            [
                "같은 지역·날짜·학교명·이름으로 다시 입장합니다.",
                "화면이 갱신되지 않으면 새로고침 후 다시 확인합니다.",
                "업로드 파일은 4MB 이하 권장 형식을 사용합니다.",
            ],
        ),
    ]
    margin_x = 12 * mm
    top_y = PAGE_H - 45 * mm
    card_w = (PAGE_W - 29 * mm) / 2
    card_h = 56 * mm
    for idx, (title, bullets) in enumerate(cards):
        col = idx % 2
        row = idx // 2
        x = margin_x + col * (card_w + 5 * mm)
        y = top_y - row * (card_h + 7 * mm) - card_h
        c.setFillColor(SOFT)
        c.setStrokeColor(LINE)
        c.roundRect(x, y, card_w, card_h, 3 * mm, fill=1, stroke=1)
        c.setFillColor(GREEN)
        c.setFont("Malgun-Bold", 12)
        c.drawString(x + 7 * mm, y + card_h - 11 * mm, title)
        bullet_y = y + card_h - 18 * mm
        for bullet in bullets:
            c.setFillColor(LIME)
            c.circle(x + 8.5 * mm, bullet_y - 2.3 * mm, 1.3 * mm, fill=1, stroke=0)
            used = draw_paragraph(
                c,
                bullet,
                x + 12 * mm,
                bullet_y,
                card_w - 19 * mm,
                18 * mm,
                size=9.1,
                leading=13.3,
            )
            bullet_y -= max(11 * mm, used + 3 * mm)

    c.setFillColor(DARK)
    c.roundRect(12 * mm, 18 * mm, PAGE_W - 24 * mm, 20 * mm, 3 * mm, fill=1, stroke=0)
    c.setFillColor(LIME)
    c.setFont("Malgun-Bold", 11)
    c.drawString(18 * mm, 29 * mm, "완료 기준")
    c.setFillColor(WHITE)
    c.setFont("Malgun", 9.2)
    c.drawString(
        45 * mm,
        29 * mm,
        "왼쪽 진행 표시가 4/4 제출이고, 4차시 최종 결과물까지 확인되면 워크북 활동이 끝납니다.",
    )
    c.showPage()


document = canvas.Canvas(str(OUTPUT_PDF), pagesize=landscape(A4))
document.setTitle("AI 원데이 클래스 - 연수생 사용 안내")
document.setAuthor("AI 원데이 클래스")
document.setSubject("연수생 웹 워크북 사용 안내")

cover_page(document)

screenshot_page(
    document,
    2,
    "시작하기",
    "지역과 날짜를 고른 뒤 입장하세요",
    "처음 화면에서 연수 회차와 본인 정보를 선택합니다.",
    "00-entry-crop.png",
    [
        "<b>지역</b>을 선택합니다.",
        "해당 지역의 <b>연수 날짜</b>를 선택합니다.",
        "<b>학교명</b>과 <b>이름</b>을 정확히 입력합니다.",
        "<b>워크북 시작하기</b>를 눌러 입장합니다.",
    ],
    "다시 접속할 때도 같은 지역·날짜·학교명·이름을 사용하면 작성 내용을 이어서 볼 수 있습니다.",
)

screenshot_page(
    document,
    3,
    "1차시",
    "사실을 확인하고 수업 문제를 정의합니다",
    "관찰한 사실과 교사의 해석을 구분한 뒤 바꿀 수업 조건을 정리합니다.",
    "01-lesson1.png",
    [
        "문장 네 개를 읽고 <b>사실</b> 또는 <b>해석</b>을 선택합니다.",
        "내 수업에서 처음 했던 판단과 새롭게 확인한 정보를 적습니다.",
        "배움을 막았을 가능성이 있는 요인을 적습니다.",
        "교사가 바꿔 볼 수업 조건을 한 문장으로 정리합니다.",
    ],
    "오른쪽의 완성 문장은 입력 내용에 따라 자동으로 만들어지며 2차시 요청문의 출발점이 됩니다.",
)

screenshot_page(
    document,
    4,
    "2차시 - 1단계",
    "나만의 수업 설계 Gem을 만듭니다",
    "제공된 메타 프롬프트를 Gemini Gem의 요청 사항에 등록합니다.",
    "02-lesson2-step1-gem.png",
    [
        "<b>메타 프롬프트 복사</b>를 누릅니다.",
        "<b>새 Gem 만들기</b>를 눌러 Gemini Gem 관리자를 엽니다.",
        "새 Gem의 요청 사항에 메타 프롬프트 전체를 붙여 넣고 저장합니다.",
        "완성된 Gem에서 새 채팅을 시작합니다.",
    ],
    "Gemini 이용을 위해 Google 계정 로그인이 필요할 수 있습니다. 메타 프롬프트는 일부가 아니라 전체를 붙여 넣습니다.",
)

screenshot_page(
    document,
    5,
    "2차시 - 2단계",
    "AI에게 요청할 내용을 완성합니다",
    "1차시 출발 문장을 이어받아 학년·교과·어려움·원하는 행동을 작성합니다.",
    "03-lesson2-step2-request.png",
    [
        "학년과 교과를 입력합니다.",
        "학생들이 어려워하는 이유와 학습 행동을 적습니다.",
        "수업에서 원하는 학생 행동을 구체적으로 적습니다.",
        "자동 완성된 요청문을 복사해 만든 Gem에서 실행합니다.",
    ],
    "요청은 ‘좋은 수업을 만들어 줘’보다 학생의 어려움과 원하는 행동을 구체적으로 적을수록 좋아집니다.",
)

screenshot_page(
    document,
    6,
    "2차시 - 3단계",
    "AI의 방법을 비교하고 하나를 선택합니다",
    "AI가 제안한 방법 5개를 옮겨 적고 실제 수업에 적용할 한 가지를 고릅니다.",
    "04-lesson2-step3-method.png",
    [
        "AI가 제안한 서로 다른 방법 5개를 짧게 입력합니다.",
        "적용할 방법의 <b>선택</b> 버튼을 누릅니다.",
        "배움 도움·학생 실행 가능·기존 수업 적용의 세 기준을 확인합니다.",
        "선택 이유를 한두 문장으로 적고 2차시를 제출합니다.",
    ],
    "방법 이름만 고르지 말고 ‘왜 우리 학생에게 맞는가’를 선택 이유에 남기세요.",
)

screenshot_page(
    document,
    7,
    "3차시 - 1단계",
    "추천 웹게임을 체험하고 연구합니다",
    "게임 하나를 직접 실행한 뒤 즉시 피드백 구조와 수업 적용 아이디어를 기록합니다.",
    "05-lesson3-step1-game.png",
    [
        "추천 게임 4종 중 하나를 선택합니다.",
        "<b>새 창에서 게임 시작</b>을 눌러 3분 정도 체험합니다.",
        "내가 해 본 결과와 게임이 준 즉시 피드백을 적습니다.",
        "학년·내용·난이도·규칙 중 내 수업에 맞게 바꿀 점을 적습니다.",
    ],
    "게임의 재미만 기록하지 말고 학생에게 어떤 피드백이 언제 제공되는지 관찰하세요.",
)

screenshot_page(
    document,
    8,
    "3차시 - 2단계",
    "직접 만든 콘텐츠를 탑재합니다",
    "AI 도구로 만든 HTML·ZIP·이미지 파일을 선택하고 라이브 화면에서 확인합니다.",
    "06-lesson3-step2-upload.png",
    [
        "내가 만든 콘텐츠 제목과 수업 활용 계획을 적습니다.",
        "<b>개발한 파일 직접 탑재하기</b>를 눌러 파일을 선택합니다.",
        "HTML 파일은 오른쪽 라이브 플레이어에서 실행 상태를 확인합니다.",
        "오류가 있으면 파일을 수정한 뒤 교체합니다.",
    ],
    "지원 형식과 최대 용량을 화면에서 확인하세요. HTML은 파일 하나만으로 실행되는 형태가 가장 안정적입니다.",
)

screenshot_page(
    document,
    9,
    "3차시 - 탑재 확인",
    "‘탑재 완료’를 확인한 뒤 제출합니다",
    "파일 선택만으로 끝내지 말고 서버 탑재 상태와 실행 결과를 확인합니다.",
    "07-lesson3-uploaded.png",
    [
        "파일명 옆의 <b>탑재 완료</b> 표시를 확인합니다.",
        "<b>파일 열기</b> 또는 라이브 플레이어로 실제 실행 여부를 확인합니다.",
        "잘못 올렸다면 <b>탑재 취소</b> 또는 파일 교체를 사용합니다.",
        "확인이 끝난 뒤 하단의 <b>제출하기</b>를 누릅니다.",
    ],
    "3차시를 제출했더라도 파일 탑재가 완료되지 않으면 4차시에서 동료가 작품을 체험할 수 없습니다.",
)

screenshot_page(
    document,
    10,
    "4차시",
    "동료 작품을 체험하고 최종본을 정리합니다",
    "갤러리에서 작품을 열어 보고 의견을 반영한 뒤 최종 결과물을 업로드합니다.",
    "08-lesson4-gallery.png",
    [
        "<b>작품 체험하기</b>를 눌러 동료 콘텐츠를 실행합니다.",
        "<b>댓글 보기</b>를 눌러 구체적인 의견을 남깁니다.",
        "반영한 의견과 수정 내용을 오른쪽 또는 하단 입력란에 적습니다.",
        "수정한 최종 파일을 선택하고 4차시를 제출합니다.",
    ],
    "댓글은 ‘좋아요’보다 어떤 장면이 좋았고 무엇을 바꾸면 좋을지 구체적으로 적는 것이 도움이 됩니다.",
)

screenshot_page(
    document,
    11,
    "4차시 - 댓글",
    "내가 쓴 댓글은 바로 수정할 수 있습니다",
    "댓글 창에서 본인이 작성한 의견만 수정할 수 있으며 수정 후 저장하거나 취소할 수 있습니다.",
    "09-lesson4-comment-edit.png",
    [
        "작품 카드의 <b>댓글 보기</b>를 누릅니다.",
        "의견을 입력한 뒤 <b>등록</b>을 누릅니다.",
        "내 댓글 옆의 <b>수정</b>을 누르면 편집 입력란이 열립니다.",
        "내용을 고친 뒤 <b>저장</b>하거나 변경하지 않으려면 <b>취소</b>합니다.",
    ],
    "다른 연수생의 댓글에는 수정 버튼이 나타나지 않습니다.",
    reinforce_panel_labels=True,
)

checklist_page(document, 12)
document.save()

print(OUTPUT_PDF)

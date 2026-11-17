import PptxGenJS from "pptxgenjs";

/**
 * 교실 화면용 PPT 공통 디자인.
 * - 글꼴: 학교 PC(Windows)에 기본으로 있는 맑은 고딕
 * - 따뜻한 종이색 배경 + 진한 남색 글자 → 교실 뒷자리에서도 잘 보이는 대비
 * - 모든 진행 슬라이드는 위쪽 남색 띠(게임 이름·주제·문제 번호)로 통일
 * - 슬라이드 크기: 16:9 (13.33 x 7.5 인치)
 */
export const FONT = "Malgun Gothic";
export const SLIDE_W = 13.333;
export const SLIDE_H = 7.5;

export const THEME = {
    bg: "F8F5EE",        // 따뜻한 종이색
    text: "1E293B",      // 진한 남색 (본문)
    bar: "1E293B",       // 위쪽 띠
    action: "2F5DDB",    // 파랑 (A, 문제 번호)
    accent: "F97316",    // 주황 (B, 정답 강조)
    guide: "64748B",     // 회색 (보조 글자)
    card: "FFFFFF",
    cardLine: "E5DFD1",
    success: "16A34A",
    danger: "DC2626",
    soft: "FFF1E6",      // 연한 주황
    solidGlass: "FFFFFF" // (옛 엔진 호환용)
};

/** 카드 공통 스타일 (옛 이름 유지: 그림자·투명 없이 흰 카드 + 얇은 테두리) */
export const getSolidGlassStyle = () => ({
    fill: { color: THEME.card },
    line: { color: THEME.cardLine, width: 1.5 },
    rectRadius: 0.12
});

/** 글자 수에 따라 글자 크기를 고른다. sizes = [아주 짧음, 짧음, 보통, 김, 아주 김] */
export const fitFont = (text = "", sizes = [60, 54, 46, 40, 34]) => {
    const len = String(text).replace(/\s+/g, "").length;
    if (len <= 10) return sizes[0];
    if (len <= 18) return sizes[1];
    if (len <= 28) return sizes[2];
    if (len <= 40) return sizes[3];
    return sizes[4];
};

export const createBasePres = (title) => {
    const pres = new PptxGenJS();
    pres.layout = "LAYOUT_WIDE";
    pres.title = title;
    pres.theme = { headFontFace: FONT, bodyFontFace: FONT };
    return pres;
};

/**
 * 진행 슬라이드 하나를 만든다. 위쪽 띠에 "게임 · 주제", 오른쪽에 태그(Q3, 정답, Lv.2 등).
 */
export const newSlide = (pres, { game = "", topic = "", tag = "", tagColor = THEME.accent } = {}) => {
    const slide = pres.addSlide();
    slide.background = { color: THEME.bg };
    slide.addShape("rect", { x: 0, y: 0, w: SLIDE_W, h: 0.75, fill: { color: THEME.bar }, line: { color: THEME.bar } });
    slide.addText([game, topic].filter(Boolean).join("  ·  "), {
        x: 0.4, y: 0, w: 9.5, h: 0.75,
        fontFace: FONT, fontSize: 18, bold: true, color: "FFFFFF", valign: "middle"
    });
    if (tag) {
        slide.addText(tag, {
            x: SLIDE_W - 2.4, y: 0.13, w: 2.0, h: 0.5,
            fontFace: FONT, fontSize: 20, bold: true, color: "FFFFFF", align: "center", valign: "middle",
            shape: "roundRect", rectRadius: 0.25, fill: { color: tagColor }
        });
    }
    return slide;
};

/** 큰 문제 카드 */
export const addQuestionCard = (slide, text, { x = 0.6, y = 1.25, w = SLIDE_W - 1.2, h = 4.4, sizes } = {}) => {
    slide.addText(text, {
        x, y, w, h,
        fontFace: FONT, fontSize: fitFont(text, sizes), bold: true, color: THEME.text,
        align: "center", valign: "middle", margin: 0.3,
        shape: "roundRect", ...getSolidGlassStyle()
    });
};

/** 정답 카드 (주황 테두리) */
export const addAnswerCard = (slide, text, { x = 1.4, y = 1.6, w = SLIDE_W - 2.8, h = 3.8, sizes = [80, 68, 56, 46, 38], label = "정답" } = {}) => {
    if (label) {
        slide.addText(label, {
            x: SLIDE_W / 2 - 1.0, y: y - 0.3, w: 2.0, h: 0.6,
            fontFace: FONT, fontSize: 22, bold: true, color: "FFFFFF", align: "center", valign: "middle",
            shape: "roundRect", rectRadius: 0.3, fill: { color: THEME.accent }
        });
    }
    slide.addText(text, {
        x, y: y + 0.15, w, h,
        fontFace: FONT, fontSize: fitFont(text, sizes), bold: true, color: THEME.text,
        align: "center", valign: "middle", margin: 0.3,
        shape: "roundRect", fill: { color: THEME.card }, line: { color: THEME.accent, width: 4 }, rectRadius: 0.12
    });
};

/** 가운데 큰 글씨 안내 슬라이드 (시작, 레벨 체크, 게임 종료 등) */
export const addMessageSlide = (pres, ctx, big, sub = "", { color = THEME.text } = {}) => {
    const slide = newSlide(pres, ctx);
    slide.addText(big, {
        x: 0.6, y: 2.0, w: SLIDE_W - 1.2, h: 2.2,
        fontFace: FONT, fontSize: 72, bold: true, color, align: "center", valign: "middle"
    });
    if (sub) {
        slide.addText(sub, {
            x: 0.6, y: 4.3, w: SLIDE_W - 1.2, h: 1.0,
            fontFace: FONT, fontSize: 30, bold: true, color: THEME.guide, align: "center", valign: "middle"
        });
    }
    return slide;
};

/** 표지: 남색 바탕 + 주황 게임 이름 + 큰 주제 */
export const addTitleSlide = (pres, type, topic) => {
    const slide = pres.addSlide();
    slide.background = { color: THEME.bar };
    slide.addText(type, {
        x: SLIDE_W / 2 - 2.0, y: 1.6, w: 4.0, h: 0.8,
        fontFace: FONT, fontSize: 30, bold: true, color: "FFFFFF", align: "center", valign: "middle",
        shape: "roundRect", rectRadius: 0.4, fill: { color: THEME.accent }
    });
    slide.addText(topic, {
        x: 0.8, y: 2.7, w: SLIDE_W - 1.6, h: 2.6,
        fontFace: FONT, fontSize: fitFont(topic, [72, 64, 54, 46, 40]), bold: true, color: "FFFFFF",
        align: "center", valign: "middle"
    });
    slide.addShape("rect", { x: SLIDE_W / 2 - 1.5, y: 5.6, w: 3.0, h: 0.08, fill: { color: THEME.accent }, line: { color: THEME.accent } });
};

/** 놀이 방법: 한 장에 3개씩, 번호 동그라미 + 큰 글씨 */
export const addConsolidatedRuleSlides = (pres, title, allRules, ctx = {}) => {
    for (let i = 0; i < allRules.length; i += 3) {
        const slide = newSlide(pres, { game: ctx.game || title, topic: ctx.topic || "", tag: title, tagColor: THEME.action });
        allRules.slice(i, i + 3).forEach((rule, idx) => {
            const y = 1.25 + idx * 2.0;
            slide.addText(String(i + idx + 1), {
                x: 0.7, y: y + 0.45, w: 0.9, h: 0.9,
                fontFace: FONT, fontSize: 32, bold: true, color: "FFFFFF", align: "center", valign: "middle",
                shape: "ellipse", fill: { color: THEME.action }
            });
            slide.addText(rule, {
                x: 1.9, y, w: SLIDE_W - 2.6, h: 1.8,
                fontFace: FONT, fontSize: 28, color: THEME.text, valign: "middle", margin: 0.25,
                shape: "roundRect", ...getSolidGlassStyle()
            });
        });
    }
};

/** (옛 호환) 하나짜리 규칙 슬라이드 */
export const addRuleSlide = (pres, title, items) => addConsolidatedRuleSlides(pres, title, items);

/** (옛 호환) 문제만 있는 슬라이드 */
export const addQuestionSlide = (pres, qNum, question, ctx = {}) => {
    const slide = newSlide(pres, { ...ctx, tag: `Q${qNum}`, tagColor: THEME.action });
    addQuestionCard(slide, question, { y: 1.3, h: 5.6 });
};

/** (옛 호환) 정답만 있는 슬라이드 */
export const addAnswerSlide = (pres, answer, ctx = {}) => {
    const slide = newSlide(pres, { ...ctx, tag: "정답" });
    addAnswerCard(slide, answer, { y: 1.9, h: 4.4 });
};

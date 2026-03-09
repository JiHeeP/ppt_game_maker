import PptxGenJS from "pptxgenjs";

// Theme Colors (SaaS Dashboard Aligned)
export const THEME = {
    bg: "F8FAFC",         // Slate-50 White
    text: "1E1B4B",       // Deep Indigo-900
    bar: "4F46E5",        // Indigo-600 (Bento Bar)
    action: "4F46E5",     // Action Indigo
    accent: "F97316",     // Vibrant Orange (CTA/Magic)
    guide: "64748B",      // Slate Grey
    solidGlass: "FFFFFF"
};

/**
 * Solid Glass Strategy: Solid White with 5% transparency and soft Indigo shadow.
 */
export const getSolidGlassStyle = (trans = 5) => ({
    fill: { color: THEME.solidGlass, transparency: trans },
    line: { color: THEME.solidGlass, width: 1.5, transparency: 80 },
    shadow: {
        type: "outer",
        color: THEME.text,
        opacity: 0.1,
        blur: 15,
        offset: 2,
        angle: 45
    },
    rect: { radius: 0.1 }
});

export const createBasePres = (title) => {
    try {
        let pres = new PptxGenJS();
        pres.layout = "LAYOUT_WIDE";
        pres.title = title;
        return pres;
    } catch (err) {
        console.error('[BaseEngine] Failed to create PptxGenJS instance:', err);
        throw err;
    }
};

export const addTitleSlide = (pres, type, topic) => {
    let slide = pres.addSlide();
    slide.background = { color: THEME.bg };

    // Game Center Badge
    slide.addText(type, {
        x: "35%", y: "20%", w: "30%", h: 0.6,
        fontSize: 28, bold: true, color: "FFFFFF", align: "center",
        fontFace: "Pretendard",
        fill: { color: THEME.accent }, // Vibrant Orange start
        rect: { radius: 0.3 }
    });

    // Topic Card - Solid Glass
    slide.addText(topic, {
        x: "10%", y: "35%", w: "80%", h: "45%",
        fontSize: 64, bold: true, color: THEME.text, align: "center",
        fontFace: "Pretendard",
        ...getSolidGlassStyle(5)
    });
};

export const addRuleSlide = (pres, title, items) => {
    let slide = pres.addSlide();
    slide.background = { color: THEME.bg };

    items.forEach((item, idx) => {
        // Step Indicators - Rounded Indigo
        slide.addText(`${idx + 1}`, {
            x: "8%", y: `${22 + idx * 14}%`, w: 0.45, h: 0.45,
            fontSize: 22, bold: true, color: "FFFFFF", align: "center",
            fontFace: "Pretendard",
            fill: { color: THEME.action },
            rect: { radius: 0.22 }
        });

        // Rule Card - Solid Glass
        slide.addText(item, {
            x: "14%", y: `${22 + idx * 14}%`, w: "78%", h: "12%",
            fontSize: 28, color: THEME.text, align: "left",
            valign: "middle", fontFace: "Pretendard",
            ...getSolidGlassStyle(2)
        });
    });
};

export const addQuestionSlide = (pres, qNum, question) => {
    let slide = pres.addSlide();
    slide.background = { color: THEME.bg };

    // Question Box - Minimal Solid Glass Card
    slide.addText(question, {
        x: "5%", y: "20%", w: "90%", h: "60%",
        fontSize: 48, bold: true, color: THEME.text, align: "center",
        fontFace: "Pretendard",
        ...getSolidGlassStyle(5)
    });
};

export const addAnswerSlide = (pres, answer) => {
    let slide = pres.addSlide();
    slide.background = { color: THEME.bg };

    // "정답 확인" Button style Text (Mock CTA)
    slide.addText("SUCCESS!", {
        x: "40%", y: "15%", w: "20%", h: 0.5,
        fontSize: 24, bold: true, color: "FFFFFF", align: "center",
        fill: { color: THEME.accent },
        rect: { radius: 0.1 }
    });

    // Answer Card - Enhanced Glow with Orange Border
    slide.addText(answer, {
        x: "10%", y: "30%", w: "80%", h: "45%",
        fontSize: 72, bold: true, color: THEME.text, align: "center", valign: "middle",
        fontFace: "Pretendard",
        ...getSolidGlassStyle(0),
        line: { color: THEME.accent, width: 3 }
    });
};

/**
 * Consolidated Rule Slide: Groups rules into 3 per slide with continuous numbering.
 * @param {PptxGenJS} pres 
 * @param {string} title 
 * @param {string[]} allRules 
 */
export const addConsolidatedRuleSlides = (pres, title, allRules) => {
    for (let i = 0; i < allRules.length; i += 3) {
        let slide = pres.addSlide();
        slide.background = { color: THEME.bg };

        // Title
        slide.addText(title, {
            x: "5%", y: "8%", w: "40%", h: "10%",
            fontSize: 36, bold: true, color: THEME.guide, align: "left", fontFace: "Pretendard"
        });

        const currentBatch = allRules.slice(i, i + 3);
        currentBatch.forEach((rule, idx) => {
            const ruleIdx = i + idx + 1;
            const yPos = 25 + (idx * 18);

            // Number Badge
            slide.addText(ruleIdx.toString(), {
                x: "10%", y: `${yPos}%`, w: 0.45, h: 0.45,
                fontSize: 22, bold: true, color: "FFFFFF", align: "center", valign: "middle",
                fill: { color: THEME.action },
                fontFace: "Pretendard",
                rect: { radius: 0.05 }
            });

            // Rule Card
            slide.addText(rule, {
                x: "16%", y: `${yPos}%`, w: "74%", h: "15%",
                fontSize: 26, color: THEME.text, align: "left", valign: "middle",
                fontFace: "Pretendard",
                fill: { color: THEME.solidGlass, transparency: 5 },
                rect: { radius: 0.1 }
            });
        });
    }
};

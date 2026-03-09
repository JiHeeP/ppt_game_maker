import { createBasePres, addTitleSlide, addConsolidatedRuleSlides, addQuestionSlide, addAnswerSlide, THEME, getSolidGlassStyle } from "./baseEngine";

/**
 * Standard Engine: A fallback engine that generates a high-quality Q&A PPT
 */
export const generateStandardPPT = async (topic, questions, gameName) => {
    let pres = createBasePres(`${topic} ${gameName}`);

    // Slide 1: Title
    addTitleSlide(pres, gameName, topic);

    // Slide 2: Rules (Generic)
    const allRules = [
        "선생님이 보여주시는 문제를 잘 읽고 정답을 생각합니다.",
        "개인별 또는 팀별로 정답을 기록하거나 발표합니다.",
        "정답 공개 후, 맞힌 개수를 확인하며 즐겁게 참여합니다."
    ];

    addConsolidatedRuleSlides(pres, "놀이 방법", allRules);

    // Slide 3: Start
    let startSlide = pres.addSlide();
    startSlide.background = { color: THEME.bg };

    startSlide.addText("즐거운 게임 시작", {
        x: "10%", y: "35%", w: "80%", h: "30%",
        fontSize: 54, bold: true, color: THEME.text, align: "center", valign: "middle",
        fontFace: "Pretendard",
        ...getSolidGlassStyle(5)
    });

    // Content: Questions & Answers
    questions.forEach((q, idx) => {
        addQuestionSlide(pres, idx + 1, q.question);
        addAnswerSlide(pres, q.answer);
    });

    // Finish Slide
    let finishSlide = pres.addSlide();
    finishSlide.background = { color: THEME.bg };

    finishSlide.addText("게임이 끝났습니다", {
        x: "10%", y: "30%", w: "80%", h: "25%",
        fontSize: 48, bold: true, color: THEME.text, align: "center", valign: "middle",
        fontFace: "Pretendard",
        ...getSolidGlassStyle(5)
    });

    finishSlide.addText("오늘 배운 내용을 잘 기억해보세요!", {
        x: "0", y: "65%", w: "100%", h: 1,
        fontSize: 24, color: THEME.guide, align: "center",
        fontFace: "Pretendard"
    });

    try {
        const fileName = `${topic}_${gameName.replace(/\s+/g, '_')}.pptx`;
        await pres.writeFile({ fileName });
    } catch (err) {
        console.error('[StandardEngine] Error during PPT generation:', err);
        throw err;
    }
};


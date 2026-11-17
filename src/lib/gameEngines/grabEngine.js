import { createBasePres, addTitleSlide, addConsolidatedRuleSlides, addMessageSlide, newSlide, addQuestionCard, THEME, FONT, fitFont, SLIDE_W } from "./baseEngine";

/**
 * 집어! : 문제 슬라이드(정답 가림) → 같은 문제 + 정답 공개 슬라이드
 */
export const generateGrabPPT = async (topic, questions) => {
    const pres = createBasePres(`${topic} 집어!`);
    const ctx = { game: "집어!", topic };

    addTitleSlide(pres, "집어!", topic);
    addConsolidatedRuleSlides(pres, "놀이 방법", [
        "짝과 하는 놀이입니다. 두 사람 사이에 물건(풀 등)을 놓습니다.",
        "선생님의 머리, 어깨 동작을 따라 하다가 \"집어!\"를 외치면 먼저 잡으세요.",
        "문제가 나와도 바로 집으면 안 되며, 반드시 \"집어!\" 신호에만 집어야 합니다.",
        "지퍼, 집게 등 가짜 신호에 주의하세요. 잘못 집으면 상대방에게 기회가 갑니다.",
        "물건을 먼저 집은 사람이 정답을 말하고, 맞히면 1점을 얻습니다."
    ], ctx);

    const answerBox = { x: 2.2, y: 5.45, w: SLIDE_W - 4.4, h: 1.65 };

    questions.forEach((q, idx) => {
        // 1) 문제 + 정답 가림
        const s1 = newSlide(pres, { ...ctx, tag: `Q${idx + 1}`, tagColor: THEME.action });
        addQuestionCard(s1, q.question, { y: 1.15, h: 4.0 });
        s1.addText("정답은?", {
            ...answerBox,
            fontFace: FONT, fontSize: 36, bold: true, color: "FFFFFF", align: "center", valign: "middle",
            shape: "roundRect", rectRadius: 0.12, fill: { color: THEME.accent }
        });

        // 2) 문제 + 정답 공개
        const s2 = newSlide(pres, { ...ctx, tag: `Q${idx + 1} 정답` });
        addQuestionCard(s2, q.question, { y: 1.15, h: 4.0 });
        s2.addText(q.answer, {
            ...answerBox,
            fontFace: FONT, fontSize: fitFont(q.answer, [56, 50, 42, 36, 30]), bold: true, color: THEME.text,
            align: "center", valign: "middle",
            shape: "roundRect", rectRadius: 0.12, fill: { color: THEME.card }, line: { color: THEME.accent, width: 4 }
        });
    });

    addMessageSlide(pres, ctx, "게임 끝!", "점수를 세어 보세요");
    await pres.writeFile({ fileName: `${topic}_집어_게임.pptx` });
};

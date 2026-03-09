import { createBasePres, addTitleSlide, addConsolidatedRuleSlides, THEME, getSolidGlassStyle } from "./baseEngine";

export const generateGrabPPT = async (topic, questions) => {
    let pres = createBasePres(`${topic} 집어!`);

    // 슬라이드 1: 제목
    addTitleSlide(pres, "집어!", topic);

    // 슬라이드 2~3: 규칙 통합
    const allRules = [
        "짝과 하는 놀이입니다. 두 사람 사이에 물건(풀 등)을 놓습니다.",
        "선생님의 머리, 어깨 동작을 따라 하다가 \"집어!\"를 외치면 먼저 잡으세요.",
        "문제가 나와도 바로 집으면 안 되며, 반드시 \"집어!\" 신호에만 집어야 합니다.",
        "지퍼, 집게 등 가짜 신호에 주의하세요. 잘못 집으면 상대방에게 기회가 갑니다.",
        "물건을 먼저 집은 사람이 정답을 말하고, 맞히면 1점을 얻습니다."
    ];

    addConsolidatedRuleSlides(pres, "놀이 방법", allRules);

    // 문제 슬라이드 루프
    questions.forEach((q, idx) => {
        // [슬라이드 1] 문제 + 답(가려짐)
        let s1 = pres.addSlide();
        s1.background = { color: THEME.bg };

        s1.addText(`Q${idx + 1}`, {
            x: "43%", y: "10%", w: "14%", h: "8%",
            fontSize: 32, bold: true, color: THEME.action, align: "center", fontFace: "Pretendard"
        });

        // 문제 영역
        s1.addText(q.question, {
            x: "5%", y: "20%", w: "90%", h: "40%",
            fontSize: 48, bold: true, color: THEME.text, align: "center", valign: "middle",
            fontFace: "Pretendard",
            ...getSolidGlassStyle(5)
        });

        // 답 영역 (가려진 상태 - 텍스트 없이 오렌지색 카드만 표시)
        s1.addText("", {
            x: "20%", y: "65%", w: "60%", h: "20%",
            fill: { color: THEME.accent },
            rect: { radius: 0.2 }
        });

        // [슬라이드 2] 문제 + 답(공개)
        let s2 = pres.addSlide();
        s2.background = { color: THEME.bg };

        s2.addText(`Q${idx + 1}`, {
            x: "43%", y: "10%", w: "14%", h: "8%",
            fontSize: 32, bold: true, color: THEME.action, align: "center", fontFace: "Pretendard"
        });

        s2.addText(q.question, {
            x: "5%", y: "20%", w: "90%", h: "40%",
            fontSize: 48, bold: true, color: THEME.text, align: "center", valign: "middle",
            fontFace: "Pretendard",
            ...getSolidGlassStyle(5)
        });

        s2.addText(q.answer, {
            x: "10%", y: "65%", w: "80%", h: "20%",
            fontSize: 54, bold: true, color: THEME.text, align: "center", valign: "middle",
            fontFace: "Pretendard",
            ...getSolidGlassStyle(0),
            line: { color: THEME.accent, width: 3 }
        });
    });

    // 최종 슬라이드
    let finishSlide = pres.addSlide();
    finishSlide.background = { color: THEME.bg };
    finishSlide.addText("게임 종료", {
        x: "10%", y: "40%", w: "80%", h: "20%",
        fontSize: 54, bold: true, color: THEME.text, align: "center",
        fontFace: "Pretendard",
        ...getSolidGlassStyle(5)
    });

    try {
        await pres.writeFile({ fileName: `${topic}_집어_게임.pptx` });
    } catch (err) {
        console.error('[GrabEngine] Error:', err);
        throw err;
    }
};


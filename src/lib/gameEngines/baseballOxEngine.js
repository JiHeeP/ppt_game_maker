import { createBasePres, addTitleSlide, addConsolidatedRuleSlides, THEME, getSolidGlassStyle } from "./baseEngine";

export const generateBaseballOxPPT = async (topic, questions) => {
    let pres = createBasePres(`${topic} 야구골든벨 OX`);

    // 슬라이드 1: 제목
    addTitleSlide(pres, "야구골든벨 OX", topic);

    // 슬라이드 2~3: 규칙 통합 (한 슬라이드에 3개씩)
    const allRules = [
        "문제를 맞힐 때마다 한 단계씩 이동하는 놀이입니다. 화면의 문제를 읽고 O인지 X인지 생각해요.",
        "선생님이 \"하나, 둘, 셋\"을 외치면 손으로 표시합니다. 모두 제자리에서 출발합니다.",
        "답을 맞혔다면, 1루로 이동합니다. 틀린 학생들은 움직이지 않고 제자리에 있습니다.",
        "1루에서 맞히면 2루로, 2루에서 맞히면 3루로! 3루에서 맞히면 홈인(체크)하고 자리에 앉습니다.",
        "틀려도 괜찮습니다. 양심을 속이지 마세요. 4점을 먼저 얻은 모둠이 이깁니다."
    ];

    addConsolidatedRuleSlides(pres, "놀이 방법", allRules);

    // 슬라이드: 준비?
    addBaseballSlide(pres, "준비 되었나요?", "지금 시작합니다!", topic);

    questions.forEach((q, idx) => {
        const isO = q.answer.trim().toUpperCase() === 'O' || q.answer.trim() === '오' || q.answer.trim() === 'o';

        // 문제 슬라이드
        addBaseballSlide(pres, `문제 ${idx + 1}`, q.question, topic, true);

        // 정답 슬라이드 (O/X Liquid Glass Buttons)
        let aSlide = pres.addSlide();
        aSlide.background = { color: THEME.bg };

        const resultLabel = isO ? "O" : "X";
        const resultColor = isO ? "#10B981" : "#EF4444";

        aSlide.addText(resultLabel, {
            x: "35%", y: "30%", w: "30%", h: "40%",
            fontSize: 160, bold: true, color: resultColor, align: "center", valign: "middle",
            fontFace: "Pretendard",
            ...getSolidGlassStyle(0),
            line: { color: THEME.accent, width: 5 } // Vibrant Orange glow border
        });

        if (q.explanation) {
            aSlide.addText(q.explanation, {
                x: "10%", y: "75%", w: "80%", h: "15%",
                fontSize: 24, color: THEME.guide, align: "center", fontFace: "Pretendard"
            });
        }
    });

    // 최종 슬라이드
    let finishSlide = pres.addSlide();
    finishSlide.background = { color: THEME.bg };
    finishSlide.addText("게임 종료", {
        x: "10%", y: "40%", w: "80%", h: "20%",
        fontSize: 60, bold: true, color: THEME.text, align: "center",
        fontFace: "Pretendard",
        ...getSolidGlassStyle(5)
    });

    try {
        await pres.writeFile({ fileName: `${topic}_야구골든벨_OX.pptx` });
    } catch (err) {
        console.error('[BaseballOxEngine] Save failed:', err);
        throw err;
    }
};

function addBaseballSlide(pres, header, body, topic, isQuestion = false) {
    let slide = pres.addSlide();
    slide.background = { color: THEME.bg };

    if (isQuestion) {
        slide.addText("Q", {
            x: "43%", y: "15%", w: "14%", h: "10%",
            fontSize: 32, bold: true, color: THEME.action, align: "center", fontFace: "Pretendard"
        });
    }

    slide.addText(body, {
        x: "10%", y: "30%", w: "80%", h: "50%",
        fontSize: isQuestion ? 44 : 32, bold: true, color: THEME.text, align: "center", valign: "middle",
        fontFace: "Pretendard",
        ...getSolidGlassStyle(5)
    });
}


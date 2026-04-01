import { createBasePres, addTitleSlide, addConsolidatedRuleSlides, THEME, getSolidGlassStyle } from "./baseEngine";

const getTelepathyQuestionFontSize = (question = "") => {
    const compactLength = question.replace(/\s+/g, "").length;
    if (compactLength <= 14) return 38;
    if (compactLength <= 22) return 34;
    if (compactLength <= 32) return 30;
    return 26;
};

export const generateTelepathyPPT = async (topic, questions) => {
    let pres = createBasePres(`${topic} 텔레파시 게임`);

    // 0. 표지 & 규칙
    addTitleSlide(pres, "텔레파시", topic);
    addConsolidatedRuleSlides(pres, "놀이 방법", [
        "화면에 두 개의 문제(A, B)가 나옵니다.",
        "선생님이 어떤 문제를 선택할지 골라보세요.",
        "선생님과 같은 문제를 고르면 성공! (10점)"
    ]);

    for (let i = 0; i < questions.length - 1; i += 2) {
        const qA = questions[i];
        const qB = questions[i + 1];
        const teacherPicksA = Math.random() < 0.5;
        const winnerSide = teacherPicksA ? "A" : "B";
        const winnerColor = teacherPicksA ? THEME.action : THEME.accent;

        // Slide 1: Choice
        let s1 = pres.addSlide();
        s1.background = { color: THEME.bg };

        s1.addText("더 자신 있는 문제를 골라보세요!", {
            x: "0", y: "15%", w: "100%", h: 1,
            fontSize: 34, bold: true, color: THEME.text, align: "center", fontFace: "Pretendard"
        });

        drawContentCard(pres, s1, "A", qA.question, null, THEME.action, false);
        drawContentCard(pres, s1, "B", qB.question, null, THEME.accent, false);

        // Slide 2: Countdown
        let s2 = pres.addSlide();
        s2.background = { color: THEME.bg };
        drawContentCard(pres, s2, "A", qA.question, qA.answer, THEME.action, false);
        drawContentCard(pres, s2, "B", qB.question, qB.answer, THEME.accent, false);

        s2.addText("하나, 둘, 셋!", {
            x: "10%", y: "45%", w: "80%", h: 2,
            fontSize: 80, bold: true, color: THEME.text, align: "center",
            fontFace: "Pretendard",
            ...getSolidGlassStyle(10),
            line: { color: THEME.accent, width: 2 }
        });

        // Slide 3: Result
        let s3 = pres.addSlide();
        s3.background = { color: THEME.bg };

        s3.addText(`선생님의 선택은...`, {
            x: "0", y: "10%", w: "100%", h: 0.5,
            fontSize: 28, color: THEME.guide, align: "center", fontFace: "Pretendard"
        });

        s3.addText(winnerSide, {
            x: "0", y: "15%", w: "100%", h: 1,
            fontSize: 100, bold: true, color: winnerColor, align: "center", fontFace: "Pretendard"
        });

        if (teacherPicksA) {
            drawContentCard(pres, s3, "A", qA.question, qA.answer, THEME.action, true);
            drawContentCard(pres, s3, "B", qB.question, qB.answer, THEME.guide, false, true);
        } else {
            drawContentCard(pres, s3, "A", qA.question, qA.answer, THEME.guide, false, true);
            drawContentCard(pres, s3, "B", qB.question, qB.answer, THEME.accent, true);
        }
    }

    try {
        await pres.writeFile({ fileName: `${topic}_텔레파시_게임.pptx` });
    } catch (err) {
        console.error('[TelepathyEngine] Error:', err);
        throw err;
    }
};

function drawContentCard(pres, slide, label, question, answer, color, isWinner, isDimmed = false) {
    const xPos = label === "A" ? "5%" : "52.5%";
    const cardWidth = "42.5%";

    // Solid Glass Background for the Card Area
    const glassStyle = getSolidGlassStyle(isDimmed ? 40 : 5);

    // Header Badge for A/B
    slide.addText(label, {
        x: xPos, y: "30%", w: cardWidth, h: 0.6,
        fontSize: 36, bold: true, color: "FFFFFF", align: "center",
        fontFace: "Pretendard",
        fill: { color: isDimmed ? THEME.guide : color },
        rect: { radius: 0.1 }
    });

    // Content area with glass effect
    slide.addText(question, {
        x: label === "A" ? "7%" : "54.5%",
        y: "37%", w: "38.5%", h: 2.15,
        fontSize: getTelepathyQuestionFontSize(question), bold: true, color: isDimmed ? THEME.guide : THEME.text, align: "center", valign: "middle",
        fontFace: "Pretendard",
        ...glassStyle,
        line: isWinner ? { color: THEME.accent, width: 3 } : { color: THEME.solidGlass, width: 1.5, transparency: 80 }
    });

    if (answer) {
        slide.addText(answer, {
            x: label === "A" ? "7%" : "54.5%",
            y: "65%", w: "38.5%", h: 1.2,
            fontSize: 28, bold: true, color: isDimmed ? THEME.guide : color, align: "center", valign: "middle",
            fontFace: "Pretendard",
            fill: { color: THEME.solidGlass, transparency: 50 },
            line: { color: color, width: 1, dashType: "dash" }
        });
    }
}



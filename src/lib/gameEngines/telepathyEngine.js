import { createBasePres, addTitleSlide, addConsolidatedRuleSlides, addMessageSlide, newSlide, THEME, FONT, fitFont, SLIDE_W } from "./baseEngine";

/**
 * 텔레파시: 한 라운드 = 문제 A·B 두 개. 선생님이 고른 쪽을 맞히면 성공.
 * 라운드마다 3장: ① 고르기 ② 하나 둘 셋(정답 공개) ③ 선생님의 선택
 */
export const generateTelepathyPPT = async (topic, questions) => {
    const pres = createBasePres(`${topic} 텔레파시 게임`);
    const ctx = { game: "텔레파시", topic };

    addTitleSlide(pres, "텔레파시", topic);
    addConsolidatedRuleSlides(pres, "놀이 방법", [
        "화면에 두 개의 문제(A, B)가 나옵니다.",
        "선생님이 어떤 문제를 선택할지 골라보세요.",
        "선생님과 같은 문제를 고르면 성공! (10점)"
    ], ctx);

    for (let i = 0; i < questions.length - 1; i += 2) {
        const round = i / 2 + 1;
        // 두 문제 중 어느 쪽이 A 가 될지도 무작위 (입력 순서대로 고정되지 않게)
        const swap = Math.random() < 0.5;
        const qA = swap ? questions[i + 1] : questions[i];
        const qB = swap ? questions[i] : questions[i + 1];
        const teacherPicksA = Math.random() < 0.5;
        const tag = `${round}라운드`;

        // ① 고르기
        const s1 = newSlide(pres, { ...ctx, tag, tagColor: THEME.action });
        addHeadline(s1, "선생님은 어떤 문제를 골랐을까요?", THEME.text);
        drawCard(s1, "A", qA, { showAnswer: false, state: "normal" });
        drawCard(s1, "B", qB, { showAnswer: false, state: "normal" });

        // ② 하나, 둘, 셋! (정답 공개)
        const s2 = newSlide(pres, { ...ctx, tag, tagColor: THEME.action });
        addHeadline(s2, "하나, 둘, 셋!", THEME.accent, 44);
        drawCard(s2, "A", qA, { showAnswer: true, state: "normal" });
        drawCard(s2, "B", qB, { showAnswer: true, state: "normal" });

        // ③ 선생님의 선택
        const s3 = newSlide(pres, { ...ctx, tag, tagColor: THEME.action });
        const winner = teacherPicksA ? "A" : "B";
        addHeadline(s3, `선생님의 선택은 ${winner}!`, teacherPicksA ? THEME.action : THEME.accent, 44);
        drawCard(s3, "A", qA, { showAnswer: true, state: teacherPicksA ? "win" : "dim" });
        drawCard(s3, "B", qB, { showAnswer: true, state: teacherPicksA ? "dim" : "win" });
    }

    addMessageSlide(pres, ctx, "게임 끝!", "선생님과 마음이 가장 잘 통한 친구는?");
    await pres.writeFile({ fileName: `${topic}_텔레파시_게임.pptx` });
};

function addHeadline(slide, text, color, fontSize = 34) {
    slide.addText(text, {
        x: 0.6, y: 0.9, w: SLIDE_W - 1.2, h: 0.85,
        fontFace: FONT, fontSize, bold: true, color, align: "center", valign: "middle"
    });
}

function drawCard(slide, label, q, { showAnswer, state }) {
    const x = label === "A" ? 0.6 : SLIDE_W / 2 + 0.2;
    const w = SLIDE_W / 2 - 0.8;
    const baseColor = label === "A" ? THEME.action : THEME.accent;
    const dim = state === "dim";
    const color = dim ? "B6BCC6" : baseColor;
    const textColor = dim ? "9AA3AF" : THEME.text;

    slide.addText(label, {
        x, y: 1.9, w, h: 0.7,
        fontFace: FONT, fontSize: 32, bold: true, color: "FFFFFF", align: "center", valign: "middle",
        fill: { color }
    });
    slide.addText(q.question, {
        x, y: 2.6, w, h: showAnswer ? 2.75 : 4.5,
        fontFace: FONT, fontSize: fitFont(q.question, [44, 40, 34, 30, 26]), bold: true, color: textColor,
        align: "center", valign: "middle", margin: 0.25,
        fill: { color: dim ? "F1F1F1" : THEME.card },
        line: { color: state === "win" ? baseColor : THEME.cardLine, width: state === "win" ? 5 : 1.5 }
    });
    if (showAnswer) {
        slide.addText(q.answer, {
            x, y: 5.55, w, h: 1.55,
            fontFace: FONT, fontSize: fitFont(q.answer, [40, 36, 30, 26, 22]), bold: true,
            color: dim ? "9AA3AF" : baseColor, align: "center", valign: "middle",
            shape: "roundRect", rectRadius: 0.12,
            fill: { color: dim ? "F1F1F1" : THEME.card }, line: { color, width: 2, dashType: "dash" }
        });
    }
}

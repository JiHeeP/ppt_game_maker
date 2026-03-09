import { createBasePres, addTitleSlide, addConsolidatedRuleSlides, THEME, getSolidGlassStyle } from "./baseEngine";

export const generateLevelUpPPT = async (topic, questions) => {
    let pres = createBasePres(`${topic} 레벨업 골든벨`);

    // 슬라이드 1: 제목
    addTitleSlide(pres, "레벨업 골든벨", topic);

    // 슬라이드 2-4: 규칙 통합 (한 슬라이드에 3개씩)
    const allRules = [
        "의자에서 일어나 바닥에 앉아서 시작합니다. (Lv.1)",
        "2문제를 연속으로 맞히면 다음 단계로 레벨이 올라갑니다.",
        "한 문제라도 틀리면 레벨이 1단계 바로 내려갑니다.",
        "단계 구성: 바닥에 앉기(Lv.1) -> 의자에 앉기(Lv.2) -> 서 있기(Lv.3) -> 책상에 앉기(Lv.4)",
        "모든 문제를 해결한 뒤 최종적으로 자신의 신체 레벨을 확인합니다.",
        "양심을 속이지 않고 정직하게 레벨을 조정하며 참여합니다."
    ];

    addConsolidatedRuleSlides(pres, "놀이 방법", allRules);

    // 슬라이드: 시작
    let startSlide = pres.addSlide();
    startSlide.background = { color: THEME.bg };
    startSlide.addText("LEVEL UP!", {
        x: "10%", y: "35%", w: "80%", h: "30%",
        fontSize: 80, bold: true, color: THEME.text, align: "center", valign: "middle",
        fontFace: "Pretendard",
        ...getSolidGlassStyle(5)
    });

    questions.forEach((q, idx) => {
        if (idx > 0 && idx % 2 === 0) {
            let checkSlide = pres.addSlide();
            checkSlide.background = { color: THEME.bg };
            checkSlide.addText("LEVEL CHECK!", {
                x: "10%", y: "40%", w: "80%", h: "20%",
                fontSize: 54, bold: true, color: THEME.accent, align: "center", fontFace: "Pretendard"
            });
            checkSlide.addText("2문제를 맞히면 레벨업! 틀리면 레벨다운!", {
                x: "10%", y: "60%", w: "80%", fontSize: 24, color: THEME.guide, align: "center", fontFace: "Pretendard"
            });
        }

        let qSlide = pres.addSlide();
        qSlide.background = { color: THEME.bg };

        const currentLevel = Math.min(4, Math.floor(idx / 2) + 1);

        qSlide.addText(`Q${idx + 1}`, {
            x: "43%", y: "15%", w: "14%", h: "10%",
            fontSize: 32, bold: true, color: THEME.action, align: "center", fontFace: "Pretendard"
        });

        qSlide.addText(`Lv.${currentLevel}`, {
            x: "80%", y: "10%", w: "15%", h: "8%",
            fontSize: 22, bold: true, color: "FFFFFF", align: "center", valign: "middle",
            fontFace: "Pretendard",
            fill: { color: THEME.bar },
            rect: { radius: 0.1 }
        });

        qSlide.addText(q.question, {
            x: "10%", y: "30%", w: "80%", h: "50%",
            fontSize: 44, bold: true, color: THEME.text, align: "center", valign: "middle",
            fontFace: "Pretendard",
            ...getSolidGlassStyle(5)
        });

        // Answer Slide
        let aSlide = pres.addSlide();
        aSlide.background = { color: THEME.bg };

        aSlide.addText("정답 확인", {
            x: "40%", y: "15%", w: "20%", h: 0.5,
            fontSize: 24, bold: true, color: "FFFFFF", align: "center",
            fill: { color: THEME.accent },
            fontFace: "Pretendard",
            rect: { radius: 0.1 }
        });

        aSlide.addText(q.answer, {
            x: "10%", y: "30%", w: "80%", h: "45%",
            fontSize: 64, bold: true, color: THEME.text, align: "center", valign: "middle",
            fontFace: "Pretendard",
            ...getSolidGlassStyle(0),
            line: { color: THEME.accent, width: 3 }
        });
    });

    // 최종 슬라이드
    let finishSlide = pres.addSlide();
    finishSlide.background = { color: THEME.bg };

    finishSlide.addText("게임 종료", {
        x: "0", y: "30%", w: "100%", fontSize: 60, bold: true, color: THEME.text, align: "center", fontFace: "Pretendard"
    });
    finishSlide.addText("지금 책상 위에 앉아 있는 마스터는 누구인가요?", {
        x: "0", y: "55%", w: "100%", fontSize: 32, bold: true, color: THEME.accent, align: "center", fontFace: "Pretendard"
    });

    try {
        await pres.writeFile({ fileName: `${topic}_레벨업_골든벨.pptx` });
    } catch (err) {
        console.error('[LevelUpEngine] Error:', err);
        throw err;
    }
};

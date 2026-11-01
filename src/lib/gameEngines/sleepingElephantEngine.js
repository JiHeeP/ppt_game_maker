import { createBasePres, THEME, getSolidGlassStyle } from "./baseEngine";

/**
 * 잠자는 코끼리 PPT 생성 엔진
 */
export const generateSleepingElephantPPT = async (topic, questions) => {
    let pres = createBasePres(`${topic} 잠자는 코끼리`);

    // 슬라이드 1: 제목 (사용자 요청: 상단 띠 제거)
    addElephantTitleSlide(pres, "잠자는 코끼리", topic);

    // 규칙 통합 슬라이드 (3개씩 그룹화)
    const allRules = [
        "모둠끼리 겨룹니다. 모둠에서 순서(차례)를 정합니다.",
        "모두 고개를 숙여 엎드립니다.",
        "자기 차례가 되면 고개를 들어 문장을 확인하고 외웁니다.",
        "글자를 확인한 뒤 다시 고개를 숙여 엎드립니다.",
        "\"모두 쓰세요\" 신호가 오면 서로 말하며 문장을 완성해요!",
        "가장 먼저 정확하게 문장을 완성한 모둠이 승리!"
    ];

    for (let i = 0; i < allRules.length; i += 3) {
        const chunk = allRules.slice(i, i + 3);
        addElephantSlide(pres, "놀이 방법", chunk, i + 1);
    }

    // 문제 루프 
    questions.forEach((q, idx) => {
        const fragments = q.fragments || splitSentence(q.answer);

        // 단계 0: 전체 취침
        addElephantGridSlide(pres, `문제 ${idx + 1}`, fragments, -1, topic);

        // 단계 1~4: 각 주자별 정보 공개
        for (let i = 0; i < 4; i++) {
            addElephantGridSlide(pres, `문제 ${idx + 1}`, fragments, i, topic);
        }

        // 정답 슬라이드
        let aSlide = pres.addSlide();
        aSlide.background = { color: "FFFFFF" };

        // 정답 배지 (사용자 요청: '정답' 으로 변경)
        aSlide.addText("정답", {
            x: "40%", y: "15%", w: "20%", h: 0.5,
            fontSize: 24, bold: true, color: "FFFFFF", align: "center",
            fill: { color: THEME.accent },
            fontFace: "Pretendard",
            rect: { radius: 0.1 }
        });

        aSlide.addText(q.answer, {
            x: "10%", y: "30%", w: "80%", h: "45%",
            fontSize: 48, bold: true, color: "1E1B4B", align: "center", valign: "middle",
            fontFace: "Pretendard",
            fill: { color: "FFFFFF" },
            line: { color: THEME.accent, width: 3 }
        });
    });

    try {
        await pres.writeFile({ fileName: `${topic}_잠자는_코끼리.pptx` });
    } catch (err) {
        console.error('[SleepingElephantEngine] Save failed:', err);
        throw err;
    }
};

/**
 * 전용 표지 슬라이드 (빌어먹을 띠 제거)
 */
function addElephantTitleSlide(pres, type, topic) {
    let slide = pres.addSlide();
    slide.background = { color: "FFFFFF" };

    slide.addText(type, {
        x: "35%", y: "20%", w: "30%", h: 0.6,
        fontSize: 28, bold: true, color: "FFFFFF", align: "center",
        fontFace: "Pretendard",
        fill: { color: THEME.accent },
        rect: { radius: 0.3 }
    });

    slide.addText(topic, {
        x: "10%", y: "35%", w: "80%", h: "45%",
        fontSize: 64, bold: true, color: "1E1B4B", align: "center",
        fontFace: "Pretendard",
        ...getSolidGlassStyle(5)
    });
}

/**
 * 게임 메인 그리드 슬라이드 생성
 */
function addElephantGridSlide(pres, header, fragments, revealIdx, _topic) {
    let slide = pres.addSlide();
    slide.background = { color: "FFFFFF" };

    slide.addText(header, {
        x: "10%", y: "5%", w: "80%", h: "10%",
        fontSize: 36, bold: true, color: "1E1B4B", align: "left", fontFace: "Pretendard"
    });

    const gridLayout = [
        { id: 4, x: "15%", y: "25%", fragIdx: 3 },
        { id: 3, x: "55%", y: "25%", fragIdx: 2 },
        { id: 2, x: "15%", y: "58%", fragIdx: 1 },
        { id: 1, x: "55%", y: "58%", fragIdx: 0 }
    ];

    gridLayout.forEach((box) => {
        const isCurrentlyRevealing = box.fragIdx === revealIdx;

        const isLeftColumn = box.id === 4 || box.id === 2;
        const numX = isLeftColumn ? (parseFloat(box.x) - 6) + "%" : (parseFloat(box.x) + 31) + "%";
        slide.addText(box.id.toString(), {
            x: numX, y: `${parseFloat(box.y) + 8}%`, w: 0.5, h: 0.5,
            fontSize: 24, bold: true, color: "FFFFFF", align: "center", valign: "middle",
            fontFace: "Pretendard",
            fill: { color: "4F46E5" },
            rect: { radius: 0.25 }
        });

        if (isCurrentlyRevealing) {
            slide.addText(fragments[box.fragIdx], {
                x: box.x, y: box.y, w: "30%", h: "28%",
                fontSize: 32, bold: true, color: "1E1B4B", align: "center", valign: "middle",
                fontFace: "Pretendard",
                fill: { color: "FFFFFF" },
                line: { color: "E2E8F0", width: 1 },
                rect: { radius: 0.1 }
            });
        } else {
            slide.addText("Zzz...", {
                x: box.x, y: box.y, w: "30%", h: "28%",
                fontSize: 36, bold: true, color: "FFFFFF", align: "center", valign: "middle",
                fontFace: "Pretendard",
                fill: { color: "1E1B4B" },
                rect: { radius: 0.1 }
            });
        }
    });
}

/**
 * 규칙 슬라이드 (사용자 제공 이미지 스타일 반영)
 */
function addElephantSlide(pres, title, items, startIdx) {
    let slide = pres.addSlide();
    slide.background = { color: "FFFFFF" };

    // 제목: 놀이 방법
    slide.addText(title, {
        x: "5%", y: "8%", w: "40%", h: "10%",
        fontSize: 36, bold: true, color: "64748B", align: "left", fontFace: "Pretendard"
    });

    items.forEach((line, i) => {
        const yPos = 25 + (i * 15);
        const currentIdx = startIdx + i;

        // 사각형 번호 배지
        slide.addText(currentIdx.toString(), {
            x: "10%", y: `${yPos}%`, w: 0.4, h: 0.4,
            fontSize: 22, bold: true, color: "FFFFFF", align: "center", valign: "middle",
            fill: { color: "4F46E5" },
            fontFace: "Pretendard",
            rect: { radius: 0.05 }
        });

        // 텍스트 카드
        slide.addText(line, {
            x: "16%", y: `${yPos}%`, w: "74%", h: "10%",
            fontSize: 28, color: "1E1B4B", align: "left", valign: "middle",
            fontFace: "Pretendard",
            fill: { color: "F8FAFC" }, // 아주 연한 회색 배경
            rect: { radius: 0.1 }
        });
    });
}

function splitSentence(sentence) {
    if (!sentence) return ["...", "...", "...", "..."];
    const words = sentence.split(' ');
    const partSize = Math.max(1, Math.ceil(words.length / 4));

    return [
        words.slice(0, partSize).join(' '),
        words.slice(partSize, partSize * 2).join(' '),
        words.slice(partSize * 2, partSize * 3).join(' '),
        words.slice(partSize * 3).join(' ')
    ].map(s => s.trim() || "Zzz...");
}

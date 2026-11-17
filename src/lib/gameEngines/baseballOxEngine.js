import { createBasePres, addTitleSlide, addConsolidatedRuleSlides, addMessageSlide, newSlide, addQuestionCard, THEME, FONT, SLIDE_W } from "./baseEngine";

// 정답이 O 인지 X 인지 판정 (AI가 다양한 표기로 줄 수 있어 넓게 받는다)
const O_WORDS = ['O', '○', '⭕', '오', '맞다', '맞음', '참', 'TRUE', 'YES'];
const X_WORDS = ['X', '×', '✕', '❌', '엑스', '틀리다', '틀림', '거짓', 'FALSE', 'NO'];
export const parseOx = (answer = "") => {
    const a = String(answer).trim().toUpperCase().replace(/[.!\s]/g, '');
    if (O_WORDS.includes(a)) return 'O';
    if (X_WORDS.includes(a)) return 'X';
    return null;
};

export const generateBaseballOxPPT = async (topic, questions) => {
    const pres = createBasePres(`${topic} 야구골든벨 OX`);
    const ctx = { game: "야구골든벨 OX", topic };

    addTitleSlide(pres, "야구골든벨 OX", topic);
    addConsolidatedRuleSlides(pres, "놀이 방법", [
        "문제를 맞힐 때마다 한 단계씩 이동하는 놀이입니다. 화면의 문제를 읽고 O인지 X인지 생각해요.",
        "선생님이 \"하나, 둘, 셋\"을 외치면 손으로 표시합니다. 모두 제자리에서 출발합니다.",
        "답을 맞혔다면, 1루로 이동합니다. 틀린 학생들은 움직이지 않고 제자리에 있습니다.",
        "1루에서 맞히면 2루로, 2루에서 맞히면 3루로! 3루에서 맞히면 홈인(체크)하고 자리에 앉습니다.",
        "틀려도 괜찮습니다. 양심을 속이지 마세요. 4점을 먼저 얻은 모둠이 이깁니다."
    ], ctx);
    addMessageSlide(pres, ctx, "플레이 볼!", "모두 제자리에서 출발해요");

    questions.forEach((q, idx) => {
        const ox = parseOx(q.answer);

        // 문제 슬라이드: 문장 + 아래에 O / X 안내
        const qSlide = newSlide(pres, { ...ctx, tag: `Q${idx + 1}`, tagColor: THEME.action });
        addQuestionCard(qSlide, q.question, { y: 1.15, h: 4.1 });
        [['O', THEME.success, SLIDE_W / 2 - 3.1], ['X', THEME.danger, SLIDE_W / 2 + 0.6]].forEach(([label, color, x]) => {
            qSlide.addText(label, {
                x, y: 5.5, w: 2.5, h: 1.6,
                fontFace: FONT, fontSize: 80, bold: true, color, align: "center", valign: "middle",
                shape: "roundRect", rectRadius: 0.15, fill: { color: THEME.card }, line: { color, width: 3 }
            });
        });

        // 정답 슬라이드
        const aSlide = newSlide(pres, { ...ctx, tag: `Q${idx + 1} 정답` });
        if (ox) {
            const color = ox === 'O' ? THEME.success : THEME.danger;
            aSlide.addText(ox, {
                x: SLIDE_W / 2 - 2.0, y: 1.2, w: 4.0, h: 3.6,
                fontFace: FONT, fontSize: 220, bold: true, color, align: "center", valign: "middle"
            });
        } else {
            // O/X 가 아닌 정답이 들어온 경우: 정답 글자를 그대로 보여 준다 (예전처럼 무조건 X 로 표시하지 않음)
            aSlide.addText(q.answer, {
                x: 1.4, y: 1.4, w: SLIDE_W - 2.8, h: 3.4,
                fontFace: FONT, fontSize: 60, bold: true, color: THEME.text, align: "center", valign: "middle"
            });
        }
        // X 문항이면 바른 사실(wrongAnswer 에 적어 둔 것)을, 아니면 문장을 다시 보여 준다
        const fix = ox === 'X' && q.wrongAnswer && q.wrongAnswer !== '오답 없음' ? `바르게 고치면: ${q.wrongAnswer}` : '';
        aSlide.addText(q.explanation || fix || q.question, {
            x: 1.0, y: 5.0, w: SLIDE_W - 2.0, h: 2.0,
            fontFace: FONT, fontSize: 26, color: THEME.guide, align: "center", valign: "middle",
            shape: "roundRect", rectRadius: 0.12, fill: { color: THEME.card }, line: { color: THEME.cardLine, width: 1.5 }
        });
    });

    addMessageSlide(pres, ctx, "게임 끝!", "홈인한 친구는 몇 명인가요?");
    await pres.writeFile({ fileName: `${topic}_야구골든벨_OX.pptx` });
};

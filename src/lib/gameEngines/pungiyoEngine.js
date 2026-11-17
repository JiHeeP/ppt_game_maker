import { createBasePres, addTitleSlide, addConsolidatedRuleSlides, addMessageSlide, newSlide, addQuestionCard, THEME, FONT, fitFont, SLIDE_W } from "./baseEngine";
import { getPungiyoPages, getPungiyoScores } from './pdfTemplateHelper';
import { renderPagesToPdf } from './pdfRender';

/**
 * 뻥이요! PPT: 문제 → 정답 + 기본 점수(1~10점, 0점 없음)
 */
export const generatePungiyoPPT = async (topic, questions) => {
    const pres = createBasePres(`${topic} 뻥이요!`);
    const ctx = { game: "뻥이요!", topic };

    addTitleSlide(pres, "뻥이요!", topic);
    addConsolidatedRuleSlides(pres, "놀이 방법", [
        "문제를 풀고 보너스 점수를 정한 뒤 최종 점수를 계산하는 놀이입니다.",
        "PPT 화면의 문제를 보고 공책에 풀고, 답을 원하는 칸에 적으세요.",
        "맞혔으면 무작위로 나오는 보너스 점수(뻥이요!)를 기본 점수에 합산합니다."
    ], ctx);
    addMessageSlide(pres, ctx, "준비되었나요?", "지금 시작합니다!");

    questions.forEach((q, idx) => {
        const qSlide = newSlide(pres, { ...ctx, tag: `Q${idx + 1}`, tagColor: THEME.action });
        addQuestionCard(qSlide, q.question, { y: 1.3, h: 5.6 });

        const sSlide = newSlide(pres, { ...ctx, tag: `Q${idx + 1} 정답` });
        const baseScore = 1 + Math.floor(Math.random() * 10); // 1~10점
        // 정답 칸과 점수 칸의 좌우 위치를 매번 무작위로 바꾼다 (정답이 늘 왼쪽에 고정되지 않게)
        const answerLeft = Math.random() < 0.5;
        const scoreW = SLIDE_W - 9.6;
        const ansBox = answerLeft ? { x: 0.8, w: 7.6 } : { x: 0.8 + scoreW + 0.4, w: 7.6 };
        const scoreBox = answerLeft ? { x: 8.8, w: scoreW } : { x: 0.8, w: scoreW };
        sSlide.addText("정답", {
            x: ansBox.x, y: 1.05, w: ansBox.w, h: 0.6,
            fontFace: FONT, fontSize: 24, bold: true, color: THEME.guide, align: "center", valign: "middle"
        });
        sSlide.addText(q.answer, {
            x: ansBox.x, y: 1.7, w: ansBox.w, h: 5.2,
            fontFace: FONT, fontSize: fitFont(q.answer, [72, 60, 48, 40, 32]), bold: true, color: THEME.text,
            align: "center", valign: "middle", margin: 0.3,
            shape: "roundRect", rectRadius: 0.12, fill: { color: THEME.card }, line: { color: THEME.accent, width: 4 }
        });
        sSlide.addText("기본 점수", {
            x: scoreBox.x, y: 1.05, w: scoreBox.w, h: 0.6,
            fontFace: FONT, fontSize: 24, bold: true, color: THEME.guide, align: "center", valign: "middle"
        });
        sSlide.addText(`${baseScore}점`, {
            x: scoreBox.x, y: 1.7, w: scoreBox.w, h: 5.2,
            fontFace: FONT, fontSize: baseScore >= 10 ? 84 : 104, bold: true, color: "FFFFFF", align: "center", valign: "middle",
            shape: "roundRect", rectRadius: 0.12, fill: { color: THEME.accent }
        });
    });

    addMessageSlide(pres, ctx, "게임 끝!", "최종 점수를 모두 더해 보세요");
    await pres.writeFile({ fileName: `${topic}_뻥이요_퀴즈.pptx` });
};

export const generatePungiyoPDF = async (topic, questions, grade) => {
    const scores = getPungiyoScores(questions.length, grade);
    await renderPagesToPdf(getPungiyoPages(topic, questions, grade, scores), {
        orientation: 'p',
        fileName: `${topic}_뻥이요_학습지.pdf`
    });
};

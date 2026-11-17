import { createBasePres, addTitleSlide, addConsolidatedRuleSlides, addQuestionSlide, addAnswerSlide, addMessageSlide } from "./baseEngine";

/**
 * Standard Engine: 문제 → 정답 순서의 기본 퀴즈 PPT
 */
export const generateStandardPPT = async (topic, questions, gameName) => {
    const pres = createBasePres(`${topic} ${gameName}`);
    const ctx = { game: gameName, topic };

    addTitleSlide(pres, gameName, topic);
    addConsolidatedRuleSlides(pres, "놀이 방법", [
        "선생님이 보여주시는 문제를 잘 읽고 정답을 생각합니다.",
        "개인별 또는 팀별로 정답을 기록하거나 발표합니다.",
        "정답 공개 후, 맞힌 개수를 확인하며 즐겁게 참여합니다."
    ], ctx);
    addMessageSlide(pres, ctx, "게임 시작!", `모두 ${questions.length}문제`);

    questions.forEach((q, idx) => {
        addQuestionSlide(pres, idx + 1, q.question, ctx);
        addAnswerSlide(pres, q.answer, { ...ctx });
    });

    addMessageSlide(pres, ctx, "게임 끝!", "오늘 배운 내용을 잘 기억해 보세요");

    const fileName = `${topic}_${gameName.replace(/\s+/g, '_')}.pptx`;
    await pres.writeFile({ fileName });
};

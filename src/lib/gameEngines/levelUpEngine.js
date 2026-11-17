import { createBasePres, addTitleSlide, addConsolidatedRuleSlides, addMessageSlide, newSlide, addQuestionCard, addAnswerCard, THEME } from "./baseEngine";

const LEVEL_POSE = ["", "바닥에 앉기", "의자에 앉기", "서 있기", "책상에 앉기"];

/**
 * 레벨업 골든벨: 2문제마다 레벨 체크
 */
export const generateLevelUpPPT = async (topic, questions) => {
    const pres = createBasePres(`${topic} 레벨업 골든벨`);
    const ctx = { game: "레벨업 골든벨", topic };

    addTitleSlide(pres, "레벨업 골든벨", topic);
    addConsolidatedRuleSlides(pres, "놀이 방법", [
        "의자에서 일어나 바닥에 앉아서 시작합니다. (Lv.1)",
        "2문제를 연속으로 맞히면 다음 단계로 레벨이 올라갑니다.",
        "한 문제라도 틀리면 레벨이 1단계 바로 내려갑니다.",
        "단계 구성: 바닥에 앉기(Lv.1) -> 의자에 앉기(Lv.2) -> 서 있기(Lv.3) -> 책상에 앉기(Lv.4)",
        "모든 문제를 해결한 뒤 최종적으로 자신의 신체 레벨을 확인합니다.",
        "양심을 속이지 않고 정직하게 레벨을 조정하며 참여합니다."
    ], ctx);
    addMessageSlide(pres, ctx, "LEVEL UP!", "모두 바닥에 앉아서 시작해요 (Lv.1)", { color: THEME.action });

    questions.forEach((q, idx) => {
        if (idx > 0 && idx % 2 === 0) {
            addMessageSlide(pres, ctx, "LEVEL CHECK!", "2문제 모두 맞히면 레벨 업! 틀리면 레벨 다운!", { color: THEME.accent });
        }
        const level = Math.min(4, Math.floor(idx / 2) + 1);

        const qSlide = newSlide(pres, { ...ctx, tag: `Q${idx + 1} · Lv.${level}`, tagColor: THEME.action });
        addQuestionCard(qSlide, q.question, { y: 1.3, h: 5.6 });

        const aSlide = newSlide(pres, { ...ctx, tag: `Q${idx + 1} 정답` });
        addAnswerCard(aSlide, q.answer, { y: 1.9, h: 4.4 });
    });

    addMessageSlide(pres, ctx, "게임 끝!", `지금 '${LEVEL_POSE[4]}' 마스터는 누구인가요?`);
    await pres.writeFile({ fileName: `${topic}_레벨업_골든벨.pptx` });
};

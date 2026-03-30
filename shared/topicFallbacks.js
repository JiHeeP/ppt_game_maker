export const isGcdPracticeRequest = (topic = "", detailedTopic = "") => {
    const merged = `${topic} ${detailedTopic}`.toLowerCase();
    return merged.includes("\uCD5C\uB300\uACF5\uC57D\uC218")
        && (
            merged.includes("\uB450 \uC218")
            || merged.includes("\uB450\uC218")
            || merged.includes("\uCC3E\uAE30")
            || merged.includes("\uAD6C\uD558\uAE30")
            || merged.includes("\uACC4\uC0B0")
        );
};

const createGcdPracticeQuestions = (requestedCount = 10) => {
    const gcdValues = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12];
    const multiplierPairs = [
        [2, 3], [3, 4], [3, 5], [4, 5], [4, 7],
        [5, 6], [5, 7], [7, 8], [3, 8], [5, 9]
    ];
    const questions = [];
    const usedPairs = new Set();

    for (const gcdValue of gcdValues) {
        for (const [leftMultiplier, rightMultiplier] of multiplierPairs) {
            const left = gcdValue * leftMultiplier;
            const right = gcdValue * rightMultiplier;
            if (left > 100 || right > 100) continue;

            const pairKey = [left, right].sort((a, b) => a - b).join("-");
            if (usedPairs.has(pairKey)) continue;
            usedPairs.add(pairKey);

            const wrongCandidates = [
                Number.isInteger(gcdValue / 2) ? gcdValue / 2 : null,
                gcdValue - 1,
                gcdValue + 1,
                gcdValue * 2,
                1
            ].filter(candidate => Number.isInteger(candidate) && candidate > 0 && candidate !== gcdValue);

            questions.push({
                question: `${left}\uC640 ${right}\uC758 \uCD5C\uB300\uACF5\uC57D\uC218\uB294?`,
                answer: String(gcdValue),
                wrongAnswer: String(wrongCandidates[0] ?? 1)
            });

            if (questions.length >= requestedCount) {
                return questions;
            }
        }
    }

    return questions;
};

export const getSpecialTopicFallbackQuestions = (topic = "", detailedTopic = "", requestedCount = 10) => {
    if (isGcdPracticeRequest(topic, detailedTopic)) {
        return createGcdPracticeQuestions(requestedCount);
    }

    return null;
};

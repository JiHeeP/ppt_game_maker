import {
    isGcdPracticeRequest,
    getSpecialTopicFallbackQuestions,
    getTopicSpecificGuidance,
    getTopicReferenceFacts
} from './topicFallbacks.js';

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
                question: `${left}와 ${right}의 최대공약수는?`,
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

export const getTopicFallbackQuestions = (topic = "", detailedTopic = "", requestedCount = 10) => {
    const specialFallback = getSpecialTopicFallbackQuestions(topic, detailedTopic, requestedCount);
    if (specialFallback) {
        return specialFallback;
    }

    const merged = `${topic} ${detailedTopic}`.toLowerCase();
    const mentionsFraction = merged.includes("분수");
    const wantsProperFractions = merged.includes("진분수");
    const wantsSameDenominator = merged.includes("분모가 같은") || merged.includes("같은 분모");
    const wantsExpressionOnly = merged.includes("식") || merged.includes("문장제 금지");

    if (isGcdPracticeRequest(topic, detailedTopic)) {
        return createGcdPracticeQuestions(requestedCount);
    }

    if (mentionsFraction && wantsProperFractions && wantsSameDenominator && wantsExpressionOnly) {
        const bank = [
            { question: "1/4 + 2/4 = ?", answer: "3/4", wrongAnswer: "4/4" },
            { question: "1/5 + 3/5 = ?", answer: "4/5", wrongAnswer: "2/5" },
            { question: "2/7 + 4/7 = ?", answer: "6/7", wrongAnswer: "5/7" },
            { question: "3/8 + 1/8 = ?", answer: "4/8", wrongAnswer: "5/8" },
            { question: "5/6 + 1/6 = ?", answer: "6/6", wrongAnswer: "4/6" },
            { question: "2/9 + 3/9 = ?", answer: "5/9", wrongAnswer: "6/9" },
            { question: "1/3 + 1/3 = ?", answer: "2/3", wrongAnswer: "3/3" },
            { question: "4/10 + 3/10 = ?", answer: "7/10", wrongAnswer: "8/10" },
            { question: "2/11 + 5/11 = ?", answer: "7/11", wrongAnswer: "6/11" },
            { question: "3/12 + 4/12 = ?", answer: "7/12", wrongAnswer: "8/12" }
        ];
        return bank.slice(0, requestedCount);
    }

    const mentionsSamguk = merged.includes("삼국");
    const mentionsChina = merged.includes("중국") || merged.includes("삼국지");
    const mentionsKoreanClassroomContext =
        merged.includes("한국사")
        || merged.includes("고구려")
        || merged.includes("백제")
        || merged.includes("신라");

    if (!(mentionsSamguk && !mentionsChina && mentionsKoreanClassroomContext)) {
        return null;
    }

    const bank = [
        { question: "삼국 시대의 세 나라는 무엇인가요?", answer: "고구려, 백제, 신라", wrongAnswer: "고구려, 가야, 고려" },
        { question: "고구려를 세운 사람은 누구인가요?", answer: "주몽", wrongAnswer: "온조" },
        { question: "백제를 세운 사람은 누구인가요?", answer: "온조", wrongAnswer: "주몽" },
        { question: "신라를 세운 사람은 누구인가요?", answer: "박혁거세", wrongAnswer: "김유신" },
        { question: "광개토대왕은 어느 나라의 왕인가요?", answer: "고구려", wrongAnswer: "신라" },
        { question: "김유신과 관련이 깊은 나라는 어디인가요?", answer: "신라", wrongAnswer: "백제" },
        { question: "금관을 많이 남긴 나라로 알려진 삼국은 어느 나라인가요?", answer: "신라", wrongAnswer: "고구려" },
        { question: "한강 유역을 중심으로 발전한 나라로 배우는 삼국은 보통 어느 나라인가요?", answer: "백제", wrongAnswer: "신라" },
        { question: "삼국 가운데 삼국 통일을 이룬 나라는 어디인가요?", answer: "신라", wrongAnswer: "고구려" },
        { question: "고구려, 백제, 신라를 함께 부르는 말은 무엇인가요?", answer: "삼국", wrongAnswer: "삼국지" }
    ];

    return bank.slice(0, requestedCount);
};

export const getHeuristicIssues = (topic = "", detailedTopic = "", questions = []) => {
    const merged = `${topic} ${detailedTopic}`.toLowerCase();
    const serialized = JSON.stringify(questions);
    const issues = [];

    const mentionsSamguk = merged.includes("삼국");
    const mentionsChina = merged.includes("중국") || merged.includes("삼국지");
    if (mentionsSamguk && !mentionsChina) {
        const bannedTerms = ["위", "촉", "오", "중국", "삼국지", "고려", "가야"];
        const found = bannedTerms.filter(term => serialized.includes(term));
        if (found.length > 0) {
            issues.push(`삼국 시대를 한국사 문맥으로 해석하지 못했고 금지어가 포함됨: ${found.join(", ")}`);
        }
    }

    return issues;
};

export const buildQuizPrompt = ({ topic, detailedTopic, requestedCount, grade, gameName, pdfInstruction }) => `
            [핵심 주제]
            ${topic}

            ${detailedTopic ? `[상세 요청 - 주제와 동일한 핵심 조건]
            ${detailedTopic}

            상세 요청은 부가 설명이 아닙니다.
            반드시 모든 문항에 일관되게 반영해야 하며, 주제와 동일한 중요도로 다뤄야 합니다.
            ` : ''}

            [기본 정보]
            대상 학년: ${grade}
            문항 수: ${requestedCount}
            게임 유형: ${gameName}

            ${getTopicSpecificGuidance(topic, detailedTopic).length > 0 ? `[주제 해석 고정]
            ${getTopicSpecificGuidance(topic, detailedTopic).map(item => `- ${item}`).join("\n")}
            ` : ''}

            ${getTopicReferenceFacts(topic, detailedTopic).length > 0 ? `[주제 참고 사실]
            ${getTopicReferenceFacts(topic, detailedTopic).map(item => `- ${item}`).join("\n")}
            ` : ''}

            ${pdfInstruction}

            [절대 규칙]
            1. 모든 문항은 핵심 주제에 정확히 맞아야 합니다.
            2. 상세 요청이 있으면 모든 문항이 그 조건을 함께 만족해야 합니다.
            3. 상세 요청을 한 문항이라도 어기면 전체 결과는 실패입니다.
            4. PDF 참고자료가 있으면 자료 범위를 벗어나지 말고, 자료와 충돌하는 추측을 하지 마세요.
            5. 정답은 명확하고 사실에 근거해야 합니다.
            6. 학년에 맞는 난이도와 표현을 사용하세요.
            7. 주제가 한국어이고 해석이 여러 개인 경우, 한국 초등학교/중학교 수업 문맥에서 가장 자연스러운 의미를 우선하세요.
            8. 코드 블록이나 설명 없이 JSON 배열만 출력하세요.
            9. 출력의 첫 글자는 '[' 이고 마지막 글자는 ']' 이어야 합니다.

            [출력 전 자체 점검]
            - 모든 문항이 주제를 벗어나지 않았는가?
            - 모든 문항이 상세 요청을 빠짐없이 만족하는가?
            - 애매한 해석 대신 학년과 한국 학교 수업 맥락에 맞는가?
            - 문항 수가 정확히 ${requestedCount}개인가?

            [JSON 형식]
            [
                { "question": "질문 내용", "answer": "정답", "wrongAnswer": "오답" }
            ]
        `;

export const normalizeQuestions = (questions, requestedCount) => (
    questions.slice(0, requestedCount).map(q => ({
        ...q,
        question: q.question || "질문 없음",
        answer: q.answer || "정답 없음",
        wrongAnswer: q.wrongAnswer || "오답 없음"
    }))
);

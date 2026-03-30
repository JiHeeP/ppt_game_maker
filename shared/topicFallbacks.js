export const isGcdPracticeRequest = (topic = "", detailedTopic = "") => {
    const merged = `${topic} ${detailedTopic}`.toLowerCase();
    return merged.includes("최대공약수")
        && (
            merged.includes("두 수")
            || merged.includes("두수")
            || merged.includes("찾기")
            || merged.includes("구하기")
            || merged.includes("계산")
        );
};

const parseGcdConstraints = (topic = "", detailedTopic = "") => {
    const merged = `${topic} ${detailedTopic}`;
    let minGcd = 2;
    let maxGcd = Infinity;

    const minMatch = merged.match(/(\d+)\s*(?:이상|<=\s*최대|=<\s*최대)/);
    if (minMatch) minGcd = Math.max(minGcd, Number(minMatch[1]));

    const minMatch2 = merged.match(/(?:최대\s*공약수\s*)?(?:>=?|=<)\s*(\d+)/);
    if (minMatch2) minGcd = Math.max(minGcd, Number(minMatch2[1]));

    const maxMatch = merged.match(/(\d+)\s*이하/);
    if (maxMatch) maxGcd = Math.min(maxGcd, Number(maxMatch[1]));

    return { minGcd, maxGcd };
};

const MATH_TOPIC_MARKER = "수학";
const MATH_FALSE_POSITIVES = ["수학여행"];
const MATH_CONCEPT_SIGNALS = [
    "뜻",
    "의미",
    "정의",
    "개념",
    "원리",
    "설명",
    "서술",
    "비교",
    "왜",
    "증명",
    "이유",
    "방법"
];
const CALC_CONTEXT_WORDS = ["계산", "풀이", "나눗셈", "곱셈", "덧셈", "뺄셈"];

export const getMathTopicPreference = (topic = "", detailedTopic = "") => {
    const merged = `${topic} ${detailedTopic}`.toLowerCase();

    const hasFalsePositive = MATH_FALSE_POSITIVES.some(fp => merged.includes(fp));
    if (hasFalsePositive) {
        return { isMathTopic: false, preferredMode: null, matchedSignals: [] };
    }

    const isMathTopic = merged.includes(MATH_TOPIC_MARKER);
    if (!isMathTopic) {
        return { isMathTopic: false, preferredMode: null, matchedSignals: [] };
    }

    const rawSignals = MATH_CONCEPT_SIGNALS.filter(signal => merged.includes(signal));

    const hasCalcContext = CALC_CONTEXT_WORDS.some(w => merged.includes(w));
    const effectiveSignals = rawSignals.filter(signal => {
        if (signal === "방법" && hasCalcContext) return false;
        return true;
    });

    return {
        isMathTopic: true,
        preferredMode: effectiveSignals.length > 0 ? "concept" : "calculation",
        matchedSignals: effectiveSignals
    };
};

const ALL_GCD_VALUES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 15, 16, 18, 20, 24, 25];
const MULTIPLIER_PAIRS = [
    [2, 3], [3, 4], [3, 5], [4, 5], [4, 7],
    [5, 6], [5, 7], [7, 8], [3, 8], [5, 9],
    [2, 5], [2, 7], [3, 7], [2, 9], [4, 9]
];

const createGcdPracticeQuestions = (requestedCount = 10, minGcd = 2, maxGcd = Infinity) => {
    const gcdValues = ALL_GCD_VALUES.filter(v => v >= minGcd && v <= maxGcd);
    if (gcdValues.length === 0) return [];

    const usedPairs = new Set();
    const allCandidates = [];

    for (const [leftMultiplier, rightMultiplier] of MULTIPLIER_PAIRS) {
        for (const gcdValue of gcdValues) {
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

            allCandidates.push({
                question: `${left}와 ${right}의 최대공약수는?`,
                answer: String(gcdValue),
                wrongAnswer: String(wrongCandidates[0] ?? 1)
            });
        }
    }

    return allCandidates.slice(0, requestedCount);
};

export const getSpecialTopicFallbackQuestions = (topic = "", detailedTopic = "", requestedCount = 10) => {
    if (isGcdPracticeRequest(topic, detailedTopic)) {
        const { minGcd, maxGcd } = parseGcdConstraints(topic, detailedTopic);
        return createGcdPracticeQuestions(requestedCount, minGcd, maxGcd);
    }

    return null;
};

export const getTopicSpecificGuidance = (topic = "", detailedTopic = "") => {
    const merged = `${topic} ${detailedTopic}`.toLowerCase();
    const guidance = [];

    const mentionsSamguk = merged.includes("삼국");
    const mentionsChina = merged.includes("중국") || merged.includes("삼국지");
    if (mentionsSamguk && !mentionsChina) {
        guidance.push("이 주제의 삼국 시대는 한국사 문맥의 고구려, 백제, 신라를 의미합니다.");
        guidance.push("위, 촉, 오, 중국 삼국지, 고려, 가야를 정답 또는 핵심 개념으로 사용하지 마세요.");
    }

    if (merged.includes("조선")) {
        guidance.push("조선 관련 주제는 한국사 교과 맥락을 기준으로 다루고, 중국 왕조사로 혼동하지 마세요.");
    }

    const mathPref = getMathTopicPreference(topic, detailedTopic);
    if (mathPref.preferredMode === "calculation") {
        guidance.push("이 주제는 수학 계산 문제입니다. 모든 문항은 학생이 직접 계산하여 답을 구하는 형태여야 합니다.");
        guidance.push("개념 설명, 정의, 용어 뜻을 묻는 서술형 문항은 출제하지 마세요.");
        guidance.push("정답과 오답은 반드시 숫자, 수식, 또는 계산 결과여야 합니다.");
        guidance.push("학생 수준에 맞는 정수·분수·배수·약수·도형 수치 계산 등 풀이 가능한 문제를 우선하세요.");
    } else if (mathPref.preferredMode === "concept") {
        guidance.push("이 주제는 수학 개념 문제입니다. 개념, 정의, 원리를 묻는 문항을 출제하세요.");
    }

    return guidance;
};

export const getTopicReferenceFacts = (topic = "", detailedTopic = "") => {
    const merged = `${topic} ${detailedTopic}`.toLowerCase();
    const facts = [];

    const mentionsSamguk = merged.includes("삼국");
    const mentionsChina = merged.includes("중국") || merged.includes("삼국지");
    if (mentionsSamguk && !mentionsChina) {
        facts.push("삼국 시대의 세 나라는 고구려, 백제, 신라입니다.");
        facts.push("고구려를 세운 사람은 주몽, 백제를 세운 사람은 온조입니다.");
        facts.push("신라를 세운 사람은 박혁거세입니다.");
        facts.push("문제는 위 같은 기본 교과 사실 안에서만 만들고, 불확실한 세부 사실은 쓰지 마세요.");
    }

    return facts;
};

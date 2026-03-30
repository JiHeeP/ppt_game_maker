import OpenAI from 'openai';

const getServerApiKey = () => (
    process.env.VITE_KIMI_API_KEY
    || process.env.KIMI_API_KEY
    || process.env.VITE_GEMINI_API_KEY
    || process.env.GEMINI_API_KEY
    || ''
).trim();

const createMoonshotClient = (apiKey) => new OpenAI({
    apiKey,
    baseURL: "https://api.moonshot.ai/v1",
    timeout: 28000,
});

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const isRetriableOpenAIError = (error) => {
    const status = error?.status;
    const message = `${error?.message || error?.error?.message || ''}`.toLowerCase();
    return [429, 500, 502, 503, 504].includes(status)
        || message.includes('overloaded')
        || message.includes('rate limit')
        || message.includes('temporarily unavailable');
};

const toUserFacingError = (error) => {
    if (isRetriableOpenAIError(error)) {
        const wrapped = new Error("AI 서버가 일시적으로 바쁩니다. 잠시 후 다시 시도해주세요.");
        wrapped.status = 503;
        return wrapped;
    }

    const wrapped = new Error(error?.message || 'Unknown server error');
    wrapped.status = error?.status || 500;
    return wrapped;
};

const createChatCompletionWithRetry = async ({
    client,
    request,
    remainingMs = () => 30000,
    operationLabel = 'AI request',
    maxAttempts = 2
}) => {
    let lastError;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        if (attempt > 0) {
            const backoffMs = 1200 * attempt;
            if (remainingMs() < backoffMs + 4000) {
                break;
            }
            console.warn(`${operationLabel} retry ${attempt + 1}/${maxAttempts} in ${backoffMs}ms`);
            await sleep(backoffMs);
        }

        try {
            return await client.chat.completions.create(request);
        } catch (error) {
            lastError = error;
            if (!isRetriableOpenAIError(error) || attempt === maxAttempts - 1) {
                break;
            }
        }
    }

    throw toUserFacingError(lastError);
};

const extractObjectsFromTruncatedArray = (sourceText) => {
    const arrayStart = sourceText.indexOf('[');
    if (arrayStart < 0) return [];

    const segment = sourceText.slice(arrayStart);
    const objects = [];
    let inString = false;
    let escaped = false;
    let depth = 0;
    let objectStart = -1;

    for (let index = 0; index < segment.length; index += 1) {
        const character = segment[index];

        if (escaped) {
            escaped = false;
            continue;
        }

        if (character === '\\' && inString) {
            escaped = true;
            continue;
        }

        if (character === '"') {
            inString = !inString;
            continue;
        }

        if (inString) continue;

        if (character === '{') {
            if (depth === 0) objectStart = index;
            depth += 1;
            continue;
        }

        if (character === '}') {
            if (depth <= 0) continue;
            depth -= 1;
            if (depth === 0 && objectStart >= 0) {
                const rawObject = segment.slice(objectStart, index + 1);
                try {
                    objects.push(JSON.parse(rawObject));
                } catch {
                    // Ignore invalid fragment
                }
                objectStart = -1;
            }
        }
    }

    return objects;
};

const parseQuizArray = (rawText) => {
    if (!rawText || typeof rawText !== 'string') {
        throw new Error("AI Format Error: Empty response from AI.");
    }

    const normalized = rawText
        .replace(/^\uFEFF/, "")
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'");

    const candidates = [normalized.trim()];
    const fencedBlocks = [...normalized.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)];
    fencedBlocks.forEach(match => candidates.push(match[1].trim()));

    const arrayMatch = normalized.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
        candidates.push(arrayMatch[0].trim());
    }

    for (const candidate of candidates) {
        const repaired = candidate.replace(/,\s*([}\]])/g, "$1");
        try {
            const parsed = JSON.parse(repaired);
            if (Array.isArray(parsed)) return parsed;
            if (parsed && Array.isArray(parsed.questions)) return parsed.questions;
            if (parsed && Array.isArray(parsed.data)) return parsed.data;
            if (parsed && Array.isArray(parsed.quiz)) return parsed.quiz;
        } catch {
            continue;
        }
    }

    const recovered = extractObjectsFromTruncatedArray(normalized);
    if (recovered.length > 0) {
        return recovered;
    }

    throw new Error("AI Format Error: Failed to parse quiz data.");
};

const parseJsonObject = (rawText) => {
    if (!rawText || typeof rawText !== 'string') {
        throw new Error("AI Format Error: Empty response from AI.");
    }

    const normalized = rawText
        .replace(/^\uFEFF/, "")
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'");

    const candidates = [normalized.trim()];
    const fencedBlocks = [...normalized.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)];
    fencedBlocks.forEach(match => candidates.push(match[1].trim()));

    const objectMatch = normalized.match(/\{[\s\S]*\}/);
    if (objectMatch) {
        candidates.push(objectMatch[0].trim());
    }

    for (const candidate of candidates) {
        const repaired = candidate.replace(/,\s*([}\]])/g, "$1");
        try {
            const parsed = JSON.parse(repaired);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                return parsed;
            }
        } catch {
            continue;
        }
    }

    throw new Error("AI Format Error: Failed to parse validation payload.");
};

const buildPdfInstruction = (pdfContext) => {
    if (!pdfContext) return "";

    return `
            [주요 참고 자료 - PDF 내용]
            아래 내용은 사용자가 업로드한 자료 PDF에서 추출한 텍스트입니다.
            문제와 정답은 가능한 한 이 자료를 충실히 반영해 주세요.
            자료 내용:
            ${pdfContext.substring(0, 30000)}
    `;
};

const getTopicSpecificGuidance = (topic = "", detailedTopic = "") => {
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

    return guidance;
};

const getTopicReferenceFacts = (topic = "", detailedTopic = "") => {
    const merged = `${topic} ${detailedTopic}`.toLowerCase();
    const facts = [];

    const mentionsSamguk = merged.includes("\uC0BC\uAD6D");
    const mentionsChina = merged.includes("\uC911\uAD6D") || merged.includes("\uC0BC\uAD6D\uC9C0");
    if (mentionsSamguk && !mentionsChina) {
        facts.push("\uC0BC\uAD6D \uC2DC\uB300\uC758 \uC138 \uB098\uB77C\uB294 \uACE0\uAD6C\uB824, \uBC31\uC81C, \uC2E0\uB77C\uC785\uB2C8\uB2E4.");
        facts.push("\uACE0\uAD6C\uB824\uB97C \uC138\uC6B4 \uC0AC\uB78C\uC740 \uC8FC\uBABD, \uBC31\uC81C\uB97C \uC138\uC6B4 \uC0AC\uB78C\uC740 \uC628\uC870\uC785\uB2C8\uB2E4.");
        facts.push("\uC2E0\uB77C\uB97C \uC138\uC6B4 \uC0AC\uB78C\uC740 \uBC15\uD601\uAC70\uC138\uC785\uB2C8\uB2E4.");
        facts.push("\uBB38\uC81C\uB294 \uC704 \uAC19\uC740 \uAE30\uBCF8 \uAD50\uACFC \uC0AC\uC2E4 \uC548\uC5D0\uC11C\uB9CC \uB9CC\uB4E4\uACE0, \uBD88\uD655\uC2E4\uD55C \uC138\uBD80 \uC0AC\uC2E4\uC740 \uC4F0\uC9C0 \uB9C8\uC138\uC694.");
    }

    return facts;
};

const getTopicFallbackQuestions = (topic = "", detailedTopic = "", requestedCount = 10) => {
    const merged = `${topic} ${detailedTopic}`.toLowerCase();
    const mentionsFraction = merged.includes("\uBD84\uC218");
    const wantsProperFractions = merged.includes("\uC9C4\uBD84\uC218");
    const wantsSameDenominator = merged.includes("\uBD84\uBAA8\uAC00 \uAC19\uC740") || merged.includes("\uAC19\uC740 \uBD84\uBAA8");
    const wantsExpressionOnly = merged.includes("\uC2DD") || merged.includes("\uBB38\uC7A5\uC81C \uAE08\uC9C0");

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

    const mentionsSamguk = merged.includes("\uC0BC\uAD6D");
    const mentionsChina = merged.includes("\uC911\uAD6D") || merged.includes("\uC0BC\uAD6D\uC9C0");
    const mentionsKoreanClassroomContext =
        merged.includes("\uD55C\uAD6D\uC0AC")
        || merged.includes("\uACE0\uAD6C\uB824")
        || merged.includes("\uBC31\uC81C")
        || merged.includes("\uC2E0\uB77C");

    if (!(mentionsSamguk && !mentionsChina && mentionsKoreanClassroomContext)) {
        return null;
    }

    const bank = [
        { question: "\uC0BC\uAD6D \uC2DC\uB300\uC758 \uC138 \uB098\uB77C\uB294 \uBB34\uC5C7\uC778\uAC00\uC694?", answer: "\uACE0\uAD6C\uB824, \uBC31\uC81C, \uC2E0\uB77C", wrongAnswer: "\uACE0\uAD6C\uB824, \uAC00\uC57C, \uACE0\uB824" },
        { question: "\uACE0\uAD6C\uB824\uB97C \uC138\uC6B4 \uC0AC\uB78C\uC740 \uB204\uAD6C\uC778\uAC00\uC694?", answer: "\uC8FC\uBABD", wrongAnswer: "\uC628\uC870" },
        { question: "\uBC31\uC81C\uB97C \uC138\uC6B4 \uC0AC\uB78C\uC740 \uB204\uAD6C\uC778\uAC00\uC694?", answer: "\uC628\uC870", wrongAnswer: "\uC8FC\uBABD" },
        { question: "\uC2E0\uB77C\uB97C \uC138\uC6B4 \uC0AC\uB78C\uC740 \uB204\uAD6C\uC778\uAC00\uC694?", answer: "\uBC15\uD601\uAC70\uC138", wrongAnswer: "\uAE40\uC720\uC2E0" },
        { question: "\uAD11\uAC1C\uD1A0\uB300\uC655\uC740 \uC5B4\uB290 \uB098\uB77C\uC758 \uC655\uC778\uAC00\uC694?", answer: "\uACE0\uAD6C\uB824", wrongAnswer: "\uC2E0\uB77C" },
        { question: "\uAE40\uC720\uC2E0\uACFC \uAD00\uB828\uC774 \uAE4A\uC740 \uB098\uB77C\uB294 \uC5B4\uB514\uC778\uAC00\uC694?", answer: "\uC2E0\uB77C", wrongAnswer: "\uBC31\uC81C" },
        { question: "\uAE08\uAD00\uC744 \uB9CE\uC774 \uB0A8\uAE34 \uB098\uB77C\uB85C \uC54C\uB824\uC9C4 \uC0BC\uAD6D\uC740 \uC5B4\uB290 \uB098\uB77C\uC778\uAC00\uC694?", answer: "\uC2E0\uB77C", wrongAnswer: "\uACE0\uAD6C\uB824" },
        { question: "\uD55C\uAC15 \uC720\uC5ED\uC744 \uC911\uC2EC\uC73C\uB85C \uBC1C\uC804\uD55C \uB098\uB77C\uB85C \uBC30\uC6B0\uB294 \uC0BC\uAD6D\uC740 \uBCF4\uD1B5 \uC5B4\uB290 \uB098\uB77C\uC778\uAC00\uC694?", answer: "\uBC31\uC81C", wrongAnswer: "\uC2E0\uB77C" },
        { question: "\uC0BC\uAD6D \uAC00\uC6B4\uB370 \uC0BC\uAD6D \uD1B5\uC77C\uC744 \uC774\uB8EC \uB098\uB77C\uB294 \uC5B4\uB514\uC778\uAC00\uC694?", answer: "\uC2E0\uB77C", wrongAnswer: "\uACE0\uAD6C\uB824" },
        { question: "\uACE0\uAD6C\uB824, \uBC31\uC81C, \uC2E0\uB77C\uB97C \uD568\uAED8 \uBD80\uB974\uB294 \uB9D0\uC740 \uBB34\uC5C7\uC778\uAC00\uC694?", answer: "\uC0BC\uAD6D", wrongAnswer: "\uC0BC\uAD6D\uC9C0" }
    ];

    return bank.slice(0, requestedCount);
};

const getHeuristicIssues = (topic = "", detailedTopic = "", questions = []) => {
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

    if (mentionsSamguk && !mentionsChina) {
        const suspiciousTerms = ['"援щ젮"', "吏꾧뎄??", "??異⑥쇅??"];
        const suspiciousFound = suspiciousTerms.filter(term => serialized.includes(term));
        if (suspiciousFound.length > 0) {
            issues.push(`?쇨뎅 ?쒕? 臾명빆??湲곕낯 ?섏꽌 ?ъ떎???꾧굅濡?蹂댁씠?섎뒗 ?⑥뼱媛 ?ы븿?? ${suspiciousFound.join(", ")}`);
        }
    }

    return issues;
};

const buildQuizPrompt = ({ topic, detailedTopic, requestedCount, grade, gameName, pdfInstruction }) => `
            [?듭떖 二쇱젣]
            ${topic}

            ${detailedTopic ? `[?곸꽭 ?붿껌 - 二쇱젣? ?숈씪???듭떖 議곌굔]
            ${detailedTopic}

            ?곸꽭 ?붿껌? 遺媛 ?ㅻ챸???꾨떃?덈떎.
            諛섎뱶??紐⑤뱺 臾명빆???쇨??섍쾶 諛섏쁺?댁빞 ?섎ŉ, 二쇱젣? ?숈씪??以묒슂?꾨줈 ?ㅻ쨪???⑸땲??
            ` : ''}

            [湲곕낯 ?뺣낫]
            ????숇뀈: ${grade}
            臾명빆 ?? ${requestedCount}
            寃뚯엫 ?좏삎: ${gameName}

            ${getTopicSpecificGuidance(topic, detailedTopic).length > 0 ? `[二쇱젣 ?댁꽍 怨좎젙]
            ${getTopicSpecificGuidance(topic, detailedTopic).map(item => `- ${item}`).join("\n")}
            ` : ''}

            ${getTopicReferenceFacts(topic, detailedTopic).length > 0 ? `[二쇱젣 ?⑥떖 ?ъ떎]
            ${getTopicReferenceFacts(topic, detailedTopic).map(item => `- ${item}`).join("\n")}
            ` : ''}

            ${pdfInstruction}

            [?덈? 洹쒖튃]
            1. 紐⑤뱺 臾명빆? ?듭떖 二쇱젣???뺥솗??留욎븘???⑸땲??
            2. ?곸꽭 ?붿껌???덉쑝硫?紐⑤뱺 臾명빆??洹?議곌굔???④퍡 留뚯”?댁빞 ?⑸땲??
            3. ?곸꽭 ?붿껌????臾명빆?대씪???닿린硫??꾩껜 寃곌낵???ㅽ뙣?낅땲??
            4. PDF 李멸퀬?먮즺媛 ?덉쑝硫??먮즺 踰붿쐞瑜?踰쀬뼱?섏? 留먭퀬, ?먮즺? 異⑸룎?섎뒗 異붿륫???섏? 留덉꽭??
            5. ?뺣떟? 紐낇솗?섍퀬 ?ъ떎??洹쇨굅?댁빞 ?⑸땲??
            6. ?숇뀈??留욌뒗 ?쒖씠?꾩? ?쒗쁽???ъ슜?섏꽭??
            7. 二쇱젣媛 ?쒓뎅?댁씠怨??댁꽍???щ윭 媛쒖씤 寃쎌슦, ?쒓뎅 珥덈벑?숆탳/以묓븰援??섏뾽 臾몃㎘?먯꽌 媛???먯뿰?ㅻ윭???섎?瑜??곗꽑?섏꽭??
            8. 肄붾뱶 釉붾줉?대굹 ?ㅻ챸 ?놁씠 JSON 諛곗뿴留?異쒕젰?섏꽭??
            9. 異쒕젰??泥?湲?먮뒗 '[' ?닿퀬 留덉?留?湲?먮뒗 ']' ?댁뼱???⑸땲??

            [異쒕젰 ???먯껜 ?먭?]
            - 紐⑤뱺 臾명빆??二쇱젣瑜?踰쀬뼱?섏? ?딆븯?붽??
            - 紐⑤뱺 臾명빆???곸꽭 ?붿껌??鍮좎쭚?놁씠 留뚯”?섎뒗媛?
            - ?좊ℓ???댁꽍 ????숇뀈怨??쒓뎅 ?숆탳 ?섏뾽 留λ씫??留욌뒗媛?
            - 臾명빆 ?섍? ?뺥솗??${requestedCount}媛쒖씤媛?

            [JSON ?뺤떇]
            [
                { "question": "吏덈Ц ?댁슜", "answer": "?뺣떟", "wrongAnswer": "?ㅻ떟" }
            ]
        `;

const normalizeQuestions = (questions, requestedCount) => (
    questions.slice(0, requestedCount).map(q => ({
        ...q,
        question: q.question || "질문 없음",
        answer: q.answer || "정답 없음",
        wrongAnswer: q.wrongAnswer || "오답 없음"
    }))
);

const _validateDetailedRequestCompliance = async ({
    client,
    topic,
    detailedTopic,
    requestedCount,
    grade,
    gameName,
    pdfContext,
    questions,
    remainingMs = () => 60000
}) => {
    if (!detailedTopic?.trim()) {
        return questions;
    }

    const fallbackQuestions = getTopicFallbackQuestions(topic, detailedTopic, requestedCount);
    if (fallbackQuestions) {
        return fallbackQuestions;
    }

    const heuristicIssues = getHeuristicIssues(topic, detailedTopic, questions);
    if (heuristicIssues.length > 0) {
        return regenerateQuestionsFromIssues({
            client,
            topic,
            detailedTopic,
            requestedCount,
            grade,
            gameName,
            pdfContext,
            issues: heuristicIssues
        });
    }

    const pdfSummary = pdfContext
        ? `PDF 참고자료가 있으며, 아래 텍스트 범위 안에서 벗어나지 않도록 검수하세요.\n${pdfContext.substring(0, 12000)}`
        : "PDF 참고자료는 없습니다.";

    const validationPrompt = `
        [검수 대상]
        핵심 주제: ${topic}
        상세 요청: ${detailedTopic}
        대상 학년: ${grade}
        문항 수: ${requestedCount}
        게임 유형: ${gameName}

        [엄격한 판정 기준]
        1. 각 문항은 핵심 주제와 상세 요청을 동시에 만족해야 합니다.
        2. 한 문항이라도 위반하면 전체 세트는 불합격입니다.
        3. 주제가 한국어이고 해석이 여러 가지면 한국 학교 수업 맥락의 의미를 우선하세요.
        4. PDF 참고자료가 있으면 그 범위를 벗어나지 마세요.
        5. 질문과 정답에 사실 오류가 있으면 불합격입니다.
        6. 기준을 어긴 문항이 있으면 기존 배열을 부분 수정하지 말고, 조건에 맞는 새 배열 전체를 다시 작성하세요.

        [PDF 참고]
        ${pdfSummary}

        [생성된 문항]
        ${JSON.stringify(questions, null, 2)}

        [작업]
        1. 문항 세트를 검수하세요.
        2. 위반이 없으면 isValid를 true로 두고 questions에 검수 완료 배열을 넣으세요.
        3. 위반이 있으면 isValid를 false로 두고 issues에 문제점을 적고, questions에는 조건을 모두 만족하도록 새로 작성한 전체 배열을 넣으세요.
        4. 문항 수는 반드시 ${requestedCount}개를 유지하세요.
        5. 결과는 아래 JSON 객체만 출력하세요.

        {
          "isValid": true,
          "issues": [],
          "questions": [
            { "question": "질문 내용", "answer": "정답", "wrongAnswer": "오답" }
          ]
        }
    `;

    {
        if (remainingMs() < 10000) {
            console.warn(`Skipping validation API call: only ${remainingMs()}ms remaining`);
            return questions;
        }
        console.log(`Calling validation API (${remainingMs()}ms remaining)`);
        const completion = await createChatCompletionWithRetry({
            client,
            remainingMs,
            operationLabel: "Validation API",
            request: {
                model: "moonshot-v1-32k",
                messages: [
                    { role: "system", content: "당신은 요구사항 위반을 엄격하게 잡아내는 수업용 퀴즈 검수 AI입니다. 한 문항이라도 조건을 어기면 전체 세트를 불합격 처리합니다." },
                    { role: "user", content: validationPrompt }
                ],
                temperature: 0,
                max_tokens: 4096,
            }
        });

        const text = completion.choices[0].message.content || "";

        try {
            const parsed = parseJsonObject(text);
            if (!Array.isArray(parsed.questions) || parsed.questions.length < requestedCount) {
                throw new Error("AI Validation Error: Incomplete corrected quiz array.");
            }

            const normalized = normalizeQuestions(parsed.questions, requestedCount);
            if (parsed.isValid === false && Array.isArray(parsed.issues) && parsed.issues.length > 0) {
                console.warn("Detailed request validation corrected quiz issues:", parsed.issues);
            }
            return normalized;
        } catch {
            const preview = text.slice(0, 300).replace(/\s+/g, ' ');
            console.error("Validation Parse Error. Preview:", preview);
        }
    }

    console.warn("Detailed request validation fallback: returning original generated questions.");
    return questions;
};

const _auditDetailedRequestCompliance = async ({
    client,
    topic,
    detailedTopic,
    requestedCount,
    grade,
    gameName,
    pdfContext,
    questions
}) => {
    if (!detailedTopic?.trim()) {
        return { isValid: true, issues: [] };
    }

    const heuristicIssues = getHeuristicIssues(topic, detailedTopic, questions);
    if (heuristicIssues.length > 0) {
        return { isValid: false, issues: heuristicIssues };
    }

    const pdfSummary = pdfContext
        ? `PDF 참고자료가 있습니다.\n${pdfContext.substring(0, 8000)}`
        : "PDF 참고자료는 없습니다.";

    const auditPrompt = `
        [감사 대상]
        주제: ${topic}
        상세 요청: ${detailedTopic}
        학년: ${grade}
        문항 수: ${requestedCount}
        게임 유형: ${gameName}

        [판정 원칙]
        1. 각 문항은 주제와 상세 요청을 동시에 만족해야 합니다.
        2. 한 문항이라도 위반하면 전체 세트는 불합격입니다.
        3. 주제가 한국어이고 해석이 여러 개면 한국 학교 수업 맥락을 우선합니다.
        4. PDF가 있으면 그 범위를 벗어나면 안 됩니다.
        5. 질문과 정답에 사실 오류가 있으면 불합격입니다.

        [PDF 참고]
        ${pdfSummary}

        [문항]
        ${JSON.stringify(questions, null, 2)}

        아래 형식의 JSON 객체만 출력하세요.
        {
          "isValid": true,
          "issues": []
        }
    `;

    const completion = await createChatCompletionWithRetry({
        client,
        operationLabel: "Audit API",
        request: {
            model: "moonshot-v1-32k",
            messages: [
                { role: "system", content: "당신은 요구사항 위반을 엄격하게 판정하는 퀴즈 감사 AI입니다." },
                { role: "user", content: auditPrompt }
            ],
            temperature: 0,
            max_tokens: 1500,
        }
    });

    const text = completion.choices[0].message.content || "";
    try {
        const parsed = parseJsonObject(text);
        return {
            isValid: parsed.isValid !== false,
            issues: Array.isArray(parsed.issues) ? parsed.issues : []
        };
    } catch {
        const preview = text.slice(0, 300).replace(/\s+/g, ' ');
        console.error("Audit Parse Error. Preview:", preview);
        return { isValid: true, issues: [] };
    }
};

const regenerateQuestionsFromIssues = async ({
    client,
    topic,
    detailedTopic,
    requestedCount,
    grade,
    gameName,
    pdfContext,
    issues
}) => {
    const fallbackQuestions = getTopicFallbackQuestions(topic, detailedTopic, requestedCount);
    if (fallbackQuestions) {
        return fallbackQuestions;
    }

    const pdfInstruction = buildPdfInstruction(pdfContext);
    const issueList = issues.length > 0 ? issues.map((issue, index) => `${index + 1} . ${issue}`.replace(' . ', '. ')).join("\n") : "??? ??? ???????";

    const strictRegenerationPrompt = `
        ${buildQuizPrompt({ topic, detailedTopic, requestedCount, grade, gameName, pdfInstruction })}

        [??? ???????? ???]
        ${issueList}

        [?????????
        - ??? ??????????????? ??? ${requestedCount}????????????????? ????????
        - ??? ??????????????????????????????
        - ???????????????????? ??? ??? ??????????????????
        - ??? ?????? ??? ??? JSON ?????????????
    `;

    const completion = await createChatCompletionWithRetry({
        client,
        operationLabel: "Regeneration API",
        request: {
            model: "moonshot-v1-32k",
            messages: [
                { role: "system", content: "????? ?????? ??????????? ??? ??? ??? ???????? ?????? AI?????" },
                { role: "user", content: strictRegenerationPrompt }
            ],
            temperature: 0,
            max_tokens: 4096,
        }
    });

    const text = completion.choices[0].message.content || "";
    const parsed = parseQuizArray(text);
    return normalizeQuestions(parsed, requestedCount);
};

export const handler = async (event, _context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: 'Method Not Allowed' };
    }

    try {
        const FUNCTION_START = Date.now();
        const TIME_LIMIT_MS = 28000;
        const remainingMs = () => Math.max(0, TIME_LIMIT_MS - (Date.now() - FUNCTION_START));

        const { topic, detailedTopic = "", count, grade, gameName, pdfContext, pdfData: _pdfData, apiKey: clientApiKey } = JSON.parse(event.body);
        const apiKey = (clientApiKey || getServerApiKey()).trim();

        if (!apiKey) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: "KIMI_API_KEY is not configured in Netlify environment variables." })
            };
        }

        const openai = createMoonshotClient(apiKey);

        const requestedCount = Number(count) || 10;
        const pdfInstruction = buildPdfInstruction(pdfContext);

        // 휴리스틱 fallback 체크 (API 호출 없이 즉시 반환)
        if (detailedTopic?.trim()) {
            const fallbackQuestions = getTopicFallbackQuestions(topic, detailedTopic, requestedCount);
            if (fallbackQuestions) {
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify(fallbackQuestions)
                };
            }
        }

        const strictPromptText = buildQuizPrompt({
            topic,
            detailedTopic,
            requestedCount,
            grade,
            gameName,
            pdfInstruction
        });

        // 단일 API 호출 - 30초 제한 내에서 1번만 호출
        console.log(`Calling Kimi API (Netlify) with retry guard (${remainingMs()}ms remaining)`);
        const completion = await createChatCompletionWithRetry({
            client: openai,
            remainingMs,
            operationLabel: "Netlify quiz generation API",
            request: {
            model: "moonshot-v1-32k",
            messages: [
                { role: "system", content: "당신은 교육용 퀴즈를 생성하는 AI 어시스턴트입니다. 반드시 JSON 배열만 출력하세요." },
                { role: "user", content: strictPromptText },
            ],
            temperature: 0.1,
            max_tokens: 4096,
            }
        });

        const text = completion.choices[0].message.content || "";
        console.log("AI Response received");

        const parsed = parseQuizArray(text);
        if (!Array.isArray(parsed) || parsed.length === 0) {
            throw new Error("AI Format Error: Empty quiz array.");
        }

        // 휴리스틱 검증 (API 호출 없이 로컬에서만)
        let normalized = normalizeQuestions(parsed, requestedCount);
        if (detailedTopic?.trim()) {
            const heuristicIssues = getHeuristicIssues(topic, detailedTopic, normalized);
            if (heuristicIssues.length > 0) {
                console.warn("Heuristic issues found:", heuristicIssues);
                const fallback = getTopicFallbackQuestions(topic, detailedTopic, requestedCount);
                if (fallback) {
                    normalized = fallback;
                }
            }
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(normalized)
        };

    } catch (error) {
        console.error("Function Error:", error);
        const errorMessage = error.message || 'Unknown server error';
        const statusCode = error.status || 500;
        return {
            statusCode,
            headers,
            body: JSON.stringify({ error: errorMessage })
        };
    }
};

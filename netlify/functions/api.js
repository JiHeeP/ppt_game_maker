import OpenAI from 'openai';
import { getTopicFallbackQuestions, getHeuristicIssues, buildQuizPrompt, normalizeQuestions } from '../../shared/quizPrompt.js';

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

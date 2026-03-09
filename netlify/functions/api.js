import OpenAI from 'openai';

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

const normalizeQuestions = (questions, requestedCount) => (
    questions.slice(0, requestedCount).map(q => ({
        ...q,
        question: q.question || "질문 없음",
        answer: q.answer || "정답 없음",
        wrongAnswer: q.wrongAnswer || "오답 없음"
    }))
);

const validateDetailedRequestCompliance = async ({
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
        return questions;
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

        [중요]
        상세 요청은 핵심 주제의 일부입니다.
        각 문항은 "주제 + 상세 요청"을 함께 만족해야 합니다.

        [PDF 참고]
        ${pdfSummary}

        [생성된 문항]
        ${JSON.stringify(questions, null, 2)}

        [작업]
        1. 문항들이 상세 요청까지 충실히 반영했는지 검수하세요.
        2. 하나라도 어긋나면 전체 문항 배열을 조건에 맞게 수정하세요.
        3. 문항 수는 반드시 ${requestedCount}개를 유지하세요.
        4. 결과는 아래 JSON 객체만 출력하세요.

        {
          "isValid": true,
          "issues": [],
          "questions": [
            { "question": "질문 내용", "answer": "정답", "wrongAnswer": "오답" }
          ]
        }
    `;

    for (let attempt = 0; attempt < 2; attempt += 1) {
        const completion = await client.chat.completions.create({
            model: "moonshot-v1-32k",
            messages: [
                { role: "system", content: "당신은 초등 및 중등 수업용 퀴즈를 검수하고 수정하는 AI입니다." },
                { role: "user", content: validationPrompt }
            ],
            temperature: 0.1,
            max_tokens: 4096,
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

export const handler = async (event, context) => {
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
        const { topic, detailedTopic = "", count, grade, gameName, pdfContext, pdfData, apiKey: clientApiKey } = JSON.parse(event.body);
        const apiKey = clientApiKey || process.env.KIMI_API_KEY || process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: "KIMI_API_KEY is not configured in Netlify environment variables." })
            };
        }

        const openai = new OpenAI({
            apiKey: apiKey,
            baseURL: "https://api.moonshot.ai/v1",
        });

        let pdfInstruction = "";

        if (pdfContext) {
            pdfInstruction = `
            [주요 참고 자료 - PDF 내용]
            선생님이 업로드한 텍스트 내용:
            ${pdfContext.substring(0, 30000)}
            `;
        }

        const requestedCount = Number(count) || 10;
        pdfInstruction = buildPdfInstruction(pdfContext);

        const promptText = `
            [핵심 주제]
            ${topic}

            ${detailedTopic?.trim() ? `[상세 요청 - 주제와 동일한 핵심 조건]
            ${detailedTopic}
            상세 요청은 반드시 모든 문항에 반영해야 하며 주제와 동일한 중요도로 다뤄야 합니다.
            ` : ''}
            주제: ${topic}
            대상 학년: ${grade}
            문항 수: ${requestedCount}
            게임 유형: ${gameName}
            
            당신은 초등/중등 교사를 돕는 전문 퀴즈 출제 위원입니다. 
            위 주제에 대해 한국어로 작성해 주세요.
            ${pdfInstruction}
            
            [공통 규칙]
            1. 질문은 명확하고 이해하기 쉬워야 합니다.
            2. 정답은 확실한 사실에 기반해야 합니다.
            3. 아래의 JSON 형식을 엄격히 지켜서 출력하세요. 코드 블록(\`\`\`json) 등 부가적인 설명 없이 오직 JSON 배열만 출력하세요.
            4. 출력의 첫 글자는 '[' 이고 마지막 글자는 ']' 이어야 합니다.
            
            [JSON 형식]
            [
                { "question": "질문 내용", "answer": "정답", "wrongAnswer": "오답" }
            ]
        `;

        let questions;
        let lastParseError;

        for (let attempt = 0; attempt < 2; attempt += 1) {
            console.log(`Calling Kimi API... attempt ${attempt + 1}`);
            const completion = await openai.chat.completions.create({
                model: "moonshot-v1-32k",
                messages: [
                    { role: "system", content: "당신은 교육용 퀴즈를 생성하는 AI 어시스턴트입니다." },
                    { role: "user", content: promptText },
                    ...(attempt > 0
                        ? [{
                            role: "user",
                            content: `이전 응답이 JSON 형식 오류 또는 잘림 상태였습니다. 반드시 ${requestedCount}개 문항의 JSON 배열만 다시 출력하세요.`
                        }]
                        : [])
                ],
                temperature: 0.3,
                max_tokens: 4096,
            });

            const text = completion.choices[0].message.content || "";
            console.log("AI Response received");

            try {
                const parsed = parseQuizArray(text);
                if (!Array.isArray(parsed) || parsed.length === 0) {
                    throw new Error("AI Format Error: Empty quiz array.");
                }
                if (parsed.length < requestedCount && attempt === 0) {
                    throw new Error("AI Format Error: Incomplete quiz array.");
                }
                questions = parsed;
                break;
            } catch (error) {
                lastParseError = error;
                const preview = text.slice(0, 300).replace(/\s+/g, ' ');
                console.error("JSON Parse Error. Preview:", preview);
            }
        }

        if (!questions) {
            throw new Error(lastParseError?.message || "AI Format Error: Failed to parse quiz data.");
        }

        let normalized = questions.slice(0, requestedCount).map(q => ({
            ...q,
            question: q.question || "질문 없음",
            answer: q.answer || "정답 없음",
            wrongAnswer: q.wrongAnswer || "정답 아님"
        }));

        normalized = await validateDetailedRequestCompliance({
            client: openai,
            topic,
            detailedTopic,
            requestedCount,
            grade,
            gameName,
            pdfContext,
            questions: normalized
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(normalized)
        };

    } catch (error) {
        console.error("Function Error:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};

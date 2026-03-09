import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Use KIMI_API_KEY from environment, with fallbacks if needed
const serverApiKey = process.env.VITE_KIMI_API_KEY || process.env.KIMI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

if (!serverApiKey) {
    console.error("Warning: KIMI_API_KEY is not set in .env file");
}

const openai = new OpenAI({
    apiKey: serverApiKey,
    baseURL: "https://api.moonshot.ai/v1",
});

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

// Quiz Generation Endpoint
app.post('/api/generate-quiz', async (req, res) => {
    try {
        const { topic, count, grade, gameName, pdfContext, pdfData, apiKey: clientApiKey } = req.body;

        // Use client API key if provided, otherwise fallback to server env
        let activeClient = openai;
        if (clientApiKey) {
            activeClient = new OpenAI({
                apiKey: clientApiKey,
                baseURL: "https://api.moonshot.ai/v1",
            });
        }

        let pdfInstruction = "";

        // Kimi 텍스트 기반 컨텍스트 (프론트엔드에서 텍스트로 추출된 내용)
        if (pdfContext) {
            pdfInstruction = `
            [주요 참고 자료 - PDF 내용]
            아래는 선생님이 업로드한 문서의 텍스트입니다. 
            가급적 이 문서의 내용을 기반으로 질문과 정답을 구성해 주세요. 
            문서 내용:
            ${pdfContext.substring(0, 30000)} /* Kimi는 긴 컨텍스트를 잘 지원합니다 */
            `;
        }

        const requestedCount = Number(count) || 10;

        const promptText = `
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
            console.log(`Calling Kimi API (Moonshot)... attempt ${attempt + 1}`);
            const completion = await activeClient.chat.completions.create({
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
            return res.status(500).json({ error: lastParseError?.message || "AI Format Error: Failed to parse quiz data." });
        }

        // Normalize
        const normalized = questions.slice(0, requestedCount).map(q => ({
            ...q,
            question: q.question || "질문 없음",
            answer: q.answer || "정답 없음",
            wrongAnswer: q.wrongAnswer || "정답 아님"
        }));

        res.json(normalized);

    } catch (error) {
        console.error("Generation Error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});


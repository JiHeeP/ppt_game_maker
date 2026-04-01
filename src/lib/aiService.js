/**
 * AI Service to generate educational quiz questions based on a topic and count.
 * Uses the local dev server in development and Netlify Functions in production.
 * Supports client-side batch splitting for large question counts to avoid timeouts.
 */
const BATCH_SIZE = 15;

const getQuizEndpoints = (configuredEndpoint) => {
    if (configuredEndpoint) {
        return [configuredEndpoint];
    }

    if (import.meta.env.DEV) {
        return [
            '/api/generate-quiz',
            'http://localhost:3000/api/generate-quiz',
            'http://127.0.0.1:3000/api/generate-quiz',
            '/.netlify/functions/api'
        ];
    }

    return ['/.netlify/functions/api'];
};

const _singleRequest = async (apiKey, topic, detailedTopic, count, grade, gameName, pdfContext, pdfData, subject, batchHint) => {
    const configuredEndpoint = import.meta.env.VITE_QUIZ_API_ENDPOINT?.trim();
    const endpoints = getQuizEndpoints(configuredEndpoint);
    const devFallbackStatuses = new Set([404, 502, 503, 504]);
    const payload = JSON.stringify({ apiKey, topic, detailedTopic, count, grade, gameName, pdfContext, pdfData, subject, batchHint });
    let lastError;

    for (const endpoint of endpoints) {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: payload
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = `Server error (${response.status})`;

                try {
                    const errorBody = JSON.parse(errorText);
                    errorMessage = errorBody.error || errorBody.errorMessage || errorBody.message || errorMessage;
                } catch {
                    errorMessage = `${response.status} ${response.statusText}: ${errorText.slice(0, 200)}`;
                }

                if (!configuredEndpoint && import.meta.env.DEV && devFallbackStatuses.has(response.status)) {
                    lastError = new Error(errorMessage);
                    continue;
                }

                throw new Error(errorMessage);
            }

            return await response.json();
        } catch (error) {
            lastError = error;
            const isNetworkError = error instanceof TypeError;
            const canRetry = !configuredEndpoint && import.meta.env.DEV && isNetworkError;
            if (!canRetry) {
                throw error;
            }
        }
    }

    throw lastError || new Error('Quiz generation server is not reachable.');
};

export const generateQuizQuestions = async (
    apiKey,
    topic,
    detailedTopic = "",
    count,
    grade = "",
    gameName = "",
    pdfContext = "",
    pdfData = null,
    subject = ""
) => {
    try {
        if (count <= BATCH_SIZE) {
            return await _singleRequest(apiKey, topic, detailedTopic, count, grade, gameName, pdfContext, pdfData, subject, "");
        }

        // Split into batches for large counts to avoid Netlify 30s timeout
        const batches = [];
        let remaining = count;
        let batchIndex = 0;
        const totalBatches = Math.ceil(count / BATCH_SIZE);
        while (remaining > 0) {
            const batchCount = Math.min(remaining, BATCH_SIZE);
            const startNum = batchIndex * BATCH_SIZE + 1;
            const endNum = startNum + batchCount - 1;
            const batchHint = `이 요청은 전체 ${count}개 문항 중 ${startNum}~${endNum}번 문제(배치 ${batchIndex + 1}/${totalBatches})입니다.`;
            batches.push({ count: batchCount, batchHint });
            remaining -= batchCount;
            batchIndex++;
        }

        console.log(`[AIService] Splitting ${count} questions into ${batches.length} batches of max ${BATCH_SIZE}`);

        const results = await Promise.all(
            batches.map(batch =>
                _singleRequest(apiKey, topic, detailedTopic, batch.count, grade, gameName, pdfContext, pdfData, subject, batch.batchHint)
            )
        );

        return results.flat();
    } catch (error) {
        console.error("[AIService] Generation Error:", error);
        throw new Error(`Quiz generation failed: ${error.message}`);
    }
};

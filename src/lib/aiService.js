/**
 * AI Service to generate educational quiz questions based on a topic and count.
 * Uses the local dev server in development and Netlify Functions in production.
 */
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

export const generateQuizQuestions = async (
    apiKey,
    topic,
    detailedTopic = "",
    count,
    grade = "",
    gameName = "",
    pdfContext = "",
    pdfData = null
) => {
    try {
        const configuredEndpoint = import.meta.env.VITE_QUIZ_API_ENDPOINT?.trim();
        const endpoints = getQuizEndpoints(configuredEndpoint);
        const devFallbackStatuses = new Set([404, 502, 503, 504]);
        const payload = JSON.stringify({ apiKey, topic, detailedTopic, count, grade, gameName, pdfContext, pdfData });
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
    } catch (error) {
        console.error("[AIService] Generation Error:", error);
        throw new Error(`Quiz generation failed: ${error.message}`);
    }
};

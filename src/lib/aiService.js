/**
 * AI Service to generate educational quiz questions based on a topic and count.
 * Now calls Netlify Function to protect API key.
 */
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
        const endpoints = configuredEndpoint
            ? [configuredEndpoint]
            : import.meta.env.DEV
                ? [
                    'http://localhost:3000/api/generate-quiz',
                    'http://127.0.0.1:3000/api/generate-quiz',
                    '/.netlify/functions/api'
                ]
                : ['/.netlify/functions/api'];

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
                    let errorMessage = `서버 오류 (${response.status})`;
                    try {
                        const errorBody = JSON.parse(errorText);
                        errorMessage = errorBody.error || errorBody.errorMessage || errorBody.message || errorMessage;
                    } catch {
                        errorMessage = `${response.status} ${response.statusText}: ${errorText.slice(0, 200)}`;
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
        throw lastError || new Error('퀴즈 생성 서버에 연결할 수 없습니다.');

    } catch (error) {
        console.error("[AIService] Generation Error:", error);
        throw new Error(`퀴즈 생성 중 오류가 발생했습니다: ${error.message}`);
    }
};


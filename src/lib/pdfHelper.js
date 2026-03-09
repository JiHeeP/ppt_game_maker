import * as pdfjsLib from 'pdfjs-dist';

/**
 * Extracts all text from a PDF file with better error handling.
 */
export const extractTextFromPDF = async (file) => {
    // Point to the local file we just copied to the public folder
    // This is the absolute safest way to load a worker in restricted networks
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

    console.log(`[PDFHelper] Initializing extraction with v5 local worker... (API Version: ${pdfjsLib.version})`);

    try {
        const arrayBuffer = await file.arrayBuffer();

        const loadingTask = pdfjsLib.getDocument({
            data: arrayBuffer,
            useSystemFonts: true,
            disableFontFace: true // Often safer for simple text extraction
        });

        const pdf = await loadingTask.promise;
        let fullText = "";

        for (let i = 1; i <= pdf.numPages; i++) {
            try {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items
                    .map(item => item.str || '')
                    .join(" ");
                fullText += pageText + "\n";
            } catch (pageErr) {
                console.warn(`[PDFHelper] Error on page ${i}:`, pageErr);
            }
        }

        const trimmedText = fullText.trim().replace(/\s+/g, ' ');

        if (trimmedText.length < 5) {
            throw new Error("EMPTY_TEXT");
        }

        return trimmedText;
    } catch (err) {
        console.error('[PDFHelper] Stable Extraction Error:', err);

        if (err.message === "EMPTY_TEXT") {
            throw new Error("PDF에서 텍스트를 인식할 수 없습니다. (스캔된 이미지 파일인지 확인해주세요)");
        }

        throw new Error(`PDF 분석 실패: ${err.message}`);
    }
};

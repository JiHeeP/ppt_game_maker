import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { getTopTenMatchTemplate } from './pdfTemplateHelper';

/**
 * Top Ten Match Engine: Generates a 2-page PDF Matching game.
 */
export const generateTopTenMatchPDF = async (topic, pairs) => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();

    // Chunk pairs into groups of 8
    const chunks = [];
    for (let i = 0; i < pairs.length; i += 8) {
        chunks.push(pairs.slice(i, i + 8));
    }

    // Helper to add a page from template
    const addPage = async (pagePairs, isFirst) => {
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.innerHTML = getTopTenMatchTemplate(topic, pagePairs);
        document.body.appendChild(container);

        try {
            const canvas = await html2canvas(container, {
                scale: 2,
                useCORS: true
            });
            const imgData = canvas.toDataURL('image/png');
            const imgProps = pdf.getImageProperties(imgData);
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            if (!isFirst) pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        } finally {
            document.body.removeChild(container);
        }
    };

    try {
        if (chunks.length === 0) {
            alert("문제가 충분하지 않습니다. 최소 1개 이상의 문제가 필요합니다.");
            return;
        }

        for (let i = 0; i < chunks.length; i++) {
            await addPage(chunks[i], i === 0);
        }

        pdf.save(`${topic}_탑텐짝찾기_학습지.pdf`);
    } catch (error) {
        console.error('[TopTenMatchEngine] PDF generation failed:', error);
        throw error;
    }
};

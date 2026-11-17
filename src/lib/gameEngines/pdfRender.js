import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

/**
 * HTML 페이지 여러 장을 A4 PDF 한 파일로 만든다.
 * - pages: 각 원소가 한 쪽짜리 HTML (세로 1000x1414px, 가로 1414x1000px 기준)
 * - 화면을 그림으로 찍되 PNG 압축(FAST)을 켜서 용량을 크게 줄인다 (예전: 쪽당 15MB 안팎 → 수백 KB)
 */
export const renderPagesToPdf = async (pages, { orientation = 'p', fileName, scale = 2 }) => {
    const pdf = new jsPDF(orientation, 'mm', 'a4');
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < pages.length; i++) {
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-99999px';
        container.style.top = '0';
        container.innerHTML = pages[i];
        document.body.appendChild(container);
        try {
            const node = container.firstElementChild || container;
            const canvas = await html2canvas(node, { scale, useCORS: true, backgroundColor: '#ffffff' });
            const ratio = Math.min(pageW / canvas.width, pageH / canvas.height);
            const w = canvas.width * ratio;
            const h = canvas.height * ratio;
            if (i > 0) pdf.addPage('a4', orientation);
            pdf.addImage(canvas, 'PNG', (pageW - w) / 2, (pageH - h) / 2, w, h, undefined, 'FAST');
        } finally {
            document.body.removeChild(container);
        }
    }
    pdf.save(fileName);
};

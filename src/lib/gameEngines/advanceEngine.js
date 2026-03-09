import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import pptxgen from "pptxgenjs";
import { getAdvanceTemplate } from "./pdfTemplateHelper";

/**
 * Advance Engine: Generates both PDF and PPT.
 */
export const generateAdvancePDF = async (topic, questions) => {
    console.log('[AdvanceEngine] Starting HTML-to-PDF generation...');

    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.innerHTML = getAdvanceTemplate(topic, questions);
    document.body.appendChild(container);

    try {
        const canvas = await html2canvas(container, {
            scale: 2,
            useCORS: true,
            allowTaint: true
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const imgHeight = (canvasHeight * pdfWidth) / canvasWidth;

        let heightLeft = imgHeight;
        let position = 0;

        // Page 1
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;

        // Page 2+
        while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;
        }

        pdf.save(`${topic}_고고전진_학습지.pdf`);
    } catch (err) {
        console.error('[AdvanceEngine] PDF Error:', err);
        throw err;
    } finally {
        document.body.removeChild(container);
    }
};

export const generateAdvancePPT = async (topic, questions) => {
    console.log('[AdvanceEngine] Starting PPTX generation...');
    const pres = new pptxgen();
    const font = "Malgun Gothic";

    pres.defineLayout({ name: 'A4_PORTRAIT', width: 8.27, height: 11.69 });
    pres.layout = 'A4_PORTRAIT';

    const n = questions.length;
    const perStep = Math.floor(n / 6);
    const stages = [];
    for (let i = 0; i < 5; i++) stages.push(questions.slice(i * perStep, (i + 1) * perStep));
    stages.push(questions.slice(5 * perStep));

    const COL_WIDTHS = [0.94, 4.33, 2.0]; // 0.94 inches ≈ 2.4cm

    // PAGE 1: Steps 1-3
    let slide1 = pres.addSlide();
    slide1.addText(`${topic} - 고고전진!`, { x: 0.5, y: 0.4, w: 5.5, h: 0.6, fontSize: 24, bold: true, fontFace: font });
    slide1.addText("이름: ________", { x: 6.2, y: 0.4, w: 1.6, h: 0.6, fontSize: 14, fontFace: font, border: { pt: 1, color: "000000" }, align: "center" });

    let currentY1 = 1.2;
    for (let sIdx = 0; sIdx < 3; sIdx++) {
        const stageQs = stages[sIdx] || [];
        const rowH = 0.6;
        const tableData = stageQs.map((q, qIdx) => {
            const row = [];
            if (qIdx === 0) {
                const stageLabel = `${sIdx + 1}단계` + (q.theme ? `\n(${q.theme})` : '');
                row.push({ text: stageLabel, options: { rowspan: stageQs.length, fontSize: q.theme ? 10 : 16, bold: true, fontFace: font, align: 'center', valign: 'middle' } });
            }
            row.push({ text: q.question, options: { fontSize: 13, fontFace: font, h: rowH } });
            row.push({ text: "", options: {} });
            return row;
        });

        slide1.addTable(tableData, { x: 0.5, y: currentY1, w: 7.27, colWidths: COL_WIDTHS, border: { pt: 1, color: "000000" } });
        currentY1 += (Math.max(1, stageQs.length) * rowH) + 0.3;
    }

    // PAGE 2: Steps 4-6
    let slide2 = pres.addSlide();
    slide2.addText(`${topic} - 고고전진! (연결)`, { x: 0.5, y: 0.4, w: 7.27, h: 0.6, fontSize: 22, bold: true, fontFace: font });

    let currentY2 = 1.2;
    for (let sIdx = 3; sIdx < 6; sIdx++) {
        const stageQs = stages[sIdx] || [];
        const rowH = 0.6;
        const tableData = stageQs.map((q, qIdx) => {
            const row = [];
            if (qIdx === 0) {
                const stageLabel = `${sIdx + 1}단계` + (q.theme ? `\n(${q.theme})` : '');
                row.push({ text: stageLabel, options: { rowspan: stageQs.length, fontSize: q.theme ? 10 : 16, bold: true, fontFace: font, align: 'center', valign: 'middle' } });
            }
            row.push({ text: q.question, options: { fontSize: 13, fontFace: font, h: rowH } });
            row.push({ text: "", options: {} });
            return row;
        });

        slide2.addTable(tableData, { x: 0.5, y: currentY2, w: 7.27, colWidths: COL_WIDTHS, border: { pt: 1, color: "000000" } });
        currentY2 += (Math.max(1, stageQs.length) * rowH) + 0.3;
    }

    await pres.writeFile({ fileName: `${topic}_고고전진_학습지.pptx` });
};

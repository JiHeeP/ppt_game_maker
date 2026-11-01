import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import pptxgen from "pptxgenjs";
import { getBingoTemplate, getBingoVerticalTemplate } from "./pdfTemplateHelper";

/**
 * Bingo Engine: Generates a high-quality PDF bingo worksheet in LANDSCAPE.
 */
export const generateBingoPDF = async (topic, questions) => {
    console.log('[BingoEngine] Starting HTML-to-PDF generation...');

    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.innerHTML = getBingoTemplate(topic, questions);
    document.body.appendChild(container);

    try {
        const canvas = await html2canvas(container, {
            scale: 2,
            useCORS: true,
            allowTaint: true
        });

        const imgData = canvas.toDataURL('image/png');
        // 'l' for landscape orientation
        const pdf = new jsPDF('l', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();

        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const imgWidth = pdfWidth;
        const imgHeight = (canvasHeight * pdfWidth) / canvasWidth;

        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        pdf.save(`${topic}_빙고_학습지.pdf`);
        console.log('[BingoEngine] PDF generated successfully.');
    } catch (err) {
        console.error('[BingoEngine] Error:', err);
        throw err;
    } finally {
        document.body.removeChild(container);
    }
};

/**
 * Bingo Engine: Generates an EDITABLE PPTX bingo worksheet.
 */
export const generateBingoPPT = async (topic, questions) => {
    console.log('[BingoEngine] Starting PPTX generation...');
    const pres = new pptxgen();

    const finalQuestions = questions.slice(0, 20);
    const numQuestions = finalQuestions.length;
    const m = Math.floor(Math.sqrt(numQuestions));
    const font = "Malgun Gothic";

    pres.layout = 'LAYOUT_WIDE';
    let slide = pres.addSlide();

    // Header Section (Topic + Name)
    slide.addText(`주제: ${topic}`, {
        x: 0.3, y: 0.2, w: 9.0, h: 0.6,
        fontSize: 22, bold: true, fontFace: font,
        color: '000000'
    });

    // Left Side (1/3 Width) - Bingo Grid (Centered Vertically)
    const gridDim = 4.2;
    const bingoData = Array.from({ length: m }, () => Array(m).fill({ text: "", options: { border: { pt: 1, color: "000000" } } }));

    slide.addTable(bingoData, {
        x: 0.3, y: 2.0, w: gridDim, h: gridDim,
        colWidths: Array(m).fill(gridDim / m),
        rowH: gridDim / m
    });

    // Vertical Divider removed
    // slide.addShape(getShape(pres, 'LINE'), { x: 4.8, y: 1.0, w: 0, h: 6.0, line: { color: "000000", width: 1.5 } });

    // Right Side (2/3 Width) - Questions Table
    slide.addText(`퀴즈 리스트`, { x: 5.2, y: 0.8, w: 7.5, h: 0.4, fontSize: 16, bold: true, fontFace: font });

    const midIdx = Math.ceil(finalQuestions.length / 2);
    const leftCol = finalQuestions.slice(0, midIdx).map((q, i) => [
        { text: `${i + 1}. ${q.question}\n(답: ______________________)`, options: { fontSize: 14, fontFace: font, border: { pt: 0.5, color: "000000" } } }
    ]);
    const rightCol = finalQuestions.slice(midIdx).map((q, i) => [
        { text: `${midIdx + i + 1}. ${q.question}\n(답: ______________________)`, options: { fontSize: 14, fontFace: font, border: { pt: 0.5, color: "000000" } } }
    ]);

    // Right-side two columns
    slide.addTable(leftCol, { x: 5.2, y: 1.3, w: 3.8, h: 5.8, margin: 0.1, valign: 'top' });
    slide.addTable(rightCol, { x: 9.1, y: 1.3, w: 3.8, h: 5.8, margin: 0.1, valign: 'top' });

    await pres.writeFile({ fileName: `${topic}_빙고_학습지.pptx` });
};

/**
 * Bingo Engine: Generates a high-quality PDF bingo worksheet in PORTRAIT.
 */
export const generateBingoVerticalPDF = async (topic, questions) => {
    console.log('[BingoEngine] Starting HTML-to-PDF generation (Vertical 2-up)...');
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.innerHTML = getBingoVerticalTemplate(topic, questions);
    document.body.appendChild(container);

    try {
        const root = container.firstElementChild;
        const pageNodes = root ? Array.from(root.querySelectorAll('[data-bingo-page]')) : [];

        if (pageNodes.length <= 1) {
            const singlePageNode = pageNodes[0] || container;
            const canvas = await html2canvas(singlePageNode, {
                scale: 2,
                useCORS: true,
                allowTaint: true
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const imgWidth = pdfWidth;
            const imgHeight = (canvasHeight * pdfWidth) / canvasWidth;
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            pdf.save(`${topic}_빙고_학습지_세로.pdf`);
            console.log('[BingoEngine] Vertical PDF generated successfully (Single page).');
            return;
        }

        const pageCanvases = [];
        for (const pageNode of pageNodes) {
            const pageCanvas = await html2canvas(pageNode, {
                scale: 2,
                useCORS: true,
                allowTaint: true
            });
            pageCanvases.push(pageCanvas);
        }

        const pdf = new jsPDF('l', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const margin = 8;
        const gutter = 4;
        const slotWidth = (pdfWidth - (margin * 2) - gutter) / 2;
        const slotHeight = pdfHeight - (margin * 2);

        const drawPageOnSlot = (canvas, slotIndex) => {
            const scale = Math.min(slotWidth / canvas.width, slotHeight / canvas.height);
            const renderWidth = canvas.width * scale;
            const renderHeight = canvas.height * scale;
            const slotX = margin + (slotIndex * (slotWidth + gutter));
            const x = slotX + ((slotWidth - renderWidth) / 2);
            const y = margin + ((slotHeight - renderHeight) / 2);

            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, renderWidth, renderHeight);
            pdf.setLineWidth(0.2);
            pdf.setDrawColor(180, 180, 180);
            pdf.rect(slotX, margin, slotWidth, slotHeight);
        };

        for (let i = 0; i < pageCanvases.length; i += 2) {
            if (i > 0) pdf.addPage();
            drawPageOnSlot(pageCanvases[i], 0);
            if (pageCanvases[i + 1]) {
                drawPageOnSlot(pageCanvases[i + 1], 1);
            }
        }

        pdf.save(`${topic}_빙고_학습지_세로.pdf`);
        console.log('[BingoEngine] Vertical PDF generated successfully (2-up layout).');
    } catch (err) {
        console.error('[BingoEngine] Error:', err);
        throw err;
    } finally {
        document.body.removeChild(container);
    }
};

/**
 * Bingo Engine: Generates an EDITABLE PPTX bingo worksheet in PORTRAIT.
 */
export const generateBingoVerticalPPT = async (topic, questions) => {
    console.log('[BingoEngine] Starting PPTX generation (Vertical Portrait)...');
    const pres = new pptxgen();

    // Safety check for ShapeType
    if (!pres.ShapeType) {
        pres.ShapeType = pres.shapes || pptxgen.ShapeType || pptxgen.shapes || {};
    }

    const finalQuestions = questions.slice(0, 20);
    const font = "Malgun Gothic";

    // Define A4 Portrait Layout
    pres.defineLayout({ name: 'A4_PORTRAIT', width: 8.27, height: 11.69 });
    pres.layout = 'A4_PORTRAIT';

    // SLIDE 1: Header + Bingo Grid + Q1-6
    let slide1 = pres.addSlide();

    // Header
    slide1.addText(`주제: ${topic}`, {
        x: 0.5, y: 0.4, w: 5.5, h: 0.6,
        fontSize: 24, bold: true, fontFace: font
    });
    slide1.addText("이름: ________", {
        x: 6.2, y: 0.4, w: 1.6, h: 0.6,
        fontSize: 14, fontFace: font,
        border: { pt: 1, color: "000000" },
        align: "center", valign: "middle"
    });

    // Bingo Grid
    const m = Math.floor(Math.sqrt(finalQuestions.length));
    const gridDim = 6.0;
    const bingoData = Array.from({ length: m }, () => Array(m).fill({ text: "", options: { border: { pt: 1.5, color: "000000" } } }));
    slide1.addTable(bingoData, {
        x: (8.27 - gridDim) / 2, y: 1.2, w: gridDim, h: gridDim,
        colWidths: Array(m).fill(gridDim / m),
        rowH: gridDim / m
    });

    // Q1-6
    const q1to6 = finalQuestions.slice(0, 6);
    if (q1to6.length > 0) {
        slide1.addText("퀴즈 질문 (1-6)", { x: 0.5, y: 7.8, w: 7.27, h: 0.4, fontSize: 18, bold: true, fontFace: font });

        const mid = Math.ceil(q1to6.length / 2);
        const leftData = q1to6.slice(0, mid).map((q, i) => [
            { text: `${i + 1}. ${q.question}\n(답: ____________________)`, options: { fontSize: 14, fontFace: font, border: { pt: 0.5, color: "000000" } } }
        ]);
        const rightData = q1to6.slice(mid).map((q, i) => [
            { text: `${mid + i + 1}. ${q.question}\n(답: ____________________)`, options: { fontSize: 14, fontFace: font, border: { pt: 0.5, color: "000000" } } }
        ]);

        slide1.addTable(leftData, { x: 0.5, y: 8.3, w: 3.5, margin: 0.05, valign: 'top' });
        slide1.addTable(rightData, { x: 4.2, y: 8.3, w: 3.5, margin: 0.05, valign: 'top' });
    }

    // SLIDE 2: Q7-20
    const q7to20 = finalQuestions.slice(6);
    if (q7to20.length > 0) {
        let slide2 = pres.addSlide();
        slide2.addText("퀴즈 질문 (7번~)", { x: 0.5, y: 0.5, w: 7.27, h: 0.6, fontSize: 20, bold: true, fontFace: font });

        const mid = Math.ceil(q7to20.length / 2);
        const leftData = q7to20.slice(0, mid).map((q, i) => [
            { text: `${i + 7}. ${q.question}\n(답: ____________________)`, options: { fontSize: 14, fontFace: font, border: { pt: 0.5, color: "000000" } } }
        ]);
        const rightData = q7to20.slice(mid).map((q, i) => [
            { text: `${mid + i + 7}. ${q.question}\n(답: ____________________)`, options: { fontSize: 14, fontFace: font, border: { pt: 0.5, color: "000000" } } }
        ]);

        slide2.addTable(leftData, { x: 0.5, y: 1.2, w: 3.5, margin: 0.05, valign: 'top' });
        slide2.addTable(rightData, { x: 4.2, y: 1.2, w: 3.5, margin: 0.05, valign: 'top' });
    }

    await pres.writeFile({ fileName: `${topic}_빙고_학습지_세로.pptx` });
};

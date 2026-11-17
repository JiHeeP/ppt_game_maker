import pptxgen from "pptxgenjs";
import { getBingoPages, getAnswerKeyPages } from "./pdfTemplateHelper";
import { renderPagesToPdf } from "./pdfRender";

/**
 * 빙고 학습지 PDF (세로 A4, 16문항 이하는 한 장) + 선생님용 정답표 PDF
 */
export const generateBingoVerticalPDF = async (topic, questions) => {
    await renderPagesToPdf(getBingoPages(topic, questions), { orientation: 'p', fileName: `${topic}_빙고_학습지_세로.pdf` });
    await renderPagesToPdf(getAnswerKeyPages(topic, '빙고', questions.slice(0, 20)), { orientation: 'p', fileName: `${topic}_빙고_정답표.pdf` });
};

/**
 * 빙고 학습지 PPT (고쳐 쓸 수 있는 편집본, A4 세로)
 */
export const generateBingoVerticalPPT = async (topic, questions) => {
    const pres = new pptxgen();
    const font = "Malgun Gothic";
    pres.defineLayout({ name: 'A4_PORTRAIT', width: 8.27, height: 11.69 });
    pres.layout = 'A4_PORTRAIT';

    const qs = questions.slice(0, 20);
    const m = Math.max(2, Math.floor(Math.sqrt(qs.length)));
    const onePage = qs.length <= 16;

    const addHeader = (slide, title, withName) => {
        slide.addText(title, { x: 0.5, y: 0.35, w: 4.6, h: 0.6, fontSize: 22, bold: true, fontFace: font, valign: 'bottom' });
        if (withName) slide.addText("번호 ____  이름 __________", { x: 5.0, y: 0.35, w: 2.8, h: 0.6, fontSize: 13, bold: true, fontFace: font, align: 'right', valign: 'bottom' });
        slide.addShape('line', { x: 0.5, y: 1.0, w: 7.27, h: 0, line: { color: '111111', width: 2.5 } });
    };
    const addGrid = (slide, size, y) => {
        const cell = { text: "", options: { border: { pt: 2, color: "111111" } } };
        slide.addTable(Array.from({ length: m }, () => Array(m).fill(cell)), {
            x: (8.27 - size) / 2, y, w: size, colW: Array(m).fill(size / m), rowH: size / m
        });
    };
    const addList = (slide, items, y, h, fontSize) => {
        const half = Math.ceil(items.length / 2);
        const rowH = h / Math.max(1, half);
        [items.slice(0, half), items.slice(half)].forEach((col, ci) => {
            if (!col.length) return;
            const data = col.map((q, i) => [{
                text: `${ci * half + i + 1}. ${q.question}\n답: `,
                options: { fontSize, fontFace: font, valign: 'top', border: [{ pt: 0 }, { pt: 0 }, { pt: 1, color: 'BBBBBB' }, { pt: 0 }] }
            }]);
            slide.addTable(data, { x: ci === 0 ? 0.5 : 4.25, y, w: 3.52, rowH, margin: 0.06 });
        });
    };

    const s1 = pres.addSlide();
    addHeader(s1, `빙고 · ${topic}`, true);
    if (onePage) {
        addGrid(s1, 5.0, 1.25);
        s1.addText("문제", { x: 0.5, y: 6.35, w: 3, h: 0.4, fontSize: 16, bold: true, fontFace: font });
        addList(s1, qs, 6.8, 4.6, 11);
    } else {
        addGrid(s1, 7.0, 2.2);
        const s2 = pres.addSlide();
        addHeader(s2, `빙고 · ${topic} (문제)`, false);
        addList(s2, qs, 1.25, 10.0, 14);
    }

    await pres.writeFile({ fileName: `${topic}_빙고_학습지_세로.pptx` });
};

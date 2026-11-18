import pptxgen from "pptxgenjs";
import { getAdvancePages, getAnswerKeyPages, getAdvanceGroups } from "./pdfTemplateHelper";
import { renderPagesToPdf } from "./pdfRender";

/**
 * 고고 전진: 미션 학습지 PDF + 선생님용 정답표 PDF
 */
export const generateAdvancePDF = async (topic, questions) => {
    // 학습지는 가로 A4 한 장에 반쪽 2부 (가운데 잘라 2명이 사용)
    await renderPagesToPdf(getAdvancePages(topic, questions), { orientation: 'l', fileName: `${topic}_고고전진_학습지.pdf` });
    await renderPagesToPdf(getAnswerKeyPages(topic, '고고 전진', questions), { orientation: 'p', fileName: `${topic}_고고전진_정답표.pdf` });
};

/**
 * 고고 전진: 고쳐 쓸 수 있는 학습지 PPT
 * PDF와 같은 모양: 가로 A4 한 장에 같은 학습지 2부(왼쪽·오른쪽). 가운데 점선을 잘라 2명이 쓴다.
 * 고칠 때는 왼쪽·오른쪽을 똑같이 고쳐야 한다.
 */
export const generateAdvancePPT = async (topic, questions) => {
    const pres = new pptxgen();
    const font = "Malgun Gothic";
    const PAGE_W = 11.69, PAGE_H = 8.27, HALF_W = PAGE_W / 2, M = 0.35;
    pres.defineLayout({ name: 'A4_LANDSCAPE', width: PAGE_W, height: PAGE_H });
    pres.layout = 'A4_LANDSCAPE';

    const groups = getAdvanceGroups(questions);
    const innerW = HALF_W - M * 2;
    const COL_WIDTHS = [0.65, innerW - 0.65 - 1.75, 1.75];

    const drawHalf = (slide, ox, group, pageIdx) => {
        const x = ox + M;
        slide.addText(`고고 전진 · ${topic}`, { x, y: 0.25, w: innerW - (groups.length > 1 ? 0.8 : 0), h: 0.45, fontSize: 16, bold: true, fontFace: font, valign: 'bottom', margin: 0 });
        if (groups.length > 1) {
            slide.addText(`${pageIdx + 1} / ${groups.length}쪽`, { x: x + innerW - 0.8, y: 0.25, w: 0.8, h: 0.45, fontSize: 10, bold: true, color: '555555', fontFace: font, align: 'right', valign: 'bottom', margin: 0 });
        }
        if (pageIdx === 0) {
            slide.addText("번호 ____  이름 __________", { x, y: 0.72, w: innerW, h: 0.28, fontSize: 11, bold: true, fontFace: font, align: 'right', valign: 'middle', margin: 0 });
        }
        slide.addShape('line', { x, y: 1.05, w: innerW, h: 0, line: { color: '111111', width: 2 } });

        const rows = group.reduce((sum, g) => sum + Math.max(1, g.s.length), 0);
        const gap = 0.1;
        const top = 1.2;
        const rowH = Math.min(0.6, (PAGE_H - top - 0.4 - gap * (group.length - 1)) / rows);
        const fontSize = rowH >= 0.5 ? 13 : rowH >= 0.4 ? 12 : 11;
        let y = top;
        group.forEach(({ s, no }) => {
            const qs = s.length ? s : [{ question: '' }];
            const data = qs.map((q, qi) => {
                const row = [];
                if (qi === 0) row.push({ text: `${no}단계`, options: { rowspan: qs.length, fontSize: 13, bold: true, fontFace: font, align: 'center', valign: 'middle', fill: { color: 'F3F3F3' } } });
                row.push({ text: q.question, options: { fontSize, fontFace: font, valign: 'middle' } });
                row.push({ text: "", options: {} });
                return row;
            });
            slide.addTable(data, { x, y, w: innerW, colW: COL_WIDTHS, rowH, border: { pt: 1.25, color: "111111" }, margin: 0.06 });
            y += qs.length * rowH + gap;
        });
    };

    groups.forEach((group, pageIdx) => {
        const slide = pres.addSlide();
        drawHalf(slide, 0, group, pageIdx);
        drawHalf(slide, HALF_W, group, pageIdx);
        slide.addShape('line', { x: HALF_W, y: 0, w: 0, h: PAGE_H, line: { color: '9AA0A6', width: 1, dashType: 'dash' } });
    });

    await pres.writeFile({ fileName: `${topic}_고고전진_학습지.pptx` });
};

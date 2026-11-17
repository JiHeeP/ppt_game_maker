import pptxgen from "pptxgenjs";
import { getAdvancePages, getAnswerKeyPages, splitAdvanceStages } from "./pdfTemplateHelper";
import { renderPagesToPdf } from "./pdfRender";

/**
 * 고고 전진: 미션 학습지 PDF + 선생님용 정답표 PDF
 */
export const generateAdvancePDF = async (topic, questions) => {
    await renderPagesToPdf(getAdvancePages(topic, questions), { orientation: 'p', fileName: `${topic}_고고전진_학습지.pdf` });
    await renderPagesToPdf(getAnswerKeyPages(topic, '고고 전진', questions), { orientation: 'p', fileName: `${topic}_고고전진_정답표.pdf` });
};

/**
 * 고고 전진: 고쳐 쓸 수 있는 학습지 PPT (A4 세로, 한 장을 꽉 채움)
 */
export const generateAdvancePPT = async (topic, questions) => {
    const pres = new pptxgen();
    const font = "Malgun Gothic";
    pres.defineLayout({ name: 'A4_PORTRAIT', width: 8.27, height: 11.69 });
    pres.layout = 'A4_PORTRAIT';

    const stages = splitAdvanceStages(questions);
    const groups = questions.length <= 18
        ? [stages.map((s, i) => ({ s, no: i + 1 }))]
        : [stages.slice(0, 3).map((s, i) => ({ s, no: i + 1 })), stages.slice(3).map((s, i) => ({ s, no: i + 4 }))];
    const COL_WIDTHS = [1.0, 4.1, 2.17];

    groups.forEach((group, pageIdx) => {
        const slide = pres.addSlide();
        slide.addText(`고고 전진 · ${topic}`, { x: 0.5, y: 0.35, w: 4.6, h: 0.6, fontSize: 22, bold: true, fontFace: font, valign: 'bottom' });
        if (pageIdx === 0) {
            slide.addText("번호 ____  이름 __________", { x: 5.0, y: 0.35, w: 2.8, h: 0.6, fontSize: 13, bold: true, fontFace: font, align: 'right', valign: 'bottom' });
        }
        slide.addShape('line', { x: 0.5, y: 1.0, w: 7.27, h: 0, line: { color: '111111', width: 2.5 } });

        const rows = group.reduce((sum, g) => sum + Math.max(1, g.s.length), 0);
        const gap = 0.15;
        const rowH = Math.min(1.0, (11.69 - 1.25 - 0.6 - gap * (group.length - 1)) / rows);
        const fontSize = rowH >= 0.75 ? 17 : rowH >= 0.6 ? 15 : 13;
        let y = 1.25;
        group.forEach(({ s, no }) => {
            const qs = s.length ? s : [{ question: '' }];
            const data = qs.map((q, qi) => {
                const row = [];
                if (qi === 0) row.push({ text: `${no}단계`, options: { rowspan: qs.length, fontSize: 18, bold: true, fontFace: font, align: 'center', valign: 'middle', fill: { color: 'F3F3F3' } } });
                row.push({ text: q.question, options: { fontSize, fontFace: font, valign: 'middle' } });
                row.push({ text: "", options: {} });
                return row;
            });
            slide.addTable(data, { x: 0.5, y, w: 7.27, colW: COL_WIDTHS, rowH, border: { pt: 1.5, color: "111111" }, margin: 0.08 });
            y += qs.length * rowH + gap;
        });
    });

    await pres.writeFile({ fileName: `${topic}_고고전진_학습지.pptx` });
};

import { getLandGrabPages, getAnswerKeyPages } from "./pdfTemplateHelper";
import { renderPagesToPdf } from "./pdfRender";

/**
 * 땅따먹기: 가로 A4 보드 1장 + 선생님용 정답표
 */
export const generateLandGrabPDF = async (topic, questions) => {
    await renderPagesToPdf(getLandGrabPages(topic, questions), { orientation: 'l', fileName: `${topic}_땅따먹기.pdf` });
    await renderPagesToPdf(getAnswerKeyPages(topic, '땅따먹기', questions.slice(0, 48)), { orientation: 'p', fileName: `${topic}_땅따먹기_정답표.pdf` });
};

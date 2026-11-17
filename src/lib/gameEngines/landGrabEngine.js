import { getLandGrabPages, getAnswerKeyPages } from "./pdfTemplateHelper";
import { renderPagesToPdf } from "./pdfRender";

/**
 * 땅따먹기: 가로 A4 보드 1장 + 선생님용 정답표
 */
export const generateLandGrabPDF = async (topic, questions) => {
    // 보드 칸 위치를 섞는다 (비슷한 문제가 한쪽에 몰리지 않게). 정답표는 섞인 칸 번호를 따른다.
    const board = questions.slice(0, 48);
    for (let i = board.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [board[i], board[j]] = [board[j], board[i]];
    }
    questions = board;
    await renderPagesToPdf(getLandGrabPages(topic, questions), { orientation: 'l', fileName: `${topic}_땅따먹기.pdf` });
    await renderPagesToPdf(getAnswerKeyPages(topic, '땅따먹기', questions.slice(0, 48)), { orientation: 'p', fileName: `${topic}_땅따먹기_정답표.pdf` });
};

import { getTopTenMatchPages, getAnswerKeyPages } from './pdfTemplateHelper';
import { renderPagesToPdf } from './pdfRender';

/**
 * 탑텐짝찾기: 한 쪽에 8쌍(카드 16장, 위치 무작위) + 선생님용 정답표(별도 파일)
 */
export const generateTopTenMatchPDF = async (topic, pairs) => {
    if (!pairs || pairs.length === 0) {
        throw new Error("문제가 충분하지 않습니다. 최소 1개 이상의 문제가 필요합니다.");
    }
    await renderPagesToPdf(getTopTenMatchPages(topic, pairs), { orientation: 'p', fileName: `${topic}_탑텐짝찾기_학습지.pdf` });
    await renderPagesToPdf(getAnswerKeyPages(topic, '탑텐짝찾기', pairs), { orientation: 'p', fileName: `${topic}_탑텐짝찾기_정답표.pdf` });
};

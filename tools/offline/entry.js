// 사이트(App.jsx)가 쓰던 게임 엔진을 그대로 불러와, 브라우저 창 안에서 호출할 수 있게 열어 둔다.
// make-game.mjs 가 이 파일을 묶어(번들) 헤드리스 크롬에 넣고 window.__makeGame(...) 을 부른다.
import { generateLevelUpPPT } from '../../src/lib/gameEngines/levelUpEngine';
import { generateBaseballOxPPT } from '../../src/lib/gameEngines/baseballOxEngine';
import { generatePungiyoPPT, generatePungiyoPDF } from '../../src/lib/gameEngines/pungiyoEngine';
import { generateTopTenMatchPDF } from '../../src/lib/gameEngines/topTenMatchEngine';
import { generateStandardPPT } from '../../src/lib/gameEngines/standardEngine';
import { generateTelepathyPPT } from '../../src/lib/gameEngines/telepathyEngine';
import { generateGrabPPT } from '../../src/lib/gameEngines/grabEngine';
import { generateLandGrabPDF } from '../../src/lib/gameEngines/landGrabEngine';
import { generateBingoVerticalPDF, generateBingoVerticalPPT } from '../../src/lib/gameEngines/bingoEngine';
import { generateAdvancePDF, generateAdvancePPT } from '../../src/lib/gameEngines/advanceEngine';
import { buildIronmanGame } from '../../src/lib/gameEngines/ironmanEngine';

// App.jsx handleGenerate 의 분기와 같은 순서·같은 호출
window.__makeGame = async ({ gameId, gameName, topic, questions, grade, studentCount }) => {
    if (gameId === 9) {
        await generateBingoVerticalPDF(topic, questions);
        await generateBingoVerticalPPT(topic, questions);
    } else if (gameId === 11) {
        await generateAdvancePDF(topic, questions);
        await generateAdvancePPT(topic, questions);
    } else if (gameId === 1) await generateTelepathyPPT(topic, questions);
    else if (gameId === 4) await generateGrabPPT(topic, questions);
    else if (gameId === 10) await generateBaseballOxPPT(topic, questions);
    else if (gameId === 6) await generateLevelUpPPT(topic, questions);
    else if (gameId === 8) await generateLandGrabPDF(topic, questions);
    else if (gameId === 12) {
        await generatePungiyoPPT(topic, questions);
        await generatePungiyoPDF(topic, questions, grade);
    } else if (gameId === 13) await generateTopTenMatchPDF(topic, questions);
    else if (gameId === 14) {
        const game = buildIronmanGame(topic, questions, grade, studentCount);
        return { html: game.html, fileName: game.fileName };
    } else await generateStandardPPT(topic, questions, gameName);
    return null;
};

import { createBasePres, addTitleSlide, addConsolidatedRuleSlides, THEME, getSolidGlassStyle } from "./baseEngine";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { getPungiyoTemplate } from './pdfTemplateHelper';

/**
 * Pungiyo PPT Engine: Popcorn Quiz with random base scores.
 */
export const generatePungiyoPPT = async (topic, questions) => {
    let pres = createBasePres(`${topic} 뻥이요!`);

    // 슬라이드 1: 제목
    addTitleSlide(pres, "뻥이요!", topic);

    // 슬라이드 2: 규칙 통합
    const allRules = [
        "문제를 풀고 보너스 점수를 정한 뒤 최종 점수를 계산하는 놀이입니다.",
        "PPT 화면의 문제를 보고 공책에 풀고, 답을 원하는 칸에 적으세요.",
        "맞혔으면 무작위로 나오는 보너스 점수(뻥이요!)를 기본 점수에 합산합니다."
    ];

    addConsolidatedRuleSlides(pres, "놀이 방법", allRules);

    // 슬라이드: 준비?
    addPungiyoSlide(pres, "준비 되었나요?", ["지금 시작합니다!"], topic);

    // 문제 루프
    questions.forEach((q, idx) => {
        // 문제 슬라이드
        addPungiyoQuestionSlide(pres, idx + 1, q.question, topic);

        // 결과 슬라이드 (정답 + 기본 점수)
        let sSlide = pres.addSlide();
        sSlide.background = { color: THEME.bg };

        const baseScore = Math.floor(Math.random() * 11);

        sSlide.addText("교실 정답", { x: "10%", y: "15%", w: "80%", fontSize: 26, bold: true, color: THEME.guide, align: "center", fontFace: "Pretendard" });
        sSlide.addText(q.answer, {
            x: "10%", y: "22%", w: "80%", h: "28%",
            fontSize: 60, bold: true, color: THEME.text, align: "center", valign: "middle",
            fontFace: "Pretendard",
            ...getSolidGlassStyle(0),
            line: { color: THEME.accent, width: 3 }
        });

        sSlide.addText("기본 점수", { x: "10%", y: "55%", w: "80%", fontSize: 26, bold: true, color: THEME.guide, align: "center", fontFace: "Pretendard" });
        sSlide.addText(baseScore.toString(), {
            x: "40%", y: "65%", w: "20%", h: "18%",
            fontSize: 80, bold: true, color: "FFFFFF", align: "center", valign: "middle",
            fontFace: "Pretendard",
            fill: { color: THEME.accent },
            rect: { radius: 0.2 }
        });
    });

    // 최종 슬라이드
    let finishSlide = pres.addSlide();
    finishSlide.background = { color: THEME.bg };
    finishSlide.addText("게임 종료", {
        x: "10%", y: "40%", w: "80%", h: "20%",
        fontSize: 60, bold: true, color: THEME.text, align: "center",
        fontFace: "Pretendard",
        ...getSolidGlassStyle(5)
    });

    try {
        await pres.writeFile({ fileName: `${topic}_뻥이요_퀴즈.pptx` });
    } catch (err) {
        console.error('[PungiyoEngine] PPT Save failed:', err);
        throw err;
    }
};

export const generatePungiyoPDF = async (topic, questions, grade) => {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.innerHTML = getPungiyoTemplate(topic, questions, grade);
    document.body.appendChild(container);

    try {
        const canvas = await html2canvas(container, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${topic}_뻥이요_학습지.pdf`);
    } catch (error) {
        console.error('[PungiyoEngine] PDF Save failed:', error);
        throw error;
    } finally {
        document.body.removeChild(container);
    }
};

function addPungiyoSlide(pres, title, items, topic) {
    let slide = pres.addSlide();
    slide.background = { color: THEME.bg };

    items.forEach((line, i) => {
        slide.addText(line, {
            x: "10%", y: `${35 + i * 16}%`, w: "80%", h: "14%",
            fontSize: 32, color: THEME.text, align: "center", valign: "middle",
            fontFace: "Pretendard",
            ...getSolidGlassStyle(5)
        });
    });
}

function addPungiyoQuestionSlide(pres, num, question, topic) {
    let slide = pres.addSlide();
    slide.background = { color: THEME.bg };

    slide.addText(question, {
        x: "5%", y: "20%", w: "90%", h: "60%",
        fontSize: 50, bold: true, color: THEME.text, align: "center", valign: "middle",
        fontFace: "Pretendard",
        ...getSolidGlassStyle(5)
    });
}


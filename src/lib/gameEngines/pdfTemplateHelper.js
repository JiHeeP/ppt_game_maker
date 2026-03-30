/**
 * Helper to generate HTML templates for PDF worksheets.
 */

export const getBingoTemplate = (topic, questions) => {
    // Enforce max 20 questions
    const finalQuestions = questions.slice(0, 20);
    const numQuestions = finalQuestions.length;
    // Calculate m such that m*m <= numQuestions, common for Bingo (3x3 or 4x4)
    const m = Math.floor(Math.sqrt(numQuestions));
    const gridSize = m * m;

    return `
        <div style="padding: 25px; font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; color: #000; width: 1414px; background: white; height: 1000px; display: flex; box-sizing: border-box; gap: 30px; overflow: hidden;">
            
            <!-- Left Side: Bingo Board (1/3 width) -->
            <div style="flex: 1; display: flex; flex-direction: column; border-right: 3px solid #000; padding-right: 25px;">
                <div style="margin-bottom: 25px; padding-bottom: 10px; border-bottom: 2px solid #000; display: flex; justify-content: space-between; align-items: baseline;">
                    <h1 style="font-size: 24px; margin: 0; font-weight: 900;">🎲 주제: ${topic}</h1>
                    <span style="font-size: 18px; font-weight: bold; border-left: 1px solid #000; padding-left: 15px;">이름: ________</span>
                </div>

                <div style="flex-grow: 1; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                    <div style="display: grid; grid-template-columns: repeat(${m}, 1fr); width: 100%; border: 3px solid #000; background: #000; aspect-ratio: 1/1; box-shadow: 10px 10px 0px rgba(0,0,0,0.1);">
                        ${Array.from({ length: gridSize }).map(() => `
                            <div style="border: 1px solid #000; display: flex; align-items: center; justify-content: center; background: white;">
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <!-- Right Side: Questions Table (2/3 width) -->
            <div style="flex: 2; display: flex; flex-direction: column;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #000; padding-bottom: 8px; margin-bottom: 10px;">
                    <h3 style="font-size: 22px; margin: 0; font-weight: 900;">📝 퀴즈 질문 리스트</h3>
                    <span style="font-size: 12px; color: #666;">* 최대 20문항</span>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; border: 1.5px solid #000; height: 100%; overflow: hidden;">
                    ${finalQuestions.map((q, idx) => `
                        <div style="border: 0.5px solid #000; padding: 8px 12px; display: flex; flex-direction: column; justify-content: space-between; min-height: 80px;">
                            <div style="font-size: 14px; line-height: 1.4;">
                                <strong>${idx + 1}.</strong> ${q.question}
                            </div>
                            <div style="margin-top: auto; color: #444; font-size: 11px; border-top: 1px solid #eee; padding-top: 4px;">
                                답: ___________________________________
                            </div>
                        </div>
                    `).join('')}
                    <!-- Empty cells fill -->
                    ${Array.from({ length: (20 - finalQuestions.length) }).map(() => `
                        <div style="border: 0.5px solid #000; background: #fafafa;"></div>
                    `).join('')}
                </div>

                </div>
            </div>
        </div>
    `;
};

export const getBingoVerticalTemplate = (topic, questions) => {
    // Enforce max 20 questions
    const finalQuestions = questions.slice(0, 20);
    const q1to6 = finalQuestions.slice(0, 6);
    const q7to20 = finalQuestions.slice(6);

    const numQuestions = finalQuestions.length;
    const m = Math.floor(Math.sqrt(numQuestions));
    const gridSize = m * m;

    return `
        <div style="font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; color: #000; width: 1000px; background: white; display: flex; flex-direction: column; box-sizing: border-box;">
            
            <!-- PAGE 1: Header + Grid + Q1-6 -->
            <div data-bingo-page="1" style="padding: 50px; height: 1414px; display: flex; flex-direction: column; box-sizing: border-box; border-bottom: 2px dashed #ccc;">
                <!-- Header Section -->
                <div style="margin-bottom: 30px; padding-bottom: 20px; border-bottom: 4px solid #000; display: flex; justify-content: space-between; align-items: baseline;">
                    <h1 style="font-size: 38px; margin: 0; font-weight: 900;">🎲 주제: ${topic}</h1>
                    <span style="font-size: 26px; font-weight: bold; border-left: 3px solid #000; padding-left: 25px;">이름: ________</span>
                </div>

                <!-- Bingo Grid Section (Middle) -->
                <div style="display: flex; flex-direction: column; align-items: center; margin-bottom: 40px;">
                    <div style="display: grid; grid-template-columns: repeat(${m}, 1fr); width: 680px; border: 5px solid #000; background: #000; aspect-ratio: 1/1; box-shadow: 15px 15px 0px rgba(0,0,0,0.05);">
                        ${Array.from({ length: gridSize }).map(() => `
                            <div style="border: 1px solid #000; display: flex; align-items: center; justify-content: center; background: white;">
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Q1-6 (2 columns) -->
                <div style="flex-grow: 1; border-top: 3px solid #000; padding-top: 30px;">
                    <h3 style="font-size: 26px; border-bottom: 2px solid #000; padding-bottom: 10px; margin: 0 0 20px 0; font-weight: 900;">📝 퀴즈 질문 (1-6)</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; column-gap: 40px; row-gap: 20px;">
                        ${q1to6.map((q, idx) => `
                            <div style="border-bottom: 1.5px solid #eee; padding-bottom: 15px;">
                                <div style="font-size: 19px; line-height: 1.5;">
                                    <strong>${idx + 1}.</strong> ${q.question}
                                </div>
                                <div style="margin-top: 8px; color: #444; font-size: 14px;">
                                    답: ___________________________________
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <!-- PAGE 2: Q7-20 (Only if exists) -->
            ${q7to20.length > 0 ? `
            <div data-bingo-page="2" style="padding: 50px; height: 1414px; display: flex; flex-direction: column; box-sizing: border-box;">
                <h3 style="font-size: 26px; border-bottom: 3px solid #000; padding-bottom: 12px; margin: 0 0 25px 0; font-weight: 900;">📝 퀴즈 질문 (7번 이후)</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; column-gap: 40px; row-gap: 20px;">
                    ${q7to20.map((q, idx) => `
                        <div style="border-bottom: 1.5px solid #eee; padding-bottom: 15px;">
                            <div style="font-size: 19px; line-height: 1.5;">
                                <strong>${idx + 7}.</strong> ${q.question}
                            </div>
                            <div style="margin-top: 8px; color: #444; font-size: 14px;">
                                답: ___________________________________
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
        </div>
    `;
};

export const getAdvanceTemplate = (topic, questions) => {
    const n = questions.length;
    const perStep = Math.floor(n / 6);

    const stages = [];
    for (let i = 0; i < 5; i++) {
        stages.push(questions.slice(i * perStep, (i + 1) * perStep));
    }
    stages.push(questions.slice(5 * perStep));

    return `
        <div style="font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; color: #000; width: 1000px; background: white; display: flex; flex-direction: column; box-sizing: border-box;">
            
            <style>
                .page {
                    padding: 50px;
                    height: 1414px;
                    display: flex;
                    flex-direction: column;
                    box-sizing: border-box;
                    border-bottom: 2px dashed #000;
                }
                .header {
                    margin-bottom: 30px;
                    padding-bottom: 20px;
                    border-bottom: 5px solid #000;
                    display: flex;
                    justify-content: space-between;
                    align-items: baseline;
                }
                .stage-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 25px;
                    table-layout: fixed;
                }
                .stage-table th, .stage-table td {
                    border: 2px solid #000;
                    padding: 15px;
                    word-break: break-all;
                }
                .stage-label {
                    width: 2.4cm !important;
                    text-align: center;
                    font-weight: bold;
                    font-size: 28px;
                    background: #fff;
                }
                .question-cell {
                    text-align: left;
                    font-size: 19px;
                    line-height: 1.5;
                    background: #fff;
                }
                .answer-cell {
                    width: 4.5cm;
                    background: #fff;
                }
                .stage-num {
                    font-size: 50px;
                    display: block;
                    font-weight: 900;
                }
                .stage-text {
                    font-size: 24px;
                }
            </style>

            <!-- PAGE 1: Steps 1-3 -->
            <div class="page">
                <div class="header">
                    <h1 style="font-size: 40px; margin: 0; font-weight: 900;">🚀 ${topic} - 고고전진!</h1>
                    <span style="font-size: 26px; font-weight: bold; border-left: 4px solid #000; padding-left: 20px;">이름: ________</span>
                </div>

                <div style="flex-grow: 1;">
                    ${stages.slice(0, 3).map((stageQuestions, stageIdx) => `
                        <table class="stage-table">
                            ${(stageQuestions.length === 0 ? [{ question: "(문제가 없습니다)", isPlaceholder: true }] : stageQuestions).map((q, qIdx) => `
                                <tr>
                                    ${qIdx === 0 ? `
                                        <td rowspan="${Math.max(1, stageQuestions.length)}" class="stage-label">
                                            <span class="stage-num">${stageIdx + 1}</span>
                                            <span class="stage-text">단계</span>
                                            ${stageQuestions[0]?.theme ? `<div style="font-size: 14px; margin-top: 10px; color: #444; font-weight: normal; word-break: keep-all;">${stageQuestions[0].theme}</div>` : ''}
                                        </td>
                                    ` : ''}
                                    <td class="question-cell" style="${q.isPlaceholder ? 'color: #ccc;' : ''}">${q.question}</td>
                                    <td class="answer-cell"></td>
                                </tr>
                            `).join('')}
                        </table>
                    `).join('')}
                </div>
                <div style="text-align: center; color: #000; font-size: 14px; font-weight: bold;">1 / 2 페이지</div>
            </div>

            <!-- PAGE 2: Steps 4-6 -->
            <div class="page">
                <div class="header">
                    <h1 style="font-size: 40px; margin: 0; font-weight: 900;">🚀 ${topic} - 고고전진! (연결)</h1>
                </div>

                <div style="flex-grow: 1;">
                    ${stages.slice(3, 6).map((stageQuestions, stageIdx) => `
                        <table class="stage-table">
                            ${(stageQuestions.length === 0 ? [{ question: "(문제가 없습니다)", isPlaceholder: true }] : stageQuestions).map((q, qIdx) => `
                                <tr>
                                    ${qIdx === 0 ? `
                                        <td rowspan="${Math.max(1, stageQuestions.length)}" class="stage-label">
                                            <span class="stage-num">${stageIdx + 4}</span>
                                            <span class="stage-text">단계</span>
                                            ${stageQuestions[0]?.theme ? `<div style="font-size: 14px; margin-top: 10px; color: #444; font-weight: normal; word-break: keep-all;">${stageQuestions[0].theme}</div>` : ''}
                                        </td>
                                    ` : ''}
                                    <td class="question-cell" style="${q.isPlaceholder ? 'color: #ccc;' : ''}">${q.question}</td>
                                    <td class="answer-cell"></td>
                                </tr>
                            `).join('')}
                        </table>
                    `).join('')}
                </div>
                <div style="text-align: center; color: #000; font-size: 14px; font-weight: bold;">2 / 2 페이지</div>
            </div>
        </div>
    `;
};

export const getLandGrabTemplate = (topic, questions) => {
    // 6 rows * 8 columns = 48 cells
    const cells = Array.from({ length: 48 }).map((_, i) => questions[i] || { question: `(문제 ${i + 1})`, isPlaceholder: true });

    return `
        <div style="padding: 1.5cm; font-family: 'Malgun Gothic', sans-serif; color: #000; width: 1122px; height: 793px; background: white; box-sizing: border-box; display: flex; flex-direction: column;">
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 0.5cm; border-bottom: 3px solid #000; padding-bottom: 10px;">
                <h1 style="font-size: 28px; margin: 0; font-weight: 900;">🗺️ 땅따먹기 놀이: ${topic}</h1>
                <span style="font-size: 18px; font-weight: bold;">이름: ______________</span>
            </div>
            
            <div style="flex-grow: 1; display: grid; grid-template-columns: repeat(8, 1fr); grid-template-rows: repeat(6, 1fr); border: 2px solid #000; background: #000; gap: 1px;">
                ${cells.map((q, idx) => `
                    <div style="background: white; padding: 5px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; overflow: hidden; position: relative; height: 100%;">
                        <span style="position: absolute; top: 2px; left: 4px; font-size: 10px; color: #ccc;">${idx + 1}</span>
                        <div style="font-size: ${q.question.length > 20 ? '11px' : q.question.length > 10 ? '13px' : '15px'}; line-height: 1.2; word-break: keep-all; font-weight: bold;">
                            ${q.question}
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div style="margin-top: 0.5cm; font-size: 12px; color: #444; display: flex; justify-content: space-between;">
                <span>* 규칙: 가위바위보를 이긴 사람이 칸을 선택하고, 문제를 맞히면 자기 땅이 됩니다.</span>
                <span>Antigravity PPT Game Maker</span>
            </div>
        </div>
    `;
};
export const getPungiyoTemplate = (topic, _questions, grade) => {
    const isHighGrade = !grade.includes('1학년') && !grade.includes('2학년');

    // Generate scores based on grade
    const pungiyoScores = isHighGrade
        ? ['+1', '+2', '+3', '+5', '+10', 'x1', 'x3', 'x5', 'x7', 'x10']
        : ['+1', '+2', '+3', '+5', '+10', '+1', '+2', '+3', '+5', '+10'];

    // Shuffle scores
    for (let i = pungiyoScores.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pungiyoScores[i], pungiyoScores[j]] = [pungiyoScores[j], pungiyoScores[i]];
    }

    return `
        <div style="padding: 40px; font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; color: #000; width: 1000px; height: 1414px; background: white; box-sizing: border-box; display: flex; flex-direction: column;">
            <div style="margin-bottom: 20px; border: 4px solid #000; display: flex; align-items: stretch;">
                <div style="flex: 3; padding: 20px; text-align: center; font-size: 34px; font-weight: 900; border-right: 4px solid #000; display: flex; align-items: center; justify-content: center;">
                    ${topic} (뻥이요!)
                </div>
                <div style="flex: 1; padding: 20px; font-size: 24px; font-weight: bold; display: flex; align-items: center;">
                    이름:
                </div>
            </div>

            <div style="flex-grow: 1;">
                <table style="width: 100%; height: 90%; border-collapse: collapse; border: 4px solid #000;">
                    <thead>
                        <tr style="background: #f2f2f2;">
                            <th style="border: 2px solid #000; padding: 10px; font-size: 22px; width: 45%;">퀴즈 문제</th>
                            <th style="border: 2px solid #000; padding: 10px; font-size: 22px; width: 10%;">답</th>
                            <th style="border: 2px solid #000; padding: 10px; font-size: 22px; width: 10%;">점수</th>
                            <th style="border: 2px solid #000; padding: 10px; font-size: 22px; width: 15%; color: #d35400;">뻥이요</th>
                            <th style="border: 2px solid #000; padding: 10px; font-size: 22px; width: 20%;">최종 점수</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Array.from({ length: 10 }).map((_, i) => `
                            <tr style="height: 105px;">
                                <td style="border: 2px solid #000;"></td>
                                <td style="border: 2px solid #000;"></td>
                                <td style="border: 2px solid #000;"></td>
                                <td style="border: 2px solid #000; text-align: center; font-size: 28px; font-weight: 900; background: #fffcf0;">
                                    ${pungiyoScores[i]}
                                </td>
                                <td style="border: 2px solid #000;"></td>
                            </tr>
                        `).join('')}
                        <tr style="height: 90px;">
                            <td colspan="4" style="border: 2px solid #000; text-align: center; font-size: 30px; font-weight: 900; background: #f2f2f2;">누적 합계 점수</td>
                            <td style="border: 2px solid #000;"></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
};

export const getTopTenMatchTemplate = (topic, pairs) => {
    // pairs matches AI output: { question, answer }
    // Row 1 & Row 2 are pairs (4 columns)
    // Row 3 & Row 4 are pairs (4 columns)

    const pad = (arr) => {
        const padded = arr.slice(0, 4);
        while (padded.length < 4) padded.push('');
        return padded;
    };

    const grid = [
        pad(pairs.slice(0, 4).map(p => p.question)),
        pad(pairs.slice(0, 4).map(p => p.answer)),
        pad(pairs.slice(4, 8).map(p => p.question)),
        pad(pairs.slice(4, 8).map(p => p.answer))
    ];

    return `
        <div style="padding: 10px; font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; color: #000; width: 1000px; height: 1414px; background: white; box-sizing: border-box; display: flex; flex-direction: column;">
            <table style="width: 100%; height: 100%; border-collapse: collapse; border: 4px solid #000; table-layout: fixed;">
                <tbody>
                    ${grid.map(row => `
                        <tr style="height: 25%;">
                            ${row.map(cell => `
                                <td style="border: 2.5px solid #000; padding: 15px; text-align: center; vertical-align: middle; word-break: break-all; font-size: 24px; font-weight: 900; background: white; line-height: 1.3;">
                                    <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%;">
                                        ${cell || ''}
                                    </div>
                                </td>
                            `).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
};

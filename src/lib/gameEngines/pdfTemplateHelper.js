/**
 * PDF 학습지 HTML 템플릿.
 * 모든 함수는 "쪽 단위 HTML 배열"을 돌려준다. (renderPagesToPdf 로 A4 PDF 를 만든다)
 * - 세로 A4 = 1000 x 1414 px, 가로 A4 = 1414 x 1000 px
 * - A4 한 장을 꽉 채우도록 줄 높이·글자 크기를 문항 수에 맞춰 계산한다.
 */

const FONT_STACK = "'Malgun Gothic', 'Apple SD Gothic Neo', 'Noto Sans KR', 'WenQuanYi Zen Hei', sans-serif";

const esc = (s = "") => String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

const chunk = (arr, size) => {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
};

const fitPx = (text, sizes) => {
    const len = String(text).replace(/\s+/g, "").length;
    if (len <= 6) return sizes[0];
    if (len <= 12) return sizes[1];
    if (len <= 20) return sizes[2];
    if (len <= 30) return sizes[3];
    return sizes[4];
};

const portrait = (inner, { padding = '56px 60px' } = {}) => `
    <div style="width:1000px;height:1414px;padding:${padding};box-sizing:border-box;background:#fff;color:#111;font-family:${FONT_STACK};display:flex;flex-direction:column;">
        ${inner}
    </div>`;

const landscape = (inner, { padding = '44px 50px' } = {}) => `
    <div style="width:1414px;height:1000px;padding:${padding};box-sizing:border-box;background:#fff;color:#111;font-family:${FONT_STACK};display:flex;flex-direction:column;">
        ${inner}
    </div>`;

const header = (title, { name = true, sub = '' } = {}) => `
    <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:4px solid #111;padding-bottom:12px;margin-bottom:22px;flex-shrink:0;">
        <div>
            ${sub ? `<div style="font-size:18px;font-weight:700;color:#555;margin-bottom:4px;">${esc(sub)}</div>` : ''}
            <div style="font-size:34px;font-weight:900;line-height:1.2;">${esc(title)}</div>
        </div>
        ${name ? `<div style="font-size:22px;font-weight:700;white-space:nowrap;">번호 ______ &nbsp; 이름 ____________</div>` : ''}
    </div>`;

const footer = (text) => `
    <div style="flex-shrink:0;margin-top:14px;font-size:15px;color:#555;text-align:center;">${esc(text)}</div>`;

/* 반쪽(세로 A5) 학습지용 작은 머리글: 제목 한 줄 + 번호·이름 칸 한 줄 */
const halfHeader = (title, { name = true, sub = '' } = {}) => `
    <div style="border-bottom:3px solid #111;padding-bottom:8px;margin-bottom:14px;flex-shrink:0;height:74px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:flex-end;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;">
            <div style="font-size:26px;font-weight:900;line-height:1.2;word-break:keep-all;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">${esc(title)}</div>
            ${sub ? `<div style="font-size:15px;font-weight:700;color:#555;white-space:nowrap;">${esc(sub)}</div>` : ''}
        </div>
        ${name ? `<div style="font-size:17px;font-weight:700;text-align:right;margin-top:6px;white-space:nowrap;">번호 ______ &nbsp; 이름 ____________</div>` : ''}
    </div>`;

/**
 * 모아찍기: 가로 A4(1414 x 1000) 한 장에 같은 반쪽 학습지(세로 A5, 707 x 1000)를 두 번 찍는다.
 * 가운데 점선을 따라 자르면 학생 2명이 한 부씩 쓴다. half 는 반쪽 안에 들어갈 HTML.
 */
export const twoUpLandscape = (half) => {
    const pane = `<div style="width:707px;height:1000px;padding:28px 34px;box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden;">${half}</div>`;
    return `
    <div style="width:1414px;height:1000px;background:#fff;color:#111;font-family:${FONT_STACK};display:flex;position:relative;">
        ${pane}${pane}
        <div style="position:absolute;left:706px;top:0;height:1000px;border-left:2px dashed #9aa0a6;"></div>
        <div style="position:absolute;left:707px;top:6px;transform:translateX(-50%);background:#fff;padding:2px 0;font-size:13px;color:#9aa0a6;writing-mode:vertical-rl;letter-spacing:2px;">자르는 선</div>
    </div>`;
};

/* ------------------------------------------------------------------ */
/* 땅따먹기: 가로 A4 한 장, 8 x 6 = 48칸                                 */
/* ------------------------------------------------------------------ */
export const getLandGrabPages = (topic, questions) => {
    const cells = Array.from({ length: 48 }).map((_, i) => questions[i] || { question: '' });
    const board = landscape(`
        ${header(`땅따먹기 · ${topic}`)}
        <div style="flex:1;display:grid;grid-template-columns:repeat(8,1fr);grid-template-rows:repeat(6,1fr);border:3px solid #111;background:#111;gap:2px;">
            ${cells.map((q, idx) => `
                <div style="background:#fff;position:relative;display:flex;align-items:center;justify-content:center;text-align:center;padding:22px 8px 8px;overflow:hidden;">
                    <span style="position:absolute;top:5px;left:8px;font-size:15px;font-weight:700;color:#9aa0a6;">${idx + 1}</span>
                    <div style="font-size:${fitPx(q.question, [24, 21, 19, 17, 15])}px;font-weight:700;line-height:1.3;word-break:keep-all;">${esc(q.question)}</div>
                </div>`).join('')}
        </div>
        ${footer('규칙: 가위바위보를 이긴 사람이 칸을 고르고, 문제를 맞히면 그 칸이 자기 땅이 됩니다.')}
    `);
    return [board];
};

/* ------------------------------------------------------------------ */
/* 빙고: 세로 A4. 16문항 이하는 한 장(빙고판 + 문제), 그보다 많으면 두 장   */
/* ------------------------------------------------------------------ */
export const getBingoPages = (topic, questions) => {
    const qs = questions.slice(0, 20);
    const m = Math.max(2, Math.floor(Math.sqrt(qs.length)));
    const grid = (size) => `
        <div style="display:flex;justify-content:center;flex-shrink:0;">
            <div style="display:grid;grid-template-columns:repeat(${m},1fr);grid-template-rows:repeat(${m},1fr);width:${size}px;height:${size}px;border:4px solid #111;background:#111;gap:2px;">
                ${Array.from({ length: m * m }).map(() => `<div style="background:#fff;"></div>`).join('')}
            </div>
        </div>`;
    const list = (items, startNo, fontSize, height) => {
        const rows = Math.max(1, Math.ceil(items.length / 2));
        return `
        <div style="height:${height}px;flex-shrink:0;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:repeat(${rows},1fr);column-gap:28px;overflow:hidden;">
            ${items.map((q, i) => `
                <div style="border-bottom:1.5px solid #bdbdbd;display:flex;flex-direction:column;justify-content:space-between;padding:6px 2px;overflow:hidden;">
                    <div style="font-size:${fontSize}px;line-height:1.35;word-break:keep-all;"><b>${startNo + i}.</b> ${esc(q.question)}</div>
                    <div style="font-size:${fontSize - 2}px;color:#777;">답:</div>
                </div>`).join('')}
        </div>`;
    };

    if (qs.length <= 16) {
        return [portrait(`
            ${header(`빙고 · ${topic}`)}
            ${grid(500)}
            <div style="font-size:24px;font-weight:900;margin:18px 0 6px;flex-shrink:0;">문제</div>
            ${list(qs, 1, 18, 1414 - 112 - 92 - 500 - 60)}
        `)];
    }
    return [
        portrait(`${header(`빙고 · ${topic}`)}<div style="flex:1;display:flex;align-items:center;justify-content:center;">${grid(840)}</div>`),
        portrait(`${header(`빙고 · ${topic} (문제)`, { name: false })}${list(qs, 1, 21, 1414 - 112 - 92)}`)
    ];
};

/* ------------------------------------------------------------------ */
/* 고고 전진: 6단계. 가로 A4 한 장에 같은 학습지 2부(가운데 잘라 2명이 사용) */
/* 12문항 이하는 한 장, 많으면 두 장(1~3 / 4~6단계)                       */
/* ------------------------------------------------------------------ */
export const splitAdvanceStages = (questions) => {
    const n = questions.length;
    const perStep = Math.floor(n / 6);
    const stages = [];
    for (let i = 0; i < 5; i++) stages.push(questions.slice(i * perStep, (i + 1) * perStep));
    stages.push(questions.slice(5 * perStep));
    return stages;
};

// 반쪽에 다 들어가는지: 12문항 이하는 한 장, 많으면 두 장(1~3 / 4~6단계). PDF·편집용 PPT 공통
export const getAdvanceGroups = (questions) => {
    const stages = splitAdvanceStages(questions);
    return questions.length <= 12
        ? [stages.map((s, i) => ({ s, no: i + 1 }))]
        : [stages.slice(0, 3).map((s, i) => ({ s, no: i + 1 })), stages.slice(3).map((s, i) => ({ s, no: i + 4 }))];
};

export const getAdvancePages = (topic, questions) => {
    const groups = getAdvanceGroups(questions);

    return groups.map((group, pageIdx) => {
        const rows = group.reduce((sum, g) => sum + Math.max(1, g.s.length), 0);
        const gap = 12;
        // 반쪽(세로 A5) 높이 1000px 안에: 여백 56 + 머리글 88 + 안내문 36
        const available = 1000 - 56 - 88 - 36 - (group.length - 1) * gap;
        const rowH = Math.min(80, Math.floor(available / rows));
        const fontSize = rowH >= 60 ? 18 : rowH >= 48 ? 16 : 14;
        const half = `
            ${halfHeader(`고고 전진 · ${topic}`, { name: pageIdx === 0, sub: groups.length > 1 ? `${pageIdx + 1} / ${groups.length}쪽` : '' })}
            <div style="flex:1;display:flex;flex-direction:column;gap:${gap}px;">
                ${group.map(({ s, no }) => `
                    <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
                        ${(s.length ? s : [{ question: '' }]).map((q, qi) => `
                            <tr style="height:${rowH}px;">
                                ${qi === 0 ? `<td rowspan="${Math.max(1, s.length)}" style="width:76px;border:2.5px solid #111;background:#f3f3f3;text-align:center;">
                                    <div style="font-size:34px;font-weight:900;line-height:1;">${no}</div>
                                    <div style="font-size:16px;font-weight:700;margin-top:3px;">단계</div>
                                </td>` : ''}
                                <td style="border:2px solid #111;padding:4px 10px;font-size:${fontSize}px;line-height:1.35;word-break:keep-all;">${esc(q.question)}</td>
                                <td style="width:34%;border:2px solid #111;"></td>
                            </tr>`).join('')}
                    </table>`).join('')}
            </div>
            <div style="flex-shrink:0;margin-top:10px;font-size:13px;color:#555;text-align:center;">주사위를 굴려 단계를 나아가고, 멈춘 단계의 문제를 풀어 오른쪽 칸에 답을 적으세요.</div>`;
        return twoUpLandscape(half);
    });
};

/* ------------------------------------------------------------------ */
/* 뻥이요!: 가로 A4 한 장에 같은 학습지 2부(왼쪽·오른쪽). 가운데를 잘라 2명이 쓴다 */
/* 줄 수 = 문항 수 (반쪽 최대 15줄). 보너스는 줄마다 미리 인쇄              */
/* (학생이 자신 있는 답을 높은 보너스 줄에 적는 전략 놀이라서 보너스를 보이게 둔다) */
/* ------------------------------------------------------------------ */
export const getPungiyoScores = (count, grade = '') => {
    const isLowGrade = /1-2|1학년|2학년/.test(grade);
    const pool = isLowGrade
        ? ['+1', '+2', '+3', '+5', '+10']
        : ['+1', '+2', '+3', '+5', '+10', 'x1', 'x3', 'x5', 'x7', 'x10'];
    const list = Array.from({ length: count }, (_, i) => pool[i % pool.length]);
    return shuffle(list);
};

export const getPungiyoPages = (topic, questions, grade, scores = getPungiyoScores(questions.length, grade)) => {
    const n = Math.max(1, questions.length);
    // 반쪽 한 면에 최대 15줄. 넘치면 쪽마다 줄 수를 고르게 나눈다 (예: 20문항 → 10 + 10)
    const pageCount = Math.ceil(n / 15);
    const pages = chunk(Array.from({ length: n }, (_, i) => i), Math.ceil(n / pageCount));
    const th = (label, w, color = '#111') => `<th style="border:2px solid #111;padding:8px 2px;font-size:18px;width:${w};color:${color};white-space:nowrap;">${label}</th>`;
    return pages.map((rows, pageIdx) => {
        const isLast = pageIdx === pages.length - 1;
        // 반쪽(세로 A5) 높이 1000px 안에: 여백 56 + 머리글 96 + 표 제목줄 44 + 합계줄
        const totalH = isLast ? 64 : 0;
        const available = 1000 - 56 - 96 - 44 - totalH - 8;
        const rowH = Math.min(80, Math.floor(available / rows.length));
        const half = `
            ${halfHeader(`뻥이요! · ${topic}`, { name: pageIdx === 0, sub: pages.length > 1 ? `${pageIdx + 1} / ${pages.length}쪽` : '' })}
            <table style="width:100%;border-collapse:collapse;border:3px solid #111;table-layout:fixed;">
                <thead><tr style="background:#f2f2f2;">
                    ${th('문제', '29%')}${th('답', '27%')}${th('점수', '13%')}${th('뻥이요', '14%', '#d35400')}${th('최종 점수', '17%')}
                </tr></thead>
                <tbody>
                    ${rows.map(i => `
                        <tr style="height:${rowH}px;">
                            <td style="border:2px solid #111;"></td>
                            <td style="border:2px solid #111;"></td>
                            <td style="border:2px solid #111;"></td>
                            <td style="border:2px solid #111;text-align:center;font-size:26px;font-weight:900;background:#fff6e5;">${scores[i] || ''}</td>
                            <td style="border:2px solid #111;"></td>
                        </tr>`).join('')}
                    ${isLast ? `<tr style="height:${totalH}px;">
                        <td colspan="4" style="border:2px solid #111;text-align:center;font-size:24px;font-weight:900;background:#f2f2f2;">누적 합계 점수</td>
                        <td style="border:2px solid #111;"></td>
                    </tr>` : ''}
                </tbody>
            </table>`;
        return twoUpLandscape(half);
    });
};

/* ------------------------------------------------------------------ */
/* 탑텐짝찾기: 한 쪽 = 8쌍 = 카드 16장(4 x 4). 카드 위치는 무작위로 섞는다 */
/* (예전에는 문제 바로 아래에 답이 있어 위치만 보고도 짝을 알 수 있었음)   */
/* ------------------------------------------------------------------ */
export const getTopTenMatchPages = (topic, pairs) => chunk(pairs, 8).map((pagePairs) => {
    const cards = shuffle([
        ...pagePairs.map(p => ({ text: p.question, kind: 'q' })),
        ...pagePairs.map(p => ({ text: p.answer, kind: 'a' }))
    ]);
    while (cards.length < 16) cards.push({ text: '', kind: '' });
    return portrait(`
        <div style="flex:1;display:grid;grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(4,1fr);border:3px solid #111;">
            ${cards.map(c => `
                <div style="border:1.5px dashed #555;position:relative;display:flex;align-items:center;justify-content:center;text-align:center;padding:30px 14px 14px;">
                    ${c.kind ? `<span style="position:absolute;top:8px;left:10px;font-size:14px;font-weight:700;color:${c.kind === 'q' ? '#2f5ddb' : '#d35400'};">${c.kind === 'q' ? '문제' : '답'}</span>` : ''}
                    <div style="font-size:${fitPx(c.text, [36, 30, 25, 22, 19])}px;font-weight:900;line-height:1.3;word-break:keep-all;">${esc(c.text)}</div>
                </div>`).join('')}
        </div>
        <div style="flex-shrink:0;margin-top:8px;font-size:13px;color:#777;text-align:right;">${esc(topic)} · 탑텐짝찾기 · 점선을 따라 오려 쓰세요</div>
    `, { padding: '28px 28px 18px' });
});

/* ------------------------------------------------------------------ */
/* 선생님용 정답표 (땅따먹기·빙고·고고 전진·탑텐짝찾기 공통)              */
/* ------------------------------------------------------------------ */
export const getAnswerKeyPages = (topic, gameName, questions) => chunk(questions.map((q, i) => ({ ...q, no: i + 1 })), 48).map((items, pageIdx, all) => {
    const twoCols = items.length > 20;
    const cols = twoCols ? chunk(items, Math.ceil(items.length / 2)) : [items];
    const fontSize = twoCols ? (items.length > 36 ? 14 : 16) : 19;
    const table = (rows) => `
        <table style="width:100%;border-collapse:collapse;table-layout:fixed;font-size:${fontSize}px;">
            <thead><tr style="background:#f2f2f2;">
                <th style="border:1.5px solid #111;width:44px;padding:6px 0;">번호</th>
                <th style="border:1.5px solid #111;padding:6px;">문제</th>
                <th style="border:1.5px solid #111;width:${twoCols ? '34%' : '30%'};padding:6px;">정답</th>
            </tr></thead>
            <tbody>
                ${rows.map(r => `<tr>
                    <td style="border:1.5px solid #111;text-align:center;padding:5px 0;">${r.no}</td>
                    <td style="border:1.5px solid #111;padding:5px 8px;line-height:1.35;word-break:keep-all;">${esc(r.question)}</td>
                    <td style="border:1.5px solid #111;padding:5px 8px;font-weight:900;color:#c2410c;word-break:keep-all;">${esc(r.answer)}</td>
                </tr>`).join('')}
            </tbody>
        </table>`;
    return portrait(`
        ${header(`정답표 · ${topic}`, { name: false, sub: `${gameName} · 선생님용${all.length > 1 ? ` (${pageIdx + 1}/${all.length})` : ''}` })}
        <div style="display:flex;gap:20px;align-items:flex-start;">
            ${cols.map(c => `<div style="flex:1;">${table(c)}</div>`).join('')}
        </div>
    `);
});

#!/usr/bin/env node
// 사이트 없이 게임 파일(.pptx / .pdf / .html)을 만드는 명령줄 도구.
//
// 사용법:
//   node tools/offline/make-game.mjs <문제파일.json> [--out 저장폴더]
//
// 문제파일 형식은 tools/offline/README.md 와 examples/ 폴더를 보세요.
// 동작: 사이트의 게임 엔진(src/lib/gameEngines)을 그대로 묶어서 헤드리스 크롬에서 실행하고,
//       크롬이 내려받는 파일을 저장폴더에 모읍니다. 그래서 결과물이 사이트와 같습니다.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));

// App.jsx 의 GAMES 목록과 같은 번호
const GAMES = {
    '텔레파시': 1,
    '뻥이요!': 12,
    '야구골든벨 OX': 10,
    '집어!': 4,
    '레벨업 골든벨': 6,
    '땅따먹기': 8,
    '빙고': 9,
    '고고 전진': 11,
    '탑텐짝찾기': 13,
    '아이언맨': 14,
};
// 띄어쓰기·느낌표 없이 써도 찾도록
const normalizeName = (s) => String(s || '').replace(/[\s!]/g, '');
const findGame = (name) => Object.keys(GAMES).find(g => normalizeName(g) === normalizeName(name));

const fail = (msg) => { console.error(`\n[오류] ${msg}\n`); process.exit(1); };

// ---------- 1. 입력 읽기 ----------
const args = process.argv.slice(2);
const inputPath = args.find(a => !a.startsWith('--'));
const outIdx = args.indexOf('--out');
const outDir = path.resolve(outIdx >= 0 ? args[outIdx + 1] : 'output');
if (!inputPath) fail('문제 파일(.json)을 지정해 주세요. 예) node tools/offline/make-game.mjs tools/offline/examples/집어.json');

let spec;
try {
    spec = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
} catch (e) {
    fail(`문제 파일을 읽지 못했습니다: ${e.message}`);
}

const gameName = findGame(spec.game);
if (!gameName) fail(`게임 이름 "${spec.game}" 을(를) 모릅니다. 가능한 이름: ${Object.keys(GAMES).join(', ')}`);
const gameId = GAMES[gameName];
const topic = String(spec.topic || '').trim();
if (!topic) fail('"topic"(학습 주제)이 비어 있습니다.');
const grade = spec.grade || '';
const studentCount = Number(spec.studentCount || 24);
const questions = (spec.questions || []).map((q, i) => {
    if (!q || !q.question || !q.answer) fail(`${i + 1}번 문항에 question 또는 answer 가 없습니다.`);
    return { question: String(q.question), answer: String(q.answer), wrongAnswer: String(q.wrongAnswer || '오답 없음') };
});
const n = questions.length;

// ---------- 2. 게임별 문제 수 규칙 (App.jsx 와 동일) ----------
if (n === 0) fail('문항이 하나도 없습니다.');
if (gameId === 1 && n % 2 !== 0) fail(`텔레파시는 한 라운드에 2문제라 문항 수가 짝수여야 합니다. (현재 ${n}개)`);
if (gameId === 11 && n < 12) fail(`고고 전진은 최소 12문제가 필요합니다. (현재 ${n}개)`);
if (gameId === 8 && n !== 48) fail(`땅따먹기는 반드시 48문제가 필요합니다. (현재 ${n}개)`);
if (gameId === 14 && n % 8 !== 0) fail(`아이언맨은 한 판이 8칸이라 8의 배수여야 합니다. (현재 ${n}개, 권장 40개)`);
if (gameId === 13 && n !== studentCount * 2) fail(`탑텐짝찾기는 학생 수(${studentCount}명) × 2 = ${studentCount * 2}문제가 필요합니다. (현재 ${n}개)`);

// ---------- 3. 엔진 묶기 ----------
const bundle = await build({
    entryPoints: [path.join(HERE, 'entry.js')],
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'browser',
    target: 'chrome120',
    logLevel: 'silent',
    define: { 'import.meta.env.DEV': 'false' },
});
const bundleCode = bundle.outputFiles[0].text;

// ---------- 4. 헤드리스 크롬에서 실행 ----------
let chromium;
try {
    ({ chromium } = require('playwright'));
} catch {
    fail('playwright 를 찾지 못했습니다. 이 도구는 Claude 클라우드 환경용입니다. 내 컴퓨터에서 쓰려면 먼저: npx playwright install chromium');
}

fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const saved = [];
try {
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage();
    // 엔진은 브라우저에서 <a download="파일명"> 을 눌러 파일을 내려받는다.
    // 그 순간을 가로채 파일명과 내용을 그대로 Node 로 넘겨 저장한다.
    const pending = [];
    await page.exposeFunction('__saveFile', (name, base64) => {
        const target = path.join(outDir, name);
        fs.writeFileSync(target, Buffer.from(base64, 'base64'));
        saved.push(target);
    });
    await page.addInitScript(() => {
        const grab = (a) => {
            if (!a || !a.download || !a.href) return false;
            const job = fetch(a.href).then(r => r.blob()).then(b => new Promise((res) => {
                const fr = new FileReader();
                fr.onload = () => res(window.__saveFile(a.download, String(fr.result).split(',')[1]));
                fr.readAsDataURL(b);
            }));
            (window.__saveJobs = window.__saveJobs || []).push(job);
            return true;
        };
        const origClick = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = function () { if (!grab(this)) origClick.call(this); };
        const origDispatch = HTMLAnchorElement.prototype.dispatchEvent;
        HTMLAnchorElement.prototype.dispatchEvent = function (ev) {
            if (ev && ev.type === 'click' && grab(this)) return true;
            return origDispatch.call(this, ev);
        };
    });
    page.on('dialog', async (d) => { console.warn(`[엔진 알림] ${d.message()}`); await d.dismiss(); });
    page.on('pageerror', (e) => console.error(`[엔진 오류] ${e.message}`));

    // 빈 페이지(about:blank)에서는 다운로드 파일 이름이 사라지므로 가짜 주소로 띄운다
    await page.route('http://offline.game/**', (route) => route.fulfill({
        contentType: 'text/html; charset=utf-8',
        body: '<!doctype html><html lang="ko"><head><meta charset="utf-8"></head><body></body></html>',
    }));
    await page.goto('http://offline.game/');
    await page.addScriptTag({ content: bundleCode });

    const result = await page.evaluate(
        (payload) => window.__makeGame(payload),
        { gameId, gameName, topic, questions, grade, studentCount }
    );

    if (result && result.html) {
        const target = path.join(outDir, result.fileName);
        fs.writeFileSync(target, result.html, 'utf8');
        saved.push(target);
    }

    // 저장 작업이 모두 끝날 때까지 기다린다
    await page.waitForTimeout(500);
    await page.evaluate(() => Promise.all(window.__saveJobs || []));
    await Promise.all(pending);
} finally {
    await browser.close();
}

if (saved.length === 0) fail('만들어진 파일이 없습니다. 위의 [엔진 오류] 메시지를 확인해 주세요.');
console.log(`\n✅ ${gameName} · "${topic}" · ${n}문항 → 파일 ${saved.length}개`);
saved.forEach(f => console.log(`   ${f}`));

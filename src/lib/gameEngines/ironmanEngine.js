/**
 * Ironman Engine: "살아남는 자가 강한 자다" 생존 게임.
 *
 * 원본 PPT 구조를 그대로 옮기되, 칸을 클릭해 운명을 여는 연출은
 * PPT 애니메이션 대신 단일 HTML 파일로 만든다.
 *
 *  - 판 1개 = 8칸 (2열 x 4행), 기본 5판 = 40문항
 *  - 칸을 클릭하면 문제 카드가 벗겨지며 아래 숨겨진 운명이 드러난다
 *  - 운명 4종: 생존 / 사망 / 살리기 / 죽이기
 *  - 문제의 정답 여부와 생사는 무관하다 (문제는 칸을 여는 관문)
 */

export const IRONMAN_CELLS_PER_BOARD = 8;
export const IRONMAN_DEFAULT_QUESTION_COUNT = 40;

// 한 판(8칸)에 숨겨지는 운명 구성. 원본 PPT의 분포를 따른다.
const FATE_DECK = ['alive', 'alive', 'alive', 'alive', 'dead', 'dead', 'revive', 'kill'];

const FATE_LABELS = {
    alive: { title: 'STAY ALIVE', sub: '그대로 서 있기' },
    dead: { title: 'ELIMINATED', sub: '앉기' },
    revive: { title: 'REVIVE', sub: '죽은 사람 1명 살리기' },
    kill: { title: 'TAKE DOWN', sub: '살아있는 사람 1명 죽이기' }
};

const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// <script> 안에 안전하게 넣기 위한 JSON 직렬화
const toEmbeddedJson = (value) => JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

/**
 * 문항을 8칸씩 나누고, 판마다 운명을 섞어 배정한다.
 * 운명은 생성 시점에 확정되므로 같은 파일을 다시 열어도 결과가 같다.
 */
export const buildIronmanBoards = (questions) => {
    const usable = (questions || []).filter((q) => q && q.question);
    const boardCount = Math.floor(usable.length / IRONMAN_CELLS_PER_BOARD);
    const boards = [];

    for (let b = 0; b < boardCount; b++) {
        const fates = shuffle(FATE_DECK);
        const cells = [];
        for (let c = 0; c < IRONMAN_CELLS_PER_BOARD; c++) {
            const q = usable[b * IRONMAN_CELLS_PER_BOARD + c];
            cells.push({
                question: q.question,
                answer: q.answer || '',
                fate: fates[c]
            });
        }
        boards.push(cells);
    }

    return boards;
};

export const generateIronmanHTML = async (topic, questions, grade = '', studentCount = 24) => {
    const boards = buildIronmanBoards(questions);

    if (boards.length === 0) {
        throw new Error(`아이언맨 게임은 최소 ${IRONMAN_CELLS_PER_BOARD}개의 문제가 필요합니다.`);
    }

    const html = renderIronmanDocument({ topic, grade, studentCount, boards });

    try {
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${topic}_아이언맨_게임.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        // 다운로드가 시작될 시간을 준 뒤 해제
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
        console.error('[IronmanEngine] HTML Save failed:', err);
        throw err;
    }
};

function renderIronmanDocument({ topic, grade, studentCount, boards }) {
    const safeTopic = escapeHtml(topic);
    const safeGrade = escapeHtml(grade);
    const data = toEmbeddedJson({
        topic,
        grade,
        studentCount: Number(studentCount) > 0 ? Number(studentCount) : 24,
        boards,
        labels: FATE_LABELS
    });

    return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${safeTopic} · 살아남는 자가 강한 자다</title>
<style>
${STYLES}
</style>
</head>
<body>
<div id="app">
  <!-- 표지 -->
  <section class="screen screen--cover is-active" data-screen="cover">
    <div class="reactor" aria-hidden="true"><span></span></div>
    <h1 class="cover__title">살아남는 자가<br>강한 자다</h1>
    <p class="cover__topic">${safeTopic}</p>
    ${safeGrade ? `<p class="cover__meta">${safeGrade}</p>` : ''}
    <button class="btn btn--primary" data-go="rules">놀이 방법 보기</button>
    <p class="cover__hint">전체 <span id="coverBoards"></span>판 · 판마다 8칸</p>
  </section>

  <!-- 놀이 방법 -->
  <section class="screen screen--rules" data-screen="rules">
    <h2 class="rules__title">원하는 칸을 골라 문제를 푸세요</h2>
    <div class="rules__grid">
      <div class="fate fate--alive"><span class="fate__title">STAY ALIVE</span><span class="fate__sub">그대로 서 있기</span></div>
      <div class="fate fate--dead"><span class="fate__title">ELIMINATED</span><span class="fate__sub">앉기</span></div>
      <div class="fate fate--revive"><span class="fate__title">REVIVE</span><span class="fate__sub">죽은 사람 1명 살리기</span></div>
      <div class="fate fate--kill"><span class="fate__title">TAKE DOWN</span><span class="fate__sub">살아있는 사람 1명 죽이기</span></div>
    </div>
    <ol class="rules__steps">
      <li>모두 자리에서 일어섭니다.</li>
      <li>한 명씩 원하는 칸을 골라 그 칸의 문제를 풉니다.</li>
      <li>선생님이 그 칸을 누르면 숨어 있던 운명이 나타납니다.</li>
      <li>끝까지 살아남은 친구가 승리합니다.</li>
    </ol>
    <button class="btn btn--primary" data-go="board">게임 시작</button>
  </section>

  <!-- 게임판 -->
  <section class="screen screen--board" data-screen="board">
    <div class="board" id="board"></div>
    <div class="hud">
      <span class="hud__topic">${safeTopic}</span>
      <span class="hud__chip">판 <b id="hudBoard">1</b>/<b id="hudBoardTotal">1</b></span>
      <span class="hud__chip">남은 칸 <b id="hudLeft">8</b></span>
      <span class="hud__chip hud__chip--count">
        생존
        <button class="hud__step" data-alive="-1" title="생존자 1명 줄이기">−</button>
        <b id="hudAlive">0</b>
        <button class="hud__step" data-alive="1" title="생존자 1명 늘리기">+</button>
      </span>
      <button class="hud__btn" id="btnUndo" title="마지막으로 연 칸 되돌리기 (Ctrl+Z)">되돌리기</button>
      <button class="hud__btn" id="btnNext" title="다음 판 (→)">다음 판</button>
      <button class="hud__btn" id="btnFull" title="전체 화면 (F)">전체 화면</button>
    </div>
  </section>

  <!-- 종료 -->
  <section class="screen screen--over" data-screen="over">
    <h1 class="over__title">GAME OVER</h1>
    <p class="over__sub">끝까지 살아남은 친구가 승리입니다</p>
    <div class="over__actions">
      <button class="btn" data-go="board" id="btnBackBoard">게임판으로</button>
      <button class="btn btn--primary" id="btnRestart">처음부터 다시</button>
    </div>
  </section>
</div>

<script id="gameData" type="application/json">${data}</script>
<script>
${SCRIPT}
</script>
</body>
</html>`;
}

const STYLES = `
:root {
  --ink: #f5f7ff;
  --card: radial-gradient(circle at 50% 45%, #A874D6 0%, #7030A0 52%, #34164C 100%);
  --alive: radial-gradient(circle at 50% 45%, #8FE6FF 0%, #25C6FF 48%, #0070C0 100%);
  --dead: radial-gradient(circle at 50% 45%, #E15C9C 0%, #941651 52%, #45081F 100%);
  --revive: radial-gradient(circle at 50% 45%, #B6E88A 0%, #00B050 52%, #037B4A 100%);
  --kill: radial-gradient(circle at 50% 45%, #FFEA9B 0%, #FFC000 52%, #B96D07 100%);
  --font: 'Pretendard', 'Pretendard Variable', -apple-system, BlinkMacSystemFont,
          'Apple SD Gothic Neo', 'Malgun Gothic', '맑은 고딕', 'Noto Sans KR', sans-serif;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; }
body {
  font-family: var(--font);
  background: #08060f;
  color: var(--ink);
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
}
#app { position: relative; width: 100vw; height: 100vh; }

.screen {
  position: absolute; inset: 0;
  display: none;
  flex-direction: column; align-items: center; justify-content: center;
  gap: 22px; padding: 4vh 5vw; text-align: center;
}
.screen.is-active { display: flex; }
.screen--board.is-active {
  display: flex; flex-direction: column;
  align-items: stretch; justify-content: flex-start;
  gap: 0; padding: 0;
}

/* ---------- 표지 ---------- */
.screen--cover {
  background:
    radial-gradient(circle at 50% 38%, rgba(37,198,255,.20), transparent 55%),
    radial-gradient(circle at 50% 100%, rgba(148,22,81,.28), transparent 60%),
    #08060f;
}
.reactor {
  width: clamp(80px, 11vh, 130px); aspect-ratio: 1; border-radius: 50%;
  background: radial-gradient(circle, #eafcff 0%, #6fe4ff 38%, #0b7fc4 70%, #052b45 100%);
  box-shadow: 0 0 60px rgba(60, 200, 255, .65), inset 0 0 22px rgba(255,255,255,.85);
  display: grid; place-items: center;
  animation: pulse 2.6s ease-in-out infinite;
}
.reactor span {
  width: 46%; aspect-ratio: 1; border-radius: 50%;
  background: #fff; box-shadow: 0 0 26px rgba(255,255,255,.95);
}
@keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }

.cover__title {
  font-size: clamp(2.4rem, 8vh, 5.4rem); font-weight: 900; line-height: 1.15;
  letter-spacing: -.02em;
  text-shadow: 0 0 34px rgba(37,198,255,.55);
}
.cover__topic {
  font-size: clamp(1.1rem, 3.2vh, 2rem); font-weight: 700;
  padding: 10px 26px; border-radius: 999px;
  background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.18);
}
.cover__meta, .cover__hint { font-size: clamp(.85rem, 1.9vh, 1.05rem); opacity: .62; }

/* ---------- 놀이 방법 ---------- */
.screen--rules { background: #0a0814; gap: 18px; }
.rules__title { font-size: clamp(1.4rem, 4.4vh, 2.6rem); font-weight: 800; }
.rules__grid {
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px; width: min(1000px, 92vw);
}
.fate {
  border-radius: 16px; padding: clamp(12px, 2.4vh, 24px);
  display: flex; flex-direction: column; gap: 6px;
  border: 1px solid rgba(255,255,255,.2);
}
.fate--alive { background: var(--alive); }
.fate--dead { background: var(--dead); }
.fate--revive { background: var(--revive); }
.fate--kill { background: var(--kill); }
.fate__title { font-size: clamp(1rem, 3vh, 1.9rem); font-weight: 900; letter-spacing: .02em; }
.fate__sub { font-size: clamp(.8rem, 2vh, 1.1rem); font-weight: 700; opacity: .92; }
.fate--kill .fate__title, .fate--kill .fate__sub { color: #3d2400; }
.rules__steps {
  list-style: none; counter-reset: step;
  display: grid; gap: 8px; width: min(1000px, 92vw); text-align: left;
}
.rules__steps li {
  counter-increment: step;
  font-size: clamp(.9rem, 2.2vh, 1.2rem); font-weight: 600;
  padding: 10px 16px 10px 46px; position: relative;
  background: rgba(255,255,255,.06); border-radius: 12px;
}
.rules__steps li::before {
  content: counter(step);
  position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
  width: 24px; height: 24px; border-radius: 50%;
  display: grid; place-items: center;
  background: #25C6FF; color: #04283c; font-weight: 900; font-size: .8rem;
}

/* ---------- 버튼 ---------- */
.btn {
  font-family: inherit; font-size: clamp(.95rem, 2.4vh, 1.25rem); font-weight: 800;
  padding: 14px 34px; border-radius: 999px; cursor: pointer;
  border: 1px solid rgba(255,255,255,.25);
  background: rgba(255,255,255,.08); color: var(--ink);
  transition: transform .12s ease, background .2s ease;
}
.btn:hover { background: rgba(255,255,255,.16); transform: translateY(-2px); }
.btn--primary {
  background: linear-gradient(135deg, #25C6FF, #0070C0);
  border-color: transparent; color: #04283c;
  box-shadow: 0 10px 30px rgba(37,198,255,.35);
}

/* ---------- 게임판 ---------- */
.board {
  position: relative; flex: 1 1 auto; width: 100%; min-height: 0;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(4, 1fr);
  gap: 4px; background: #000; padding: 4px;
}
.cell { position: relative; overflow: hidden; border-radius: 10px; }

.cell__fate {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 6px; padding: 8px;
  border: 1px solid rgba(255,255,255,.25);
  border-radius: 10px;
}
.cell__fate--alive { background: var(--alive); }
.cell__fate--dead { background: var(--dead); }
.cell__fate--revive { background: var(--revive); }
.cell__fate--kill { background: var(--kill); }
.cell__fateTitle {
  font-size: clamp(1.5rem, 6.5vh, 4.2rem); font-weight: 900; letter-spacing: .01em;
  text-shadow: 0 0 26px rgba(255,255,255,.45);
}
.cell__fateSub { font-size: clamp(.8rem, 2.2vh, 1.35rem); font-weight: 700; opacity: .95; }
.cell__fate--kill .cell__fateTitle, .cell__fate--kill .cell__fateSub { color: #3d2400; text-shadow: none; }

.cell.is-open .cell__fate { animation: fateIn .45s cubic-bezier(.2,.9,.3,1.2) both; }
@keyframes fateIn {
  from { transform: scale(.86); filter: brightness(1.9); }
  to { transform: scale(1); filter: brightness(1); }
}

.cell__card {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 4px; padding: 12px 18px; cursor: pointer;
  background: var(--card);
  border: 1px solid rgba(255,255,255,.28);
  border-radius: 10px;
  box-shadow: inset 0 0 60px rgba(184,47,221,.35);
  transition: filter .15s ease;
}
.cell__card:hover { filter: brightness(1.15); }
.cell__num {
  position: absolute; top: 8px; left: 12px;
  font-size: clamp(.7rem, 1.7vh, 1rem); font-weight: 800; opacity: .55;
}
.cell__q {
  font-size: clamp(1rem, 4.6vh, 3rem); font-weight: 900; line-height: 1.22;
  text-shadow: 0 0 22px rgba(184,47,221,.6);
  overflow-wrap: anywhere;
}
.cell.is-open .cell__card {
  animation: stripOut .5s ease forwards;
  pointer-events: none;
}
@keyframes stripOut {
  from { clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); opacity: 1; }
  to { clip-path: polygon(0 0, 0 0, 0 100%, 0 100%); opacity: 0; }
}

/* ---------- HUD ---------- */
.hud {
  flex: 0 0 auto; order: -1; width: 100%;
  display: flex; align-items: center; gap: 8px; flex-wrap: nowrap; justify-content: center;
  padding: 5px 10px;
  background: #08060f; border-bottom: 1px solid rgba(255,255,255,.12);
  font-size: clamp(.68rem, 1.6vh, .9rem);
  opacity: .68; transition: opacity .2s ease;
  overflow-x: auto; scrollbar-width: none;
}
.hud::-webkit-scrollbar { display: none; }
.hud:hover { opacity: 1; }
.hud > * { flex: 0 0 auto; }
.hud__topic { font-weight: 800; max-width: 22vw; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hud__chip { padding: 3px 10px; border-radius: 999px; background: rgba(255,255,255,.1); font-weight: 600; }
.hud__chip--count { display: inline-flex; align-items: center; gap: 5px; }
.hud__step {
  width: 20px; height: 20px; border-radius: 50%; cursor: pointer;
  border: none; background: rgba(255,255,255,.18); color: var(--ink);
  font-family: inherit; font-weight: 900; line-height: 1;
}
.hud__step:hover { background: rgba(255,255,255,.34); }
.hud__btn {
  font-family: inherit; font-size: inherit; font-weight: 700; cursor: pointer;
  padding: 5px 12px; border-radius: 999px;
  border: 1px solid rgba(255,255,255,.22); background: transparent; color: var(--ink);
}
.hud__btn:hover { background: rgba(255,255,255,.16); }
.hud__btn:disabled { opacity: .35; cursor: default; }

/* ---------- 종료 ---------- */
.screen--over {
  background: radial-gradient(circle at 50% 50%, rgba(148,22,81,.35), transparent 60%), #08060f;
}
.over__title {
  font-size: clamp(3rem, 14vh, 9rem); font-weight: 900; letter-spacing: .04em;
  text-shadow: 0 0 50px rgba(223,45,130,.7);
}
.over__sub { font-size: clamp(1rem, 2.8vh, 1.5rem); opacity: .8; }
.over__actions { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }

@media (max-width: 700px) {
  .rules__grid { grid-template-columns: 1fr; }
  .hud__topic { display: none; }
}
`;

const SCRIPT = `
(function () {
  var DATA = JSON.parse(document.getElementById('gameData').textContent);
  var boards = DATA.boards;
  var boardIndex = 0;
  var history = [];        // [{board, cell}] 되돌리기용
  var opened = boards.map(function (b) { return b.map(function () { return false; }); });
  var aliveCount = DATA.studentCount;

  var el = {
    board: document.getElementById('board'),
    hudBoard: document.getElementById('hudBoard'),
    hudBoardTotal: document.getElementById('hudBoardTotal'),
    hudLeft: document.getElementById('hudLeft'),
    hudAlive: document.getElementById('hudAlive'),
    btnUndo: document.getElementById('btnUndo'),
    btnNext: document.getElementById('btnNext'),
    btnFull: document.getElementById('btnFull'),
    btnRestart: document.getElementById('btnRestart'),
    coverBoards: document.getElementById('coverBoards')
  };

  el.coverBoards.textContent = boards.length;
  el.hudBoardTotal.textContent = boards.length;
  el.hudAlive.textContent = aliveCount;

  /* ---------- 화면 전환 ---------- */
  function show(name) {
    var screens = document.querySelectorAll('.screen');
    for (var i = 0; i < screens.length; i++) {
      screens[i].classList.toggle('is-active', screens[i].dataset.screen === name);
    }
    if (name === 'board') renderBoard();
  }

  var goButtons = document.querySelectorAll('[data-go]');
  for (var i = 0; i < goButtons.length; i++) {
    goButtons[i].addEventListener('click', function () { show(this.dataset.go); });
  }

  /* ---------- 효과음 (외부 파일 없이 합성) ---------- */
  var audioCtx = null;
  function beep(fate) {
    try {
      if (!audioCtx) {
        var Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        audioCtx = new Ctx();
      }
      var tones = { alive: [523, 784], dead: [330, 165], revive: [523, 659, 880], kill: [440, 233] };
      var seq = tones[fate] || [440];
      seq.forEach(function (freq, idx) {
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        var t0 = audioCtx.currentTime + idx * 0.11;
        osc.type = fate === 'dead' ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(freq, t0);
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(0.16, t0 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.32);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(t0); osc.stop(t0 + 0.34);
      });
    } catch (e) { /* 소리는 부가 기능이므로 실패해도 진행 */ }
  }

  /* ---------- 게임판 그리기 ---------- */
  function renderBoard() {
    var cells = boards[boardIndex];
    el.board.innerHTML = '';

    cells.forEach(function (cell, idx) {
      var wrap = document.createElement('div');
      wrap.className = 'cell';
      if (opened[boardIndex][idx]) wrap.classList.add('is-open');

      var label = DATA.labels[cell.fate];
      var fate = document.createElement('div');
      fate.className = 'cell__fate cell__fate--' + cell.fate;
      fate.innerHTML =
        '<span class="cell__fateTitle"></span><span class="cell__fateSub"></span>';
      fate.firstChild.textContent = label.title;
      fate.lastChild.textContent = label.sub;

      var card = document.createElement('div');
      card.className = 'cell__card';
      var num = document.createElement('span');
      num.className = 'cell__num';
      num.textContent = (boardIndex * cells.length + idx + 1);
      var q = document.createElement('div');
      q.className = 'cell__q';
      q.textContent = cell.question;
      card.appendChild(num);
      card.appendChild(q);

      card.addEventListener('click', function () { openCell(idx); });

      wrap.appendChild(fate);
      wrap.appendChild(card);
      el.board.appendChild(wrap);

      fitText(q);
    });

    updateHud();
  }

  // 문제가 길면 칸을 넘치지 않도록 글자 크기를 줄인다
  function fitText(node) {
    var size = parseFloat(getComputedStyle(node).fontSize);
    var guard = 0;
    while (node.scrollHeight > node.parentNode.clientHeight - 24 && size > 12 && guard < 40) {
      size *= 0.92;
      node.style.fontSize = size + 'px';
      guard++;
    }
  }

  function openCell(idx) {
    if (opened[boardIndex][idx]) return;
    opened[boardIndex][idx] = true;
    history.push({ board: boardIndex, cell: idx });
    el.board.children[idx].classList.add('is-open');
    beep(boards[boardIndex][idx].fate);
    updateHud();
  }

  function undo() {
    var last = history.pop();
    if (!last) return;
    opened[last.board][last.cell] = false;
    if (last.board !== boardIndex) {
      boardIndex = last.board;
      renderBoard();
    } else {
      el.board.children[last.cell].classList.remove('is-open');
      updateHud();
    }
  }

  function updateHud() {
    var left = opened[boardIndex].filter(function (o) { return !o; }).length;
    el.hudBoard.textContent = boardIndex + 1;
    el.hudLeft.textContent = left;
    el.hudAlive.textContent = aliveCount;
    el.btnUndo.disabled = history.length === 0;
    el.btnNext.textContent = boardIndex >= boards.length - 1 ? '게임 종료' : '다음 판';
  }

  function nextBoard() {
    if (boardIndex >= boards.length - 1) { show('over'); return; }
    boardIndex++;
    renderBoard();
  }

  function prevBoard() {
    if (boardIndex === 0) return;
    boardIndex--;
    renderBoard();
  }

  /* ---------- 컨트롤 ---------- */
  el.btnNext.addEventListener('click', nextBoard);
  el.btnUndo.addEventListener('click', undo);
  el.btnFull.addEventListener('click', function () {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
  });
  el.btnRestart.addEventListener('click', function () {
    opened = boards.map(function (b) { return b.map(function () { return false; }); });
    history = [];
    boardIndex = 0;
    aliveCount = DATA.studentCount;
    show('cover');
  });

  var stepButtons = document.querySelectorAll('[data-alive]');
  for (var s = 0; s < stepButtons.length; s++) {
    stepButtons[s].addEventListener('click', function () {
      aliveCount = Math.max(0, aliveCount + Number(this.dataset.alive));
      el.hudAlive.textContent = aliveCount;
    });
  }

  document.addEventListener('keydown', function (e) {
    var onBoard = document.querySelector('.screen--board').classList.contains('is-active');
    if (e.key === 'f' || e.key === 'F') { el.btnFull.click(); return; }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); undo(); return; }
    if (!onBoard) return;
    if (e.key === 'ArrowRight') nextBoard();
    if (e.key === 'ArrowLeft') prevBoard();
    if (e.key >= '1' && e.key <= '8') openCell(Number(e.key) - 1);
  });

  window.addEventListener('resize', function () {
    if (document.querySelector('.screen--board').classList.contains('is-active')) renderBoard();
  });
})();
`;

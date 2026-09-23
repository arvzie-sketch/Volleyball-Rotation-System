/* ============================================================
   VOLLEYBALL RULES QUIZ
   Loads questions from data/quiz-questions.json
   Handles quiz flow: category select → questions → results → diploma
   ============================================================ */

// ── State ───────────────────────────────────────────────────
let allQuestions  = [];
let quizQuestions = [];   // randomised subset for current quiz
let answers       = {};   // { index: { selected, locked, isCorrect } }
let currentIndex  = 0;
let quizCategory  = '';

// ── Constants ────────────────────────────────────────────────
const QUIZ_SIZES = { general: 20, rotations: 10, full: 25 };
const TIER_THRESHOLDS = { gold: 90, silver: 80, bronze: 70 };
const OPTION_LABELS = ['A', 'B', 'C', 'D'];

// ── Helpers ──────────────────────────────────────────────────
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getTier(pct) {
  if (pct >= TIER_THRESHOLDS.gold)   return 'gold';
  if (pct >= TIER_THRESHOLDS.silver) return 'silver';
  if (pct >= TIER_THRESHOLDS.bronze) return 'bronze';
  return null;
}

function getCategoryLabel(cat) {
  return { general: 'General Rules Quiz', rotations: 'Rotations Quiz', full: 'Full Exam' }[cat] || cat;
}

function getCategoryBadgeText(cat) {
  return { general: 'General', rotations: 'Rotations', full: 'Mixed' }[cat] || cat;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Optional illustration per question, shown on a light panel above the answers:
//   "image": { "src": "assets/quiz/q7.svg", "alt": "Referee signal", "credit": "Illustration: …" }
// (a plain "image": "path" string also works). Use original artwork only — FIVB rulebook
// illustrations are copyrighted.
function buildFigure(image) {
  const img = typeof image === 'string' ? { src: image } : image;
  if (!img || !img.src) return '';
  const alt = img.alt || 'Question illustration';
  const credit = img.credit ? `<figcaption class="question-credit">${escapeHtml(img.credit)}</figcaption>` : '';
  return `<figure class="question-figure"><img src="${escapeHtml(img.src)}" alt="${escapeHtml(alt)}">${credit}</figure>`;
}

// Four short answers sit in a 2×2 grid on phones too
const SHORT_OPTION_MAX = 20;

function showScreen(id) {
  ['category-screen', 'quiz-screen', 'results-screen'].forEach(s => {
    document.getElementById(s).style.display = s === id ? 'block' : 'none';
  });
  window.scrollTo(0, 0);
}

function clearGlow() {
  const el = document.getElementById('result-glow');
  if (el) el.className = 'result-glow';
}

// ── Data Loading ─────────────────────────────────────────────
async function loadQuestions() {
  const res  = await fetch('data/quiz-questions.json');
  const data = await res.json();
  allQuestions = data.questions;
}

// ── Quiz Initialisation ──────────────────────────────────────
function startQuiz(category) {
  quizCategory  = category;
  const size    = QUIZ_SIZES[category];
  const pool    = category === 'full'
    ? [...allQuestions]
    : allQuestions.filter(q => q.category === category);

  quizQuestions = shuffleArray(pool).slice(0, size);
  answers       = {};
  currentIndex  = 0;

  renderQuiz();
  showScreen('quiz-screen');
}

// ── Render: Quiz Shell ────────────────────────────────────────
function renderQuiz() {
  renderQuestionGrid();
  renderQuestion(currentIndex);
  updateProgress();
  updateNavButtons();
  document.getElementById('finish-btn').style.display = 'none';
}

// ── Render: Question Grid ─────────────────────────────────────
function renderQuestionGrid() {
  const grid = document.getElementById('question-grid');
  grid.innerHTML = '';

  quizQuestions.forEach((_, i) => {
    const box = document.createElement('button');
    box.className = 'q-box';
    box.textContent = i + 1;
    box.setAttribute('aria-label', `Question ${i + 1}`);

    const ans = answers[i];
    if (i === currentIndex) {
      box.classList.add('current');
    } else if (ans?.locked) {
      box.classList.add(ans.isCorrect ? 'correct' : 'wrong');
    }

    box.addEventListener('click', () => goToQuestion(i));
    grid.appendChild(box);
  });
}

function updateQuestionGrid() {
  renderQuestionGrid();
}

// ── Render: Question Card ─────────────────────────────────────
function renderQuestion(index) {
  const q      = quizQuestions[index];
  const ans    = answers[index];
  const locked = ans?.locked === true;
  const card   = document.getElementById('question-card');

  let html = `
    <div class="question-meta">
      <span class="question-num">Question ${index + 1} of ${quizQuestions.length}</span>
      <span class="category-badge">${getCategoryBadgeText(q.category)}</span>
    </div>
    <p class="question-text">${q.question}</p>
  `;

  if (q.image) html += buildFigure(q.image);

  // Build options — 2×2 grid for MC (stacked on phones unless short), side-by-side for T/F
  if (q.type === 'truefalse') {
    html += '<div class="options-tf">';
    const opts = [{ label: 'True', value: true }, { label: 'False', value: false }];
    opts.forEach(opt => { html += buildOptionBtn(opt.value, opt.label, null, q, ans, locked); });
    html += '</div>';
  } else {
    const short = q.options.every(o => String(o).length <= SHORT_OPTION_MAX);
    html += `<div class="options-grid${short ? ' options-short' : ''}">`;
    q.options.forEach((text, i) => { html += buildOptionBtn(i, text, OPTION_LABELS[i], q, ans, locked); });
    html += '</div>';
  }

  // Submit or locked state
  if (!locked) {
    const hasSelection = ans?.selected !== undefined;
    html += `<button class="submit-btn" id="submit-btn" ${hasSelection ? '' : 'disabled'}>Submit Answer</button>`;
  } else {
    // Explanation
    const isCorrect = ans.isCorrect;
    html += `
      <div class="explanation">
        <div class="explanation-header">
          <span class="result-icon ${isCorrect ? 'correct' : 'wrong'}">${isCorrect ? '&#10003;' : '&#10005;'}</span>
          <span class="result-label ${isCorrect ? 'correct' : 'wrong'}">${isCorrect ? 'Correct!' : 'Incorrect'}</span>
        </div>
        <p>${q.explanation}</p>
        <span class="rule-badge">${q.rule}</span>
      </div>
    `;
  }

  card.innerHTML = html;

  // Bind option clicks (only if not locked)
  if (!locked) {
    card.querySelectorAll('.option-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const raw = btn.dataset.value;
        // Convert to correct type: true/false questions store booleans
        const val = raw === 'true' ? true : raw === 'false' ? false : parseInt(raw, 10);
        selectOption(val);
      });
    });

    const submitBtn = card.querySelector('#submit-btn');
    if (submitBtn) {
      submitBtn.addEventListener('click', submitAnswer);
    }
  }
}

function buildOptionBtn(value, text, label, q, ans, locked) {
  let cls = 'option-btn';
  const selected = ans?.selected;

  if (locked) {
    const isCorrect = (q.type === 'truefalse') ? (value === q.correct) : (value === q.correct);
    const wasSelected = (selected === value);

    if (wasSelected && ans.isCorrect)  cls += ' correct-answer';
    if (wasSelected && !ans.isCorrect) cls += ' wrong-answer';
    if (!wasSelected && isCorrect)     cls += ' correct-answer';  // show right answer
  } else {
    if (selected === value) cls += ' selected';
  }

  const labelHtml = label ? `<span class="option-label">${label}</span>` : '';
  const disabledAttr = locked ? 'disabled' : '';
  const dataVal = (typeof value === 'boolean') ? value.toString() : value;

  return `<button class="${cls}" data-value="${dataVal}" ${disabledAttr}>${labelHtml}${text}</button>`;
}

// ── Answer: Select ────────────────────────────────────────────
function selectOption(value) {
  if (answers[currentIndex]?.locked) return;
  answers[currentIndex] = { ...(answers[currentIndex] || {}), selected: value };
  renderQuestion(currentIndex);

  // Re-enable submit button
  const submitBtn = document.getElementById('submit-btn');
  if (submitBtn) submitBtn.disabled = false;
}

// ── Answer: Submit ────────────────────────────────────────────
function submitAnswer() {
  const ans = answers[currentIndex];
  if (!ans || ans.selected === undefined || ans.locked) return;

  const q       = quizQuestions[currentIndex];
  const isCorrect = ans.selected === q.correct;

  answers[currentIndex] = { ...ans, locked: true, isCorrect };

  renderQuestion(currentIndex);
  updateQuestionGrid();
  updateProgress();
  updateNavButtons();

  // Show finish button if all answered
  const lockedCount = Object.values(answers).filter(a => a.locked).length;
  if (lockedCount === quizQuestions.length) {
    document.getElementById('finish-btn').style.display = 'block';
  }
}

// ── Navigation ────────────────────────────────────────────────
function goToQuestion(index) {
  currentIndex = index;
  renderQuestion(currentIndex);
  updateQuestionGrid();
  updateNavButtons();
  document.getElementById('question-card').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function updateNavButtons() {
  document.getElementById('prev-btn').disabled = currentIndex === 0;
  document.getElementById('next-btn').disabled = currentIndex === quizQuestions.length - 1;
}

function updateProgress() {
  const answered = Object.values(answers).filter(a => a.locked).length;
  const total = quizQuestions.length;
  document.getElementById('progress-text').textContent = `${answered} of ${total} answered`;
  const fill = document.getElementById('progress-bar-fill');
  if (fill) fill.style.width = total > 0 ? `${(answered / total) * 100}%` : '0%';
}

// ── Results ───────────────────────────────────────────────────
function showResults() {
  const correct    = Object.values(answers).filter(a => a.isCorrect).length;
  const total      = quizQuestions.length;
  const percentage = Math.round((correct / total) * 100);
  const tier       = getTier(percentage);

  // Tier glow backdrop
  const glowEl = document.getElementById('result-glow');
  if (glowEl) {
    glowEl.className = 'result-glow' + (tier ? ` ${tier} visible` : '');
  }

  let html = `<div class="results-inner">`;

  html += `<p class="result-heading">Your Result</p>`;
  html += `<div class="score-circle-wrap ${tier ? tier + '-border' : ''}">
    <div class="score-pct">${percentage}%</div>
    <div class="score-label">${correct}/${total} correct</div>
  </div>`;

  if (tier) {
    html += `<div class="tier-badge ${tier}">${tier.charAt(0).toUpperCase() + tier.slice(1)}</div>`;
  } else {
    html += `<div class="tier-badge none">Keep studying!</div>`;
  }

  html += `<p class="score-fraction">${correct} out of ${total} correct &mdash; ${getCategoryLabel(quizCategory)}</p>`;

  if (tier) {
    html += `
      <div class="diploma-section">
        <h3>Download your diploma</h3>
        <input type="text" id="diploma-name" class="name-input" placeholder="Enter your name" maxlength="60">
        <button class="diploma-btn" id="download-diploma-btn">Download ${tier.charAt(0).toUpperCase() + tier.slice(1)} Diploma &darr;</button>
      </div>
    `;
  } else {
    html += `<div class="keep-studying">Score 70% or more to earn a Bronze diploma. Review the explanations and give it another try!</div>`;
  }

  html += `
    <div class="result-actions">
      <button class="result-btn" id="review-btn">Review Answers</button>
      <button class="result-btn" id="try-again-btn">Try Again</button>
      <button class="result-btn" id="back-btn">Back to Categories</button>
    </div>
  `;

  html += `</div>`; // close results-inner

  document.getElementById('results-content').innerHTML = html;
  showScreen('results-screen');

  // Bind buttons
  document.getElementById('review-btn').addEventListener('click', () => {
    clearGlow();
    showScreen('quiz-screen');
    goToQuestion(0);
  });

  document.getElementById('try-again-btn').addEventListener('click', () => {
    clearGlow();
    startQuiz(quizCategory);
  });

  document.getElementById('back-btn').addEventListener('click', () => {
    clearGlow();
    showScreen('category-screen');
  });

  if (tier) {
    loadDiplomaFonts();   // warm up so the download is instant
    document.getElementById('download-diploma-btn').addEventListener('click', generateDiploma);
    document.getElementById('diploma-name').addEventListener('input', () => {
      document.getElementById('diploma-name').style.borderColor = '';
    });
  }
}

// ── PDF Diploma ───────────────────────────────────────────────
// Ivory certificate: guilloche border, condensed title, the name in a serif italic
// on a signature line, and a foil seal with ribbons in the tier's metal colour.

// Fonts (OFL, subset to Latin) — fetched only when a diploma is made.
// Bump DIPLOMA_FONTS_VERSION if a font file changes (Cloudflare caches assets for hours).
const DIPLOMA_FONTS_VERSION = 1;
const DIPLOMA_FONTS = [
  { file: 'BarlowSemiCondensed-SemiBold.ttf', family: 'BarlowSC',  style: 'normal' },
  { file: 'Barlow-Regular.ttf',               family: 'Barlow',    style: 'normal' },
  { file: 'CormorantGaramond-SemiBoldItalic.ttf', family: 'Cormorant', style: 'italic' },
];
// Built-in fallbacks if the font files can't be loaded (e.g. offline)
const DIPLOMA_FALLBACK = {
  BarlowSC:  ['helvetica', 'bold'],
  Barlow:    ['helvetica', 'normal'],
  Cormorant: ['times', 'bolditalic'],
};

// Print-safe metal tones on ivory paper
const DIPLOMA_METALS = {
  gold:   { deep: '#86651b', mid: '#b58e2e', light: '#dfc277' },
  silver: { deep: '#56606b', mid: '#8a95a0', light: '#c6cdd4' },
  bronze: { deep: '#7a4722', mid: '#a86a3a', light: '#d8a677' },
};
const DIPLOMA_PAPER = '#fbf8f1';
const DIPLOMA_INK = { main: '#1a1f25', soft: '#465260', muted: '#7d8793' };

let diplomaFontsPromise = null;

function bufferToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

function loadDiplomaFonts() {
  if (!diplomaFontsPromise) {
    diplomaFontsPromise = Promise.all(DIPLOMA_FONTS.map(async f => {
      const res = await fetch(`assets/fonts/${f.file}?v=${DIPLOMA_FONTS_VERSION}`);
      if (!res.ok) throw new Error(`${f.file}: ${res.status}`);
      return { ...f, data: bufferToBase64(await res.arrayBuffer()) };
    })).catch(err => {
      console.warn('Diploma fonts unavailable, using built-in fonts:', err);
      diplomaFontsPromise = null;   // retry next time
      return null;
    });
  }
  return diplomaFontsPromise;
}

// Relative-segment polyline through absolute points
function drawPath(doc, pts, style, closed) {
  const segs = [];
  for (let i = 1; i < pts.length; i++) segs.push([pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]]);
  doc.lines(segs, pts[0][0], pts[0][1], [1, 1], style, closed);
}

// Closed polar curve r(θ) around (cx, cy)
function polarPoints(cx, cy, r, steps) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const rr = r(t);
    pts.push([cx + rr * Math.cos(t), cy + rr * Math.sin(t)]);
  }
  return pts;
}

async function generateDiploma() {
  const nameInput = document.getElementById('diploma-name');
  const name = nameInput.value.trim();
  if (!name) {
    nameInput.focus();
    nameInput.style.borderColor = 'var(--danger)';
    return;
  }

  const correct    = Object.values(answers).filter(a => a.isCorrect).length;
  const total      = quizQuestions.length;
  const percentage = Math.round((correct / total) * 100);
  const tier       = getTier(percentage);
  if (!tier) return;

  const btn = document.getElementById('download-diploma-btn');
  if (btn) btn.disabled = true;
  const fonts = await loadDiplomaFonts();
  if (btn) btn.disabled = false;

  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
  const metal = DIPLOMA_METALS[tier];
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
  const W = 297, H = 210, CX = W / 2;

  if (fonts) {
    fonts.forEach(f => {
      doc.addFileToVFS(f.file, f.data);
      doc.addFont(f.file, f.family, f.style);
    });
  }
  const font = (family, size) => {
    if (fonts) doc.setFont(family, DIPLOMA_FONTS.find(f => f.family === family).style);
    else doc.setFont(...DIPLOMA_FALLBACK[family]);
    doc.setFontSize(size);
  };
  // Built-in fonts can't encode dashes/quotes reliably
  const txt = s => (fonts ? s : s.replace(/[–—]/g, '-').replace(/[‘’]/g, "'"));
  // jsPDF doesn't include charSpace when measuring or centring, so do it here
  const widthOf = (s, space = 0) => doc.getTextWidth(txt(s)) + space * Math.max(txt(s).length - 1, 0);
  const centred = (s, x, y, space = 0) => {
    doc.text(txt(s), x - widthOf(s, space) / 2, y, { charSpace: space });
  };
  // Largest size up to `size` at which `s` fits in `maxWidth`
  const fitFont = (family, size, s, maxWidth, space = 0, min = 4) => {
    font(family, size);
    while (widthOf(s, space) > maxWidth && size > min) font(family, (size -= 0.5));
  };

  // Paper
  doc.setFillColor(DIPLOMA_PAPER);
  doc.rect(0, 0, W, H, 'F');

  // Faint guilloche rosette behind the body text
  doc.saveGraphicsState();
  doc.setGState(new doc.GState({ opacity: 0.09, 'stroke-opacity': 0.09 }));
  doc.setDrawColor(metal.mid);
  doc.setLineWidth(0.18);
  for (let k = 0; k < 6; k++) {
    const phase = (k / 6) * Math.PI * 2;
    drawPath(doc, polarPoints(CX, 104, t => 46 + 12 * Math.sin(9 * t + phase) + 4 * Math.sin(27 * t), 540), 'S');
  }
  doc.restoreGraphicsState();

  // Frame: outer rule, guilloche band, inner rules
  const O = 8, I = 14;
  doc.setDrawColor(metal.mid);
  doc.setLineWidth(0.7);
  doc.rect(O, O, W - 2 * O, H - 2 * O, 'S');
  doc.setLineWidth(0.3);
  doc.rect(I, I, W - 2 * I, H - 2 * I, 'S');
  doc.setDrawColor(metal.light);
  doc.setLineWidth(0.15);
  doc.rect(I + 2, I + 2, W - 2 * (I + 2), H - 2 * (I + 2), 'S');

  // Two interlaced waves in the 6mm band between the rules
  const mid = (O + I) / 2, amp = 1.7, period = 5.2, step = 0.4;
  doc.setDrawColor(metal.mid);
  doc.setLineWidth(0.16);
  for (const phase of [0, Math.PI]) {
    const wave = s => amp * Math.sin((2 * Math.PI * s) / period + phase);
    const horiz = y => { const pts = []; for (let x = I; x <= W - I; x += step) pts.push([x, y + wave(x - I)]); return pts; };
    const vert = x => { const pts = []; for (let y = I; y <= H - I; y += step) pts.push([x + wave(y - I), y]); return pts; };
    drawPath(doc, horiz(mid), 'S');
    drawPath(doc, horiz(H - mid), 'S');
    drawPath(doc, vert(mid), 'S');
    drawPath(doc, vert(W - mid), 'S');
  }

  // Corner blocks with a diamond
  for (const [x, y] of [[O, O], [W - I, O], [O, H - I], [W - I, H - I]]) {
    doc.setFillColor(DIPLOMA_PAPER);
    doc.setDrawColor(metal.mid);
    doc.setLineWidth(0.3);
    doc.rect(x, y, I - O, I - O, 'FD');
    const c = [x + (I - O) / 2, y + (I - O) / 2], d = 1.7;
    doc.setFillColor(metal.mid);
    drawPath(doc, [[c[0], c[1] - d], [c[0] + d, c[1]], [c[0], c[1] + d], [c[0] - d, c[1]]], 'F', true);
  }

  // Header
  doc.setTextColor(DIPLOMA_INK.muted);
  font('BarlowSC', 8);
  centred('VOLLEYBALL-ROTATIONS.COM', CX, 31, 1.1);

  doc.setTextColor(DIPLOMA_INK.main);
  font('BarlowSC', 36);
  centred('CERTIFICATE', CX, 51, 2.4);

  doc.setTextColor(metal.deep);
  font('BarlowSC', 10.5);
  centred('OF ACHIEVEMENT', CX, 60, 1.9);

  // Ornament: rule — diamond — rule
  doc.setDrawColor(metal.mid);
  doc.setLineWidth(0.3);
  doc.line(CX - 42, 67, CX - 5, 67);
  doc.line(CX + 5, 67, CX + 42, 67);
  doc.setFillColor(metal.mid);
  drawPath(doc, [[CX, 65.2], [CX + 1.8, 67], [CX, 68.8], [CX - 1.8, 67]], 'F', true);

  // Recipient
  doc.setTextColor(DIPLOMA_INK.soft);
  font('Cormorant', 16);
  centred('This certifies that', CX, 82);

  doc.setTextColor(DIPLOMA_INK.main);
  fitFont('Cormorant', 46, name, 172, 0, 22);   // stays within the 176mm name line
  centred(name, CX, 102);

  doc.setDrawColor(metal.mid);
  doc.setLineWidth(0.3);
  doc.line(CX - 88, 107, CX + 88, 107);

  doc.setTextColor(DIPLOMA_INK.soft);
  font('Barlow', 12);
  centred(`has demonstrated ${tierLabel}-level knowledge of volleyball rules`, CX, 118);
  centred(`by scoring ${correct}/${total} (${percentage}%) on the ${getCategoryLabel(quizCategory)}`, CX, 125);

  // Seal: ribbons, foil starburst, disc with a guilloche ring
  const SY = 154;
  doc.setFillColor(metal.deep);
  for (const s of [-1, 1]) {
    drawPath(doc, [
      [CX + s * 10.5, SY + 3], [CX + s * 2.5, SY + 7.5], [CX + s * 7.5, SY + 27],
      [CX + s * 11.2, SY + 23.2], [CX + s * 15.5, SY + 25.5],
    ], 'F', true);
  }
  doc.setFillColor(metal.mid);
  drawPath(doc, polarPoints(CX, SY, t => (Math.round((t / (Math.PI * 2)) * 96) % 2 ? 14.9 : 16.2), 96), 'F', true);
  doc.setFillColor(metal.deep);
  doc.circle(CX, SY, 13.4, 'F');
  doc.setDrawColor(metal.light);
  doc.setLineWidth(0.14);
  for (const phase of [0, Math.PI]) {
    drawPath(doc, polarPoints(CX, SY, t => 11.3 + 0.9 * Math.sin(20 * t + phase), 360), 'S');
  }
  doc.setLineWidth(0.25);
  doc.circle(CX, SY, 9.3, 'S');

  // Text sized to sit inside the inner ring (r 9.3)
  doc.setTextColor(metal.light);
  fitFont('BarlowSC', 5.5, 'RULES QUIZ', 14, 0.5);
  centred('RULES QUIZ', CX, SY - 4.2, 0.5);
  doc.setTextColor(DIPLOMA_PAPER);
  fitFont('BarlowSC', 15, tierLabel.toUpperCase(), 13.5, 0.6);
  centred(tierLabel.toUpperCase(), CX, SY + 2.3, 0.6);
  doc.setTextColor(metal.light);
  font('BarlowSC', 6.5);
  centred(`${percentage}%`, CX, SY + 6.9, 0.3);

  // Date and rule edition, on signature-style lines either side of the seal
  const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  for (const [x, value, label] of [
    [62, dateStr, 'DATE OF ISSUE'],
    [W - 62, 'FIVB Official Rules 2025–2028', 'BASED ON'],
  ]) {
    doc.setTextColor(DIPLOMA_INK.main);
    font('Barlow', 11);
    centred(value, x, 157);
    doc.setDrawColor(metal.mid);
    doc.setLineWidth(0.25);
    doc.line(x - 34, 160.5, x + 34, 160.5);
    doc.setTextColor(DIPLOMA_INK.muted);
    font('BarlowSC', 7);
    centred(label, x, 165.5, 0.8);
  }

  // Disclaimer
  doc.setTextColor(DIPLOMA_INK.muted);
  font('Barlow', 6.5);
  centred('For educational purposes only. Not affiliated with or endorsed by the FIVB.', CX, 190);

  doc.save(`volleyball-quiz-${tier}-diploma.pdf`);
}

// ── DOMContentLoaded ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Load questions
  await loadQuestions();

  // Category card clicks
  document.querySelectorAll('[data-category]').forEach(card => {
    card.addEventListener('click', () => startQuiz(card.dataset.category));
  });

  // Back to categories from quiz
  document.getElementById('back-to-categories').addEventListener('click', () => {
    showScreen('category-screen');
  });

  // Previous / Next
  document.getElementById('prev-btn').addEventListener('click', () => {
    if (currentIndex > 0) goToQuestion(currentIndex - 1);
  });

  document.getElementById('next-btn').addEventListener('click', () => {
    if (currentIndex < quizQuestions.length - 1) goToQuestion(currentIndex + 1);
  });

  // Finish / See Results
  document.getElementById('finish-btn').addEventListener('click', showResults);

  // Nav hamburger
  const navHamburger = document.getElementById('nav-hamburger');
  const navMenu      = document.getElementById('nav-menu');
  navHamburger.addEventListener('click', e => {
    e.stopPropagation();
    const open = navMenu.classList.toggle('open');
    navHamburger.classList.toggle('open', open);
  });
  document.addEventListener('click', () => {
    navMenu.classList.remove('open');
    navHamburger.classList.remove('open');
  });
});

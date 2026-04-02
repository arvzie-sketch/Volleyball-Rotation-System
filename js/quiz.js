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

function showScreen(id) {
  ['category-screen', 'quiz-screen', 'results-screen'].forEach(s => {
    document.getElementById(s).style.display = s === id ? 'block' : 'none';
  });
  window.scrollTo(0, 0);
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

  // Build options
  if (q.type === 'truefalse') {
    const opts = [{ label: 'True', value: true }, { label: 'False', value: false }];
    opts.forEach(opt => {
      html += buildOptionBtn(opt.value, opt.label, null, q, ans, locked);
    });
  } else {
    q.options.forEach((text, i) => {
      html += buildOptionBtn(i, text, OPTION_LABELS[i], q, ans, locked);
    });
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
          <span class="result-icon ${isCorrect ? 'correct' : 'wrong'}">${isCorrect ? '&#10004;' : '&#10008;'}</span>
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
  document.getElementById('progress-text').textContent =
    `${answered} of ${quizQuestions.length} answered`;
}

// ── Results ───────────────────────────────────────────────────
function showResults() {
  const correct    = Object.values(answers).filter(a => a.isCorrect).length;
  const total      = quizQuestions.length;
  const percentage = Math.round((correct / total) * 100);
  const tier       = getTier(percentage);

  let html = `<div class="score-circle-wrap ${tier ? tier + '-border' : ''}">
    <div class="score-pct">${percentage}%</div>
    <div class="score-label">${correct}/${total} correct</div>
  </div>`;

  if (tier) {
    html += `<div class="tier-badge ${tier}">${tier.charAt(0).toUpperCase() + tier.slice(1)}</div><br>`;
  } else {
    html += `<div class="tier-badge none">Keep studying!</div><br>`;
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

  document.getElementById('results-content').innerHTML = html;
  showScreen('results-screen');

  // Bind buttons
  document.getElementById('review-btn').addEventListener('click', () => {
    showScreen('quiz-screen');
    goToQuestion(0);
  });

  document.getElementById('try-again-btn').addEventListener('click', () => {
    startQuiz(quizCategory);
  });

  document.getElementById('back-btn').addEventListener('click', () => {
    showScreen('category-screen');
  });

  if (tier) {
    document.getElementById('download-diploma-btn').addEventListener('click', generateDiploma);
    document.getElementById('diploma-name').addEventListener('input', () => {
      document.getElementById('diploma-name').style.borderColor = '';
    });
  }
}

// ── PDF Diploma ───────────────────────────────────────────────
function generateDiploma() {
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

  const tierLabel  = tier.charAt(0).toUpperCase() + tier.slice(1);
  const { jsPDF }  = window.jspdf;
  const doc        = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const w = 297, h = 210;

  // Background
  doc.setFillColor(12, 21, 32);
  doc.rect(0, 0, w, h, 'F');

  // Subtle gradient effect via overlay rectangles (jsPDF doesn't support gradients)
  doc.setFillColor(15, 35, 55);
  doc.rect(0, 0, w / 2, h, 'F');

  // Outer border
  const borderColors = { Gold: [241, 196, 15], Silver: [189, 195, 199], Bronze: [230, 126, 34] };
  const bc = borderColors[tierLabel];
  doc.setDrawColor(bc[0], bc[1], bc[2]);
  doc.setLineWidth(1.5);
  doc.roundedRect(8, 8, w - 16, h - 16, 4, 4, 'S');

  // Inner border (thinner, accent blue)
  doc.setDrawColor(94, 174, 255);
  doc.setLineWidth(0.3);
  doc.roundedRect(12, 12, w - 24, h - 24, 3, 3, 'S');

  // Corner accents
  doc.setFillColor(bc[0], bc[1], bc[2]);
  const corners = [[8,8],[w-8,8],[8,h-8],[w-8,h-8]];
  corners.forEach(([cx, cy]) => {
    doc.circle(cx, cy, 2, 'F');
  });

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 170, 190);
  doc.text('CERTIFICATE OF ACHIEVEMENT', w / 2, 30, { align: 'center' });

  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Volleyball Rules Knowledge', w / 2, 48, { align: 'center' });

  // Divider line
  doc.setDrawColor(60, 80, 100);
  doc.setLineWidth(0.4);
  doc.line(60, 55, w - 60, 55);

  // Certifies text
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(160, 175, 190);
  doc.text('This certifies that', w / 2, 68, { align: 'center' });

  // Name
  doc.setFontSize(30);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(94, 174, 255);
  doc.text(name, w / 2, 86, { align: 'center' });

  // Underline the name
  const nameWidth = doc.getTextWidth(name);
  const nameX = w / 2 - nameWidth / 2;
  doc.setDrawColor(94, 174, 255);
  doc.setLineWidth(0.5);
  doc.line(nameX, 89, nameX + nameWidth, 89);

  // Achievement text
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(160, 175, 190);
  doc.text(`has demonstrated ${tierLabel}-level knowledge of volleyball rules`, w / 2, 101, { align: 'center' });
  doc.text(`by scoring ${correct}/${total} (${percentage}%) on the ${getCategoryLabel(quizCategory)}`, w / 2, 112, { align: 'center' });

  // Tier badge (large, centred)
  doc.setFontSize(40);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(bc[0], bc[1], bc[2]);
  doc.text(tierLabel.toUpperCase(), w / 2, 143, { align: 'center' });

  // Stars around tier
  doc.setFontSize(14);
  doc.text('*   *   *', w / 2, 155, { align: 'center' });

  // Divider
  doc.setDrawColor(60, 80, 100);
  doc.setLineWidth(0.4);
  doc.line(60, 163, w - 60, 163);

  // Footer info
  const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(130, 145, 160);
  doc.text(`Issued: ${dateStr}`, w / 2 - 60, 173, { align: 'center' });
  doc.text('Based on FIVB Official Volleyball Rules 2025-2028', w / 2 + 40, 173, { align: 'center' });

  doc.setFontSize(9);
  doc.setTextColor(94, 174, 255);
  doc.text('volleyball-rotations.com', w / 2, 182, { align: 'center' });

  // Disclaimer
  doc.setFontSize(6.5);
  doc.setTextColor(80, 95, 110);
  doc.text('For educational purposes only. Not affiliated with or endorsed by the FIVB.', w / 2, 197, { align: 'center' });

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

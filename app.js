// app.js - Main application orchestrator

import { parseDocument } from './parsers.js';
import { analyzeDocument, interpretFlesch } from './analyzer.js';
import {
  initGemini, setDocumentContext, resetChat,
  summarizeDocument, analyzeSentiment, extractEntities, chatWithDocument,
} from './gemini.js';

// ─── State ────────────────────────────────────────────────────────────────────
let currentText = '';
let isAiRunning = false;
let isChatSending = false;

// ─── DOM ─────────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const uploadZone      = $('uploadZone');
const uploadContent   = $('uploadContent');
const uploadLoading   = $('uploadLoading');
const fileInput       = $('fileInput');
const browseBtn       = $('browseBtn');
const fileBar         = $('fileBar');
const fileTypeBadge   = $('fileTypeBadge');
const fileName        = $('fileName');
const fileSize        = $('fileSize');
const clearFile       = $('clearFile');
const analysisSection = $('analysisSection');
const uploadSection   = $('uploadSection');
const statsGrid       = $('statsGrid');
const readabilitySection = $('readabilitySection');
const keywordCloud    = $('keywordCloud');
const keywordList     = $('keywordList');
const runAiBtn        = $('runAiBtn');
const aiStatus        = $('aiStatus');
const summaryCard     = $('summaryCard');
const summaryContent  = $('summaryContent');
const sentimentCard   = $('sentimentCard');
const sentimentContent = $('sentimentContent');
const entitiesCard    = $('entitiesCard');
const entitiesContent = $('entitiesContent');
const chatMessages    = $('chatMessages');
const chatInput       = $('chatInput');
const sendBtn         = $('sendBtn');
const apiKeyBtn       = $('apiKeyBtn');
const apiKeyLabel     = $('apiKeyLabel');
const apiKeyModal     = $('apiKeyModal');
const apiKeyInput     = $('apiKeyInput');
const saveApiKey      = $('saveApiKey');
const closeModal      = $('closeModal');
const themeToggle     = $('themeToggle');

// ─── Theme ────────────────────────────────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('docscan-theme') || 'dark';
  applyTheme(saved);
}
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
  localStorage.setItem('docscan-theme', theme);
}
themeToggle.addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-theme');
  applyTheme(cur === 'dark' ? 'light' : 'dark');
});

// ─── API Key ──────────────────────────────────────────────────────────────────
function initApiKey() {
  const stored = localStorage.getItem('docscan-gemini-key');
  if (stored) {
    apiKeyInput.value = stored;
    initGemini(stored);
    apiKeyLabel.textContent = 'API Key ✓';
  }
}
apiKeyBtn.addEventListener('click', () => apiKeyModal.classList.add('open'));
closeModal.addEventListener('click', () => apiKeyModal.classList.remove('open'));
apiKeyModal.addEventListener('click', e => { if (e.target === apiKeyModal) apiKeyModal.classList.remove('open'); });
apiKeyInput.addEventListener('keydown', e => { if (e.key === 'Enter') saveApiKey.click(); });
saveApiKey.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  if (!key) { alert('Please enter an API key.'); return; }
  localStorage.setItem('docscan-gemini-key', key);
  initGemini(key);
  apiKeyLabel.textContent = 'API Key ✓';
  apiKeyModal.classList.remove('open');
});

// ─── File Upload ──────────────────────────────────────────────────────────────
browseBtn.addEventListener('click', e => { e.stopPropagation(); fileInput.click(); });
uploadZone.addEventListener('click', () => fileInput.click());
uploadZone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } });
fileInput.addEventListener('change', () => { if (fileInput.files[0]) handleFile(fileInput.files[0]); });

uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
uploadZone.addEventListener('dragleave', e => { if (!uploadZone.contains(e.relatedTarget)) uploadZone.classList.remove('drag-over'); });
uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  const file = e.dataTransfer?.files[0];
  if (file) handleFile(file);
});

clearFile.addEventListener('click', resetApp);

// ─── File Processing ──────────────────────────────────────────────────────────
async function handleFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['pdf','docx','txt','md','markdown'].includes(ext)) {
    alert(`Unsupported file type ".${ext}". Please upload PDF, DOCX, TXT, or MD.`);
    return;
  }
  // Show loading
  uploadContent.hidden = true;
  uploadLoading.hidden = false;
  uploadZone.style.cursor = 'default';

  try {
    const { text, type } = await parseDocument(file);
    currentText = text;
    if (!text.trim()) throw new Error('No readable text found in this file.');

    // File bar
    fileTypeBadge.textContent = type;
    fileName.textContent = file.name;
    fileSize.textContent = fmtBytes(file.size);
    fileBar.hidden = false;

    // Set AI context
    setDocumentContext(text);
    resetChat();

    // Run local analysis
    runLocalAnalysis(text);

    // Show analysis
    analysisSection.hidden = false;
    switchTab('stats');

  } catch (err) {
    alert('Error reading file: ' + err.message);
  } finally {
    uploadContent.hidden = false;
    uploadLoading.hidden = true;
    uploadZone.style.cursor = '';
    fileInput.value = '';
  }
}

function resetApp() {
  currentText = '';
  fileInput.value = '';
  fileBar.hidden = true;
  analysisSection.hidden = true;
  statsGrid.innerHTML = '';
  readabilitySection.innerHTML = '';
  keywordCloud.innerHTML = '';
  keywordList.innerHTML = '';
  summaryCard.hidden = true;
  sentimentCard.hidden = true;
  entitiesCard.hidden = true;
  aiStatus.textContent = '';
  chatMessages.innerHTML = `
    <div class="chat-empty" id="chatEmpty">
      <span>💬</span>
      <p>Ask anything about your document</p>
      <p class="text-muted" style="font-size:0.8rem">e.g. "What is the main topic?" · "Summarize section 2"</p>
    </div>
  `;
  resetChat();
}

// ─── Local Analysis ───────────────────────────────────────────────────────────
function runLocalAnalysis(text) {
  const stats = analyzeDocument(text);
  renderStats(stats);
  renderKeywords(stats.keywords);
}

function renderStats(stats) {
  const items = [
    { label: 'Words',           value: stats.wordCount.toLocaleString() },
    { label: 'Characters',      value: stats.charCount.toLocaleString() },
    { label: 'Sentences',       value: stats.sentenceCount.toLocaleString() },
    { label: 'Paragraphs',      value: stats.paragraphCount.toLocaleString() },
    { label: 'Unique Words',    value: stats.uniqueWordCount.toLocaleString() },
    { label: 'Avg Word Len',    value: stats.avgWordLength },
    { label: 'Avg Sent Len',    value: stats.avgSentenceLength + 'w' },
    { label: 'Reading Time',    value: '~' + stats.readingTimeMin + ' min' },
    { label: 'Lexical Diversity', value: stats.lexicalDiversity + '%' },
  ];
  statsGrid.innerHTML = items.map(({ label, value }) => `
    <div class="stat-card">
      <div class="stat-value">${esc(String(value))}</div>
      <div class="stat-label">${esc(label)}</div>
    </div>
  `).join('');

  // Readability
  const interp = interpretFlesch(stats.flesch);
  readabilitySection.innerHTML = `
    <div class="readability-score">
      <div class="readability-number">${stats.flesch}</div>
      <div class="readability-bar-wrap">
        <div class="readability-bar-bg">
          <div class="readability-bar-fill" style="width:${stats.flesch}%"></div>
        </div>
        <div class="readability-label">${esc(interp.label)}</div>
        <div class="readability-desc">${esc(interp.desc)}</div>
        <div class="readability-grade text-accent mt-2">${esc(interp.grade)}</div>
      </div>
    </div>
    <p class="text-muted mt-4" style="font-size:0.78rem">
      Longest word: <strong>${esc(stats.longestWord)}</strong> &nbsp;·&nbsp;
      Score range: 0 (very hard) → 100 (very easy)
    </p>
  `;
}

function renderKeywords(keywords) {
  if (!keywords.length) {
    keywordCloud.innerHTML = '<p class="text-muted">No keywords found.</p>';
    keywordList.innerHTML = '';
    return;
  }
  const maxScore = keywords[0].score;

  // Cloud
  keywordCloud.innerHTML = keywords.map(kw => {
    const size = (0.78 + (kw.score / maxScore) * 0.65).toFixed(2);
    return `<span class="kw-tag" style="font-size:${size}rem">${esc(kw.word)}</span>`;
  }).join('');

  // List
  keywordList.innerHTML = keywords.map((kw, i) => {
    const pct = Math.round((kw.score / maxScore) * 100);
    return `
      <div class="kw-item">
        <span class="kw-rank">${i + 1}</span>
        <span class="kw-word">${esc(kw.word)}</span>
        <div class="kw-bar-wrap"><div class="kw-bar-bg"><div class="kw-bar-fill" style="width:${pct}%"></div></div></div>
        <span class="kw-count">${kw.count}x</span>
      </div>
    `;
  }).join('');
}

// ─── AI Analysis ──────────────────────────────────────────────────────────────
runAiBtn.addEventListener('click', async () => {
  if (isAiRunning) return;
  if (!currentText) { alert('Please upload a document first.'); return; }
  if (!localStorage.getItem('docscan-gemini-key')) { apiKeyModal.classList.add('open'); return; }

  isAiRunning = true;
  runAiBtn.disabled = true;
  runAiBtn.textContent = '✨ Analyzing…';
  summaryCard.hidden = true;
  sentimentCard.hidden = true;
  entitiesCard.hidden = true;
  aiStatus.innerHTML = '<span class="spinner"></span> Running AI analysis…';

  try {
    const [summary, sentiment, entities] = await Promise.all([
      summarizeDocument(),
      analyzeSentiment(),
      extractEntities(),
    ]);

    // Summary
    const lines = summary.split('\n').filter(l => l.trim());
    summaryContent.innerHTML = '<ul>' + lines.map(line => {
      const cleaned = line.replace(/^[-*\u2022]\s*/, '');
      return `<li>${esc(cleaned)}</li>`;
    }).join('') + '</ul>';
    summaryCard.hidden = false;

    // Sentiment
    const cls = sentiment.label.toLowerCase();
    sentimentContent.innerHTML = `
      <span class="sentiment-badge ${esc(cls)}">${esc(sentiment.emoji)} ${esc(sentiment.label)}</span>
      <p class="sentiment-rationale">${esc(sentiment.rationale)}</p>
    `;
    sentimentCard.hidden = false;

    // Entities
    const { people, places, organizations } = entities;
    const hasAny = people.length || places.length || organizations.length;
    if (hasAny) {
      let html = '';
      if (people.length) {
        html += `<div class="entity-group"><div class="entity-group-title">People</div><div class="entity-chips">
          ${people.map(p => `<span class="entity-chip person">${esc(p)}</span>`).join('')}</div></div>`;
      }
      if (places.length) {
        html += `<div class="entity-group"><div class="entity-group-title">Places</div><div class="entity-chips">
          ${places.map(p => `<span class="entity-chip place">${esc(p)}</span>`).join('')}</div></div>`;
      }
      if (organizations.length) {
        html += `<div class="entity-group"><div class="entity-group-title">Organizations</div><div class="entity-chips">
          ${organizations.map(o => `<span class="entity-chip org">${esc(o)}</span>`).join('')}</div></div>`;
      }
      entitiesContent.innerHTML = html;
    } else {
      entitiesContent.innerHTML = '<p class="text-muted">No named entities found in this document.</p>';
    }
    entitiesCard.hidden = false;
    aiStatus.textContent = '✅ Analysis complete';

  } catch (err) {
    aiStatus.textContent = '❌ Error: ' + err.message;
  } finally {
    isAiRunning = false;
    runAiBtn.disabled = false;
    runAiBtn.textContent = '✨ Analyze with AI';
  }
});

// ─── Chat ─────────────────────────────────────────────────────────────────────
async function sendChat() {
  if (isChatSending) return;
  const q = chatInput.value.trim();
  if (!q) return;
  if (!currentText) { alert('Please upload a document first.'); return; }
  if (!localStorage.getItem('docscan-gemini-key')) { apiKeyModal.classList.add('open'); return; }

  // Remove empty state
  const emptyEl = chatMessages.querySelector('.chat-empty');
  if (emptyEl) emptyEl.remove();

  appendMsg('user', q);
  chatInput.value = '';
  isChatSending = true;
  sendBtn.disabled = true;

  const typingId = 'typing-' + Date.now();
  chatMessages.insertAdjacentHTML('beforeend', `
    <div class="chat-message assistant" id="${typingId}">
      <div class="chat-avatar">🤖</div>
      <div class="chat-bubble"><span class="spinner"></span></div>
    </div>
  `);
  scrollChat();

  try {
    const answer = await chatWithDocument(q);
    document.getElementById(typingId)?.remove();
    appendMsg('assistant', answer);
  } catch (err) {
    document.getElementById(typingId)?.remove();
    appendMsg('assistant', 'Error: ' + err.message);
  } finally {
    isChatSending = false;
    sendBtn.disabled = false;
    chatInput.focus();
  }
}

function appendMsg(role, text) {
  const avatar = role === 'user' ? '🙋' : '🤖';
  chatMessages.insertAdjacentHTML('beforeend', `
    <div class="chat-message ${esc(role)}">
      <div class="chat-avatar">${esc(avatar)}</div>
      <div class="chat-bubble">${esc(text).replace(/\n/g, '<br>')}</div>
    </div>
  `);
  scrollChat();
}
function scrollChat() { chatMessages.scrollTop = chatMessages.scrollHeight; }

sendBtn.addEventListener('click', sendChat);
chatInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } });

// ─── Tabs ─────────────────────────────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => {
    const active = t.dataset.tab === name;
    t.classList.toggle('active', active);
    t.setAttribute('aria-selected', active);
  });
  document.querySelectorAll('.tab-panel').forEach(p => {
    p.classList.toggle('active', p.id === `tab-${name}`);
  });
}
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});

// ─── Utilities ────────────────────────────────────────────────────────────────
function fmtBytes(b) {
  if (b < 1024)          return b + ' B';
  if (b < 1024 * 1024)   return (b / 1024).toFixed(1) + ' KB';
  return (b / (1024 * 1024)).toFixed(1) + ' MB';
}
function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Init ─────────────────────────────────────────────────────────────────────
initTheme();
initApiKey();

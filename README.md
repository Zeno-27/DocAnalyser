# DocScan — Document Analyzer

A powerful, fully client-side **document analyzer** built with Vanilla HTML/CSS/JS. No build tools, no backend — just open `index.html` in a browser.

## Features

- **📄 Multi-format support** — PDF, DOCX, TXT, Markdown
- **📊 Document Stats** — Word count, character count, sentence/paragraph count, reading time, lexical diversity, longest word
- **📖 Readability Score** — Flesch Reading Ease with grade-level interpretation
- **🏷️ Keyword Extraction** — Top 20 keywords using TF-IDF analysis (no API needed)
- **🤖 AI Summary** — Concise bullet-point summary powered by Gemini 2.5 Flash
- **💡 Sentiment Analysis** — Positive / Neutral / Negative with rationale
- **🏷️ Entity Extraction** — People, Places, and Organizations
- **💬 Document Chat** — Multi-turn Q&A: ask anything about your document
- **🌙 Dark / Light Mode** — Toggle between themes
- **🔒 Privacy First** — All parsing happens locally in your browser; only AI features call the Gemini API

## Tech Stack

| Layer | Technology |
|---|---|
| UI | Vanilla HTML5, CSS3 (custom properties), ES Modules |
| PDF parsing | [PDF.js](https://mozilla.github.io/pdf.js/) via CDN |
| DOCX parsing | [mammoth.js](https://github.com/mwilliamson/mammoth.js) via CDN |
| AI features | [Gemini 2.5 Flash](https://ai.google.dev/) via `@google/genai` (esm.sh) |

## Getting Started

### Option 1 — Python (recommended, no install needed)
```bash
cd document-analyzer
python -m http.server 8080
# Open http://localhost:8080
```

### Option 2 — Node.js
```bash
npx serve .
```

### Option 3 — VS Code
Install the **Live Server** extension and click "Go Live".

> ⚠️ Do NOT open `index.html` directly via `file://` — ES modules require an HTTP server.

## AI Setup

1. Get a free API key from [Google AI Studio](https://aistudio.google.com/apikey)
2. Click **🔑 API Key** in the app header
3. Paste your key and click **Save** — it's stored in `localStorage` only

## Project Structure

```
document-analyzer/
├── index.html      # App shell — upload zone, tabs, modal
├── style.css       # Dark/light theme, responsive layout
├── app.js          # Main orchestrator — DOM wiring, event handling
├── parsers.js      # PDF / DOCX / TXT extraction
├── analyzer.js     # Local analysis — stats, readability, TF-IDF keywords
└── gemini.js       # Gemini API — summary, sentiment, entities, chat
```

## License

MIT

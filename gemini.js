// gemini.js - Gemini API integration (@google/genai via esm.sh)

import { GoogleGenAI } from 'https://esm.sh/@google/genai';

const MODEL = 'gemini-2.5-flash';
let _client = null;
let _docContext = '';
let _chatHistory = [];

export function initGemini(apiKey) {
  _client = new GoogleGenAI({ apiKey });
  _chatHistory = [];
}

export function setDocumentContext(text) {
  _docContext = text.length > 60000
    ? text.slice(0, 60000) + '\n\n[Document truncated for AI analysis]'
    : text;
  _chatHistory = [];
}

export function resetChat() { _chatHistory = []; }

function requireClient() {
  if (!_client) throw new Error('Gemini API key not set. Click the API Key button to configure it.');
}

export async function summarizeDocument() {
  requireClient();
  const res = await _client.models.generateContent({
    model: MODEL,
    contents: `You are an expert document analyst. Summarize the document below in 5-8 concise bullet points. Start each point with a dash (-). Be precise and informative.

DOCUMENT:
${_docContext}

SUMMARY:`,
  });
  return res.text.trim();
}

export async function analyzeSentiment() {
  requireClient();
  const res = await _client.models.generateContent({
    model: MODEL,
    contents: `Analyze the overall sentiment of this document. Return ONLY a JSON object with fields: "label" (one of: "Positive", "Neutral", "Negative"), "emoji" (one emoji), "rationale" (1-2 sentences).

DOCUMENT:
${_docContext}`,
    config: { responseMimeType: 'application/json' },
  });
  try {
    const p = JSON.parse(res.text.trim());
    return { label: p.label || 'Neutral', emoji: p.emoji || 'O', rationale: p.rationale || '' };
  } catch {
    return { label: 'Neutral', emoji: 'O', rationale: 'Unable to determine sentiment.' };
  }
}

export async function extractEntities() {
  requireClient();
  const res = await _client.models.generateContent({
    model: MODEL,
    contents: `Extract named entities from this document. Return ONLY a JSON object with arrays: "people" (up to 8 person names), "places" (up to 8 locations), "organizations" (up to 8 orgs/companies). Use empty arrays if none found.

DOCUMENT:
${_docContext}`,
    config: { responseMimeType: 'application/json' },
  });
  try {
    const p = JSON.parse(res.text.trim());
    return {
      people:        Array.isArray(p.people)        ? p.people        : [],
      places:        Array.isArray(p.places)        ? p.places        : [],
      organizations: Array.isArray(p.organizations) ? p.organizations : [],
    };
  } catch {
    return { people: [], places: [], organizations: [] };
  }
}

export async function chatWithDocument(question) {
  requireClient();
  const systemInstruction = `You are a helpful document analysis assistant. Answer questions based ONLY on the document content below. If the answer is not in the document, say so clearly. Be concise and helpful.

DOCUMENT:
${_docContext}`;

  const contents = [
    ..._chatHistory,
    { role: 'user', parts: [{ text: question }] },
  ];

  const res = await _client.models.generateContent({
    model: MODEL,
    contents,
    config: { systemInstruction },
  });

  const answer = res.text.trim();
  _chatHistory.push({ role: 'user',  parts: [{ text: question }] });
  _chatHistory.push({ role: 'model', parts: [{ text: answer   }] });
  if (_chatHistory.length > 20) _chatHistory = _chatHistory.slice(-20);
  return answer;
}

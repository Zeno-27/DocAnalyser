// parsers.js - Document text extraction
// Supports: PDF (PDF.js CDN), DOCX (mammoth.js), TXT, MD

const PDFJS_VERSION = '4.9.155';
const PDFJS_CDN = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}`;
let _pdfjsLib = null;

async function loadPdfJs() {
  if (_pdfjsLib) return _pdfjsLib;
  const mod = await import(`${PDFJS_CDN}/pdf.min.mjs`);
  _pdfjsLib = mod;
  _pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS_CDN}/pdf.worker.min.mjs`;
  return _pdfjsLib;
}

export async function parsePDF(file) {
  const lib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await lib.getDocument({ data: arrayBuffer }).promise;
  const pageTexts = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => ('str' in item ? item.str : '')).join(' ');
    pageTexts.push(pageText.trim());
  }
  return pageTexts.filter(Boolean).join('\n\n');
}

export async function parseDOCX(file) {
  if (typeof mammoth === 'undefined') {
    throw new Error('mammoth.js failed to load. Check your internet connection.');
  }
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

export async function parseTXT(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsText(file, 'UTF-8');
  });
}

export async function parseDocument(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  switch (ext) {
    case 'pdf':
      return { text: await parsePDF(file), type: 'PDF' };
    case 'docx':
      return { text: await parseDOCX(file), type: 'DOCX' };
    case 'txt':
      return { text: await parseTXT(file), type: 'TXT' };
    case 'md':
    case 'markdown':
      return { text: await parseTXT(file), type: 'MD' };
    default:
      throw new Error(`Unsupported file type: .${ext}. Please upload a PDF, DOCX, TXT, or MD file.`);
  }
}

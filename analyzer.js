// analyzer.js - Local document analysis (no network required)

const STOP_WORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with','by',
  'from','is','it','its','that','this','are','was','were','be','been','being',
  'have','has','had','do','does','did','will','would','could','should','may',
  'might','shall','can','not','no','nor','so','yet','both','either','neither',
  'each','few','more','most','other','some','such','than','too','very','just',
  'don','he','she','they','we','you','i','me','him','her','us','them','my',
  'your','his','our','their','what','which','who','whom','when','where','why',
  'how','all','any','as','into','up','out','about','after','before','between',
  'through','during','also','then','there','here','if','while','although','even',
  'get','got','let','make','like','know','go','see','use','now','one','two',
  'new','old','first','last','long','great','own','same','much','well','back',
  'still','way','come','give','take','look','think','say','want','these','those',
  'must','need','since','until','unless','because','though','however','therefore',
  'thus','hence','whereas','upon','within','without','over','under','again',
  'further','once','only','per','via','etc','ie','eg','said','many','every',
]);

function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const m = word.match(/[aeiouy]{1,2}/g);
  return m ? Math.max(1, m.length) : 1;
}

function fleschScore(alphaWords, wordCount, sentenceCount) {
  if (!sentenceCount || !wordCount) return 0;
  const totalSyl = alphaWords.reduce((s, w) => s + countSyllables(w), 0);
  const score = 206.835 - 1.015 * (wordCount / sentenceCount) - 84.6 * (totalSyl / wordCount);
  return Math.max(0, Math.min(100, Math.round(score * 10) / 10));
}

export function interpretFlesch(score) {
  if (score >= 90) return { label: 'Very Easy',        desc: 'Easily understood by an average 11-year-old.',     grade: '5th grade' };
  if (score >= 80) return { label: 'Easy',             desc: 'Conversational English for everyday consumers.',    grade: '6th grade' };
  if (score >= 70) return { label: 'Fairly Easy',      desc: 'Easy to read for most adults.',                    grade: '7th grade' };
  if (score >= 60) return { label: 'Standard',         desc: 'Readable by 13-15-year-old students.',             grade: '8-9th grade' };
  if (score >= 50) return { label: 'Fairly Difficult', desc: 'Fairly difficult; best for educated readers.',     grade: '10-12th grade' };
  if (score >= 30) return { label: 'Difficult',        desc: 'Best understood by college graduates.',            grade: 'College' };
  return               { label: 'Very Difficult',       desc: 'Best understood by university / postgrad readers.',grade: 'Professional' };
}

function extractKeywords(text, topN = 20) {
  const tokens = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
  const total = tokens.length;
  if (!total) return [];
  const tf = {};
  for (const tok of tokens) {
    if (!STOP_WORDS.has(tok)) tf[tok] = (tf[tok] || 0) + 1;
  }
  const scored = Object.entries(tf).map(([word, count]) => ({
    word, count,
    score: Math.round((count / total) * Math.log(word.length + 2) * 10000 * 100) / 100,
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topN);
}

export function analyzeDocument(text) {
  const charCount         = text.length;
  const charCountNoSpaces = text.replace(/\s/g, '').length;
  const wordTokens        = text.match(/\S+/g) || [];
  const wordCount         = wordTokens.length;
  const alphaWords        = text.match(/\b[a-zA-Z]+\b/g) || [];
  const sentenceMatches   = text.match(/[^.!?]+[.!?]+/g) || [];
  const sentenceCount     = Math.max(sentenceMatches.length, 1);
  const paragraphs        = text.split(/\n\s*\n/).filter(p => p.trim());
  const paragraphCount    = Math.max(paragraphs.length, 1);

  const avgWordLength = alphaWords.length
    ? +(alphaWords.reduce((s, w) => s + w.length, 0) / alphaWords.length).toFixed(1) : 0;

  const longestWord = [...alphaWords].sort((a, b) => b.length - a.length)[0] || '-';
  const avgSentenceLength = Math.round(wordCount / sentenceCount);
  const readingTimeMin    = Math.max(1, Math.ceil(wordCount / 200));

  const uniqueWords      = new Set(alphaWords.map(w => w.toLowerCase()));
  const uniqueWordCount  = uniqueWords.size;
  const lexicalDiversity = wordCount > 0 ? Math.round((uniqueWordCount / wordCount) * 100) : 0;
  const flesch           = fleschScore(alphaWords, wordCount, sentenceCount);
  const keywords         = extractKeywords(text, 20);

  return {
    charCount, charCountNoSpaces, wordCount, sentenceCount, paragraphCount,
    avgWordLength, longestWord, avgSentenceLength, readingTimeMin,
    uniqueWordCount, lexicalDiversity, flesch, keywords,
  };
}

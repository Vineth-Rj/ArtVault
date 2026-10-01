// Pure helpers for the AI features (no database, no network) so they are easy to test.
const STOP = new Set(['the', 'and', 'for', 'with', 'art', 'arts', 'of', 'in', 'on', 'an', 'to', 'from', 'by', 'some', 'show', 'find', 'that', 'are', 'any']);

function tokenize(q) {
  const words = String(q || '').toLowerCase().split(/[^a-z0-9\u00C0-\u024F]+/);
  return [...new Set(words.filter((w) => w.length >= 3 && !STOP.has(w)))];
}

function cleanList(v, max) {
  if (!Array.isArray(v)) return [];
  const out = v.map((x) => String(x).toLowerCase().trim()).filter((x) => x && x.length <= 40);
  return [...new Set(out)].slice(0, max);
}

function cleanText(v, max) {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

function parseJson(text) {
  if (!text) throw new Error('Empty response');
  const s = String(text).trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try { return JSON.parse(s); } catch { /* fall through */ }
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a >= 0 && b > a) return JSON.parse(s.slice(a, b + 1));
  throw new Error('Response was not valid JSON');
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasWord = (text, term) => new RegExp(`\\b${esc(term)}(?:s|es)?\\b`).test(text);

// terms: [{ t: 'coastal', w: 2 }]  (w = weight: 2 for the user's own words, 1 for AI-expanded ones)
function scoreProduct(p, terms) {
  const lists = [...(p.aiKeywords || []), ...(p.aiTags || []), ...(p.aiThemes || [])].map((x) => String(x).toLowerCase());
  const title = String(p.title || '').toLowerCase();
  const other = [p.description, p.category, p.artType, p.aiStyle, p.aiMood, p.aiDescription, p.story]
    .filter(Boolean).join(' ').toLowerCase();

  let score = 0;
  const matched = [];
  for (const { t, w } of terms) {
    let pts = 0;
    if (lists.some((x) => x === t || hasWord(x, t))) pts += 3;
    if (hasWord(title, t)) pts += 2;
    if (hasWord(other, t)) pts += 1;
    if (pts) { score += pts * w; matched.push(t); }
  }
  return { score, matched };
}

module.exports = { tokenize, cleanList, cleanText, parseJson, scoreProduct };
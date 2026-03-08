const crypto = require('crypto');

function normalizeWhitespace(text = '') {
  return String(text).replace(/\s+/g, ' ').trim();
}

function normalizeForHash(text = '') {
  return normalizeWhitespace(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function hashText(text = '') {
  return crypto.createHash('md5').update(normalizeForHash(text)).digest('hex');
}

function isDummyQuestion(text = '', subject = '') {
  const t = normalizeWhitespace(text).toLowerCase();
  const s = (subject || '').toLowerCase();

  const patterns = [
    /\bplaceholder\b/,
    /\bdummy\b/,
    /\blorem ipsum\b/,
    /\bquestion\s+\w+\s*#?\d+\b/,
    /\bsignificance of .* event \d+\b/,
    /\boption [abcd]\b/,
    /\bthis is a sample question\b/
  ];

  if (patterns.some((p) => p.test(t))) return true;
  if (s && t.includes(`question ${s}`)) return true;
  return false;
}

function validateQuestion(raw, subject = '') {
  const errors = [];
  const q = raw || {};

  const questionText = normalizeWhitespace(q.question_text || q.question || '');
  if (questionText.length < 18) {
    errors.push('question_too_short');
  }
  if (isDummyQuestion(questionText, subject)) {
    errors.push('dummy_or_placeholder');
  }

  const options = Array.isArray(q.options)
    ? q.options.map((o) => normalizeWhitespace(o))
    : [];
  if (options.length !== 4) {
    errors.push('options_must_be_4');
  }
  if (options.some((o) => o.length < 1)) {
    errors.push('empty_option');
  }
  if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) {
    errors.push('duplicate_options');
  }

  const answer =
    Number.isInteger(q.correct_answer) ? q.correct_answer :
    Number.isInteger(q.correct) ? q.correct : -1;
  if (answer < 0 || answer > 3) {
    errors.push('invalid_correct_answer');
  }

  const explanation = normalizeWhitespace(q.explanation || '');
  if (explanation.length < 20) {
    errors.push('explanation_too_short');
  }

  const difficulty = normalizeWhitespace(q.difficulty || 'medium').toLowerCase();
  const validDifficulties = new Set(['easy', 'medium', 'hard']);
  if (!validDifficulties.has(difficulty)) {
    errors.push('invalid_difficulty');
  }

  const examTypes = Array.isArray(q.exam_types)
    ? q.exam_types.map((e) => normalizeWhitespace(String(e)).toUpperCase()).filter(Boolean)
    : [];
  if (examTypes.length === 0) {
    errors.push('missing_exam_types');
  }

  if (String(subject || '').toLowerCase() === 'tamil') {
    const tamilRegex = /[\u0B80-\u0BFF]/g;
    const combined = `${questionText} ${options.join(' ')} ${explanation}`;
    const tamilChars = (combined.match(tamilRegex) || []).length;
    if (tamilChars < 25) {
      errors.push('tamil_text_required');
    }
    if (!examTypes.includes('TNPSC')) {
      errors.push('tamil_must_include_tnpsc_exam_type');
    }
  }

  const canonical = {
    question_text: questionText,
    options,
    correct_answer: answer,
    explanation,
    difficulty: validDifficulties.has(difficulty) ? difficulty : 'medium',
    exam_types: examTypes
  };

  return {
    ok: errors.length === 0,
    errors,
    canonical
  };
}

module.exports = {
  normalizeForHash,
  hashText,
  isDummyQuestion,
  validateQuestion
};

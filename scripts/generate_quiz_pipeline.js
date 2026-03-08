const fs = require('fs');
const path = require('path');
const { ingestQuestions } = require('./quiz_ingestor');
const { hashText } = require('./quiz_qc');

function loadEnvFile(filename) {
  const p = path.resolve(process.cwd(), filename);
  if (!fs.existsSync(p)) return;
  const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^\s*([A-Z0-9_]+)=(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    if (process.env[key]) continue;
    let val = m[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    process.env[key] = val;
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (const arg of args) {
    const m = arg.match(/^--([^=]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
    else if (arg === '--dry-run') out['dry-run'] = 'true';
  }
  return out;
}

function extractJsonArray(text) {
  const trimmed = String(text || '').trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return JSON.parse(trimmed);
  }
  const match = trimmed.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('No JSON array found in model output');
  return JSON.parse(match[0]);
}

async function generateBatch({ topic, subject, count, examTypes, difficulty, model }) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY missing');

  const prompt = [
    `Generate ${count} unique, exam-quality MCQs for Indian competitive exams.`,
    `Subject: ${subject}`,
    `Topic: ${topic}`,
    `Difficulty: ${difficulty}`,
    `Exam types: ${examTypes.join(', ')}`,
    'Return ONLY a JSON array. No markdown, no explanation.',
    'Each item schema:',
    '{"question_text":"...","options":["A","B","C","D"],"correct_answer":0,"explanation":"...","difficulty":"easy|medium|hard","exam_types":["UPSC","TNPSC"]}',
    'Rules:',
    '- No placeholders/dummy/sample/template text',
    '- Exactly 4 distinct options',
    '- One correct index 0..3',
    '- Concise but real explanation',
    '- Questions must be factually grounded and non-repetitive',
    ...(String(subject || '').toLowerCase() === 'tamil'
      ? [
          '- For subject "tamil": question_text, options, and explanation MUST be fully in Tamil language script.',
          '- For subject "tamil": Use TNPSC-style previous-year pattern and difficulty.',
          '- For subject "tamil": exam_types must include "TNPSC".',
          '- Do not output English transliteration for Tamil questions.'
        ]
      : [])
  ].join('\n');

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://mindgains.in',
      'X-Title': 'MIGA Quiz Pipeline'
    },
    body: JSON.stringify({
      model: model || process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct',
      temperature: 0.5,
      max_tokens: 5000,
      messages: [
        { role: 'system', content: 'You are a strict JSON generator.' },
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${t}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '';
  return extractJsonArray(content);
}

async function main() {
  loadEnvFile('.env.local');
  loadEnvFile('.env');

  const args = parseArgs();
  const subject = (args.subject || '').toLowerCase().trim();
  const topic = (args.topic || '').trim();
  const count = Math.max(1, Number.parseInt(args.count || '50', 10));
  const difficulty = (args.difficulty || 'mixed').toLowerCase();
  const examTypes = (args.exams || 'UPSC,TNPSC,SSC')
    .split(',')
    .map((e) => e.trim().toUpperCase())
    .filter(Boolean);
  const dryRun = args['dry-run'] === 'true';
  const model = args.model || '';

  if (!subject) throw new Error('--subject is required');
  if (!topic) throw new Error('--topic is required');

  console.log(`\n🧠 Pipeline start | subject=${subject} | topic="${topic}" | count=${count} | dryRun=${dryRun}`);

  const target = count;
  let generated = [];
  let generatedUnique = 0;
  let attempts = 0;
  const maxAttempts = 6;

  while (generatedUnique < target && attempts < maxAttempts) {
    attempts++;
    const remaining = target - generatedUnique;
    const batchCount = Math.min(25, remaining + 10);
    console.log(`\n⚙️ Generation attempt ${attempts}/${maxAttempts} (requesting ${batchCount})...`);
    try {
      const batch = await generateBatch({ topic, subject, count: batchCount, examTypes, difficulty, model });
      for (const q of batch) {
        if (!Array.isArray(q.exam_types) || q.exam_types.length === 0) {
          q.exam_types = examTypes;
        }
        if (!q.difficulty || q.difficulty === 'mixed') {
          q.difficulty = difficulty === 'mixed' ? 'medium' : difficulty;
        }
      }
      generated = generated.concat(batch);
      const tmpSeen = new Set();
      for (const q of generated) {
        const text = String(q?.question_text || q?.question || '').trim();
        if (!text) continue;
        tmpSeen.add(hashText(text));
      }
      generatedUnique = tmpSeen.size;
      console.log(`Generated cumulative: ${generated.length} (unique ${generatedUnique})`);
    } catch (err) {
      console.error(`Generation attempt failed: ${err.message}`);
    }
  }

  if (generated.length === 0) {
    throw new Error('No questions generated');
  }

  // De-duplicate generated pool before taking target batch.
  const uniq = [];
  const seen = new Set();
  for (const q of generated) {
    const text = String(q?.question_text || q?.question || '').trim();
    if (!text) continue;
    const h = hashText(text);
    if (seen.has(h)) continue;
    seen.add(h);
    uniq.push(q);
  }

  const summary = await ingestQuestions(subject, uniq.slice(0, target), { dryRun });
  console.log(`\n🎯 Final summary: ${JSON.stringify(summary, null, 2)}\n`);
}

main().catch((err) => {
  console.error(`❌ Pipeline failed: ${err.message}`);
  process.exit(1);
});

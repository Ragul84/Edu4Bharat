const { Redis } = require('@upstash/redis');
const fs = require('fs');
const path = require('path');
const { hashText, validateQuestion } = require('./quiz_qc');

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
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

/**
 * Ingests questions into Upstash Redis with strict QC + deduplication.
 * @param {string} subject
 * @param {Array<object>} questions
 * @param {{ dryRun?: boolean }} options
 */
async function ingestQuestions(subject, questions, options = {}) {
  const slug = String(subject || '').toLowerCase().trim();
  if (!slug) throw new Error('subject is required');
  if (!Array.isArray(questions)) throw new Error('questions must be an array');
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    throw new Error('Missing Upstash env vars');
  }

  const dryRun = !!options.dryRun;
  const key = `quiz:subject:${slug}`;
  const idSetKey = `quiz:ids:${slug}`;
  const textSetKey = `quiz:textnorm:${slug}`;

  console.log(`🚀 Ingesting ${questions.length} questions for [${slug}]${dryRun ? ' (dry-run)' : ''}...`);

  let addedCount = 0;
  let skippedCount = 0;
  const rejected = {};

  const batchSeen = new Set();

  for (const raw of questions) {
    const qc = validateQuestion(raw, slug);
    if (!qc.ok) {
      skippedCount++;
      for (const e of qc.errors) rejected[e] = (rejected[e] || 0) + 1;
      continue;
    }

    const canonical = qc.canonical;
    const qId = hashText(canonical.question_text);
    const normHash = hashText(canonical.question_text);

    if (batchSeen.has(normHash)) {
      skippedCount++;
      rejected.duplicate_in_batch = (rejected.duplicate_in_batch || 0) + 1;
      continue;
    }
    batchSeen.add(normHash);

    const isDuplicateId = await redis.sismember(idSetKey, qId);
    const isDuplicateText = await redis.sismember(textSetKey, normHash);
    if (isDuplicateId || isDuplicateText) {
      skippedCount++;
      rejected.duplicate_existing = (rejected.duplicate_existing || 0) + 1;
      continue;
    }

    if (!dryRun) {
      await redis.rpush(key, JSON.stringify({ ...canonical, id: qId }));
      await redis.sadd(idSetKey, qId);
      await redis.sadd(textSetKey, normHash);
    }
    addedCount++;
  }

  const summary = {
    subject: slug,
    input: questions.length,
    added: addedCount,
    skipped: skippedCount,
    rejected
  };
  console.log(`✅ Done: ${JSON.stringify(summary)}`);
  return summary;
}

module.exports = { ingestQuestions };


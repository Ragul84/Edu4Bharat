const fs = require('fs');
const path = require('path');
const { Redis } = require('@upstash/redis');
const { validateQuestion } = require('./quiz_qc');

function loadEnvFile(filename) {
  const p = path.resolve(process.cwd(), filename);
  if (!fs.existsSync(p)) return;
  const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^\s*([A-Z0-9_]+)=(.*)\s*$/);
    if (!m) continue;
    if (process.env[m[1]]) continue;
    let v = m[2].trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    process.env[m[1]] = v;
  }
}

async function main() {
  loadEnvFile('.env.local');
  loadEnvFile('.env');
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  const key = 'quiz:subject:tamil';
  const raw = await redis.lrange(key, 0, -1);
  const kept = [];
  let dropped = 0;
  const reasons = {};

  for (const item of raw) {
    let q = item;
    try {
      q = typeof item === 'string' ? JSON.parse(item) : item;
    } catch {
      dropped++;
      reasons.invalid_json = (reasons.invalid_json || 0) + 1;
      continue;
    }
    const qc = validateQuestion(q, 'tamil');
    if (qc.ok) kept.push({ ...qc.canonical, id: q.id });
    else {
      dropped++;
      for (const e of qc.errors) reasons[e] = (reasons[e] || 0) + 1;
    }
  }

  await redis.del(key);
  await redis.del('quiz:ids:tamil');
  await redis.del('quiz:textnorm:tamil');

  for (const q of kept) {
    await redis.rpush(key, JSON.stringify(q));
  }

  console.log(JSON.stringify({
    subject: 'tamil',
    original: raw.length,
    kept: kept.length,
    dropped,
    reasons
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

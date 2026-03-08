require('dotenv').config();
const { Redis } = require('@upstash/redis');
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function cleanup() {
  const subjects = ['history', 'polity', 'geography', 'science', 'english', 'economics'];
  console.log('--- STARTING REDIS CLEANUP ---');
  
  for (const s of subjects) {
    const key = `quiz:subject:${s}`;
    const all = await redis.lrange(key, 0, -1);
    console.log(`Checking ${s}: ${all.length} total items...`);
    
    const valid = all.filter(item => {
      const q = typeof item === 'string' ? JSON.parse(item) : item;
      const text = (q.question_text || q.question || '').toLowerCase();
      // Filter out "Question subject #number" or "dummy"
      return !text.includes('question ' + s) && !text.includes('dummy');
    });

    if (valid.length < all.length) {
      console.log(`  Removing ${all.length - valid.length} dummy items from ${s}...`);
      await redis.del(key);
      if (valid.length > 0) {
        // Push valid ones back
        await redis.rpush(key, ...valid);
      }
      console.log(`  Done. ${s} now has ${valid.length} real questions.`);
    } else {
      console.log(`  ${s} is already clean.`);
    }
  }
}

cleanup();


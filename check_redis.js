require('dotenv').config();
const { Redis } = require('@upstash/redis');
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function check() {
  try {
    const keys = await redis.keys('quiz:*');
    console.log('Total quiz keys:', keys.length);
    
    const subjects = ['history', 'polity', 'geography', 'science', 'english', 'economics'];
    for (const s of subjects) {
      const count = await redis.llen('quiz:subject:' + s);
      const sample = await redis.lrange('quiz:subject:' + s, 0, 0);
      console.log(`${s}: ${count} questions.`);
      if (sample.length) {
        console.log(`  Sample: ${JSON.stringify(sample[0]).substring(0, 150)}...`);
      }
    }
  } catch (e) {
    console.error('Redis Error:', e.message);
  }
}

check();


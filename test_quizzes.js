require('dotenv').config();
const { Redis } = require('@upstash/redis');
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function test() {
  try {
    const subjects = ['history', 'polity', 'geography', 'science', 'english', 'economics'];
    console.log('--- 10 SAMPLE QUIZZES FROM DATABASE ---');
    for (const s of subjects) {
      const questions = await redis.lrange('quiz:subject:' + s, 0, 9);
      console.log(`\nSubject: ${s.toUpperCase()} (${questions.length} samples)`);
      questions.forEach((q, i) => {
        const data = typeof q === 'string' ? JSON.parse(q) : q;
        console.log(`${i+1}. ${data.question_text || data.question}`);
      });
    }
  } catch (e) {
    console.error('Redis Error:', e.message);
  }
}

test();


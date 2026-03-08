require('dotenv').config();
const { Redis } = require('@upstash/redis');
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const economicsBatch = [
  {
    "question_text": "Who is known as the 'Father of Economics'?",
    "options": ["Adam Smith", "Alfred Marshall", "J.M. Keynes", "Karl Marx"],
    "correct": 0,
    "explanation": "Adam Smith is widely considered the father of modern economics after his work 'The Wealth of Nations'."
  },
  {
    "question_text": "Which organization calculates the 'GDP' in India?",
    "options": ["RBI", "NITI Aayog", "CSO (now NSO)", "Ministry of Finance"],
    "correct": 2,
    "explanation": "The National Statistical Office (NSO) under the Ministry of Statistics and Programme Implementation calculates GDP."
  },
  {
    "question_text": "What is the main objective of the 'Monetary Policy' in India?",
    "options": ["Price Stability", "Employment Generation", "Poverty Alleviation", "Foreign Trade"],
    "correct": 0,
    "explanation": "The primary objective of RBI's monetary policy is to maintain price stability while keeping in mind the objective of growth."
  },
  {
    "question_text": "Gresham's Law is related to?",
    "options": ["Consumption", "Production", "Circulation of Money", "Distribution"],
    "correct": 2,
    "explanation": "Gresham's Law states that 'bad money drives out good money' from circulation."
  },
  {
    "question_text": "Which sector contributes the most to India's GDP?",
    "options": ["Agriculture", "Industry", "Services", "Mining"],
    "correct": 2,
    "explanation": "The Services sector is the largest contributor to India's GDP, accounting for over 50%."
  }
];

async function pushBatch() {
  try {
    const key = 'quiz:subject:economics';
    const idKey = 'quiz:ids:economics';
    
    for (const q of economicsBatch) {
      const qStr = JSON.stringify(q);
      // Use a Set to prevent duplicates based on the question text
      const isNew = await redis.sadd(idKey, q.question_text.toLowerCase());
      if (isNew) {
        await redis.rpush(key, qStr);
      }
    }
    console.log(`Successfully pushed ${economicsBatch.length} Economics questions (duplicates skipped).`);
  } catch (e) {
    console.error(e.message);
  }
}
pushBatch();


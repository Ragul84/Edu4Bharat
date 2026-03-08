require('dotenv').config();
const { Redis } = require('@upstash/redis');
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const geographyBatch = [
  {
    "question_text": "Which is the highest peak in the Western Ghats?",
    "options": ["Anamudi", "Doddabetta", "Mahendragiri", "Kalsubai"],
    "correct": 0,
    "explanation": "Anamudi (2,695m) in Kerala is the highest peak in the Western Ghats and South India."
  },
  {
    "question_text": "The 'Majuli' island, the largest river island in the world, is located in which river?",
    "options": ["Ganga", "Brahmaputra", "Indus", "Godavari"],
    "correct": 1,
    "explanation": "Majuli is a large river island in the Brahmaputra River, Assam."
  },
  {
    "question_text": "Which Indian state has the longest coastline?",
    "options": ["Maharashtra", "Tamil Nadu", "Gujarat", "Andhra Pradesh"],
    "correct": 2,
    "explanation": "Gujarat has the longest coastline in India, stretching over 1,600 km."
  },
  {
    "question_text": "The 'Palk Strait' separates India from which country?",
    "options": ["Maldives", "Sri Lanka", "Myanmar", "Indonesia"],
    "correct": 1,
    "explanation": "The Palk Strait is a strait between the Tamil Nadu state of India and the Mannar district of Sri Lanka."
  },
  {
    "question_text": "Which is the largest producer of 'Saffron' in India?",
    "options": ["Himachal Pradesh", "Jammu & Kashmir", "Uttarakhand", "Sikkim"],
    "correct": 1,
    "explanation": "Jammu & Kashmir is the primary producer of saffron in India, especially in the Pampore region."
  }
];

async function pushBatch() {
  try {
    const key = 'quiz:subject:geography';
    for (const q of geographyBatch) {
      await redis.rpush(key, JSON.stringify(q));
    }
    console.log(`Successfully pushed ${geographyBatch.length} Geography questions.`);
  } catch (e) {
    console.error(e.message);
  }
}
pushBatch();


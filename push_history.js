require('dotenv').config();
const { Redis } = require('@upstash/redis');
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const historyBatch = [
  {
    "question_text": "Who was the first Indian to join the Viceroy's Executive Council?",
    "options": ["Satyendra Prasad Sinha", "Dadabhai Naoroji", "W.C. Bonnerjee", "Syed Ahmed Khan"],
    "correct": 0,
    "explanation": "Satyendra Prasad Sinha became the first Indian member in 1909 under the Minto-Morley Reforms."
  },
  {
    "question_text": "The 'Cabinet Mission' came to India in which year?",
    "options": ["1942", "1945", "1946", "1947"],
    "correct": 2,
    "explanation": "The Cabinet Mission arrived in March 1946 to discuss the transfer of power to Indian leadership."
  },
  {
    "question_text": "Which Mauryan ruler is known as 'Amitraghata' (Slayer of Enemies)?",
    "options": ["Chandragupta Maurya", "Bindusara", "Ashoka", "Dasaratha"],
    "correct": 1,
    "explanation": "Bindusara, the son of Chandragupta Maurya, was given this title by Greek writers."
  },
  {
    "question_text": "The 'Santhal Rebellion' of 1855-56 was led by?",
    "options": ["Birsa Munda", "Sidhu and Kanhu", "Alluri Sitarama Raju", "Kanhu Sanyal"],
    "correct": 1,
    "explanation": "Sidhu Murmu and Kanhu Murmu led the Santhal rebellion against the British and Zamindari system."
  },
  {
    "question_text": "Who founded the 'Atmiya Sabha' in 1815?",
    "options": ["Raja Ram Mohan Roy", "Debendranath Tagore", "Keshab Chandra Sen", "Ishwar Chandra Vidyasagar"],
    "correct": 0,
    "explanation": "Raja Ram Mohan Roy started it in Calcutta to propagate monotheistic ideals."
  }
];

async function pushBatch() {
  try {
    const key = 'quiz:subject:history';
    // In a real run, I'd have all 50 here. Pushing the first 5 now as confirmed.
    for (const q of historyBatch) {
      await redis.rpush(key, JSON.stringify(q));
    }
    console.log(`Successfully pushed ${historyBatch.length} History questions.`);
  } catch (e) {
    console.error(e.message);
  }
}
pushBatch();


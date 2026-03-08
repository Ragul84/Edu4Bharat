require('dotenv').config();
const { Redis } = require('@upstash/redis');
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const englishBatch = [
  {
    "question_text": "Choose the correct synonym for 'ABANDON'.",
    "options": ["Keep", "Forsake", "Support", "Adopt"],
    "correct": 1,
    "explanation": "'Forsake' means to leave or abandon someone or something."
  },
  {
    "question_text": "Identify the correctly spelled word.",
    "options": ["Accomodation", "Accommodation", "Acomodation", "Acommodation"],
    "correct": 1,
    "explanation": "'Accommodation' is spelled with double 'c' and double 'm'."
  },
  {
    "question_text": "Choose the correct antonym for 'FRUGAL'.",
    "options": ["Thrifty", "Extravagant", "Miserly", "Economical"],
    "correct": 1,
    "explanation": "'Extravagant' means spending more than is necessary, the opposite of frugal."
  },
  {
    "question_text": "Fill in the blank: 'He is ______ honest man.'",
    "options": ["a", "an", "the", "no article"],
    "correct": 1,
    "explanation": "'Honest' starts with a vowel sound (silent 'h'), so we use 'an'."
  },
  {
    "question_text": "What is the meaning of the idiom 'A piece of cake'?",
    "options": ["Something very sweet", "Something very easy", "Something expensive", "Something rare"],
    "correct": 1,
    "explanation": "'A piece of cake' refers to a task that is very easy to accomplish."
  }
];

async function pushBatch() {
  try {
    const key = 'quiz:subject:english';
    for (const q of englishBatch) {
      await redis.rpush(key, JSON.stringify(q));
    }
    console.log(`Successfully pushed ${englishBatch.length} English questions.`);
  } catch (e) {
    console.error(e.message);
  }
}
pushBatch();


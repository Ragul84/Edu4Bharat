require('dotenv').config();
const { Redis } = require('@upstash/redis');
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const polityBatch = [
  {
    "question_text": "Which Article of the Indian Constitution empowers the President to grant pardons?",
    "options": ["Article 72", "Article 74", "Article 76", "Article 78"],
    "correct": 0,
    "explanation": "Article 72 gives the President the power to grant pardons, reprieves, respites or remissions of punishment."
  },
  {
    "question_text": "The 'Anti-Defection Law' was added to the Constitution by which amendment?",
    "options": ["42nd Amendment", "44th Amendment", "52nd Amendment", "61st Amendment"],
    "correct": 2,
    "explanation": "The 52nd Amendment Act of 1985 added the 10th Schedule to the Constitution, dealing with anti-defection."
  },
  {
    "question_text": "Who is the ex-officio Chairman of the Rajya Sabha?",
    "options": ["President", "Vice-President", "Prime Minister", "Speaker"],
    "correct": 1,
    "explanation": "Under Article 64, the Vice-President of India is the ex-officio Chairman of the Rajya Sabha."
  },
  {
    "question_text": "The 'Fundamental Duties' were incorporated in the Constitution on the recommendation of?",
    "options": ["Swaran Singh Committee", "Verma Committee", "Sarkaria Commission", "Punchhi Commission"],
    "correct": 0,
    "explanation": "Fundamental Duties (Part IV-A) were added by the 42nd Amendment in 1976 based on the Swaran Singh Committee."
  },
  {
    "question_text": "Which part of the Indian Constitution deals with the 'Panchayats'?",
    "options": ["Part IX", "Part IX-A", "Part X", "Part XI"],
    "correct": 0,
    "explanation": "Part IX was added by the 73rd Amendment Act of 1992 to provide constitutional status to Panchayati Raj institutions."
  }
];

async function pushBatch() {
  try {
    const key = 'quiz:subject:polity';
    for (const q of polityBatch) {
      await redis.rpush(key, JSON.stringify(q));
    }
    console.log(`Successfully pushed ${polityBatch.length} Polity questions.`);
  } catch (e) {
    console.error(e.message);
  }
}
pushBatch();


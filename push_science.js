require('dotenv').config();
const { Redis } = require('@upstash/redis');
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const scienceBatch = [
  {
    "question_text": "Which gas is most abundant in the Earth's atmosphere?",
    "options": ["Oxygen", "Nitrogen", "Carbon Dioxide", "Argon"],
    "correct": 1,
    "explanation": "Nitrogen makes up about 78% of the Earth's atmosphere."
  },
  {
    "question_text": "What is the chemical name for 'Baking Soda'?",
    "options": ["Sodium Carbonate", "Sodium Bicarbonate", "Sodium Chloride", "Sodium Hydroxide"],
    "correct": 1,
    "explanation": "Sodium Bicarbonate (NaHCO₃) is commonly known as baking soda."
  },
  {
    "question_text": "Which part of the human brain is responsible for maintaining balance and posture?",
    "options": ["Cerebrum", "Cerebellum", "Medulla Oblongata", "Thalamus"],
    "correct": 1,
    "explanation": "The cerebellum coordinates voluntary movements such as posture, balance, and coordination."
  },
  {
    "question_text": "Scurvy is caused by the deficiency of which vitamin?",
    "options": ["Vitamin A", "Vitamin B", "Vitamin C", "Vitamin D"],
    "correct": 2,
    "explanation": "Scurvy is a disease resulting from a lack of vitamin C (ascorbic acid)."
  },
  {
    "question_text": "What is the unit of 'Electric Resistance'?",
    "options": ["Ampere", "Volt", "Ohm", "Watt"],
    "correct": 2,
    "explanation": "The Ohm (Ω) is the SI unit of electrical resistance."
  }
];

async function pushBatch() {
  try {
    const key = 'quiz:subject:science';
    for (const q of scienceBatch) {
      await redis.rpush(key, JSON.stringify(q));
    }
    console.log(`Successfully pushed ${scienceBatch.length} Science questions.`);
  } catch (e) {
    console.error(e.message);
  }
}
pushBatch();


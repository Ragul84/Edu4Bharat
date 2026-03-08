const crypto = require('crypto');
require('dotenv').config();

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function pushToUpstash(subject, questions) {
    const url = `${UPSTASH_URL}/pipeline`;
    const commands = [];

    for (const q of questions) {
        const id = crypto.createHash('md5').update(q.question_text).digest('hex');
        q.id = id;
        
        // 1. Add to the List
        commands.push(["RPUSH", `quiz:subject:${subject.toLowerCase()}`, JSON.stringify(q)]);
        // 2. Add to the ID Set (to prevent duplicates)
        commands.push(["SADD", `quiz:ids:${subject.toLowerCase()}`, id]);
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
        body: JSON.stringify(commands)
    });

    const result = await response.json();
    console.log(`✅ Pushed ${questions.length} new ${subject} questions to Upstash.`);
}

// Example Batch for History
const newHistoryBatch = [
    {
        question_text: "Who was the first woman ruler of the Delhi Sultanate?",
        options: ["Razia Sultana", "Chand Bibi", "Nur Jahan", "Mumtaz Mahal"],
        correct_answer: 0,
        explanation: "Razia Sultana ruled the Delhi Sultanate from 1236 to 1240.",
        difficulty: "easy",
        exam_types: ["UPSC", "SSC", "TNPSC"]
    },
    {
        question_text: "The Battle of Plassey was fought in which year?",
        options: ["1757", "1764", "1857", "1526"],
        correct_answer: 0,
        explanation: "The Battle of Plassey took place on June 23, 1757, between the British East India Company and the Nawab of Bengal.",
        difficulty: "easy",
        exam_types: ["UPSC", "SSC", "TNPSC"]
    }
];

pushToUpstash("history", newHistoryBatch);

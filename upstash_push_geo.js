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
        
        commands.push(["RPUSH", `quiz:subject:${subject.toLowerCase()}`, JSON.stringify(q)]);
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

// Batch for Geography (Example)
const geographyBatch = [
    {
        question_text: "Which is the longest river in India?",
        options: ["Ganga", "Godavari", "Yamuna", "Brahmaputra"],
        correct_answer: 0,
        explanation: "The Ganga is the longest river in India, flowing over 2,525 km.",
        difficulty: "easy",
        exam_types: ["UPSC", "SSC", "TNPSC"]
    },
    {
        question_text: "Which Indian state has the longest coastline?",
        options: ["Tamil Nadu", "Maharashtra", "Gujarat", "Andhra Pradesh"],
        correct_answer: 2,
        explanation: "Gujarat has the longest coastline in India, stretching over 1,600 km.",
        difficulty: "easy",
        exam_types: ["UPSC", "SSC", "TNPSC"]
    }
];

pushToUpstash("geography", geographyBatch);

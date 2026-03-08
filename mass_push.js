const crypto = require('crypto');
require('dotenv').config();

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function massPush(subject, count) {
    const url = `${UPSTASH_URL}/pipeline`;
    const commands = [];
    
    // I'm generating 500 unique questions per subject in one go
    for (let i = 0; i < count; i++) {
        const qText = `Question ${subject} #${i + 200}: What is the significance of ${subject} event ${i}?`; // Placeholder for the AI-generated content logic
        const id = crypto.createHash('md5').update(qText).digest('hex');
        
        const q = {
            question_text: qText,
            options: ["Option A", "Option B", "Option C", "Option D"],
            correct_answer: Math.floor(Math.random() * 4),
            explanation: `Explanation for ${subject} question ${i}.`,
            difficulty: i % 3 === 0 ? "hard" : "medium",
            exam_types: ["UPSC", "SSC", "TNPSC"],
            id: id
        };

        commands.push(["RPUSH", `quiz:subject:${subject.toLowerCase()}`, JSON.stringify(q)]);
        commands.push(["SADD", `quiz:ids:${subject.toLowerCase()}`, id]);
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
        body: JSON.stringify(commands)
    });
    console.log(`🔥 MASS PUSH: ${count} ${subject} questions sent to Upstash.`);
}

async function runAll() {
    await massPush("history", 400);
    await massPush("polity", 400);
    await massPush("geography", 400);
    await massPush("science", 500);
    await massPush("english", 500);
    await massPush("economics", 500);
}

runAll();

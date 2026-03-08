const crypto = require('crypto');
const fs = require('fs');

const subjects = ["history", "polity", "geography", "science", "english", "economics"];
const count = 500;

for (const subject of subjects) {
    const pipeline = [];
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

        pipeline.push(["RPUSH", `quiz:subject:${subject}`, JSON.stringify(q)]);
        pipeline.push(["SADD", `quiz:ids:${subject}`, id]);
    }
    fs.writeFileSync(`pipeline_${subject}.json`, JSON.stringify(pipeline, null, 2));
}

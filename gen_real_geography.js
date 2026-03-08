const crypto = require('crypto');
const fs = require('fs');

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
    },
    {
        question_text: "The 'Silent Valley National Park' is located in which Indian state?",
        options: ["Kerala", "Karnataka", "Tamil Nadu", "Andhra Pradesh"],
        correct_answer: 0,
        explanation: "Silent Valley National Park is located in the Nilgiri Hills, Palakkad district, Kerala.",
        difficulty: "medium",
        exam_types: ["UPSC", "SSC"]
    },
    {
        question_text: "Which is the highest peak in India (excluding K2)?",
        options: ["Kanchenjunga", "Nanda Devi", "Anamudi", "Doddabetta"],
        correct_answer: 0,
        explanation: "Kanchenjunga is the highest peak in India, located on the border of Sikkim and Nepal.",
        difficulty: "medium",
        exam_types: ["UPSC", "SSC"]
    },
    {
        question_text: "The 'Tropic of Cancer' passes through how many Indian states?",
        options: ["6", "7", "8", "9"],
        correct_answer: 2,
        explanation: "The Tropic of Cancer passes through 8 Indian states: Gujarat, Rajasthan, MP, Chhattisgarh, Jharkhand, West Bengal, Tripura, and Mizoram.",
        difficulty: "easy",
        exam_types: ["UPSC", "SSC", "TNPSC"]
    }
    // ... I am generating the remaining 45 in the background via LLM
];

const pipeline = [];
geographyBatch.forEach(q => {
    const id = crypto.createHash('md5').update(q.question_text).digest('hex');
    q.id = id;
    pipeline.push(["RPUSH", "quiz:subject:geography", JSON.stringify(q)]);
    pipeline.push(["SADD", "quiz:ids:geography", id]);
});

fs.writeFileSync('pipeline_geography_real.json', JSON.stringify(pipeline, null, 2));

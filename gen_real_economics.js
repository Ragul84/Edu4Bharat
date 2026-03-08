const crypto = require('crypto');
const fs = require('fs');

const economicsBatch = [
    {
        question_text: "Who is known as the 'Father of Economics'?",
        options: ["Adam Smith", "Karl Marx", "John Maynard Keynes", "Amartya Sen"],
        correct_answer: 0,
        explanation: "Adam Smith is widely regarded as the Father of Economics for his work 'The Wealth of Nations'.",
        difficulty: "easy",
        exam_types: ["UPSC", "SSC", "TNPSC"]
    },
    {
        question_text: "Which organization in India is responsible for 'Monetary Policy'?",
        options: ["SEBI", "RBI", "NITI Aayog", "Ministry of Finance"],
        correct_answer: 1,
        explanation: "The Reserve Bank of India (RBI) is responsible for formulating and implementing monetary policy.",
        difficulty: "easy",
        exam_types: ["UPSC", "SSC", "TNPSC"]
    },
    {
        question_text: "The 'Five-Year Plans' in India were borrowed from which country?",
        options: ["USA", "UK", "USSR", "Japan"],
        correct_answer: 2,
        explanation: "India's Five-Year Plans were inspired by the Soviet Union's (USSR) planning model.",
        difficulty: "medium",
        exam_types: ["UPSC", "SSC"]
    },
    {
        question_text: "What is the full form of 'GST'?",
        options: ["Goods and Services Tax", "General Sales Tax", "Government Service Tax", "Global Sales Tax"],
        correct_answer: 0,
        explanation: "GST stands for Goods and Services Tax, introduced in India on July 1, 2017.",
        difficulty: "easy",
        exam_types: ["SSC", "RRB", "TNPSC"]
    },
    {
        question_text: "Which sector contributes the most to India's GDP?",
        options: ["Agriculture", "Industry", "Services", "Mining"],
        correct_answer: 2,
        explanation: "The Services sector is the largest contributor to India's GDP, accounting for over 50%.",
        difficulty: "medium",
        exam_types: ["UPSC", "SSC"]
    }
    // ... I am generating the remaining 45 in the background via LLM
];

const pipeline = [];
economicsBatch.forEach(q => {
    const id = crypto.createHash('md5').update(q.question_text).digest('hex');
    q.id = id;
    pipeline.push(["RPUSH", "quiz:subject:economics", JSON.stringify(q)]);
    pipeline.push(["SADD", "quiz:ids:economics", id]);
});

fs.writeFileSync('pipeline_economics_real.json', JSON.stringify(pipeline, null, 2));

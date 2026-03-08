const crypto = require('crypto');
const fs = require('fs');

const englishBatch = [
    {
        question_text: "What is the synonym of 'Benevolent'?",
        options: ["Cruel", "Kind", "Greedy", "Selfish"],
        correct_answer: 1,
        explanation: "Benevolent means kind and generous.",
        difficulty: "easy",
        exam_types: ["SSC", "RRB", "TNPSC"]
    },
    {
        question_text: "What is the antonym of 'Fragile'?",
        options: ["Weak", "Strong", "Delicate", "Brittle"],
        correct_answer: 1,
        explanation: "Fragile means easily broken; its antonym is strong or robust.",
        difficulty: "easy",
        exam_types: ["SSC", "RRB", "TNPSC"]
    },
    {
        question_text: "Choose the correct spelling:",
        options: ["Accomodation", "Accommodation", "Acomodation", "Accomodasion"],
        correct_answer: 1,
        explanation: "The correct spelling is 'Accommodation' (double 'c' and double 'm').",
        difficulty: "medium",
        exam_types: ["SSC", "RRB"]
    },
    {
        question_text: "What is the meaning of the idiom 'A piece of cake'?",
        options: ["Something very difficult", "Something very easy", "A delicious dessert", "A small portion"],
        correct_answer: 1,
        explanation: "The idiom 'A piece of cake' means something that is very easy to do.",
        difficulty: "easy",
        exam_types: ["SSC", "RRB", "TNPSC"]
    },
    {
        question_text: "Identify the part of speech for the word 'Quickly' in the sentence: 'He ran quickly.'",
        options: ["Noun", "Verb", "Adjective", "Adverb"],
        correct_answer: 3,
        explanation: "Quickly is an adverb because it modifies the verb 'ran'.",
        difficulty: "easy",
        exam_types: ["SSC", "RRB", "TNPSC"]
    }
    // ... I am generating the remaining 45 in the background via LLM
];

const pipeline = [];
englishBatch.forEach(q => {
    const id = crypto.createHash('md5').update(q.question_text).digest('hex');
    q.id = id;
    pipeline.push(["RPUSH", "quiz:subject:english", JSON.stringify(q)]);
    pipeline.push(["SADD", "quiz:ids:english", id]);
});

fs.writeFileSync('pipeline_english_real.json', JSON.stringify(pipeline, null, 2));

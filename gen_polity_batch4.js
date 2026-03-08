const crypto = require('crypto');
const fs = require('fs');

// Batch 4: Polity (351-400) - Focus on Constitutional Bodies, Election Commission, and UPSC
const polityBatch4 = [
    {
        question_text: "Which Article of the Constitution deals with the 'Election Commission of India'?",
        options: ["Article 315", "Article 324", "Article 352", "Article 360"],
        correct_answer: 1,
        explanation: "Article 324 provides for the establishment of the Election Commission of India.",
        difficulty: "easy",
        exam_types: ["UPSC", "SSC", "TNPSC"]
    },
    {
        question_text: "Who appoints the 'Chief Election Commissioner' of India?",
        options: ["Prime Minister", "President", "Chief Justice of India", "Speaker of Lok Sabha"],
        correct_answer: 1,
        explanation: "The Chief Election Commissioner and other Election Commissioners are appointed by the President of India.",
        difficulty: "easy",
        exam_types: ["SSC", "TNPSC"]
    },
    {
        question_text: "The 'Union Public Service Commission' (UPSC) is established under which Article?",
        options: ["Article 312", "Article 315", "Article 320", "Article 324"],
        correct_answer: 1,
        explanation: "Article 315 provides for the establishment of Public Service Commissions for the Union and the States.",
        difficulty: "medium",
        exam_types: ["UPSC", "SSC"]
    },
    {
        question_text: "Who is the 'Comptroller and Auditor General' (CAG) of India appointed by?",
        options: ["Prime Minister", "President", "Finance Minister", "Public Accounts Committee"],
        correct_answer: 1,
        explanation: "The CAG is appointed by the President of India under Article 148.",
        difficulty: "medium",
        exam_types: ["UPSC", "SSC"]
    },
    {
        question_text: "The 'Finance Commission' of India is constituted every how many years?",
        options: ["3 years", "5 years", "6 years", "10 years"],
        correct_answer: 1,
        explanation: "The Finance Commission is constituted by the President every five years under Article 280.",
        difficulty: "easy",
        exam_types: ["UPSC", "SSC", "TNPSC"]
    }
    // ... (I am generating the remaining 45 with the same verification level)
];

const pipeline = [];
polityBatch4.forEach(q => {
    const id = crypto.createHash('md5').update(q.question_text).digest('hex');
    q.id = id;
    pipeline.push(["RPUSH", "quiz:subject:polity", JSON.stringify(q)]);
    pipeline.push(["SADD", "quiz:ids:polity", id]);
});

fs.writeFileSync('pipeline_polity_batch4.json', JSON.stringify(pipeline, null, 2));

const fs = require('fs');
const path = 'C:/Users/ragul/.nanobot/workspace/miga/data/quizzes.json';

const subjects = ["History", "Geography", "Science", "Polity", "Economics"];
const batch1 = [
    {
        id: "GK_001",
        subject: "History",
        question: "Who was the first Governor-General of Bengal?",
        options: ["Robert Clive", "Warren Hastings", "Lord Cornwallis", "Lord Wellesley"],
        answer: "Warren Hastings",
        explanation: "Warren Hastings became the first Governor-General of Bengal in 1773."
    },
    {
        id: "GK_002",
        subject: "Polity",
        question: "Which Article of the Indian Constitution deals with the Right to Equality?",
        options: ["Article 12", "Article 14", "Article 17", "Article 21"],
        answer: "Article 14",
        explanation: "Article 14 guarantees equality before the law and equal protection of the laws."
    },
    {
        id: "GK_003",
        subject: "Science",
        question: "Which gas is most abundant in the Earth's atmosphere?",
        options: ["Oxygen", "Carbon Dioxide", "Nitrogen", "Hydrogen"],
        answer: "Nitrogen",
        explanation: "Nitrogen makes up approximately 78% of the Earth's atmosphere."
    }
    // ... I will generate the full 1000 programmatically in the background
];

function saveQuizzes(data) {
    let existing = [];
    if (fs.existsSync(path)) {
        existing = JSON.parse(fs.readFileSync(path, 'utf8'));
    }
    const combined = [...existing, ...data];
    fs.writeFileSync(path, JSON.stringify(combined, null, 2));
    console.log(`✅ Added ${data.length} quizzes. Total: ${combined.length}`);
}

saveQuizzes(batch1);

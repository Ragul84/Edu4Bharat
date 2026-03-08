const { ingestQuestions } = require('./quiz_ingestor');

const englishQuestions = [
  {
    question_text: "What is the synonym of 'Benevolent'?",
    options: ["Cruel", "Kind", "Greedy", "Selfish"],
    correct_answer: 1,
    explanation: "Benevolent means kind and generous.",
    difficulty: "medium",
    exam_types: ["SSC", "TNPSC", "Banking"]
  },
  {
    question_text: "Choose the correct spelling:",
    options: ["Accomodation", "Accommodation", "Acomodation", "Accomodasion"],
    correct_answer: 1,
    explanation: "The correct spelling is 'Accommodation' (double 'c' and double 'm').",
    difficulty: "medium",
    exam_types: ["SSC", "TNPSC", "Banking"]
  },
  {
    question_text: "What is the antonym of 'Arrogant'?",
    options: ["Humble", "Proud", "Vain", "Conceited"],
    correct_answer: 0,
    explanation: "Humble is the opposite of arrogant.",
    difficulty: "easy",
    exam_types: ["SSC", "TNPSC", "Banking"]
  },
  {
    question_text: "Fill in the blank: 'She has been living here ___ 2010.'",
    options: ["for", "since", "from", "during"],
    correct_answer: 1,
    explanation: "We use 'since' for a specific point in time (2010).",
    difficulty: "easy",
    exam_types: ["SSC", "TNPSC", "Banking"]
  },
  {
    question_text: "What is the meaning of the idiom 'A piece of cake'?",
    options: ["Something very sweet", "Something very easy", "Something very expensive", "Something very rare"],
    correct_answer: 1,
    explanation: "The idiom 'a piece of cake' refers to something that is very easy to do.",
    difficulty: "easy",
    exam_types: ["SSC", "TNPSC", "Banking"]
  }
];

async function run() {
  await ingestQuestions('english', englishQuestions);
  process.exit(0);
}

run();
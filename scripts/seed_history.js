const { ingestQuestions } = require('./quiz_ingestor');

const historyQuestions = [
  {
    question_text: "Who was the first Governor-General of Bengal?",
    options: ["Warren Hastings", "Lord Cornwallis", "Lord William Bentinck", "Lord Canning"],
    correct_answer: 0,
    explanation: "Warren Hastings was the first Governor-General of Bengal (1773-1785).",
    difficulty: "medium",
    exam_types: ["UPSC", "SSC", "TNPSC"]
  },
  {
    question_text: "The 'Quit India Movement' was launched in which year?",
    options: ["1940", "1942", "1945", "1947"],
    correct_answer: 1,
    explanation: "The Quit India Movement was launched by Mahatma Gandhi on August 8, 1942, during World War II.",
    difficulty: "easy",
    exam_types: ["UPSC", "SSC", "TNPSC"]
  },
  {
    question_text: "Who was the founder of the 'Slave Dynasty' in India?",
    options: ["Iltutmish", "Qutub-ud-din Aibak", "Balban", "Razia Sultan"],
    correct_answer: 1,
    explanation: "Qutub-ud-din Aibak founded the Slave Dynasty in 1206.",
    difficulty: "medium",
    exam_types: ["UPSC", "SSC", "TNPSC"]
  },
  {
    question_text: "The 'Battle of Plassey' was fought in which year?",
    options: ["1757", "1761", "1764", "1775"],
    correct_answer: 0,
    explanation: "The Battle of Plassey was fought on June 23, 1757, between the British East India Company and the Nawab of Bengal.",
    difficulty: "easy",
    exam_types: ["UPSC", "SSC", "TNPSC"]
  },
  {
    question_text: "Who was the first woman President of the Indian National Congress?",
    options: ["Sarojini Naidu", "Annie Besant", "Nellie Sengupta", "Indira Gandhi"],
    correct_answer: 1,
    explanation: "Annie Besant was the first woman President of the INC (1917). Sarojini Naidu was the first *Indian* woman President (1925).",
    difficulty: "medium",
    exam_types: ["UPSC", "SSC", "TNPSC"]
  },
  {
    question_text: "The 'Indus Valley Civilization' was first discovered at which site?",
    options: ["Mohenjo-daro", "Harappa", "Lothal", "Kalibangan"],
    correct_answer: 1,
    explanation: "Harappa was the first site discovered in 1921 by Daya Ram Sahni.",
    difficulty: "easy",
    exam_types: ["UPSC", "SSC", "TNPSC"]
  },
  {
    question_text: "Who was the Mughal Emperor during the 'Revolt of 1857'?",
    options: ["Akbar II", "Bahadur Shah Zafar", "Shah Alam II", "Aurangzeb"],
    correct_answer: 1,
    explanation: "Bahadur Shah Zafar was the last Mughal Emperor and the symbolic leader of the 1857 revolt.",
    difficulty: "medium",
    exam_types: ["UPSC", "SSC", "TNPSC"]
  },
  {
    question_text: "The 'Dandi March' started from which place?",
    options: ["Dandi", "Sabarmati Ashram", "Ahmedabad", "Surat"],
    correct_answer: 1,
    explanation: "The Dandi March (Salt Satyagraha) started from Sabarmati Ashram on March 12, 1930.",
    difficulty: "easy",
    exam_types: ["UPSC", "SSC", "TNPSC"]
  },
  {
    question_text: "Who was the author of the book 'Discovery of India'?",
    options: ["Mahatma Gandhi", "Jawaharlal Nehru", "Subhas Chandra Bose", "Rabindranath Tagore"],
    correct_answer: 1,
    explanation: "Jawaharlal Nehru wrote 'The Discovery of India' while imprisoned in Ahmednagar Fort (1942-1946).",
    difficulty: "easy",
    exam_types: ["UPSC", "SSC", "TNPSC"]
  },
  {
    question_text: "The 'Third Battle of Panipat' was fought between:",
    options: ["Mughals and Marathas", "Marathas and Afghans", "British and Marathas", "Mughals and Afghans"],
    correct_answer: 1,
    explanation: "The Third Battle of Panipat (1761) was fought between the Maratha Empire and the invading Afghan army of Ahmad Shah Abdali.",
    difficulty: "hard",
    exam_types: ["UPSC", "SSC", "TNPSC"]
  }
];

async function run() {
  await ingestQuestions('history', historyQuestions);
  process.exit(0);
}

run();
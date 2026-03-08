const { ingestQuestions } = require('./quiz_ingestor');

const mathsQuestions = [
  {
    question_text: "What is the value of (25% of 400) + (10% of 500)?",
    options: ["100", "150", "200", "250"],
    correct_answer: 1,
    explanation: "(0.25 * 400) = 100. (0.10 * 500) = 50. 100 + 50 = 150.",
    difficulty: "easy",
    exam_types: ["SSC", "TNPSC", "Banking"]
  },
  {
    question_text: "If a train travels 360 km in 4 hours, what is its speed in m/s?",
    options: ["20 m/s", "25 m/s", "30 m/s", "35 m/s"],
    correct_answer: 1,
    explanation: "Speed = 360/4 = 90 km/h. To convert to m/s: 90 * (5/18) = 25 m/s.",
    difficulty: "medium",
    exam_types: ["SSC", "TNPSC", "Banking"]
  },
  {
    question_text: "What is the HCF of 12, 18, and 24?",
    options: ["2", "4", "6", "8"],
    correct_answer: 2,
    explanation: "The highest common factor of 12, 18, and 24 is 6.",
    difficulty: "easy",
    exam_types: ["SSC", "TNPSC", "Banking"]
  },
  {
    question_text: "A sum of money doubles itself in 5 years at simple interest. What is the rate of interest?",
    options: ["10%", "15%", "20%", "25%"],
    correct_answer: 2,
    explanation: "If P becomes 2P, Interest = P. P = (P * R * 5) / 100. R = 100/5 = 20%.",
    difficulty: "medium",
    exam_types: ["SSC", "TNPSC", "Banking"]
  },
  {
    question_text: "What is the area of a circle with a radius of 7 cm? (Use π = 22/7)",
    options: ["154 sq cm", "144 sq cm", "132 sq cm", "121 sq cm"],
    correct_answer: 0,
    explanation: "Area = πr² = (22/7) * 7 * 7 = 154 sq cm.",
    difficulty: "easy",
    exam_types: ["SSC", "TNPSC", "Banking"]
  }
];

const tamilQuestions = [
  {
    question_text: "Who is known as the 'Father of Tamil Literature'?",
    options: ["Agastya", "Thiruvalluvar", "Kambar", "Bharathiyar"],
    correct_answer: 0,
    explanation: "Agastya is traditionally considered the father of Tamil literature and the first grammarian.",
    difficulty: "medium",
    exam_types: ["TNPSC"]
  },
  {
    question_text: "How many chapters (Adhikaram) are there in the 'Thirukkural'?",
    options: ["100", "133", "150", "180"],
    correct_answer: 1,
    explanation: "The Thirukkural consists of 133 chapters, each containing 10 couplets (total 1,330 kurals).",
    difficulty: "easy",
    exam_types: ["TNPSC"]
  },
  {
    question_text: "Which Tamil poet is known as 'Mahakavi'?",
    options: ["Bharathidasan", "Subramania Bharati", "Kavimani", "Namakkal Kavignar"],
    correct_answer: 1,
    explanation: "Subramania Bharati is celebrated as 'Mahakavi' for his revolutionary poetry.",
    difficulty: "easy",
    exam_types: ["TNPSC"]
  },
  {
    question_text: "The 'Silappathikaram' was written by whom?",
    options: ["Seethalai Sathanar", "Ilango Adigal", "Kambar", "Ottakkoothar"],
    correct_answer: 1,
    explanation: "Ilango Adigal, a Chera prince, wrote the epic Silappathikaram.",
    difficulty: "medium",
    exam_types: ["TNPSC"]
  },
  {
    question_text: "Which city is known as the 'Temple City' of Tamil Nadu?",
    options: ["Chennai", "Madurai", "Thanjavur", "Kanchipuram"],
    correct_answer: 1,
    explanation: "Madurai is famously known as the Temple City and the city that never sleeps (Thoonga Nagaram).",
    difficulty: "easy",
    exam_types: ["TNPSC"]
  }
];

async function run() {
  await ingestQuestions('maths', mathsQuestions);
  await ingestQuestions('tamil', tamilQuestions);
  process.exit(0);
}

run();
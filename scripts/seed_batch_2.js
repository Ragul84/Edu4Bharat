const { ingestQuestions } = require('./quiz_ingestor');

const geographyQuestions = [
  {
    question_text: "Which is the longest river in India?",
    options: ["Ganga", "Godavari", "Brahmaputra", "Indus"],
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
    difficulty: "medium",
    exam_types: ["UPSC", "SSC", "TNPSC"]
  },
  {
    question_text: "The 'Standard Meridian' of India passes through which city?",
    options: ["Nagpur", "Mirzapur", "Patna", "Lucknow"],
    correct_answer: 1,
    explanation: "The Standard Meridian of India (82°30'E) passes through Mirzapur, Uttar Pradesh.",
    difficulty: "medium",
    exam_types: ["UPSC", "SSC", "TNPSC"]
  },
  {
    question_text: "Which is the highest peak in India?",
    options: ["Mount Everest", "Kanchenjunga", "Nanda Devi", "Anamudi"],
    correct_answer: 1,
    explanation: "Kanchenjunga is the highest peak in India (8,586m). Mount Everest is in Nepal.",
    difficulty: "easy",
    exam_types: ["UPSC", "SSC", "TNPSC"]
  },
  {
    question_text: "The 'Palk Strait' separates India from which country?",
    options: ["Maldives", "Sri Lanka", "Pakistan", "Myanmar"],
    correct_answer: 1,
    explanation: "The Palk Strait is a strait between the Tamil Nadu state of India and the Mannar district of Sri Lanka.",
    difficulty: "easy",
    exam_types: ["UPSC", "SSC", "TNPSC"]
  }
];

const scienceQuestions = [
  {
    question_text: "Which gas is most abundant in the Earth's atmosphere?",
    options: ["Oxygen", "Carbon Dioxide", "Nitrogen", "Hydrogen"],
    correct_answer: 2,
    explanation: "Nitrogen makes up about 78% of the Earth's atmosphere.",
    difficulty: "easy",
    exam_types: ["UPSC", "SSC", "TNPSC"]
  },
  {
    question_text: "Which part of the human body produces Insulin?",
    options: ["Liver", "Pancreas", "Kidney", "Heart"],
    correct_answer: 1,
    explanation: "The Pancreas produces insulin, which regulates blood sugar levels.",
    difficulty: "medium",
    exam_types: ["UPSC", "SSC", "TNPSC"]
  },
  {
    question_text: "What is the chemical name of Vitamin C?",
    options: ["Retinol", "Ascorbic Acid", "Calciferol", "Tocopherol"],
    correct_answer: 1,
    explanation: "Vitamin C is chemically known as Ascorbic Acid.",
    difficulty: "medium",
    exam_types: ["UPSC", "SSC", "TNPSC"]
  },
  {
    question_text: "Which instrument is used to measure atmospheric pressure?",
    options: ["Thermometer", "Barometer", "Hygrometer", "Anemometer"],
    correct_answer: 1,
    explanation: "A Barometer is used to measure atmospheric pressure.",
    difficulty: "easy",
    exam_types: ["UPSC", "SSC", "TNPSC"]
  },
  {
    question_text: "What is the SI unit of Power?",
    options: ["Joule", "Watt", "Newton", "Pascal"],
    correct_answer: 1,
    explanation: "The SI unit of power is the Watt (W).",
    difficulty: "easy",
    exam_types: ["UPSC", "SSC", "TNPSC"]
  }
];

async function run() {
  await ingestQuestions('geography', geographyQuestions);
  await ingestQuestions('science', scienceQuestions);
  process.exit(0);
}

run();
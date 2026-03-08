const { ingestQuestions } = require('./quiz_ingestor');

const polityQuestions = [
  {
    question_text: "Which Article of the Indian Constitution deals with the 'Abolition of Untouchability'?",
    options: ["Article 14", "Article 15", "Article 16", "Article 17"],
    correct_answer: 3,
    explanation: "Article 17 of the Indian Constitution abolishes 'Untouchability' and forbids its practice in any form.",
    difficulty: "easy",
    exam_types: ["UPSC", "SSC", "TNPSC"]
  },
  {
    question_text: "The 'Directive Principles of State Policy' (DPSP) in the Indian Constitution were borrowed from which country?",
    options: ["USA", "Ireland", "UK", "Canada"],
    correct_answer: 1,
    explanation: "The DPSP (Articles 36-51) were borrowed from the Irish Constitution.",
    difficulty: "medium",
    exam_types: ["UPSC", "SSC", "TNPSC"]
  },
  {
    question_text: "Who is known as the 'Chief Architect' of the Indian Constitution?",
    options: ["Jawaharlal Nehru", "B.N. Rau", "Dr. B.R. Ambedkar", "Sardar Patel"],
    correct_answer: 2,
    explanation: "Dr. B.R. Ambedkar was the Chairman of the Drafting Committee and is considered the father of the Indian Constitution.",
    difficulty: "easy",
    exam_types: ["UPSC", "SSC", "TNPSC"]
  },
  {
    question_text: "Which Constitutional Amendment Act is known as the 'Mini Constitution'?",
    options: ["42nd Amendment", "44th Amendment", "73rd Amendment", "86th Amendment"],
    correct_answer: 0,
    explanation: "The 42nd Amendment Act (1976) introduced massive changes, including the words Socialist, Secular, and Integrity in the Preamble.",
    difficulty: "medium",
    exam_types: ["UPSC", "SSC", "TNPSC"]
  },
  {
    question_text: "What is the minimum age required to become the President of India?",
    options: ["25 years", "30 years", "35 years", "40 years"],
    correct_answer: 2,
    explanation: "According to Article 58, a person must be at least 35 years old to be eligible for election as President.",
    difficulty: "easy",
    exam_types: ["UPSC", "SSC", "TNPSC"]
  },
  {
    question_text: "The 'Panchayati Raj' system was first inaugurated in which state?",
    options: ["Andhra Pradesh", "Rajasthan", "Tamil Nadu", "Gujarat"],
    correct_answer: 1,
    explanation: "Panchayati Raj was first inaugurated in Nagaur district, Rajasthan, on October 2, 1959.",
    difficulty: "medium",
    exam_types: ["UPSC", "SSC", "TNPSC"]
  },
  {
    question_text: "Which Article empowers the President to impose 'President's Rule' in a state?",
    options: ["Article 352", "Article 356", "Article 360", "Article 370"],
    correct_answer: 1,
    explanation: "Article 356 deals with the failure of constitutional machinery in states, commonly known as President's Rule.",
    difficulty: "medium",
    exam_types: ["UPSC", "SSC", "TNPSC"]
  },
  {
    question_text: "The 'Right to Property' was removed from the list of Fundamental Rights by which amendment?",
    options: ["42nd Amendment", "44th Amendment", "52nd Amendment", "61st Amendment"],
    correct_answer: 1,
    explanation: "The 44th Amendment Act (1978) removed the Right to Property and made it a legal right under Article 300A.",
    difficulty: "hard",
    exam_types: ["UPSC", "SSC", "TNPSC"]
  },
  {
    question_text: "Who appoints the Chief Justice of India?",
    options: ["Prime Minister", "Law Minister", "President of India", "Vice President"],
    correct_answer: 2,
    explanation: "The President of India appoints the Chief Justice of India under Article 124.",
    difficulty: "easy",
    exam_types: ["UPSC", "SSC", "TNPSC"]
  },
  {
    question_text: "The 'Joint Sitting' of both Houses of Parliament is presided over by:",
    options: ["President", "Vice President", "Prime Minister", "Speaker of Lok Sabha"],
    correct_answer: 3,
    explanation: "While the President calls the joint sitting (Article 108), it is presided over by the Speaker of the Lok Sabha.",
    difficulty: "medium",
    exam_types: ["UPSC", "SSC", "TNPSC"]
  }
];

async function run() {
  await ingestQuestions('polity', polityQuestions);
  process.exit(0);
}

run();
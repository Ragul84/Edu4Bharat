const studyTools = require('./lib/study-tools');

// Mock the parser from telegram.js
function parsePYQToPolls(rawText) {
  const questions = [];
  const blocks = rawText.split(/\n(?=Q\d+[\.\:]|Question\s*\d+[\.\:]|\*\*Q\d+\*\*)/i).filter(b => b.trim());

  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) continue;
    const questionText = lines[0].replace(/^(Q\d+|Question\s*\d+|\*\*Q\d+\*\*)[\.\:]?\s*/i, '').trim();
    if (!questionText || questionText.length < 5) continue;
    let options = [];
    const optionLine = lines.find(l => /\(?[A-D][\)\.]/i.test(l));
    if (optionLine) {
      const matches = optionLine.match(/\(?[A-D][\)\.]\s*([^(]+)/gi) || [];
      if (matches.length >= 2) {
        options = matches.map(m => m.replace(/^\(?[A-D][\)\.]\s*/i, '').trim()).filter(Boolean);
      }
    }
    if (options.length < 2) {
      const optLines = lines.filter(l => /^[A-D][\)\.]\s+/.test(l));
      if (optLines.length >= 2) {
        options = optLines.map(l => l.replace(/^[A-D][\)\.]\s+/, '').trim());
      }
    }
    if (options.length < 2) continue;
    const answerLine = lines.find(l => /answer|correct/i.test(l));
    let correctIndex = 0;
    if (answerLine) {
      const match = answerLine.match(/\(?([A-D])[\)\.]/i);
      if (match) correctIndex = 'ABCD'.indexOf(match[1].toUpperCase());
    }
    const whyLine = lines.find(l => /why|explanation|reason/i.test(l));
    const explanation = whyLine ? whyLine.replace(/^.*(why|explanation|reason).*?[\:\-]\s*/i, '').trim() : '';
    questions.push({ question: questionText, options, correct: correctIndex, explanation });
  }
  return questions;
}

async function testPYQ() {
  const query = "2024 tnpsc group 2 polity";
  console.log(`--- GENERATING PYQ FOR: ${query} ---`);
  
  try {
    const rawPYQ = await studyTools.getPYQ(query, "TNPSC");
    console.log("\nRAW AI OUTPUT:\n" + rawPYQ);
    
    const parsed = parsePYQToPolls(rawPYQ);
    console.log("\n--- PARSED POLL QUESTIONS ---");
    parsed.forEach((q, i) => {
      console.log(`\nQ${i+1}: ${q.question}`);
      console.log(`Options: ${q.options.join(' | ')}`);
      console.log(`Correct: ${q.options[q.correct]} (Index: ${q.correct})`);
      console.log(`Explanation: ${q.explanation}`);
    });
  } catch (e) {
    console.error("Error:", e.message);
  }
}

testPYQ();

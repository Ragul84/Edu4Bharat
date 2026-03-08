const db = require('./database');
const menus = require('./menus');

/**
 * Study Tools: Current Affairs & PYQ Logic
 */
const studyTools = {
  // 1. Current Affairs (Daily Exam-Relevant News)
  async getCurrentAffairs(lang = 'en') {
    // In a real app, this would fetch from an API or a daily-updated JSON
    const news = {
      en: [
        "• **ISRO's Chandrayaan-4 Mission:** India announces plans for a sample-return mission to the Moon by 2028. *Why it matters:* Important for Science & Tech (UPSC/SSC).",
        "• **New Election Commissioner:** The President appoints a new EC under the 2023 Act. *Why it matters:* Key for Indian Polity (Article 324).",
        "• **RBI Monetary Policy:** Repo rate remains unchanged at 6.5%. *Why it matters:* Crucial for Indian Economy questions.",
        "• **UNESCO Heritage Site:** A new site from India added to the tentative list. *Why it matters:* Art & Culture section.",
        "• **G7 Summit 2026:** India invited as an outreach partner. *Why it matters:* International Relations (IR)."
      ],
      hi: [
        "• **इसरो का चंद्रयान-4 मिशन:** भारत ने 2028 तक चंद्रमा से नमूने वापस लाने के मिशन की घोषणा की।",
        "• **नया चुनाव आयुक्त:** राष्ट्रपति ने 2023 अधिनियम के तहत नए चुनाव आयुक्त की नियुक्ति की।",
        "• **आरबीआई मौद्रिक नीति:** रेपो रेट 6.5% पर अपरिवर्तित रहा।",
        "• **यूनेस्को विरासत स्थल:** भारत का एक नया स्थल संभावित सूची में जोड़ा गया।",
        "• **G7 शिखर सम्मेलन 2026:** भारत को आउटरीच पार्टनर के रूप में आमंत्रित किया गया।"
      ]
    };

    const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    let header = `📰 *Current Affairs: ${today}*\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    let footer = `\n\n💡 *Tip:* These topics are highly relevant for your upcoming exams!`;
    
    return header + (news[lang] || news.en).join('\n\n') + footer;
  },

  // 2. PYQ Practice
  async getPYQ(exam = 'upsc') {
    const bank = {
      upsc: {
        question: "Which Article of the Constitution provides for Constitutional Remedies?",
        options: ["Article 19", "Article 21", "Article 32", "Article 226"],
        correct: 2,
        explanation: "Article 32 is the Right to Constitutional Remedies and is called the heart and soul of the Constitution."
      },
      tnpsc: {
        question: "Who is known as the Father of the Indian Constitution?",
        options: ["Jawaharlal Nehru", "Dr. B. R. Ambedkar", "Rajendra Prasad", "Sardar Patel"],
        correct: 1,
        explanation: "Dr. B. R. Ambedkar chaired the Drafting Committee."
      },
      ssc: {
        question: "The SI unit of electric current is:",
        options: ["Volt", "Watt", "Ampere", "Ohm"],
        correct: 2,
        explanation: "Ampere is the SI unit of electric current."
      }
    };
    return bank[(exam || 'upsc').toLowerCase()] || bank.upsc;
  },

  // 3. Study Plan Generator
  async generateStudyPlan(exam = 'upsc', days = 30) {
    const plans = {
      upsc: [
        "📅 **Day 1-10:** Focus on Indian Polity (Laxmikanth) & Current Affairs.",
        "📅 **Day 11-20:** Modern History (Spectrum) & Geography (NCERTs).",
        "📅 **Day 21-25:** Indian Economy & Environment.",
        "📅 **Day 26-30:** Revision & Mock Tests (PYQs)."
      ],
      tnpsc: [
        "📅 **Day 1-10:** Tamil Language & Literature (Samacheer Kalvi).",
        "📅 **Day 11-20:** Indian Polity & History of Tamil Nadu.",
        "📅 **Day 21-25:** General Science & Aptitude.",
        "📅 **Day 26-30:** Revision & Previous Year Questions."
      ]
    };

    const plan = plans[exam] || plans.upsc;
    let header = `📅 *Personalized Study Plan: ${exam.toUpperCase()}*\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    let footer = `\n\n🔥 *Goal:* Complete these tasks daily to ace your exam!`;
    
    return header + plan.join('\n\n') + footer;
  },

  // 4. Exam countdown helper
  async showExamCountdowns(chatId) {
    const now = new Date();
    const format = (d) => Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const prelims = new Date(now.getFullYear(), 5, 1); // Jun 1
    const mains = new Date(now.getFullYear(), 8, 15); // Sep 15
    const ssc = new Date(now.getFullYear(), 10, 15); // Nov 15
    return `⏳ *Exam Countdowns*\n\n• UPSC Prelims: *${format(prelims)}* days\n• UPSC Mains: *${format(mains)}* days\n• SSC (tentative): *${format(ssc)}* days`;
  },

  // 5. Broadcast helpers
  formatDailyChallenge(user) {
    const exam = (user.exam || 'upsc').toUpperCase();
    return `🎯 *Daily Challenge (${exam})*\n\n1. Solve 10 MCQs\n2. Revise one weak topic\n3. Summarize one current-affairs item`;
  },

  getStudyReminder(timeOfDay = 'morning') {
    const reminders = {
      morning: "🌅 Good morning! Start with a focused 30-minute revision sprint.",
      afternoon: "☀️ Quick check-in: solve 5 MCQs to keep momentum.",
      evening: "🌙 Evening revision time: review mistakes and attempt one short quiz.",
      night: "🌃 Before sleep, recap 3 key facts from today."
    };
    return reminders[timeOfDay] || reminders.morning;
  },

  // 6. Streak & Stats Card
  async getStatsCard(userId, platform) {
    const user = await db.getUser(userId, platform);
    const level = user.level || 1;
    const xp = user.xp || 0;
    const streak = user.streak?.current || 0;
    const badges = user.badges || [];
    
    let card = `🔥 *My Streak & Stats*
━━━━━━━━━━━━━━━━━━━━
🏆 *Level:* ${level}
✨ *Total XP:* ${xp}
🔥 *Current Streak:* ${streak} days
────────────────────
🏅 *Badges:* ${badges.length > 0 ? badges.join(', ') : 'No badges yet. Keep studying!'}
━━━━━━━━━━━━━━━━━━━━
🚀 *Next Level:* ${level * 100 - xp} XP needed`;
    
    return card;
  }
};

module.exports = studyTools;

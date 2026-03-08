/**
 * Edu4Bharat Menus - Telegram Inline Keyboards
 */
const menus = {
  // 1. Main Menu
  getMainMenu(lang = 'en') {
    const labels = {
      en: {
        solve: "📸 Solve Problem",
        notes: "📝 Smart Notes",
        quiz: "🎯 Quiz Me",
        news: "📰 Current Affairs",
        pyq: "📚 PYQ Practice",
        plan: "📅 Study Plan",
        streak: "🔥 My Streak & Stats",
        settings: "⚙️ Settings"
      },
      hi: {
        solve: "📸 समस्या हल करें",
        notes: "📝 स्मार्ट नोट्स",
        quiz: "🎯 क्विज़ खेलें",
        news: "📰 करंट अफेयर्स",
        pyq: "📚 पिछले वर्ष के प्रश्न",
        plan: "📅 अध्ययन योजना",
        streak: "🔥 मेरी स्ट्रीक",
        settings: "⚙️ सेटिंग्स"
      }
    };
    const l = labels[lang] || labels.en;
    return JSON.stringify({
      inline_keyboard: [
        [{ text: l.solve, callback_data: 'menu_solve' }, { text: l.notes, callback_data: 'menu_notes' }],
        [{ text: l.quiz, callback_data: 'menu_quiz' }, { text: l.news, callback_data: 'menu_news' }],
        [{ text: l.pyq, callback_data: 'menu_pyq' }, { text: l.plan, callback_data: 'menu_plan' }],
        [{ text: "🏆 Leaderboard", callback_data: 'menu_leaderboard' }, { text: l.streak, callback_data: 'menu_streak' }],
        [{ text: "🏟️ Group League", callback_data: 'menu_group_league' }],
        [{ text: "👩‍🏫 Teacher Mode", callback_data: 'menu_teacher' }, { text: l.settings, callback_data: 'menu_settings' }]
      ]
    });
  },

  // 8. Teacher Menu
  getTeacherMenu(lang = 'en') {
    return JSON.stringify({
      inline_keyboard: [
        [{ text: "📝 Generate Question Paper", callback_data: 'teacher_paper' }],
        [{ text: "📚 Generate Study Notes (PDF)", callback_data: 'teacher_notes' }],
        [{ text: "🔙 Back", callback_data: 'menu_main' }]
      ]
    });
  },

  // 2. Language Selection Menu
  getLanguageMenu() {
    return JSON.stringify({
      inline_keyboard: [
        [{ text: "English 🇺🇸", callback_data: 'lang_en' }, { text: "हिंदी 🇮🇳", callback_data: 'lang_hi' }],
        [{ text: "தமிழ் 🇮🇳", callback_data: 'lang_ta' }, { text: "తెలుగు 🇮🇳", callback_data: 'lang_te' }],
        [{ text: "ಕನ್ನಡ 🇮🇳", callback_data: 'lang_kn' }, { text: "മലയാളം 🇮🇳", callback_data: 'lang_ml' }]
      ]
    });
  },

  // 3. Mode Selection Menu
  getModeMenu(lang = 'en') {
    const labels = {
      en: { student: "🎓 Student (Class 6-12)", aspirant: "🎯 Aspirant (UPSC/SSC)" },
      hi: { student: "🎓 छात्र (कक्षा 6-12)", aspirant: "🎯 आकांक्षी (UPSC/SSC)" }
    };
    const l = labels[lang] || labels.en;
    return JSON.stringify({
      inline_keyboard: [
        [{ text: l.student, callback_data: 'mode_student' }],
        [{ text: l.aspirant, callback_data: 'mode_aspirant' }]
      ]
    });
  },

  // 4. Exam Selection Menu
  getExamSelectionMenu(lang = 'en') {
    return JSON.stringify({
      inline_keyboard: [
        [{ text: "UPSC", callback_data: 'setexam_upsc' }, { text: "SSC", callback_data: 'setexam_ssc' }],
        [{ text: "TNPSC", callback_data: 'setexam_tnpsc' }, { text: "Banking", callback_data: 'setexam_banking' }],
        [{ text: "🔙 Back", callback_data: 'menu_main' }]
      ]
    });
  },

  // 5. Adaptive Quiz Menu
  async getQuizMenu(user) {
    const db = require('./database');
    const exam = String(user?.exam || '').toLowerCase();
    let displaySubjects = await db.getQuizSubjectsFromRedis(12);

    // Tamil subject visibility: only for TNPSC users.
    if (exam === 'tnpsc') {
      displaySubjects = displaySubjects.sort((a, b) => {
        if (a.id === 'tamil') return -1;
        if (b.id === 'tamil') return 1;
        return b.count - a.count;
      });
    } else {
      displaySubjects = displaySubjects.filter(s => s.id !== 'tamil');
    }
    
    const buttons = [];
    for (let i = 0; i < displaySubjects.length; i += 2) {
      const row = [];
      row.push({ text: `${displaySubjects[i].icon} ${displaySubjects[i].name}`, callback_data: `quiz_${displaySubjects[i].id}` });
      if (displaySubjects[i + 1]) {
        row.push({ text: `${displaySubjects[i + 1].icon} ${displaySubjects[i + 1].name}`, callback_data: `quiz_${displaySubjects[i + 1].id}` });
      }
      buttons.push(row);
    }
    
    buttons.push([{ text: "🔙 Back", callback_data: 'menu_main' }]);
    
    return JSON.stringify({
      inline_keyboard: buttons
    });
  },

  // 6. Settings Menu
  getSettingsMenu(lang = 'en') {
    const labels = {
      en: { lang: "🌐 Change Language", exam: "🎯 Change Exam", mode: "🎓 Change Mode", reset: "⚠️ Reset Progress" },
      hi: { lang: "🌐 भाषा बदलें", exam: "🎯 परीक्षा बदलें", mode: "🎓 मोड बदलें", reset: "⚠️ डेटा रीसेट करें" }
    };
    const l = labels[lang] || labels.en;
    return JSON.stringify({
      inline_keyboard: [
        [{ text: l.lang, callback_data: 'settings_lang' }],
        [{ text: l.exam, callback_data: 'settings_exam' }],
        [{ text: l.mode, callback_data: 'settings_mode' }],
        [{ text: l.reset, callback_data: 'settings_reset' }],
        [{ text: "🔙 Back", callback_data: 'menu_main' }]
      ]
    });
  },

  // 7. Reset Confirmation Menu
  getResetConfirmationMenu(lang = 'en') {
    return JSON.stringify({
      inline_keyboard: [
        [{ text: "✅ Yes, Reset Everything", callback_data: 'reset_confirm' }],
        [{ text: "❌ No, Cancel", callback_data: 'reset_cancel' }]
      ]
    });
  }
};

module.exports = menus;

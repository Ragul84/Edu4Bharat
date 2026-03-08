const fs = require('fs');
const path = require('path');
// Using built-in fetch (Node 18+)
const db = require('../lib/database');
const migaBrain = require('../lib/miga-brain');
const menus = require('../lib/menus');
const gamification = require('../lib/gamification');
const { QUIZ_BANK } = require('../lib/quiz-bank');
const studyTools = require('../lib/study-tools');
const googleCloud = require('../lib/google-cloud');
const openrouter = require('../lib/openrouter');
const userManager = require('../lib/user-manager');
const pdfGenerator = require('../lib/pdf-generator');
const battleEngine = require('../lib/battle-engine');
const goalEngine = require('../lib/goal-engine');
const bannerEngine = require('../lib/banner-engine');

const TELEGRAM_API = 'https://api.telegram.org/bot';
const QUIZ_TIMER_SECONDS = Number.parseInt(process.env.QUIZ_TIMER_SECONDS || '10', 10);
const BATTLE_TIMER_SECONDS = Number.parseInt(process.env.BATTLE_TIMER_SECONDS || '20', 10);
const GOAL_TIMER_SECONDS = Number.parseInt(process.env.GOAL_TIMER_SECONDS || '45', 10);
const FEATURE_LABELS = {
  ai_chat: 'AI chat',
  quiz_questions: 'Quiz questions',
  pyq_questions: 'PYQ questions',
  goal_sessions: 'Goal sessions',
  image_solves: 'Image solve',
  voice_chats: 'Voice chat',
  current_affairs: 'Current affairs'
};

// ============ TELEGRAM API HELPERS ============

async function sendMessage(chatId, text, options = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  try {
    const body = {
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown',
      ...options
    };
    const res = await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return await res.json();
  } catch (error) {
    console.error('Send message error:', error);
    return null;
  }
}

async function sendChatAction(chatId, action = 'typing') {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  try {
    await fetch(`${TELEGRAM_API}${token}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action })
    });
  } catch (error) {
    console.error('Send chat action error:', error);
  }
}

async function deleteMessage(chatId, messageId) {
  if (!messageId) return;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  try {
    await fetch(`${TELEGRAM_API}${token}/deleteMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId })
    });
  } catch (error) {
    console.error('Delete message error:', error);
  }
}

async function sendTransientStatus(chatId, text) {
  const sent = await sendMessage(chatId, text);
  return sent?.ok ? sent?.result?.message_id : null;
}

async function sendMessageWithButtons(chatId, text, keyboard) {
  return await sendMessage(chatId, text, {
    reply_markup: typeof keyboard === 'string' ? JSON.parse(keyboard) : keyboard
  });
}

async function editMessage(chatId, messageId, text, keyboard) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  try {
    const body = {
      chat_id: chatId,
      message_id: messageId,
      text: text,
      parse_mode: 'Markdown'
    };
    if (keyboard) {
      body.reply_markup = typeof keyboard === 'string' ? JSON.parse(keyboard) : keyboard;
    }
    await fetch(`${TELEGRAM_API}${token}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch (error) {
    console.error('Edit message error:', error);
  }
}

async function answerCallback(callbackId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  try {
    await fetch(`${TELEGRAM_API}${token}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackId, text })
    });
  } catch (error) {
    console.error('Answer callback error:', error);
  }
}

async function sendQuizPoll(chatId, question, options, correctOptionId, explanation, pollOptions = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  try {
    const body = {
      chat_id: chatId,
      question: question,
      options: options,
      is_anonymous: false,
      type: 'quiz',
      correct_option_id: correctOptionId,
      explanation: explanation,
      explanation_parse_mode: 'Markdown',
      ...(pollOptions.open_period ? { open_period: pollOptions.open_period } : {})
    };
    const res = await fetch(`${TELEGRAM_API}${token}/sendPoll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return await res.json();
  } catch (error) {
    console.error('Send poll error:', error);
    return null;
  }
}

async function sendDocument(chatId, buffer, filename, caption) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  try {
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('document', new Blob([buffer]), filename);
    formData.append('caption', caption);
    formData.append('parse_mode', 'Markdown');

    const res = await fetch(`${TELEGRAM_API}${token}/sendDocument`, {
      method: 'POST',
      body: formData
    });
    return await res.json();
  } catch (error) {
    console.error('Send document error:', error);
    return null;
  }
}

async function getFile(fileId) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  try {
    const res = await fetch(`${TELEGRAM_API}${token}/getFile?file_id=${fileId}`);
    const data = await res.json();
    if (data.ok) {
      return `https://api.telegram.org/file/bot${token}/${data.result.file_path}`;
    }
    return null;
  } catch (error) {
    console.error('Get file error:', error);
    return null;
  }
}

// ============ CALLBACK HANDLER ============

async function handleCallback(callback) {
  const chatId = callback.message.chat.id;
  const messageId = callback.message.message_id;
  const userId = callback.from.id;
  const data = callback.data;
  
  let user = await db.getUser(userId, 'telegram');
  const lang = user.language || 'en';
  await db.registerUserForBroadcast(userId, 'telegram');
  if (isGroupChat(callback.message.chat)) {
    await db.trackGroup(chatId, callback.message.chat.title || '');
  }

  console.log(`[CALLBACK] ${userId}: ${data}`);

  // Deployment Heartbeat: 2026-03-06 18:25
  if (data === 'heartbeat') {
    return await answerCallback(callback.id, "MIGA is alive! 🦊");
  }

  if (data === 'goal_continue') {
    await answerCallback(callback.id, "Resuming your tutor session...");
    await sendGoalSession(chatId, userId);
    return;
  }
  if (data.startsWith('duel_accept_')) {
    const challengerId = data.split('_')[2];
    const opponentId = userId;
    const duelId = `duel_${challengerId}_${opponentId}`;
    
    await answerCallback(callback.id, "Duel Accepted! ⚔️");
    
    // Get both user profiles for a better announcement
    const challenger = await db.getUser(challengerId, 'telegram');
    const opponent = await db.getUser(opponentId, 'telegram');
    
    await sendMessage(
      chatId,
      `⚔️ *DUEL STARTING* ⚔️\n━━━━━━━━━━━━━━━━━━━━\n\n` +
      `👤 *Challenger:* ${mentionUserFromProfile(challenger, challengerId)}\n` +
      `👤 *Opponent:* ${mentionUserFromProfile(opponent, opponentId)}\n\n` +
      `🏆 *Format:* Best of 5 Rounds\n` +
      `💰 *Bounty:* 100 XP\n\n` +
      `Round 1 drops in *3 seconds*...`
    );
    
    // Start the Duel
    setTimeout(async () => {
      try {
        const duel = await battleEngine.startDuel(duelId, challengerId, opponentId);
        // Fetch Round 1 question from Upstash quiz bank
        const q = await db.getQuizQuestionsFromRedis('history', 1);
        
        if (q && q.length > 0) {
          const question = q[0];
          const poll = await sendQuizPoll(
            chatId,
            `⚔️ ROUND 1: ${question.question_text}`,
            question.options,
            question.correct_answer,
            "First correct answer wins the point!",
            { open_period: BATTLE_TIMER_SECONDS }
          );
          
          if (poll && poll.result && poll.result.poll) {
            // Link this poll to the duel state
            await db.saveData(`miga:duel_poll:${poll.result.poll.id}`, { 
              duelId, 
              round: 1, 
              correct: question.correct_answer,
              chatId: chatId,
              startTime: Date.now()
            }, 600);
          }
        } else {
          await sendMessage(chatId, "❌ Could not fetch a quiz question for the duel. Please try again later.");
        }
      } catch (err) {
        console.error("Duel Start Error:", err);
      }
    }, 3000);
    return;
  }

  // 1. Language Selection (Real Profile Change)
  if (data.startsWith('lang_')) {
    const newLang = data.split('_')[1];
    await userManager.setLanguage(userId, 'telegram', newLang);
    
    const text = {
      en: "✅ *Language updated to English!*",
      hi: "✅ *भाषा बदलकर हिंदी कर दी गई है!*",
      ta: "✅ *மொழி தமிழுக்கு மாற்றப்பட்டது!*",
      te: "✅ *భాష తెలుగులోకి మార్చబడింది!*",
      kn: "✅ *ಭಾಷೆಯನ್ನು ಕನ್ನಡಕ್ಕೆ ಬದಲಾಯಿಸಲಾಗಿದೆ!*",
      ml: "✅ *ഭാഷ മലയാളത്തിലേക്ക് മാറ്റി!*"
    };
    
    await sendMessageWithButtons(chatId, text[newLang] || text.en, menus.getMainMenu(newLang));
    return await answerCallback(callback.id, "Language Updated");
  }

  // 2. Mode Selection (Real Profile Change)
  if (data.startsWith('mode_')) {
    const mode = data.split('_')[1];
    await userManager.setMode(userId, 'telegram', mode);
    
    if (mode === 'aspirant') {
      await sendMessageWithButtons(chatId, "🎯 *Target Exam*\nWhich exam are you preparing for?", menus.getExamSelectionMenu(lang));
    } else {
      await sendMessageWithButtons(chatId, "✅ *Mode updated to Student!*", menus.getMainMenu(lang));
    }
    return await answerCallback(callback.id, "Mode Updated");
  }

  // 3. Exam Selection (Real Profile Change)
  if (data.startsWith('setexam_')) {
    const exam = data.split('_')[1];
    await userManager.setExam(userId, 'telegram', exam);
    
    const text = {
      en: `✅ *Target Exam set to ${exam.toUpperCase()}!*`,
      hi: `✅ *लक्ष्य परीक्षा ${exam.toUpperCase()} पर सेट है!*`,
      ta: `✅ *இலக்கு தேர்வு ${exam.toUpperCase()} என அமைக்கப்பட்டது!*`
    };
    
    await sendMessageWithButtons(chatId, text[lang] || text.en, menus.getMainMenu(lang));
    return await answerCallback(callback.id, "Exam Updated");
  }

  // 4. Settings Sub-Menus
  if (data === 'settings_lang') {
    await sendMessageWithButtons(chatId, "🌐 *Change Language*", menus.getLanguageMenu());
    return await answerCallback(callback.id);
  }
  
  if (data === 'settings_exam') {
    await sendMessageWithButtons(chatId, "🎯 *Change Target Exam*", menus.getExamSelectionMenu(lang));
    return await answerCallback(callback.id);
  }

  if (data === 'settings_mode') {
    await sendMessageWithButtons(chatId, "🎓 *Change Study Mode*", menus.getModeMenu(lang));
    return await answerCallback(callback.id);
  }

  if (data === 'settings_reset') {
    await sendMessageWithButtons(chatId, "⚠️ *Reset All Progress?*\n\nThis will clear your XP, Streaks, and Level. This cannot be undone!", menus.getResetConfirmationMenu(lang));
    return await answerCallback(callback.id);
  }

  // 5. Reset Logic (Real Profile Change)
  if (data === 'reset_confirm') {
    await userManager.resetProgress(userId, 'telegram');
    const welcomeText = `🦊 *MIGA: Your 24/7 Study Champion*
━━━━━━━━━━━━━━━━━━━━
Welcome! I'm MIGA, your AI companion powered by *Mindgains*. I'm here to help you ace your exams!

✨ *What I can do for you:*
────────────────────

📸  *Snap & Solve* — Send photos of any doubt
🎙️  *Voice Doubts* — Talk to me in your language
📝  *Smart Notes* — Get instant study summaries
🎯  *Exam Prep* — UPSC, TNPSC, SSC & more
👩‍🏫  *Teacher Tools* — Generate papers & quizzes

🔥 *Daily Streaks • XP Rewards • 6 Languages*
━━━━━━━━━━━━━━━━━━━━
👇 *Please select your language to begin:*`;
    await sendMessageWithButtons(chatId, welcomeText, menus.getLanguageMenu());
    return await answerCallback(callback.id, "Data reset successfully");
  }

  if (data === 'reset_cancel') {
    await sendMessageWithButtons(chatId, getWelcomeBackText(user), menus.getMainMenu(lang));
    return await answerCallback(callback.id);
  }

  // 6. Quiz Subject Selection
  if (data.startsWith('quiz_')) {
    const subject = data.split('_')[1];
    if (subject === 'tamil' && String(user.exam || '').toLowerCase() !== 'tnpsc') {
      await answerCallback(callback.id, "Tamil quiz is available for TNPSC mode only.");
      await sendMessageWithButtons(chatId, "⚠️ *Tamil Quiz Access*\n\nTamil subject is enabled only when your target exam is *TNPSC*.", getBackHomeMenu());
      return;
    }
    await answerCallback(callback.id, "Starting quiz...");
    await db.saveUserProfile(userId, 'telegram', { currentQuizSubject: subject, quizCount: 0 });
    await handleQuizStart(chatId, messageId, user, subject);
    return;
  }

  // 7. Main Menu Navigation
  if (data === 'menu_main') {
    await answerCallback(callback.id, "🏠 Opening main menu...");
    await sendMessageWithButtons(chatId, getWelcomeBackText(user), menus.getMainMenu(lang));
    return;
  }

  if (data === 'menu_quiz') {
    const quizMenu = await menus.getQuizMenu(user);
    await answerCallback(callback.id, "🎯 Quiz Arena unlocked!");
    await sendMessageWithButtons(chatId, "🎯 *Quiz Arena*\n\nChoose a subject and start instantly.", quizMenu);
    return;
  }

  if (data === 'menu_settings') {
    await answerCallback(callback.id, "⚙️ Personalizing settings...");
    await sendMessageWithButtons(chatId, "⚙️ *Settings Control Center*\n\nTune language, exam, mode, and progress options.", menus.getSettingsMenu(lang));
    return;
  }

  // 8. Study Tools Navigation
  if (data === 'menu_news') {
    const quotaOk = await consumeQuotaOrNotify(chatId, userId, 'current_affairs', 1);
    if (!quotaOk.ok) {
      await answerCallback(callback.id, 'Daily limit reached');
      return;
    }
    const news = await studyTools.getCurrentAffairs(lang);
    await answerCallback(callback.id, "📰 Fetching latest current-affairs digest...");
    await sendMessageWithButtons(chatId, news, getBackHomeMenu());
    return;
  }

  if (data === 'menu_pyq') {
    await answerCallback(callback.id, "📚 PYQ Mode activated!");
    const subjectByExam = {
      upsc: 'polity',
      tnpsc: 'history',
      ssc: 'english',
      banking: 'economics',
      railways: 'science'
    };
    const pyqSubject = subjectByExam[user.exam] || 'history';
    const pyqQuestions = await db.getQuizQuestionsFromRedis(pyqSubject, 10);
    if (!pyqQuestions || pyqQuestions.length === 0) {
      await sendMessageWithButtons(chatId, "⚠️ *PYQ Practice*\n\nI couldn't find PYQs for this exam yet.", getBackHomeMenu());
      return;
    }
    await sendMessageWithButtons(chatId, `📚 *PYQ Practice Arena*\n\nTarget: *${(user.exam || 'upsc').toUpperCase()}*\nSubject: *${pyqSubject.toUpperCase()}*\n\n⚡ Quick mode activated.`, getBackHomeMenu());
    await db.saveUserProfile(userId, 'telegram', {
      currentQuizSubject: `pyq_${pyqSubject}`,
      quizCount: 0,
      quizCorrect: 0,
      quizTotal: pyqQuestions.length,
      currentQuizQuestions: JSON.stringify(pyqQuestions)
    });
    const first = pyqQuestions[0];
    await sendTrackedQuizPoll(chatId, userId, first, 'pyq');
    return;
  }

  if (data === 'menu_plan') {
    const plan = await studyTools.generateStudyPlan(user.exam || 'upsc');
    await answerCallback(callback.id, "📅 Building your plan...");
    await sendMessageWithButtons(chatId, plan, getBackHomeMenu());
    return;
  }

  if (data === 'menu_streak') {
    const stats = await studyTools.getStatsCard(userId, 'telegram');
    await answerCallback(callback.id, "🔥 Loading streak stats...");
    await sendMessageWithButtons(chatId, stats, getBackHomeMenu());
    return;
  }

  if (data === 'menu_solve') {
    await answerCallback(callback.id, "📸 Snap & Solve ready!");
    await sendMessageWithButtons(chatId, "📸 *Snap & Solve Studio*\n\nDrop a clear question image and I'll return a step-by-step solution.", getBackHomeMenu());
    return;
  }

  if (data === 'menu_notes') {
    await answerCallback(callback.id, "📝 Smart Notes opening...");
    await sendMessageWithButtons(chatId, "📝 *Smart Notes Lab*\n\nSend a topic name (or textbook photo) and get clean, exam-ready notes.", getBackHomeMenu());
    return;
  }

  if (data === 'menu_leaderboard') {
    const topUsers = await db.getLeaderboard('weekly', 10);
    const leaderboardText = gamification.formatLeaderboard(topUsers, "🏆 *MIGA GLOBAL LEADERBOARD*");
    await answerCallback(callback.id, "🏆 Ranking board loading...");
    await sendMessageWithButtons(chatId, leaderboardText, getBackHomeMenu());
    return;
  }

  if (data === 'menu_group_league') {
    await answerCallback(callback.id, "🏟️ Loading group league...");
    if (!isGroupChat(callback.message.chat)) {
      await sendMessageWithButtons(chatId, "🏟️ *Group League*\n━━━━━━━━━━━━━━━━━━━━\n\nUse this inside a Telegram group to see your league table.", getBackHomeMenu());
      return;
    }
    const title = await db.getGroupTitle(chatId) || callback.message.chat.title || 'Study Group';
    const rows = await db.getGroupLeaderboard(chatId, 10);
    await sendMessageWithButtons(chatId, formatGroupLeaderboard(rows, title), getBackHomeMenu());
    return;
  }

  // 9. Teacher Mode Navigation
  if (data === 'menu_teacher') {
    await answerCallback(callback.id, "👩‍🏫 Entering Teacher Mode...");
    await sendMessageWithButtons(chatId, "👩‍🏫 *Teacher Command Deck*\n\nGenerate papers and study notes with one tap.", menus.getTeacherMenu(lang));
    return;
  }

  if (data === 'teacher_paper') {
    await db.saveUserProfile(userId, 'telegram', { onboardingStep: 'wizard_class' });
    await sendMessage(chatId, "📝 *Question Paper Wizard (1/4)*\n\nWhich *Class* and *Subject* is this for?\n(e.g., Class 11th, History)");
    return await answerCallback(callback.id);
  }

  if (data === 'teacher_notes') {
    await answerCallback(callback.id, "📚 Notes generator ready!");
    await sendMessageWithButtons(chatId, "📚 *Generate Study Notes (PDF)*\n\nSend the topic name and I’ll generate a clean classroom-ready PDF.", menus.getTeacherMenu(lang));
    return;
  }
}

// ============ QUIZ HANDLER ============

async function handleQuizStart(chatId, messageId, user, subjectId) {
  // Fetch 10 random questions from Upstash
  const questions = await db.getQuizQuestionsFromRedis(subjectId, 10);
  
  if (questions && questions.length > 0) {
    // Store the questions in Redis for the current session
    await db.saveUserProfile(user.id, 'telegram', { 
      currentQuizQuestions: JSON.stringify(questions),
      quizCount: 0,
      quizCorrect: 0,
      quizTotal: questions.length,
      currentQuizSubject: subjectId
    });
    
    const q = questions[0];
    await sendTrackedQuizPoll(chatId, user.id, q, 'quiz');
    console.log(`[QUIZ] Poll sent to ${chatId} for subject: ${subjectId}`);
  } else {
    await sendMessage(chatId, `❌ Sorry, I couldn't find valid questions for this subject right now.`);
  }
}

function getWelcomeBackText(user) {
  return `🇮🇳 *Welcome back to Edu4Bharat!* 🦊\n\n🔥 *Streak:* ${user.streak?.current || 0} days | 🏆 *XP:* ${user.xp || 0}\n\nHow can I help you today?`;
}

function isGroupChat(chat = {}) {
  return chat.type === 'group' || chat.type === 'supergroup';
}

function escapeMarkdownName(text = '') {
  return String(text || '').replace(/([\\_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

function mentionUserFromProfile(profile = {}, fallbackId = null) {
  const usernameRaw = String(profile.username || '').trim();
  if (usernameRaw) {
    return usernameRaw.startsWith('@') ? usernameRaw : `@${usernameRaw}`;
  }
  const name = escapeMarkdownName(profile.firstName || profile.name || 'Learner');
  const id = fallbackId || profile.id;
  if (!id) return `*${name}*`;
  return `[${name}](tg://user?id=${id})`;
}

function getShareCardText(name, score, subject = 'General Knowledge') {
  return `I scored ${score}/10 in ${subject.toUpperCase()} on Edu4Bharat. Can you beat me?`;
}

function getShareKeyboard(name, score, subject) {
  const text = encodeURIComponent(`🏆 ${getShareCardText(name, score, subject)}`);
  return {
    inline_keyboard: [
      [{ text: '📣 Share to Group', url: `https://t.me/share/url?url=https://t.me&text=${text}` }],
      [{ text: '🏠 Home', callback_data: 'menu_main' }]
    ]
  };
}

function formatGroupLeaderboard(rows = [], groupTitle = 'Study Group') {
  if (!rows.length) {
    return `🏟️ *${groupTitle} League*\n━━━━━━━━━━━━━━━━━━━━\n\nNo scores yet.\nStart a quiz or battle to get ranked.`;
  }
  let text = `🏟️ *${groupTitle} Weekly League*\n━━━━━━━━━━━━━━━━━━━━\n\n`;
  rows.forEach((row, idx) => {
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
    text += `${medal} *${row.name}*  ${row.xp} XP\n`;
  });
  text += `\n━━━━━━━━━━━━━━━━━━━━\nTop 3 auto-post daily.`;
  return text;
}

async function sendTrackedQuizPoll(chatId, userId, question, context = 'quiz') {
  if (context !== 'host' && context !== 'battle') {
    const feature = context === 'pyq' ? 'pyq_questions' : 'quiz_questions';
    const quotaOk = await consumeQuotaOrNotify(chatId, userId, feature, 1);
    if (!quotaOk.ok) return null;
  }

  const timer = QUIZ_TIMER_SECONDS;
  const poll = await sendQuizPoll(
    chatId,
    question.question_text,
    question.options,
    question.correct_answer,
    question.explanation || 'Great job!',
    { open_period: timer }
  );
  if (poll && poll.result && poll.result.poll) {
    await db.saveData(`miga:quiz_poll:${poll.result.poll.id}`, {
      userId: String(userId),
      chatId: String(chatId),
      correct: question.correct_answer,
      context,
      answered: false
    }, 3600);
  }
  return poll;
}

async function sendGoalSession(chatId, userId) {
  const quotaOk = await consumeQuotaOrNotify(chatId, userId, 'goal_sessions', 1);
  if (!quotaOk.ok) return false;

  const state = await goalEngine.getGoalState(userId, 'telegram');
  if (!state || state.status !== 'active') {
    await sendMessage(chatId, "⚠️ No active goal session. Start with `/goal <topic>`.");
    return false;
  }
  const session = goalEngine.getCurrentSession(state);
  if (!session) {
    await sendMessage(chatId, "⚠️ Could not load next session. Try `/goalstop` and start again.");
    return false;
  }

  await goalEngine.clearResume(userId, 'telegram');
  await sendMessage(chatId, goalEngine.formatSessionText(state, session));
  const poll = await sendQuizPoll(
    chatId,
    `🧠 SESSION CHECKPOINT: ${session.checkpoint.question_text}`,
    session.checkpoint.options,
    session.checkpoint.correct_answer,
    session.checkpoint.explanation,
    { open_period: GOAL_TIMER_SECONDS }
  );
  if (poll?.result?.poll?.id) {
    await db.saveData(`miga:goal_poll:${poll.result.poll.id}`, {
      userId: String(userId),
      chatId: String(chatId),
      sessionIndex: state.currentSessionIndex,
      correct: session.checkpoint.correct_answer
    }, 7200);
  }
  return true;
}

async function sendGoalMasterQuestion(chatId, userId) {
  const state = await goalEngine.getGoalState(userId, 'telegram');
  if (!state || state.status !== 'master_quiz') return false;
  const q = goalEngine.getCurrentMasterQuestion(state);
  if (!q) return false;

  await sendMessage(chatId, `🎓 *Final Master Quiz*\n━━━━━━━━━━━━━━━━━━━━\n\nQuestion ${state.currentMasterIndex + 1}/${state.master_quiz.length}`);
  const poll = await sendQuizPoll(chatId, q.question_text, q.options, q.correct_answer, q.explanation, { open_period: GOAL_TIMER_SECONDS });
  if (poll?.result?.poll?.id) {
    await db.saveData(`miga:goal_master_poll:${poll.result.poll.id}`, {
      userId: String(userId),
      chatId: String(chatId),
      masterIndex: state.currentMasterIndex,
      correct: q.correct_answer
    }, 7200);
  }
  return true;
}

async function processPersonalQuizProgress(userId, targetChatId, isCorrect) {
  const user = await db.getUser(userId, 'telegram');
  if (!user.currentQuizSubject) return false;

  const nextCount = (user.quizCount || 0) + 1;
  const questions = JSON.parse(user.currentQuizQuestions || '[]');
  const totalQuestions = Number.isInteger(user.quizTotal) ? user.quizTotal : questions.length;

  await db.saveUserProfile(userId, 'telegram', {
    quizCount: nextCount,
    quizCorrect: (user.quizCorrect || 0) + (isCorrect ? 1 : 0),
    quizTotal: totalQuestions
  });

  const refreshedUser = await db.getUser(userId, 'telegram');
  const refreshedQuestions = JSON.parse(refreshedUser.currentQuizQuestions || '[]');

  if (nextCount < refreshedQuestions.length) {
    await new Promise(resolve => setTimeout(resolve, 1200));
    const q = refreshedQuestions[nextCount];
    await sendTrackedQuizPoll(
      targetChatId || userId,
      userId,
      q,
      refreshedUser.currentQuizSubject?.startsWith('pyq_') ? 'pyq' : 'quiz'
    );
    return true;
  }

  const finalScore = refreshedUser.quizCorrect || 0;
  const total = refreshedUser.quizTotal || refreshedQuestions.length || nextCount;
  const subject = String(refreshedUser.currentQuizSubject || 'general').replace(/^pyq_/, '');
  const name = refreshedUser.username || refreshedUser.firstName || 'Learner';
  const dailyAfterQuiz = await db.markDailyQuizCompletion(userId, 'telegram', total);
  await sendMessageWithButtons(
    targetChatId || userId,
    `🏆 *Quiz Complete!*\n\nScore: *${finalScore}/${total}*\nSubject: *${subject.toUpperCase()}*\n\n📣 Share your result card and challenge your group.`,
    getShareKeyboard(name, finalScore, subject)
  );
  if (dailyAfterQuiz && !dailyAfterQuiz.quizDone) {
    const left = Math.max(0, (dailyAfterQuiz.quizTargetPerDay || 10) - (dailyAfterQuiz.quizQuestionsAnswered || 0));
    await sendMessage(targetChatId || userId, `📌 *Daily Target Update*\n\n${left} quiz questions left for today's goal. Use /dailyprogress anytime.`);
  } else if (dailyAfterQuiz && dailyAfterQuiz.quizDone && dailyAfterQuiz.topicDone) {
    await sendMessage(targetChatId || userId, `🔥 *Daily Goal Completed*\n━━━━━━━━━━━━━━━━━━━━\n\nYou're done for today. Legendary consistency.`);
  }
  await db.saveUserProfile(userId, 'telegram', {
    currentQuizSubject: null,
    quizCount: 0,
    quizCorrect: 0,
    quizTotal: 0,
    currentQuizQuestions: null
  });
  return true;
}

function getBackHomeMenu() {
  return {
    inline_keyboard: [
      [{ text: '🔙 Back', callback_data: 'menu_main' }, { text: '🏠 Home', callback_data: 'menu_main' }]
    ]
  };
}


async function consumeQuotaOrNotify(chatId, userId, feature, amount = 1) {
  const quota = await db.consumeFeatureQuota(userId, 'telegram', feature, amount);
  if (quota?.allowed) return { ok: true, quota };

  const label = FEATURE_LABELS[feature] || feature;
  await sendMessage(
    chatId,
    `?? *Daily Limit Reached*\n\n` +
    `*${label}* quota is over for today.\n` +
    `Plan: *${String(quota?.tier || 'free').toUpperCase()}*\n` +
    `Used: *${quota?.used || 0}/${quota?.limit || 0}*\n\n` +
    `Use /usage to view all limits. Upgrade to Pro for higher daily credits.`
  );
  return { ok: false, quota };
}

function formatUsageSummary(summary = {}) {
  const tier = String(summary.tier || 'free').toUpperCase();
  let text = `?? *Plan & Usage*\n\n` +
    `Plan: *${tier}*\n` +
    `Date: *${summary.date || '-'}*\n\n`;

  for (const feature of Object.keys(FEATURE_LABELS)) {
    const row = summary.usage?.[feature] || { used: 0, limit: 0, remaining: 0 };
    text += `• *${FEATURE_LABELS[feature]}:* ${row.used}/${row.limit}  (left: ${row.remaining})\n`;
  }
  return text;
}

async function sendDashboard(chatId, user) {
  const streak = user.streak?.current || 0;
  const xp = user.xp || 0;
  const level = user.level || 1;
  const exam = (user.exam || 'upsc').toUpperCase();
  const mode = (user.mode || 'student').toUpperCase();
  const text = `🇮🇳 *Edu4Bharat Dashboard*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 *Mode:* ${mode}\n` +
    `🎯 *Target:* ${exam}\n` +
    `🔥 *Streak:* ${streak} days\n` +
    `⚡ *XP:* ${xp} | 🏆 *Level:* ${level}\n\n` +
    `✨ *Tap any feature below to continue your study flow.*`;
  await sendMessage(chatId, text);
}

// ============ MEDIA HANDLERS ============

async function handlePhoto(chatId, userId, message, user) {
  const quotaOk = await consumeQuotaOrNotify(chatId, userId, 'image_solves', 1);
  if (!quotaOk.ok) return;

  const statusId = await sendTransientStatus(chatId, "Analyzing your image...");
  await sendChatAction(chatId, 'typing');

  try {
    const photo = message.photo[message.photo.length - 1];
    const fileUrl = await getFile(photo.file_id);
    const caption = message.caption || 'Solve this problem and explain step by step';

    const systemPrompt = migaBrain.getSystemPrompt(user);
    const response = await openrouter.analyzeImage(systemPrompt, fileUrl, caption);

    await db.addXP(userId, 'telegram', gamification.awardXP('solve_problem'));
    await deleteMessage(chatId, statusId);
    await sendMessage(chatId, response);
  } catch (error) {
    console.error('Photo error:', error);
    await deleteMessage(chatId, statusId);
    await sendMessage(chatId, "Sorry, I had trouble analyzing that image.");
  }
}

async function handleVoice(chatId, userId, message, user) {
  const quotaOk = await consumeQuotaOrNotify(chatId, userId, 'voice_chats', 1);
  if (!quotaOk.ok) return;

  const statusId = await sendTransientStatus(chatId, "Listening...");
  await sendChatAction(chatId, 'typing');

  try {
    const fileUrl = await getFile(message.voice.file_id);
    const sttResult = await googleCloud.speechToText(fileUrl, user.language || 'en');

    if (sttResult.success && sttResult.text) {
      await deleteMessage(chatId, statusId);
      await sendMessage(chatId, "I heard: " + sttResult.text);
      await sendChatAction(chatId, 'typing');
      const systemPrompt = migaBrain.getSystemPrompt(user);
      const response = await openrouter.chatWithMiga(systemPrompt, sttResult.text, []);
      await sendMessage(chatId, response);
    }
  } catch (error) {
    console.error('Voice error:', error);
    await deleteMessage(chatId, statusId);
    await sendMessage(chatId, "Sorry, I had trouble hearing that.");
  }
}

// ============ MESSAGE HANDLER ============

async function handleMessage(message) {
  const chatId = message.chat.id;
  const userId = message.from.id;
  const text = message.text || '';

  let user = await db.getUser(userId, 'telegram');
  const lang = user.language || 'en';
  const inGroup = isGroupChat(message.chat);

  // Update profile & streak
  if (message.from) {
    const profileData = {
      username: message.from.username ? `@${message.from.username}` : null,
      firstName: message.from.first_name,
      lastName: message.from.last_name
    };
    await db.saveUserProfile(userId, 'telegram', profileData);
  }
  if (inGroup) {
    await db.trackGroup(chatId, message.chat.title || '');
  }
  await db.updateStreak(userId, 'telegram');
  await db.trackDailyUsage(userId, 'telegram');

  // 1. Handle Commands
  if (text && text.startsWith('/')) {
    const rawCommand = text.split(' ')[0].toLowerCase().replace('/', '').split('@')[0];
    
    switch (rawCommand) {
      case 'start':
        const referralArg = (text.split(' ')[1] || '').trim();
        if (referralArg) {
          const referralResult = await db.applyReferral(userId, 'telegram', referralArg);
          if (referralResult.ok) {
            await sendMessage(chatId, `🎉 *Referral unlocked!*\n\nYou and your inviter both earned rewards.\n+80 XP, badge, and *Pro Quiz Pack* unlocked.`);
          }
        }
        if (user.onboardingStep === 'ready') {
          return await sendMessageWithButtons(chatId, getWelcomeBackText(user), menus.getMainMenu(lang));
        }
        const welcomeText = `🦊 *MIGA: Your 24/7 Study Champion*
━━━━━━━━━━━━━━━━━━━━
Welcome! I'm MIGA, your AI companion powered by *Mindgains*. I'm here to help you ace your exams!

✨ *What I can do for you:*
────────────────────

📸  *Snap & Solve* — Send photos of any doubt
🎙️  *Voice Doubts* — Talk to me in your language
📝  *Smart Notes* — Get instant study summaries
🎯  *Exam Prep* — UPSC, TNPSC, SSC & more
👩‍🏫  *Teacher Tools* — Generate papers & quizzes

🔥 *Daily Streaks • XP Rewards • 6 Languages*
━━━━━━━━━━━━━━━━━━━━
👇 *Please select your language to begin:*`;
        return await sendMessageWithButtons(chatId, welcomeText, menus.getLanguageMenu());
      
      case 'quiz': 
        const quizMenu = await menus.getQuizMenu(user);
        return await sendMessageWithButtons(chatId, "🎯 *Quiz Center*\n\nSelect a subject to start your 10-question challenge!", quizMenu);
      case 'goal':
        {
          const topic = text.replace(/^\/goal(@\w+)?/i, '').trim();
          if (!topic) {
            return await sendMessage(chatId, "🎯 *Set Your Goal*\n━━━━━━━━━━━━━━━━━━━━\n\nUse:\n`/goal <topic>`\n\nExample:\n`/goal Fundamental Rights`");
          }
          await sendMessage(chatId, `🧠 *Building Tutor Plan*\n━━━━━━━━━━━━━━━━━━━━\n\nTopic: *${topic}*\n\nDesigning balanced micro-sessions with checkpoints...`);
          try {
            const state = await goalEngine.startGoal(userId, 'telegram', topic, user);
            await sendMessage(chatId,
              `✅ *Goal Ready*\n━━━━━━━━━━━━━━━━━━━━\n\n` +
              `📚 Topic: *${state.topic}*\n` +
              `🧩 Sessions: *${state.sessions.length}*\n` +
              `🎓 Final Master Quiz: *${state.master_quiz.length} questions*\n\n` +
              `Starting Session 1 now...`
            );
            return await sendGoalSession(chatId, userId);
          } catch (error) {
            console.error('Goal planning error:', error);
            return await sendMessage(chatId, "❌ I couldn't build a valid tutor plan right now. Please try `/goal <topic>` again in a moment.");
          }
        }
      case 'goalstatus':
        {
          const state = await goalEngine.getGoalState(userId, 'telegram');
          if (!state) return await sendMessage(chatId, "No active goal. Start with `/goal <topic>`.");
          return await sendMessage(
            chatId,
            `📊 *Goal Status*\n━━━━━━━━━━━━━━━━━━━━\n\n` +
            `📚 Topic: *${state.topic}*\n` +
            `⚙️ Stage: *${state.status}*\n` +
            `🧩 Session: *${Math.min(state.currentSessionIndex + 1, state.sessions.length)}/${state.sessions.length}*\n` +
            `🎓 Master: *${Math.min(state.currentMasterIndex + 1, state.master_quiz.length)}/${state.master_quiz.length}*`
          );
        }
      case 'myplan':
        {
          const summary = await db.getUsageSummary(userId, 'telegram');
          return await sendMessage(
            chatId,
            `?? *Current Plan*\n\n` +
            `Tier: *${String(summary.tier || 'free').toUpperCase()}*\n` +
            `Model: *${process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-lite-001'}*\n` +
            `Use /usage to check today's credits.`
          );
        }
      case 'usage':
        {
          const summary = await db.getUsageSummary(userId, 'telegram');
          return await sendMessage(chatId, formatUsageSummary(summary));
        }
      case 'dailyprogress':
        {
          const p = await db.getDailyGoalProgress(userId, 'telegram');
          if (!p) return await sendMessage(chatId, "⚠️ Could not fetch daily progress right now.");
          const exam = String(user.exam || 'upsc').toUpperCase();
          const quizLeft = Math.max(0, (p.quizTargetPerDay || 10) - (p.quizQuestionsAnswered || 0));
          const topicLeft = Math.max(0, (p.topicTargetPerDay || 1) - (p.topicGoalsCompleted || 0));
          const done = p.quizDone && p.topicDone;
          return await sendMessageWithButtons(
            chatId,
            `📈 *Daily Progress*\n━━━━━━━━━━━━━━━━━━━━\n\n` +
            `🎯 Exam: *${exam}*\n` +
            `🧠 Quiz Questions: *${p.quizQuestionsAnswered}/${p.quizTargetPerDay}*\n` +
            `🎯 Topic Goals: *${p.topicGoalsCompleted}/${p.topicTargetPerDay}*\n` +
            `🔥 Status: *${done ? 'Completed' : 'In Progress'}*\n\n` +
            (done
              ? `🏆 You completed today’s goal. Keep the streak alive tomorrow!`
              : `To finish today:\n• ${quizLeft} quiz questions left\n• ${topicLeft} topic goal left`),
            {
              inline_keyboard: done
                ? [[{ text: '🏠 Main Menu', callback_data: 'menu_main' }]]
                : [[{ text: '🎯 Continue Quiz', callback_data: 'menu_quiz' }, { text: '🧠 Continue Goal', callback_data: 'goal_continue' }]]
            }
          );
        }
      case 'goalstop':
        await db.deleteData(`miga:goal:state:telegram:${userId}`);
        await db.deleteData(`miga:goal:resume:telegram:${userId}`);
        return await sendMessage(chatId, "🛑 *Goal Session Stopped*\n\nYou can restart anytime with `/goal <topic>`.");
      case 'invite':
        const myCode = await db.ensureReferralCode(userId, 'telegram');
        const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'testststtsstst_bot';
        return await sendMessage(chatId,
          `🎟️ *Your Invite Link*\n\nShare this with friends:\nhttps://t.me/${botUsername}?start=${myCode}\n\nRewards:\n- You: +120 XP, badge, Pro Quiz Pack\n- Friend: +80 XP, badge, Pro Quiz Pack`
        );
      case 'groupleague':
        if (!inGroup) {
          return await sendMessage(chatId, '🏟️ Group League works only in groups. Add me to your study group and run `/groupleague` there.', { parse_mode: 'Markdown' });
        }
        const groupTitle = await db.getGroupTitle(chatId) || message.chat.title || 'Study Group';
        const groupRows = await db.getGroupLeaderboard(chatId, 10);
        return await sendMessage(chatId, formatGroupLeaderboard(groupRows, groupTitle));
      case 'hoststart':
        if (!inGroup) return await sendMessage(chatId, '👩‍🏫 *Host Mode*\n━━━━━━━━━━━━━━━━━━━━\n\nThis command works only in groups.');
        {
          const subject = (text.split(' ')[1] || 'history').toLowerCase();
          const q = await db.getQuizQuestionsFromRedis(subject, 1);
          if (!q.length) return await sendMessage(chatId, `❌ No questions found for *${subject}* right now.`);
          await db.saveData(`miga:host:state:${chatId}`, {
            hostId: String(userId),
            subject,
            startedAt: Date.now()
          }, 7200);
          await sendMessage(chatId, `🎙️ *Host Mode ON*\n━━━━━━━━━━━━━━━━━━━━\n\n*Host:* ${mentionUserFromProfile(user, userId)}\n*Subject:* ${subject.toUpperCase()}\n\nUse /hostnext for next round\nUse /hostend to close`);
          const poll = await sendTrackedQuizPoll(chatId, userId, q[0], 'host');
          if (poll?.result?.poll?.id) {
            await db.saveData(`miga:host_poll:${poll.result.poll.id}`, { chatId: String(chatId), subject, correct: q[0].correct_answer }, 7200);
          }
          return;
        }
      case 'hostnext':
        if (!inGroup) return await sendMessage(chatId, '👩‍🏫 Host Mode works only in groups.');
        {
          const state = await db.getData(`miga:host:state:${chatId}`);
          if (!state) return await sendMessage(chatId, '⚠️ Host mode is not active. Use /hoststart <subject>.');
          const q = await db.getQuizQuestionsFromRedis(state.subject || 'history', 1);
          if (!q.length) return await sendMessage(chatId, '❌ No more questions available right now.');
          const poll = await sendTrackedQuizPoll(chatId, userId, q[0], 'host');
          if (poll?.result?.poll?.id) {
            await db.saveData(`miga:host_poll:${poll.result.poll.id}`, { chatId: String(chatId), subject: state.subject, correct: q[0].correct_answer }, 7200);
          }
          return;
        }
      case 'hostend':
        if (!inGroup) return await sendMessage(chatId, '👩‍🏫 Host Mode works only in groups.');
        await db.deleteData(`miga:host:state:${chatId}`);
        return await sendMessage(chatId, '✅ Host mode ended.');
      case 'news': 
        {
          const quotaOk = await consumeQuotaOrNotify(chatId, userId, 'current_affairs', 1);
          if (!quotaOk.ok) return;
        }
        const news = await studyTools.getCurrentAffairs(lang);
        return await sendMessageWithButtons(chatId, news, menus.getMainMenu(lang));
      case 'exam':
      case 'countdown':
        return await sendMessageWithButtons(chatId, await studyTools.showExamCountdowns(chatId), menus.getMainMenu(lang));
      case 'streak': 
        const stats = await studyTools.getStatsCard(userId, 'telegram');
        return await sendMessageWithButtons(chatId, stats, menus.getMainMenu(lang));
      case 'leaderboard':
        const topUsers = await db.getLeaderboard('weekly', 10);
        const leaderboardText = gamification.formatLeaderboard(topUsers, "🏆 *MIGA GLOBAL LEADERBOARD*");
        return await sendMessageWithButtons(chatId, leaderboardText, menus.getMainMenu(lang));
      case 'notes': return await sendMessage(chatId, "📚 *Smart Notes*\n\nSend me a topic name or a photo of your textbook, and I'll generate structured notes for you!");
      case 'guide':
      case 'help':
        return await sendMessage(chatId,
          `📘 *Edu4Bharat Guide*\n` +
          `━━━━━━━━━━━━━━━━━━━━\n\n` +
          `*For Players*\n` +
          `• /quiz  - 10-question quiz\n` +
          `• /goal <topic>  - personal tutor micro-sessions\n` +
          `• /dailyprogress  - check today's targets\n` +
          `• /myplan  - check current tier\n` +
          `• /usage  - check today's credits\n` +
          `• /battle <subject>  - speed battle (group only)\n` +
          `• /groupleague  - weekly group rankings (group only)\n` +
          `• /invite  - referral rewards link\n\n` +
          `*For Group Admins / Teachers*\n` +
          `• /hoststart <subject>  - start live host mode\n` +
          `• /hostnext  - next question\n` +
          `• /hostend  - end host session\n\n` +
          `*Events*\n` +
          `• 9:00 PM IST Mega Quiz\n` +
          `• Sunday Battle Cup\n\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `Use commands in group for group league progress.`
        );
      case 'v':
      case 'version': return await sendMessage(chatId, `✅ *MIGA System Online*\n\n*Version:* 3.1.0\n*Build:* 20260306-1330\n*Status: Leaderboard Live 🏆*`);
      case 'reset': return await sendMessage(chatId, "⚠️ *Reset Data?*\n\nTo reset your progress and start over, please type `/reset_confirm`");
      case 'reset_confirm':
        await userManager.resetProgress(userId, 'telegram');
        return await sendMessageWithButtons(chatId, "🔄 *Data Reset!* Please select your language:", menus.getLanguageMenu());
      
      // ============ BATTLE GROUND COMMANDS ============
      case 'duel':
        const opponent = text.split(' ')[1];
        if (!opponent || !opponent.startsWith('@')) {
          return await sendMessage(chatId, "⚔️ *MIGA Duel*\n\nPlease mention a friend to challenge them!\nExample: `/duel @username`", { parse_mode: 'Markdown' });
        }
        return await sendMessage(chatId, `⚔️ *Challenge Sent*\n━━━━━━━━━━━━━━━━━━━━\n\n${mentionUserFromProfile(user, userId)} has challenged ${opponent} to a 1v1 duel!`, {
          reply_markup: {
            inline_keyboard: [[{ text: "🤝 Accept Challenge", callback_data: `duel_accept_${userId}` }]]
          }
        });

      case 'battle':
        if (!inGroup) {
          return await sendMessage(chatId, "⚔️ *Battle Arena*\n━━━━━━━━━━━━━━━━━━━━\n\nThis command works only in *Telegram Groups*.\n\nAdd me to your study group, then use:\n`/battle polity`");
        }
        const battleSubject = text.split(' ')[1] || 'General';
        await sendMessage(chatId, `🔥 *MIGA BATTLE ARENA* 🔥\n━━━━━━━━━━━━━━━━━━━━\n\n*Subject:* ${battleSubject.toUpperCase()}\n\nFirst 3 correct answers win:\n🥇 Gold  •  🥈 Silver  •  🥉 Bronze\n\n⚡ Question drops in *5 seconds*...`);
        
        // Wait 5 seconds
        setTimeout(async () => {
          const q = await db.getQuizQuestionsFromRedis(battleSubject, 1);
          if (q && q.length > 0) {
            const question = q[0];
            const poll = await sendQuizPoll(
              chatId,
              `⚔️ BATTLE: ${question.question_text}`,
              question.options,
              question.correct_answer,
              "Speed is everything! ⚡",
              { open_period: BATTLE_TIMER_SECONDS }
            );
            
            // Link this poll to the battle state
            await db.saveData(`miga:battle_poll:${poll.result.poll.id}`, { 
              chatId: chatId,
              correct: question.correct_answer,
              startTime: Date.now()
            }, 3600);
          }
        }, 5000);
        return;
    }
  }

  // 2. Handle Media
  if (message.photo) return await handlePhoto(chatId, userId, message, user);
  if (message.voice) return await handleVoice(chatId, userId, message, user);

  // 3. Handle Onboarding
  if (user.onboardingStep !== 'ready' && !user.onboardingStep.startsWith('wizard_')) {
    return await sendMessageWithButtons(chatId, "👋 *Welcome!* Please select your language to begin:", menus.getLanguageMenu());
  }

  // 4. Handle Teacher Wizard (Conversation)
  if (user.onboardingStep === 'wizard_class') {
    await db.saveUserProfile(userId, 'telegram', { wizardClass: text, onboardingStep: 'wizard_type' });
    return await sendMessage(chatId, "📝 *Question Paper Wizard (2/4)*\n\nWhat is the *Exam Type* and *Total Marks*?\n(e.g., Model Paper, 80 Marks)");
  }
  
  if (user.onboardingStep === 'wizard_type') {
    await db.saveUserProfile(userId, 'telegram', { wizardType: text, onboardingStep: 'wizard_time' });
    return await sendMessage(chatId, "📝 *Question Paper Wizard (3/4)*\n\nWhat is the *Time Duration* and *Structure*?\n(e.g., 3 Hours, 16 MCQs, 5 Short Answers)");
  }
  
  if (user.onboardingStep === 'wizard_time') {
    await db.saveUserProfile(userId, 'telegram', { wizardTime: text, onboardingStep: 'wizard_generate' });
    await sendMessage(chatId, "📄 *Generating your professional PDF...* This may take a moment.");
    
    const systemPrompt = `You are a professional exam paper generator. Generate a high-quality question paper in English only. 
    Class/Subject: ${user.wizardClass}
    Type/Marks: ${user.wizardType}
    Time/Structure: ${text}
    
    Format the output as a clean list of questions. No chatter.`;
    
    const content = await openrouter.chatWithMiga(systemPrompt, "Generate the paper now.", []);
    
    const pdfBuffer = await pdfGenerator.generateQuestionPaper({
      title: user.wizardType.split(',')[0],
      className: user.wizardClass.split(',')[0],
      subject: user.wizardClass.split(',')[1],
      time: text.split(',')[0],
      marks: user.wizardType.split(',')[1],
      content: content
    });
    
    await sendDocument(chatId, pdfBuffer, "Question_Paper.pdf", "✅ *Here is your professional Question Paper!*");
    await db.saveUserProfile(userId, 'telegram', { onboardingStep: 'ready' });
    return;
  }

  // 5. Handle AI Chat (MIGA Brain)
  console.log(`[AI] Processing for ${userId}: "${text}"`);
  const quotaOk = await consumeQuotaOrNotify(chatId, userId, 'ai_chat', 1);
  if (!quotaOk.ok) return;

  await sendChatAction(chatId, 'typing');

  const systemPrompt = migaBrain.getSystemPrompt(user);
  const history = await db.getConversationHistory(userId, 'telegram', 10);
  const response = await openrouter.chatWithMiga(
    systemPrompt,
    text,
    history.map(m => ({ role: m.role, content: m.content }))
  );
  await db.addToHistory(userId, 'telegram', 'user', text);
  await db.addToHistory(userId, 'telegram', 'assistant', response);

  await sendMessage(chatId, response);
}

// ============ WEBHOOK ENTRY POINT ============

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(200).send('MIGA Webhook Active');

  try {
    const update = req.body;
    
    // 1. Handle Messages
    if (update.message) await handleMessage(update.message);
    
    // 2. Handle Callbacks (Buttons)
    if (update.callback_query) await handleCallback(update.callback_query);

    // 2.5 Handle Poll close events (auto mark unanswered quiz as wrong and continue)
    if (update.poll && update.poll.is_closed) {
      const pollId = update.poll.id;
      const quizPollKey = `miga:quiz_poll:${pollId}`;
      const quizMeta = await db.getData(quizPollKey);
      if (quizMeta && !quizMeta.answered && ['quiz', 'pyq'].includes(String(quizMeta.context || ''))) {
        await db.saveData(quizPollKey, { ...quizMeta, answered: true, timeout: true }, 3600);
        const ownerId = Number(quizMeta.userId);
        await sendMessage(quizMeta.chatId || ownerId, `⏱️ *Time up!* Marked as incorrect. Moving to next question.`);
        await processPersonalQuizProgress(ownerId, quizMeta.chatId || ownerId, false);
      }
    }
    
    // 3. Handle Poll Answers (XP Rewards & Continuous Quiz)
    if (update.poll_answer) {
      const userId = update.poll_answer.user.id;
      const pollId = update.poll_answer.poll_id;
      const user = await db.getUser(userId, 'telegram');
      const selectedOption = update.poll_answer.option_ids?.[0];
      
      // Check if this is a Duel Poll
      const duelKey = `miga:duel_poll:${pollId}`;
      const isDuel = await db.getData(duelKey);
      
      if (isDuel) {
        const isCorrect = update.poll_answer.option_ids[0] === isDuel.correct;
        if (isCorrect) {
          const duel = await battleEngine.processDuelAnswer(isDuel.duelId, userId, true);
          if (duel) {
            const scores = Object.values(duel.scores).join(' - ');
            await sendMessage(isDuel.chatId, `🎯 *POINT!* ${mentionUserFromProfile(user, userId)} wins Round ${isDuel.round}.\n\n🏆 *Score:* ${scores}`);
            
            if (duel.status === 'finished') {
              const finalScores = Object.values(duel.scores).join(' - ');
              await sendMessage(
                isDuel.chatId,
                `🎊 *DUEL OVER* 🎊\n━━━━━━━━━━━━━━━━━━━━\n\n` +
                `🏆 ${mentionUserFromProfile(user, userId)} is the Champion!\n` +
                `📊 *Final Score:* ${finalScores}\n` +
                `💰 *Bounty:* +100 XP`
              );
              const duelBanner = await bannerEngine.generate('BATTLEWIN', {
                topTitle: 'QUIZ DOMINATION',
                bigWord: 'WINNER',
                username: user.username || user.firstName || `User${String(userId).slice(-4)}`,
                topic: 'UPSC Duel Arena',
                statement: 'I won this 1v1 duel',
                detailLine: `Final Score ${finalScores}`,
                xpGained: 100,
                score: 'Duel Champion',
                brandTag: '@Edu4BharatAI_bot'
              });
              if (duelBanner) {
                await sendDocument(isDuel.chatId, duelBanner, 'miga_duel_win.jpg', '🏆 *Duel Winner Card*');
              }
              
              await db.addXP(userId, 'telegram', 100);
              
              // Award consolation XP to the other player
              const loserId = duel.players.find(id => id !== userId);
              if (loserId) await db.addXP(loserId, 'telegram', 10);
              
              // Cleanup all duel-related keys
              await db.deleteData(duelKey);
              await db.deleteData(`miga:duel_state:${isDuel.duelId}`);
              // Cleanup round winners
              for (let i = 1; i <= 5; i++) {
                await db.deleteData(`miga:duel_round_winner:${isDuel.duelId}:${i}`);
              }
            } else {
              // Send Next Round in 3 seconds
              setTimeout(async () => {
                const q = await db.getQuizQuestionsFromRedis('history', 1);
                if (q && q.length > 0) {
                  const question = q[0];
                  const poll = await sendQuizPoll(
                    isDuel.chatId,
                    `⚔️ ROUND ${duel.currentRound}: ${question.question_text}`,
                    question.options,
                    question.correct_answer,
                    "First correct answer wins the point!",
                    { open_period: BATTLE_TIMER_SECONDS }
                  );
                  
                  if (poll && poll.result && poll.result.poll) {
                    // Link this poll to the duel state
                    await db.saveData(`miga:duel_poll:${poll.result.poll.id}`, { 
                      duelId: isDuel.duelId, 
                      round: duel.currentRound, 
                      correct: question.correct_answer,
                      chatId: isDuel.chatId,
                      startTime: Date.now()
                    }, 600);
                  }
                }
              }, 3000);
            }
          }
        }
        return res.status(200).json({ ok: true });
      }

      // Goal session checkpoint poll
      const goalPollKey = `miga:goal_poll:${pollId}`;
      const goalMeta = await db.getData(goalPollKey);
      if (goalMeta && String(goalMeta.userId) === String(userId)) {
        const isCorrect = selectedOption === goalMeta.correct;
        await db.addXP(userId, 'telegram', isCorrect ? 22 : 8, isCorrect ? 'goal_checkpoint_correct' : 'goal_checkpoint_attempt');

        await sendMessage(
          goalMeta.chatId,
          isCorrect
            ? `✅ *Checkpoint Cleared*\n━━━━━━━━━━━━━━━━━━━━\n\nGreat accuracy. You got it right.`
            : `🧠 *Checkpoint Feedback*\n━━━━━━━━━━━━━━━━━━━━\n\nGood try. Learn from explanation and continue.`
        );

        const result = await goalEngine.recordSessionAnswer(userId, 'telegram', goalMeta.sessionIndex, isCorrect);
        if (!result) return res.status(200).json({ ok: true });

        if (result.sessionsDone) {
          await sendMessage(goalMeta.chatId, `🚀 *Session Track Complete*\n━━━━━━━━━━━━━━━━━━━━\n\nNow entering your *Final Master Quiz*.`);
          await sendGoalMasterQuestion(goalMeta.chatId, userId);
        } else {
          const nextSession = result.state.sessions[result.state.currentSessionIndex];
          const sessionBanner = await bannerEngine.generate('STUDY', {
            topTitle: "DAILY STUDY GOAL ACHIEVED",
            bigWord: 'MASTERED',
            username: user.username || user.firstName || `User${String(userId).slice(-4)}`,
            topic: result.state.topic,
            statement: `I just mastered ${result.state.topic} on @Edu4BharatAI_bot`,
            detailLine: '',
            xpGained: isCorrect ? 22 : 8,
            score: '',
            statLine: '',
            brandTag: '@Edu4BharatAI_bot'
          });
          if (sessionBanner) {
            await sendDocument(goalMeta.chatId, sessionBanner, 'miga_session_card.jpg', `✅ *Session ${result.state.currentSessionIndex} Complete*`);
          }
          const dueAt = await goalEngine.scheduleResume(
            userId,
            'telegram',
            result.state.topic,
            goalMeta.chatId,
            result.nextBreakMinutes
          );
          const resumeClock = new Date(dueAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
          await sendMessageWithButtons(
            goalMeta.chatId,
            `☕ *Break Time*\n━━━━━━━━━━━━━━━━━━━━\n\n` +
            `Take *${result.nextBreakMinutes} minutes* break.\n` +
            `Next: *${nextSession.title}*\n` +
            `I will ping you around *${resumeClock}*.\n\n` +
            `If you're ready now, continue below.`,
            { inline_keyboard: [[{ text: '▶️ Continue Now', callback_data: 'goal_continue' }]] }
          );
        }

        return res.status(200).json({ ok: true });
      }

      // Goal final master quiz poll
      const goalMasterKey = `miga:goal_master_poll:${pollId}`;
      const goalMasterMeta = await db.getData(goalMasterKey);
      if (goalMasterMeta && String(goalMasterMeta.userId) === String(userId)) {
        const isCorrect = selectedOption === goalMasterMeta.correct;
        await db.addXP(userId, 'telegram', isCorrect ? 30 : 10, isCorrect ? 'goal_master_correct' : 'goal_master_attempt');

        const master = await goalEngine.recordMasterAnswer(userId, 'telegram', goalMasterMeta.masterIndex, isCorrect);
        if (!master) return res.status(200).json({ ok: true });

        if (!master.complete) {
          await new Promise(resolve => setTimeout(resolve, 1200));
          await sendGoalMasterQuestion(goalMasterMeta.chatId, userId);
          return res.status(200).json({ ok: true });
        }

        const updatedUser = await db.getUser(userId, 'telegram');
        const dailyAfterGoal = await db.markDailyTopicGoalCompletion(userId, 'telegram');
        const completion = goalEngine.buildCompletionSummary(master.state, mentionUserFromProfile(updatedUser, userId));
        const banner = await bannerEngine.generate('VICTORY', {
          topTitle: "TODAY'S MISSION COMPLETE",
          bigWord: 'VICTORY',
          username: updatedUser.username || updatedUser.firstName || `User${String(userId).slice(-4)}`,
          topic: `${master.state.topic}`,
          statement: `I just mastered ${master.state.topic} on @Edu4BharatAI_bot`,
          detailLine: '',
          xpGained:
            (master.state.masterResults.filter(r => r.isCorrect).length * 30) +
            ((master.state.masterResults.length - master.state.masterResults.filter(r => r.isCorrect).length) * 10),
          score: '',
          statLine: '',
          brandTag: '@Edu4BharatAI_bot'
        });
        await sendMessage(goalMasterMeta.chatId, completion);
        if (banner) {
          await sendDocument(goalMasterMeta.chatId, banner, 'miga_goal_banner.jpg', `🎉 *Mastery Badge* • ${master.state.topic}`);
        } else {
          await sendMessageWithButtons(
            goalMasterMeta.chatId,
            `🎊 *Share Your Win*\n━━━━━━━━━━━━━━━━━━━━\n\n` +
            `${getShareCardText(updatedUser.firstName || 'I', master.state.masterResults.filter(r => r.isCorrect).length, master.state.topic)}\n\n` +
            `Brand: *MIGA • Mindgains.ai*`,
            getShareKeyboard(updatedUser.firstName || 'Learner', master.state.masterResults.filter(r => r.isCorrect).length, master.state.topic)
          );
        }
        await goalEngine.clearResume(userId, 'telegram');
        if (dailyAfterGoal && dailyAfterGoal.quizDone && dailyAfterGoal.topicDone) {
          await sendMessage(goalMasterMeta.chatId, `🔥 *Daily Goal Completed*\n━━━━━━━━━━━━━━━━━━━━\n\nYou nailed both quiz + topic goals today.`);
        }
        return res.status(200).json({ ok: true });
      }

      // Check if this is Host Mode poll
      const hostPollKey = `miga:host_poll:${pollId}`;
      const hostMeta = await db.getData(hostPollKey);
      if (hostMeta) {
        const isCorrect = selectedOption === hostMeta.correct;
        const xpRes = await db.addXP(userId, 'telegram', isCorrect ? 25 : 5, isCorrect ? 'host_correct' : 'host_attempt');
        await db.updateGroupLeaderboard(hostMeta.chatId, userId, 'telegram', xpRes?.xp || user.xp || 0);
        if (isCorrect) {
          await sendMessage(
            hostMeta.chatId,
            `🎉 *Host Round Winner* 🎉\n━━━━━━━━━━━━━━━━━━━━\n\n${mentionUserFromProfile(user, userId)} cracked it first.\n\n✅ *+25 XP awarded*`
          );
        }
        return res.status(200).json({ ok: true });
      }

      // Check if this is a Battle Ground Poll
      const battleKey = `miga:battle_poll:${pollId}`;
      const isBattle = await db.getData(battleKey);
      
      if (isBattle) {
        const isCorrect = update.poll_answer.option_ids[0] === isBattle.correct;
        const result = await battleEngine.processGroupBuzzer(isBattle.chatId, pollId, userId, isCorrect, Date.now() - isBattle.startTime);
        
        if (result.status === 'success') {
          const medals = { 1: '🥇 GOLD', 2: '🥈 SILVER', 3: '🥉 BRONZE' };
          await sendMessage(
            isBattle.chatId,
            `${medals[result.rank]} *Winner Alert*\n━━━━━━━━━━━━━━━━━━━━\n\n${mentionUserFromProfile(user, userId)} answered in *${(result.responseTime / 1000).toFixed(2)}s*.\n\n💥 *+${result.reward} XP*`
          );
          const afterBattleXp = await db.getUser(userId, 'telegram');
          await db.updateGroupLeaderboard(isBattle.chatId, userId, 'telegram', afterBattleXp?.xp || 0);
          
          if (result.winners.length === 3) {
            const winnerLines = [];
            for (const winner of result.winners) {
              const profile = await db.getUser(winner.userId, 'telegram');
              const medal = winner.rank === 1 ? '🥇' : winner.rank === 2 ? '🥈' : '🥉';
              winnerLines.push(`${medal} ${mentionUserFromProfile(profile, winner.userId)}  +${winner.reward} XP`);
            }
            await sendMessage(
              isBattle.chatId,
              `🎊 *BATTLE OVER* 🎊\n━━━━━━━━━━━━━━━━━━━━\n\n` +
              `${winnerLines.join('\n')}\n\n` +
              `🎉 Congratulations champions!\n` +
              `Use /groupleague to view updated ranking.`
            );
            const gold = result.winners.find(w => w.rank === 1);
            if (gold) {
              const goldUser = await db.getUser(gold.userId, 'telegram');
              const battleBanner = await bannerEngine.generate('BATTLEWIN', {
                topTitle: 'QUIZ BATTLE WON',
                bigWord: 'WINNER',
                username: goldUser.username || goldUser.firstName || `User${String(gold.userId).slice(-4)}`,
                topic: 'UPSC Polity',
                statement: 'I won this group battle',
                detailLine: `XP Gained: ${gold.reward}`,
                xpGained: gold.reward,
                score: 'Battle Champion',
                brandTag: '@Edu4BharatAI_bot'
              });
              if (battleBanner) {
                await sendDocument(isBattle.chatId, battleBanner, 'miga_battle_win.jpg', '🥇 *Battle Winner Card*');
              }
            }
            await db.deleteData(battleKey);
          }
        }
        return res.status(200).json({ ok: true });
      }

      const quizPollKey = `miga:quiz_poll:${pollId}`;
      const quizMeta = await db.getData(quizPollKey);
      const isQuizPoll = quizMeta && String(quizMeta.userId) === String(userId);
      const isCorrect = isQuizPoll ? selectedOption === quizMeta.correct : false;
      if (isQuizPoll) {
        await db.saveData(quizPollKey, { ...quizMeta, answered: true }, 3600);
        // Award XP for quiz participating
        const xpResult = await db.addXP(userId, 'telegram', isCorrect ? 18 : gamification.awardXP('quiz_attempt'), isCorrect ? 'quiz_correct' : 'quiz_attempt');
        if (quizMeta && isGroupChat({ type: String(quizMeta.chatId).startsWith('-') ? 'group' : 'private' })) {
          await db.updateGroupLeaderboard(quizMeta.chatId, userId, 'telegram', xpResult?.xp || user.xp || 0);
        }
        await processPersonalQuizProgress(userId, quizMeta?.chatId || userId, isCorrect);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Webhook Error:', error);
    return res.status(200).json({ ok: true });
  }
};

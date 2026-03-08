// MIGA Broadcast API
// Sends scheduled notifications to all users
// Called by cron job (Vercel Cron or external service)

const db = require('../lib/database');
const studyTools = require('../lib/study-tools');
const gamification = require('../lib/gamification');

const TELEGRAM_API = 'https://api.telegram.org/bot';

// Send message to a user
async function sendTelegramMessage(chatId, text, keyboard = null) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const body = {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown'
  };
  
  if (keyboard) {
    body.reply_markup = JSON.stringify(keyboard);
  }

  try {
    const response = await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return await response.json();
  } catch (error) {
    console.error('Broadcast send error:', error);
    return null;
  }
}

// Get time of day
function getTimeOfDay() {
  const hour = new Date().getUTCHours() + 5.5; // IST
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

// ============ BROADCAST HANDLERS ============

// Daily Challenge Broadcast (Morning 8 AM)
async function broadcastDailyChallenge() {
  const users = await db.getAllUsers('telegram');
  let sent = 0;
  
  for (const user of users) {
    if (user.onboardingStep === 'ready') {
      const challengeMsg = studyTools.formatDailyChallenge(user);
      const reminder = studyTools.getStudyReminder('morning');
      
      const fullMsg = `${reminder}\n\n${challengeMsg}`;
      
      const keyboard = {
        inline_keyboard: [
          [{ text: '🎯 Start Now!', callback_data: 'menu_quiz' }]
        ]
      };
      
      await sendTelegramMessage(user.id, fullMsg, keyboard);
      sent++;
      
      // Rate limiting - 30 messages per second max
      await new Promise(r => setTimeout(r, 50));
    }
  }
  
  return { sent, total: users.length };
}

// Leaderboard Broadcast (Evening 8 PM)
async function broadcastLeaderboard() {
  const users = await db.getAllUsers('telegram');
  let sent = 0;
  
  // Get top 10 users by XP
  const leaderboard = await db.getLeaderboard('weekly', 10);
  
  if (leaderboard.length === 0) {
    return { sent: 0, total: 0 };
  }
  
  // Format leaderboard message
  let lbMsg = `🏆 *Daily Leaderboard*\n\n`;
  lbMsg += `Top learners today:\n\n`;
  
  const medals = ['🥇', '🥈', '🥉'];
  
  leaderboard.forEach((user, index) => {
    const medal = medals[index] || `${index + 1}.`;
    const name = user.username ? `@${user.username}` : (user.name || `User ${user.id.toString().slice(-4)}`);
    const levelInfo = gamification.calculateLevel(user.xp || 0);
    
    lbMsg += `${medal} *${name}*\n`;
    lbMsg += `   ⚡ ${user.xp || 0} XP • Level ${levelInfo.level}\n\n`;
  });
  
  lbMsg += `\n💪 Keep learning to climb the ranks!`;
  
  const keyboard = {
    inline_keyboard: [
      [{ text: '🎯 Take Quiz Now', callback_data: 'menu_quiz' }],
      [{ text: '🔥 My Stats', callback_data: 'menu_streak' }]
    ]
  };
  
  // Send to all active users
  for (const user of users) {
    if (user.onboardingStep === 'ready') {
      await sendTelegramMessage(user.id, lbMsg, keyboard);
      sent++;
      await new Promise(r => setTimeout(r, 50));
    }
  }
  
  return { sent, total: users.length };
}

// Study Reminder Broadcast
async function broadcastStudyReminder() {
  const users = await db.getAllUsers('telegram');
  const timeOfDay = getTimeOfDay();
  let sent = 0;
  
  for (const user of users) {
    if (user.onboardingStep === 'ready') {
      const reminder = studyTools.getStudyReminder(timeOfDay);
      const daily = await db.getDailyGoalProgress(user.id, 'telegram');
      const exam = String(user.exam || 'upsc').toUpperCase();
      
      // Add streak info
      const streak = user.streak?.current || 0;
      let streakMsg = '';
      if (streak > 0) {
        streakMsg = `\n\n🔥 Your streak: *${streak} days* - Don't break it!`;
      }
      let dailyMsg = '';
      if (daily && !(daily.quizDone && daily.topicDone)) {
        const quizLeft = Math.max(0, (daily.quizTargetPerDay || 10) - (daily.quizQuestionsAnswered || 0));
        const topicLeft = Math.max(0, (daily.topicTargetPerDay || 1) - (daily.topicGoalsCompleted || 0));
        dailyMsg = `\n\n🎯 *${exam} target left today:*\n• ${quizLeft} quiz questions\n• ${topicLeft} topic goal`;
      } else if (daily && daily.quizDone && daily.topicDone) {
        dailyMsg = `\n\n🏆 *${exam} daily goal done!* Keep your streak and rest well.`;
      }
      
      const keyboard = {
        inline_keyboard: [
          [{ text: '📚 Study Now', callback_data: 'menu_main' }],
          [{ text: '📈 Daily Progress', callback_data: 'menu_main' }]
        ]
      };
      
      await sendTelegramMessage(user.id, reminder + streakMsg + dailyMsg, keyboard);
      sent++;
      await new Promise(r => setTimeout(r, 50));
    }
  }
  
  return { sent, total: users.length };
}

// Group League Top 3 (daily auto-post)
async function broadcastGroupLeagueTop3() {
  const groupIds = await db.getTrackedGroups();
  let posted = 0;

  for (const groupId of groupIds) {
    const rows = await db.getGroupLeaderboard(groupId, 3);
    if (!rows.length) continue;
    const title = await db.getGroupTitle(groupId) || 'Study Group';
    const text = `🏟️ *${title} Daily League Update*\n\n` +
      `🥇 ${rows[0]?.name || '-'}\n` +
      `🥈 ${rows[1]?.name || '-'}\n` +
      `🥉 ${rows[2]?.name || '-'}\n\n` +
      `Use /groupleague to view full weekly table.`;
    await sendTelegramMessage(groupId, text, {
      inline_keyboard: [[{ text: '🏆 View Group League', callback_data: 'menu_main' }]]
    });
    posted++;
    await new Promise(r => setTimeout(r, 60));
  }

  return { posted, totalGroups: groupIds.length };
}

async function broadcastMegaQuiz9PM() {
  const groupIds = await db.getTrackedGroups();
  let posted = 0;
  for (const groupId of groupIds) {
    await sendTelegramMessage(
      groupId,
      `⏰ *9PM India Mega Quiz is LIVE!*\n\n20 minutes. Fastest minds climb the league.\n\nHost command: \`/hoststart polity\``,
      { inline_keyboard: [[{ text: '🎙️ Start Host Mode', callback_data: 'menu_teacher' }]] }
    );
    posted++;
    await new Promise(r => setTimeout(r, 60));
  }
  return { posted, totalGroups: groupIds.length };
}

async function broadcastSundayBattleCup() {
  const day = new Date().getUTCDay();
  if (day !== 0) return { posted: 0, skipped: true, reason: 'not_sunday_utc' };

  const groupIds = await db.getTrackedGroups();
  let posted = 0;
  for (const groupId of groupIds) {
    await sendTelegramMessage(
      groupId,
      `🏆 *Sunday Battle Cup starts now!*\n\nRun \`/battle history\` or use host mode for your group finals.`,
      { inline_keyboard: [[{ text: '⚔️ Start Battle', callback_data: 'menu_quiz' }]] }
    );
    posted++;
    await new Promise(r => setTimeout(r, 60));
  }
  return { posted, totalGroups: groupIds.length };
}

async function broadcastGoalResumePings() {
  const keys = await db.getKeysByPattern('miga:goal:resume:telegram:*');
  let pinged = 0;
  const now = Date.now();

  for (const key of keys) {
    const item = await db.getData(key);
    if (!item || item.notified || !item.dueAt || item.dueAt > now) continue;

    await sendTelegramMessage(
      item.chatId || item.userId,
      `⏰ *Break Complete*\n━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Are you up for the next tutor session on *${item.topic}*?`,
      { inline_keyboard: [[{ text: '▶️ Continue Session', callback_data: 'goal_continue' }]] }
    );
    await db.saveData(key, { ...item, notified: true }, 86400 * 2);
    pinged++;
    await new Promise(r => setTimeout(r, 40));
  }

  return { pinged, checked: keys.length };
}

// ============ API HANDLER ============

module.exports = async (req, res) => {
  // Verify cron secret (optional security)
  const cronSecret = req.headers['x-cron-secret'] || req.query.secret;
  const expectedSecret = process.env.CRON_SECRET;
  
  if (expectedSecret && cronSecret !== expectedSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const action = req.query.action || req.body?.action;
  
  try {
    let result;
    
    switch (action) {
      case 'daily_challenge':
        result = await broadcastDailyChallenge();
        break;
      case 'leaderboard':
        result = await broadcastLeaderboard();
        break;
      case 'reminder':
        result = await broadcastStudyReminder();
        break;
      case 'group_league_top3':
        result = await broadcastGroupLeagueTop3();
        break;
      case 'mega_quiz_9pm':
        result = await broadcastMegaQuiz9PM();
        break;
      case 'sunday_battle_cup':
        result = await broadcastSundayBattleCup();
        break;
      case 'goal_resume':
        result = await broadcastGoalResumePings();
        break;
      default:
        return res.status(400).json({ 
          error: 'Invalid action',
          validActions: ['daily_challenge', 'leaderboard', 'reminder', 'group_league_top3', 'mega_quiz_9pm', 'sunday_battle_cup', 'goal_resume']
        });
    }
    
    res.status(200).json({
      success: true,
      action,
      ...result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Broadcast error:', error);
    res.status(500).json({ error: error.message });
  }
};

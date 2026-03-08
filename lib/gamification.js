// MIGA Gamification System
// XP, Streaks, Badges, Leaderboards, Levels

// ============ XP SYSTEM ============

const XP_REWARDS = {
  // Learning activities
  solve_problem: 10,
  solve_hard_problem: 25,
  complete_quiz: 15,
  quiz_attempt: 10,
  quiz_perfect_score: 30,
  read_notes: 5,
  ask_doubt: 5,
  
  // Engagement
  daily_login: 5,
  streak_bonus_7: 50,
  streak_bonus_30: 200,
  streak_bonus_100: 500,
  
  // Achievements
  first_problem: 20,
  first_quiz: 20,
  first_voice: 15,
  share_score: 10,
  refer_friend: 100,
  
  // Current affairs
  read_current_affairs: 10,
  current_affairs_quiz: 20,
  
  // PYQ
  pyq_attempt: 15,
  pyq_correct: 25
};

// ============ LEVEL SYSTEM ============

const LEVELS = [
  { level: 1, name: 'Beginner', minXP: 0, emoji: '🌱' },
  { level: 2, name: 'Learner', minXP: 100, emoji: '📚' },
  { level: 3, name: 'Student', minXP: 300, emoji: '✏️' },
  { level: 4, name: 'Scholar', minXP: 600, emoji: '🎓' },
  { level: 5, name: 'Expert', minXP: 1000, emoji: '⭐' },
  { level: 6, name: 'Master', minXP: 1500, emoji: '🏆' },
  { level: 7, name: 'Champion', minXP: 2500, emoji: '👑' },
  { level: 8, name: 'Legend', minXP: 4000, emoji: '🔥' },
  { level: 9, name: 'Genius', minXP: 6000, emoji: '🧠' },
  { level: 10, name: 'MIGA Master', minXP: 10000, emoji: '🦊' }
];

/**
 * Calculate level from XP
 */
function calculateLevel(xp) {
  let currentLevel = LEVELS[0];
  for (const level of LEVELS) {
    if (xp >= level.minXP) {
      currentLevel = level;
    } else {
      break;
    }
  }
  
  // Calculate progress to next level
  const currentIndex = LEVELS.indexOf(currentLevel);
  const nextLevel = LEVELS[currentIndex + 1];
  
  let progress = 100;
  let xpToNext = 0;
  
  if (nextLevel) {
    const xpInLevel = xp - currentLevel.minXP;
    const xpNeeded = nextLevel.minXP - currentLevel.minXP;
    progress = Math.round((xpInLevel / xpNeeded) * 100);
    xpToNext = nextLevel.minXP - xp;
  }
  
  return {
    ...currentLevel,
    xp,
    progress,
    xpToNext,
    nextLevel: nextLevel || null
  };
}

/**
 * Award XP for an action
 */
function awardXP(action, multiplier = 1) {
  const baseXP = XP_REWARDS[action] || 0;
  return Math.round(baseXP * multiplier);
}

// ============ STREAK SYSTEM ============

/**
 * Calculate streak from activity dates
 */
function calculateStreak(activityDates) {
  if (!activityDates || activityDates.length === 0) {
    return { current: 0, longest: 0, isActive: false };
  }
  
  // Sort dates descending
  const dates = activityDates
    .map(d => new Date(d).toDateString())
    .filter((d, i, arr) => arr.indexOf(d) === i) // Unique dates
    .sort((a, b) => new Date(b) - new Date(a));
  
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  
  // Check if streak is active (activity today or yesterday)
  const isActive = dates[0] === today || dates[0] === yesterday;
  
  if (!isActive) {
    return { current: 0, longest: calculateLongestStreak(dates), isActive: false };
  }
  
  // Calculate current streak
  let currentStreak = 1;
  let checkDate = new Date(dates[0]);
  
  for (let i = 1; i < dates.length; i++) {
    checkDate.setDate(checkDate.getDate() - 1);
    if (dates[i] === checkDate.toDateString()) {
      currentStreak++;
    } else {
      break;
    }
  }
  
  return {
    current: currentStreak,
    longest: Math.max(currentStreak, calculateLongestStreak(dates)),
    isActive: true,
    lastActivity: dates[0]
  };
}

function calculateLongestStreak(dates) {
  if (dates.length === 0) return 0;
  
  let longest = 1;
  let current = 1;
  
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diffDays = Math.round((prev - curr) / 86400000);
    
    if (diffDays === 1) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }
  
  return longest;
}

/**
 * Get streak emoji display
 */
function getStreakDisplay(streak) {
  if (streak === 0) return '💤';
  if (streak < 3) return '🔥';
  if (streak < 7) return '🔥🔥';
  if (streak < 14) return '🔥🔥🔥';
  if (streak < 30) return '⚡🔥🔥🔥';
  if (streak < 100) return '💎🔥🔥🔥🔥';
  return '👑🔥🔥🔥🔥🔥';
}

// ============ BADGES SYSTEM ============

const BADGES = {
  // Getting Started
  first_step: {
    id: 'first_step',
    name: 'First Step',
    emoji: '👣',
    description: 'Solved your first problem',
    condition: (stats) => stats.problemsSolved >= 1
  },
  curious_mind: {
    id: 'curious_mind',
    name: 'Curious Mind',
    emoji: '🤔',
    description: 'Asked your first doubt',
    condition: (stats) => stats.doubtsAsked >= 1
  },
  
  // Problem Solving
  problem_solver: {
    id: 'problem_solver',
    name: 'Problem Solver',
    emoji: '🧩',
    description: 'Solved 10 problems',
    condition: (stats) => stats.problemsSolved >= 10
  },
  century_club: {
    id: 'century_club',
    name: 'Century Club',
    emoji: '💯',
    description: 'Solved 100 problems',
    condition: (stats) => stats.problemsSolved >= 100
  },
  problem_master: {
    id: 'problem_master',
    name: 'Problem Master',
    emoji: '🏆',
    description: 'Solved 500 problems',
    condition: (stats) => stats.problemsSolved >= 500
  },
  
  // Quiz
  quiz_starter: {
    id: 'quiz_starter',
    name: 'Quiz Starter',
    emoji: '🎯',
    description: 'Completed your first quiz',
    condition: (stats) => stats.quizzesCompleted >= 1
  },
  quiz_master: {
    id: 'quiz_master',
    name: 'Quiz Master',
    emoji: '🎓',
    description: 'Completed 50 quizzes',
    condition: (stats) => stats.quizzesCompleted >= 50
  },
  perfectionist: {
    id: 'perfectionist',
    name: 'Perfectionist',
    emoji: '✨',
    description: 'Got 100% on 10 quizzes',
    condition: (stats) => stats.perfectQuizzes >= 10
  },
  
  // Streaks
  streak_starter: {
    id: 'streak_starter',
    name: 'Streak Starter',
    emoji: '🔥',
    description: '3 day streak',
    condition: (stats) => stats.longestStreak >= 3
  },
  week_warrior: {
    id: 'week_warrior',
    name: 'Week Warrior',
    emoji: '⚡',
    description: '7 day streak',
    condition: (stats) => stats.longestStreak >= 7
  },
  consistency_king: {
    id: 'consistency_king',
    name: 'Consistency King',
    emoji: '👑',
    description: '30 day streak',
    condition: (stats) => stats.longestStreak >= 30
  },
  unstoppable: {
    id: 'unstoppable',
    name: 'Unstoppable',
    emoji: '💎',
    description: '100 day streak',
    condition: (stats) => stats.longestStreak >= 100
  },
  
  // Languages
  polyglot: {
    id: 'polyglot',
    name: 'Polyglot',
    emoji: '🌍',
    description: 'Used 3+ languages',
    condition: (stats) => stats.languagesUsed >= 3
  },
  
  // Voice
  voice_learner: {
    id: 'voice_learner',
    name: 'Voice Learner',
    emoji: '🎙️',
    description: 'Used voice messages 10 times',
    condition: (stats) => stats.voiceMessages >= 10
  },
  
  // Photo
  snap_solver: {
    id: 'snap_solver',
    name: 'Snap Solver',
    emoji: '📸',
    description: 'Solved 20 problems from photos',
    condition: (stats) => stats.photoProblems >= 20
  },
  
  // Current Affairs
  news_hawk: {
    id: 'news_hawk',
    name: 'News Hawk',
    emoji: '📰',
    description: 'Read current affairs 30 days',
    condition: (stats) => stats.currentAffairsDays >= 30
  },
  
  // PYQ
  pyq_warrior: {
    id: 'pyq_warrior',
    name: 'PYQ Warrior',
    emoji: '📚',
    description: 'Attempted 100 PYQs',
    condition: (stats) => stats.pyqAttempted >= 100
  },
  
  // Levels
  level_5: {
    id: 'level_5',
    name: 'Rising Star',
    emoji: '⭐',
    description: 'Reached Level 5',
    condition: (stats) => stats.level >= 5
  },
  level_10: {
    id: 'level_10',
    name: 'MIGA Legend',
    emoji: '🦊',
    description: 'Reached Level 10',
    condition: (stats) => stats.level >= 10
  },
  
  // Special
  early_bird: {
    id: 'early_bird',
    name: 'Early Bird',
    emoji: '🌅',
    description: 'Studied before 6 AM',
    condition: (stats) => stats.earlyBirdSessions >= 1
  },
  night_owl: {
    id: 'night_owl',
    name: 'Night Owl',
    emoji: '🦉',
    description: 'Studied after midnight',
    condition: (stats) => stats.nightOwlSessions >= 1
  },
  weekend_warrior: {
    id: 'weekend_warrior',
    name: 'Weekend Warrior',
    emoji: '🗓️',
    description: 'Studied every weekend for a month',
    condition: (stats) => stats.weekendStudyWeeks >= 4
  }
};

/**
 * Check which badges user has earned
 */
function checkBadges(stats) {
  const earned = [];
  const available = [];
  
  for (const [id, badge] of Object.entries(BADGES)) {
    if (badge.condition(stats)) {
      earned.push(badge);
    } else {
      available.push(badge);
    }
  }
  
  return { earned, available };
}

/**
 * Check for newly earned badges
 */
function checkNewBadges(stats, existingBadgeIds = []) {
  const newBadges = [];
  
  for (const [id, badge] of Object.entries(BADGES)) {
    if (!existingBadgeIds.includes(id) && badge.condition(stats)) {
      newBadges.push(badge);
    }
  }
  
  return newBadges;
}

/**
 * Format badges for display
 */
function formatBadges(badges, maxDisplay = 10) {
  if (badges.length === 0) {
    return 'No badges yet. Keep learning! 📚';
  }
  
  const displayed = badges.slice(0, maxDisplay);
  let text = displayed.map(b => `${b.emoji} ${b.name}`).join('\n');
  
  if (badges.length > maxDisplay) {
    text += `\n... and ${badges.length - maxDisplay} more!`;
  }
  
  return text;
}

// ============ LEADERBOARD ============

/**
 * Format leaderboard entry
 */
function formatLeaderboardEntry(rank, user) {
  const medals = ['🥇', '🥈', '🥉'];
  const medal = medals[rank - 1] || `${rank}.`;
  
  const levelInfo = calculateLevel(user.xp);
  
  return `${medal} ${user.name || 'Student'} - ${user.xp} XP ${levelInfo.emoji}`;
}

/**
 * Format full leaderboard
 */
function formatLeaderboard(users, title = '🏆 Weekly Leaderboard') {
  if (users.length === 0) {
    return `${title}\n\nNo entries yet. Be the first! 🚀`;
  }
  
  let text = `${title}\n${'─'.repeat(20)}\n\n`;
  
  users.slice(0, 10).forEach((user, index) => {
    text += formatLeaderboardEntry(index + 1, user) + '\n';
  });
  
  return text;
}

// ============ STATS DISPLAY ============

/**
 * Format user stats card
 */
function formatStatsCard(user) {
  const levelInfo = calculateLevel(user.xp || 0);
  const streak = user.streak || { current: 0, longest: 0 };
  const badges = user.badges || [];
  
  const progressBar = createProgressBar(levelInfo.progress);
  
  return `
📊 *Your Stats*
${'─'.repeat(20)}

${levelInfo.emoji} *Level ${levelInfo.level}* - ${levelInfo.name}
${progressBar} ${levelInfo.progress}%
⚡ ${user.xp || 0} XP ${levelInfo.nextLevel ? `(${levelInfo.xpToNext} to next)` : '(MAX)'}

🔥 *Streak:* ${streak.current} days ${getStreakDisplay(streak.current)}
📈 *Longest:* ${streak.longest} days

🏅 *Badges:* ${badges.length}/${Object.keys(BADGES).length}
${badges.slice(0, 5).map(b => BADGES[b]?.emoji || '🏅').join(' ')}

📚 *Problems Solved:* ${user.problemsSolved || 0}
🎯 *Quizzes Completed:* ${user.quizzesCompleted || 0}
`.trim();
}

/**
 * Create ASCII progress bar
 */
function createProgressBar(percent, length = 10) {
  const filled = Math.round((percent / 100) * length);
  const empty = length - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

// ============ MOTIVATIONAL MESSAGES ============

const LEVEL_UP_MESSAGES = [
  "🎉 LEVEL UP! You're on fire!",
  "⬆️ New level unlocked! Keep crushing it!",
  "🚀 Level up! You're unstoppable!",
  "✨ Congratulations! New level achieved!",
  "🌟 Amazing! You've leveled up!"
];

const STREAK_MESSAGES = {
  3: "🔥 3 day streak! You're building momentum!",
  7: "⚡ 1 WEEK STREAK! Incredible consistency!",
  14: "💪 2 WEEK STREAK! You're a machine!",
  30: "👑 30 DAY STREAK! You're a legend!",
  50: "🏆 50 DAY STREAK! Absolutely phenomenal!",
  100: "💎 100 DAY STREAK! MIGA Master status!"
};

const BADGE_MESSAGES = [
  "🏅 New badge unlocked!",
  "✨ Achievement unlocked!",
  "🎖️ You earned a new badge!",
  "🏆 Badge earned! Well done!"
];

function getLevelUpMessage() {
  return LEVEL_UP_MESSAGES[Math.floor(Math.random() * LEVEL_UP_MESSAGES.length)];
}

function getStreakMessage(streak) {
  const milestones = Object.keys(STREAK_MESSAGES).map(Number).sort((a, b) => b - a);
  for (const milestone of milestones) {
    if (streak >= milestone) {
      return STREAK_MESSAGES[milestone];
    }
  }
  return `🔥 ${streak} day streak!`;
}

function getBadgeMessage() {
  return BADGE_MESSAGES[Math.floor(Math.random() * BADGE_MESSAGES.length)];
}

// ============ EXPORTS ============

module.exports = {
  // XP
  XP_REWARDS,
  awardXP,
  
  // Levels
  LEVELS,
  calculateLevel,
  
  // Streaks
  calculateStreak,
  getStreakDisplay,
  
  // Badges
  BADGES,
  checkBadges,
  checkNewBadges,
  formatBadges,
  
  // Leaderboard
  formatLeaderboardEntry,
  formatLeaderboard,
  
  // Display
  formatStatsCard,
  createProgressBar,
  
  // Messages
  getLevelUpMessage,
  getStreakMessage,
  getBadgeMessage
};

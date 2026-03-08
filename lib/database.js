// MIGA Database Layer - Upstash Redis
// Persistent storage for user data, conversations, gamification, and stats

const { Redis } = require('@upstash/redis');

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Key prefixes for organization
const KEYS = {
  user: (platform, userId) => `miga:user:${platform}:${userId}`,
  conversation: (platform, userId) => `miga:conv:${platform}:${userId}`,
  stats: (platform, userId) => `miga:stats:${platform}:${userId}`,
  dailyUsage: (platform, userId, date) => `miga:usage:${platform}:${userId}:${date}`,
  studyPlan: (platform, userId) => `miga:plan:${platform}:${userId}`,
  activityLog: (platform, userId) => `miga:activity:${platform}:${userId}`,
  leaderboard: (period) => `miga:leaderboard:${period}`,
  globalStats: () => `miga:global:stats`,
  dailyGoal: (platform, userId, date) => `miga:daily_goal:${platform}:${userId}:${date}`,
  featureUsage: (platform, userId, date, feature) => `miga:quota:${platform}:${userId}:${date}:${feature}`,
};

const PLAN_LIMITS = {
  free: {
    ai_chat: Number.parseInt(process.env.LIMIT_FREE_AI_CHAT || '8', 10),
    quiz_questions: Number.parseInt(process.env.LIMIT_FREE_QUIZ_QUESTIONS || '15', 10),
    pyq_questions: Number.parseInt(process.env.LIMIT_FREE_PYQ_QUESTIONS || '5', 10),
    goal_sessions: Number.parseInt(process.env.LIMIT_FREE_GOAL_SESSIONS || '1', 10),
    image_solves: Number.parseInt(process.env.LIMIT_FREE_IMAGE_SOLVES || '3', 10),
    voice_chats: Number.parseInt(process.env.LIMIT_FREE_VOICE_CHATS || '4', 10),
    current_affairs: Number.parseInt(process.env.LIMIT_FREE_CURRENT_AFFAIRS || '3', 10),
  },
  pro: {
    ai_chat: Number.parseInt(process.env.LIMIT_PRO_AI_CHAT || '60', 10),
    quiz_questions: Number.parseInt(process.env.LIMIT_PRO_QUIZ_QUESTIONS || '60', 10),
    pyq_questions: Number.parseInt(process.env.LIMIT_PRO_PYQ_QUESTIONS || '20', 10),
    goal_sessions: Number.parseInt(process.env.LIMIT_PRO_GOAL_SESSIONS || '6', 10),
    image_solves: Number.parseInt(process.env.LIMIT_PRO_IMAGE_SOLVES || '20', 10),
    voice_chats: Number.parseInt(process.env.LIMIT_PRO_VOICE_CHATS || '25', 10),
    current_affairs: Number.parseInt(process.env.LIMIT_PRO_CURRENT_AFFAIRS || '15', 10),
  }
};

const TRACKED_FEATURES = Object.keys(PLAN_LIMITS.free);

const QUIZ_SUBJECT_ICONS = {
  history: '🏛️',
  polity: '🏛️',
  geography: '🌍',
  science: '🔬',
  english: '📚',
  economics: '📈',
  general: '🧠',
  gk: '🧠',
  maths: '➗'
};

function toTitleCase(text = '') {
  return text
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function getTodayDateKey() {
  return new Date().toISOString().split('T')[0];
}

function normalizeQuizAnswerIndex(rawQuestion = {}, options = [], fallback = 0) {
  const q = rawQuestion || {};
  const len = options.length;
  if (!len) return fallback;

  const candidates = [
    q.correct_answer,
    q.correct,
    q.correctOptionId,
    q.answer_index,
    q.answerIndex
  ];

  let idx = null;
  for (const value of candidates) {
    if (Number.isInteger(value)) {
      idx = value;
      break;
    }
    if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
      idx = parseInt(value.trim(), 10);
      break;
    }
    if (typeof value === 'string' && /^[A-Da-d]$/.test(value.trim())) {
      idx = value.trim().toUpperCase().charCodeAt(0) - 65;
      break;
    }
  }

  const directText =
    (typeof q.correct_text === 'string' && q.correct_text) ||
    (typeof q.correct_option === 'string' && q.correct_option) ||
    (typeof q.answer_text === 'string' && q.answer_text) ||
    (typeof q.answer === 'string' && !/^\d+$/.test(q.answer.trim()) ? q.answer : '');

  if (directText) {
    const t = directText.trim().toLowerCase();
    const found = options.findIndex(o => String(o || '').trim().toLowerCase() === t);
    if (found >= 0) return found;
  }

  const explanation = String(q.explanation || '').toLowerCase();

  if (Number.isInteger(idx)) {
    if (idx >= 0 && idx < len) {
      // Heuristic: old datasets sometimes stored 1-based index (1..4).
      // If explanation clearly mentions neighboring 1-based candidate, prefer that.
      if (idx > 0 && idx <= len - 1) {
        const oneBasedCandidate = idx - 1;
        const optionA = String(options[idx] || '').toLowerCase();
        const optionB = String(options[oneBasedCandidate] || '').toLowerCase();
        if (optionB && explanation.includes(optionB) && optionA && !explanation.includes(optionA)) {
          return oneBasedCandidate;
        }
      }
      return idx;
    }
    if (idx >= 1 && idx <= len) return idx - 1;
  }

  if (explanation) {
    const hits = options
      .map((o, i) => ({ i, t: String(o || '').toLowerCase() }))
      .filter(x => x.t.length >= 6 && explanation.includes(x.t));
    if (hits.length === 1) return hits[0].i;
  }

  return fallback;
}

// ============ GENERIC DATA STORAGE ============

// Save any data with optional expiry (seconds)
async function saveData(key, data, expiry = null) {
  try {
    if (expiry) {
      await redis.set(key, data, { ex: expiry });
    } else {
      await redis.set(key, data);
    }
    return true;
  } catch (error) {
    console.error('Database error (saveData):', error);
    return false;
  }
}

// Get any data
async function getData(key) {
  try {
    return await redis.get(key);
  } catch (error) {
    console.error('Database error (getData):', error);
    return null;
  }
}

// Delete any data
async function deleteData(key) {
  try {
    await redis.del(key);
    return true;
  } catch (error) {
    console.error('Database error (deleteData):', error);
    return false;
  }
}

// ============ USER MANAGEMENT ============

// Default user structure
function createDefaultUser(userId, platform) {
  return {
    id: userId,
    platform: platform,
    language: null,
    mode: null,
    exam: null,
    onboardingStep: 'language',
    name: null,
    username: null,  // Telegram/WhatsApp username
    firstName: null,
    lastName: null,
    grade: null,  // For students
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    
    // Gamification
    xp: 0,
    level: 1,
    badges: [],
    
    // Stats
    stats: {
      questionsAsked: 0,
      problemsSolved: 0,
      photosAnalyzed: 0,
      voiceMessages: 0,
      quizzesCompleted: 0,
      perfectQuizzes: 0,
      pyqAttempted: 0,
      pyqCorrect: 0,
      currentAffairsDays: 0,
      sessionsCount: 1,
      languagesUsed: [],
      earlyBirdSessions: 0,
      nightOwlSessions: 0,
      weekendStudyWeeks: 0,
    },
    
    // Streak
    streak: {
      current: 0,
      longest: 0,
      lastActiveDate: null,
      activityDates: [],
    },
    
    // Weak areas tracking
    weakAreas: {},
    
    // Preferences
    preferences: {
      explanationStyle: 'detailed', // 'simple', 'detailed', 'expert'
      notificationsEnabled: true,
      dailyReminder: null,
      streakAlert: true,
      newsDigest: true,
    },

    subscription: {
      tier: 'free',
      status: 'active',
      startedAt: null,
      expiresAt: null
    }
  };
}

// Get user (creates if not exists)
async function getUser(userId, platform = 'telegram') {
  const key = KEYS.user(platform, userId);
  
  try {
    let user = await redis.get(key);
    
    if (!user) {
      user = createDefaultUser(userId, platform);
      await redis.set(key, user);
      // Increment global user count
      await redis.incr(`${KEYS.globalStats()}:totalUsers`);
    } else {
      // Migrate old users to new structure
      user = migrateUser(user, userId, platform);
      // Update last active
      user.lastActiveAt = new Date().toISOString();
      await redis.set(key, user);
    }
    
    return user;
  } catch (error) {
    console.error('Database error (getUser):', error);
    // Return in-memory fallback
    return createDefaultUser(userId, platform);
  }
}

// Migrate old user structure to new
function migrateUser(user, userId, platform) {
  const defaults = createDefaultUser(userId, platform);
  
  // Add missing fields
  if (!user.xp) user.xp = 0;
  if (!user.level) user.level = 1;
  if (!user.badges) user.badges = [];
  if (!user.streak) user.streak = defaults.streak;
  if (!user.weakAreas) user.weakAreas = {};
  if (!user.stats) user.stats = defaults.stats;
  if (!user.stats.problemsSolved) user.stats.problemsSolved = 0;
  if (!user.stats.quizzesCompleted) user.stats.quizzesCompleted = 0;
  if (!user.stats.perfectQuizzes) user.stats.perfectQuizzes = 0;
  if (!user.stats.pyqAttempted) user.stats.pyqAttempted = 0;
  if (!user.stats.pyqCorrect) user.stats.pyqCorrect = 0;
  if (!user.stats.currentAffairsDays) user.stats.currentAffairsDays = 0;
  if (!user.stats.languagesUsed) user.stats.languagesUsed = [];
  if (!user.stats.earlyBirdSessions) user.stats.earlyBirdSessions = 0;
  if (!user.stats.nightOwlSessions) user.stats.nightOwlSessions = 0;
  if (!user.stats.weekendStudyWeeks) user.stats.weekendStudyWeeks = 0;
  if (!user.subscription) user.subscription = defaults.subscription;
  if (!user.subscription.tier) user.subscription.tier = 'free';
  if (!user.subscription.status) user.subscription.status = 'active';
  
  return user;
}

// Update user
async function updateUser(userId, platform, updates) {
  const key = KEYS.user(platform, userId);
  
  try {
    const user = await getUser(userId, platform);
    const updatedUser = { ...user, ...updates, lastActiveAt: new Date().toISOString() };
    await redis.set(key, updatedUser);
    return updatedUser;
  } catch (error) {
    console.error('Database error (updateUser):', error);
    return null;
  }
}

// Set language
async function setLanguage(userId, platform, language) {
  const user = await getUser(userId, platform);
  const languagesUsed = user.stats.languagesUsed || [];
  if (!languagesUsed.includes(language)) {
    languagesUsed.push(language);
  }
  
  return await updateUser(userId, platform, {
    language: language,
    onboardingStep: 'mode',
    stats: { ...user.stats, languagesUsed }
  });
}

// Set mode
async function setMode(userId, platform, mode) {
  const updates = {
    mode: mode,
    onboardingStep: mode === 'aspirant' ? 'exam' : 'ready'
  };
  return await updateUser(userId, platform, updates);
}

// Set exam
async function setExam(userId, platform, exam) {
  return await updateUser(userId, platform, {
    exam: exam,
    onboardingStep: 'ready'
  });
}

// Set class/grade
async function setGrade(userId, platform, grade) {
  return await updateUser(userId, platform, {
    grade: grade,
    onboardingStep: 'ready'
  });
}

// Check if user is onboarded
async function isOnboarded(userId, platform) {
  const user = await getUser(userId, platform);
  return user.onboardingStep === 'ready';
}

// Get onboarding step
async function getOnboardingStep(userId, platform) {
  const user = await getUser(userId, platform);
  return user.onboardingStep;
}

// Reset user (start fresh) - keeps username/name
async function resetUser(userId, platform) {
  const key = KEYS.user(platform, userId);
  const convKey = KEYS.conversation(platform, userId);
  
  try {
    // Get old user to preserve name/username
    const oldUser = await redis.get(key);
    const newUser = createDefaultUser(userId, platform);
    
    // Preserve identity info
    if (oldUser) {
      newUser.name = oldUser.name;
      newUser.username = oldUser.username;
      newUser.firstName = oldUser.firstName;
      newUser.lastName = oldUser.lastName;
    }
    
    await redis.set(key, newUser);
    await redis.del(convKey); // Clear conversation history
    return newUser;
  } catch (error) {
    console.error('Database error (resetUser):', error);
    return createDefaultUser(userId, platform);
  }
}

// Save user profile info (name, username, and any other updates)
async function saveUserProfile(userId, platform, profileData) {
  try {
    const user = await getUser(userId, platform);
    
    // Handle identity updates
    if (profileData.username) user.username = profileData.username;
    if (profileData.firstName) user.firstName = profileData.firstName;
    if (profileData.lastName) user.lastName = profileData.lastName;
    if (profileData.firstName || profileData.lastName) {
      user.name = [profileData.firstName, profileData.lastName].filter(Boolean).join(' ');
    }
    
    // Merge all other updates
    const finalUpdates = { ...profileData };
    if (user.name) finalUpdates.name = user.name;
    if (user.username) finalUpdates.username = user.username;
    if (user.firstName) finalUpdates.firstName = user.firstName;
    if (user.lastName) finalUpdates.lastName = user.lastName;
    
    return await updateUser(userId, platform, finalUpdates);
  } catch (error) {
    console.error('Database error (saveUserProfile):', error);
    return null;
  }
}

// Check if user exists (for reset protection)
async function userExists(userId, platform) {
  const key = KEYS.user(platform, userId);
  try {
    const user = await redis.get(key);
    return user && user.onboardingStep === 'ready';
  } catch (error) {
    return false;
  }
}

// Get all users for a platform (for broadcasts)
async function getAllUsers(platform) {
  try {
    // Get all user keys
    const pattern = `miga:user:${platform}:*`;
    const keys = await redis.keys(pattern);
    
    if (!keys || keys.length === 0) return [];
    
    // Get all users
    const users = [];
    for (const key of keys) {
      const user = await redis.get(key);
      if (user) users.push(user);
    }
    
    return users;
  } catch (error) {
    console.error('Database error (getAllUsers):', error);
    return [];
  }
}

// Register user ID for broadcasts (called on first message)
async function registerUserForBroadcast(userId, platform) {
  const listKey = `miga:broadcast:${platform}`;
  try {
    await redis.sadd(listKey, userId.toString());
    return true;
  } catch (error) {
    console.error('Database error (registerUserForBroadcast):', error);
    return false;
  }
}

// ============ XP & GAMIFICATION ============

// Add XP to user
async function addXP(userId, platform, amount, reason = '') {
  try {
    const user = await getUser(userId, platform);
    const oldLevel = user.level;
    user.xp = (user.xp || 0) + amount;
    
    // Calculate new level
    const LEVELS = [0, 100, 300, 600, 1000, 1500, 2500, 4000, 6000, 10000];
    let newLevel = 1;
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (user.xp >= LEVELS[i]) {
        newLevel = i + 1;
        break;
      }
    }
    user.level = newLevel;
    
    await updateUser(userId, platform, { xp: user.xp, level: user.level });
    await updateLeaderboard(userId, platform, user.xp, user.name || user.firstName || 'Student');
    
    return {
      xp: user.xp,
      xpGained: amount,
      level: user.level,
      leveledUp: newLevel > oldLevel,
      reason
    };
  } catch (error) {
    console.error('Database error (addXP):', error);
    return null;
  }
}

// Award badge
async function awardBadge(userId, platform, badgeId) {
  try {
    const user = await getUser(userId, platform);
    if (!user.badges.includes(badgeId)) {
      user.badges.push(badgeId);
      await updateUser(userId, platform, { badges: user.badges });
      return { awarded: true, badge: badgeId, totalBadges: user.badges.length };
    }
    return { awarded: false, badge: badgeId, alreadyHas: true };
  } catch (error) {
    console.error('Database error (awardBadge):', error);
    return null;
  }
}

// Get user badges
async function getUserBadges(userId, platform) {
  const user = await getUser(userId, platform);
  return user.badges || [];
}

// ============ STREAK MANAGEMENT ============

// Update streak
async function updateStreak(userId, platform) {
  try {
    const user = await getUser(userId, platform);
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    let streak = user.streak || { current: 0, longest: 0, lastActiveDate: null, activityDates: [] };
    
    // Already active today
    if (streak.lastActiveDate === today) {
      return { streak: streak.current, updated: false };
    }
    
    // Continue streak from yesterday
    if (streak.lastActiveDate === yesterday) {
      streak.current++;
    } else if (streak.lastActiveDate !== today) {
      // Streak broken, start new
      streak.current = 1;
    }
    
    // Update longest
    if (streak.current > streak.longest) {
      streak.longest = streak.current;
    }
    
    // Update activity dates (keep last 100)
    streak.activityDates.push(today);
    if (streak.activityDates.length > 100) {
      streak.activityDates = streak.activityDates.slice(-100);
    }
    
    streak.lastActiveDate = today;
    
    await updateUser(userId, platform, { streak });
    
    // Check for streak milestones
    const milestones = [3, 7, 14, 30, 50, 100];
    const hitMilestone = milestones.includes(streak.current);
    
    return {
      streak: streak.current,
      longest: streak.longest,
      updated: true,
      hitMilestone,
      milestone: hitMilestone ? streak.current : null
    };
  } catch (error) {
    console.error('Database error (updateStreak):', error);
    return { streak: 0, updated: false };
  }
}

// Get streak info
async function getStreak(userId, platform) {
  const user = await getUser(userId, platform);
  return user.streak || { current: 0, longest: 0, lastActiveDate: null };
}

// ============ CONVERSATION HISTORY ============

// Add message to conversation history
async function addToHistory(userId, platform, role, content) {
  const key = KEYS.conversation(platform, userId);
  
  try {
    const message = {
      role: role,
      content: content,
      timestamp: new Date().toISOString()
    };
    
    // Push to list
    await redis.rpush(key, JSON.stringify(message));
    
    // Keep only last 50 messages
    const length = await redis.llen(key);
    if (length > 50) {
      await redis.ltrim(key, length - 50, -1);
    }
    
    // Update stats if user message
    if (role === 'user') {
      await incrementStat(userId, platform, 'questionsAsked');
    }
    
    return message;
  } catch (error) {
    console.error('Database error (addToHistory):', error);
    return null;
  }
}

// Get conversation history
async function getConversationHistory(userId, platform, limit = 20) {
  const key = KEYS.conversation(platform, userId);
  
  try {
    const messages = await redis.lrange(key, -limit, -1);
    return messages.map(msg => typeof msg === 'string' ? JSON.parse(msg) : msg);
  } catch (error) {
    console.error('Database error (getConversationHistory):', error);
    return [];
  }
}

// Clear conversation history
async function clearHistory(userId, platform) {
  const key = KEYS.conversation(platform, userId);
  
  try {
    await redis.del(key);
    return true;
  } catch (error) {
    console.error('Database error (clearHistory):', error);
    return false;
  }
}

// ============ STATS & ANALYTICS ============

// Increment a stat
async function incrementStat(userId, platform, statName, amount = 1) {
  try {
    const user = await getUser(userId, platform);
    user.stats[statName] = (user.stats[statName] || 0) + amount;
    
    await updateUser(userId, platform, { stats: user.stats });
    
    // Also update global stats
    await redis.incr(`${KEYS.globalStats()}:total${statName.charAt(0).toUpperCase() + statName.slice(1)}`);
    
    return user.stats;
  } catch (error) {
    console.error('Database error (incrementStat):', error);
    return null;
  }
}

// Increment photo count
async function incrementPhotoCount(userId, platform) {
  return await incrementStat(userId, platform, 'photosAnalyzed');
}

// Increment voice message count
async function incrementVoiceCount(userId, platform) {
  return await incrementStat(userId, platform, 'voiceMessages');
}

// Increment problems solved
async function incrementProblemsSolved(userId, platform) {
  return await incrementStat(userId, platform, 'problemsSolved');
}

// Increment quizzes completed
async function incrementQuizzesCompleted(userId, platform, isPerfect = false) {
  await incrementStat(userId, platform, 'quizzesCompleted');
  if (isPerfect) {
    await incrementStat(userId, platform, 'perfectQuizzes');
  }
  return await getUserStats(userId, platform);
}

// Get user stats
async function getUserStats(userId, platform) {
  const user = await getUser(userId, platform);
  return user.stats;
}

// ============ WEAK AREAS TRACKING ============

// Track weak area
async function trackWeakArea(userId, platform, subject, topic, isCorrect) {
  try {
    const user = await getUser(userId, platform);
    const weakAreas = user.weakAreas || {};
    
    const key = `${subject}:${topic}`;
    if (!weakAreas[key]) {
      weakAreas[key] = { correct: 0, total: 0 };
    }
    
    weakAreas[key].total++;
    if (isCorrect) {
      weakAreas[key].correct++;
    }
    
    await updateUser(userId, platform, { weakAreas });
    return weakAreas;
  } catch (error) {
    console.error('Database error (trackWeakArea):', error);
    return null;
  }
}

// Get weak areas
async function getWeakAreas(userId, platform) {
  const user = await getUser(userId, platform);
  const weakAreas = user.weakAreas || {};
  
  // Calculate accuracy and sort by weakness
  const areas = Object.entries(weakAreas).map(([key, data]) => {
    const [subject, topic] = key.split(':');
    const accuracy = data.total > 0 ? (data.correct / data.total) * 100 : 0;
    return { subject, topic, accuracy, ...data };
  });
  
  // Sort by accuracy (lowest first = weakest)
  return areas.sort((a, b) => a.accuracy - b.accuracy);
}

// ============ STUDY PLAN ============

// Save study plan
async function saveStudyPlan(userId, platform, plan) {
  const key = KEYS.studyPlan(platform, userId);
  
  try {
    await redis.set(key, plan);
    return true;
  } catch (error) {
    console.error('Database error (saveStudyPlan):', error);
    return false;
  }
}

// Get study plan
async function getStudyPlan(userId, platform) {
  const key = KEYS.studyPlan(platform, userId);
  
  try {
    return await redis.get(key);
  } catch (error) {
    console.error('Database error (getStudyPlan):', error);
    return null;
  }
}

// ============ DAILY USAGE TRACKING ============

// Track daily usage (for rate limiting free tier)
async function trackDailyUsage(userId, platform) {
  const today = new Date().toISOString().split('T')[0];
  const key = KEYS.dailyUsage(platform, userId, today);
  
  try {
    const count = await redis.incr(key);
    // Set expiry to 48 hours (cleanup old keys)
    if (count === 1) {
      await redis.expire(key, 172800);
    }
    return count;
  } catch (error) {
    console.error('Database error (trackDailyUsage):', error);
    return 0;
  }
}

// Get daily usage count
async function getDailyUsage(userId, platform) {
  const today = new Date().toISOString().split('T')[0];
  const key = KEYS.dailyUsage(platform, userId, today);
  
  try {
    const count = await redis.get(key);
    return parseInt(count) || 0;
  } catch (error) {
    console.error('Database error (getDailyUsage):', error);
    return 0;
  }
}

// Check if user has exceeded free limit
async function hasExceededFreeLimit(userId, platform, limit = 50) {
  const usage = await getDailyUsage(userId, platform);
  return usage >= limit;
}

function getUserTier(user = {}) {
  const tier = String(user?.subscription?.tier || 'free').toLowerCase();
  return tier === 'pro' ? 'pro' : 'free';
}

function getPlanLimits(tier = 'free') {
  const key = tier === 'pro' ? 'pro' : 'free';
  return PLAN_LIMITS[key];
}

async function getFeatureUsage(userId, platform, feature, date = null) {
  const key = KEYS.featureUsage(platform, userId, date || getTodayDateKey(), feature);
  try {
    const count = await redis.get(key);
    return parseInt(count, 10) || 0;
  } catch (error) {
    console.error('Database error (getFeatureUsage):', error);
    return 0;
  }
}

async function consumeFeatureQuota(userId, platform, feature, amount = 1, date = null) {
  const user = await getUser(userId, platform);
  const tier = getUserTier(user);
  const limits = getPlanLimits(tier);
  const limit = Number.isFinite(limits?.[feature]) ? limits[feature] : 0;
  const key = KEYS.featureUsage(platform, userId, date || getTodayDateKey(), feature);

  try {
    if (!TRACKED_FEATURES.includes(feature)) {
      return { allowed: true, tier, feature, used: 0, limit: null, remaining: null };
    }

    const incBy = Math.max(1, Number.parseInt(amount, 10) || 1);
    const used = await redis.incrby(key, incBy);
    if (used === incBy) await redis.expire(key, 172800);

    if (limit > 0 && used > limit) {
      await redis.incrby(key, -incBy);
      const current = await getFeatureUsage(userId, platform, feature, date);
      return {
        allowed: false,
        tier,
        feature,
        used: current,
        limit,
        remaining: Math.max(0, limit - current)
      };
    }

    return {
      allowed: true,
      tier,
      feature,
      used,
      limit,
      remaining: Math.max(0, limit - used)
    };
  } catch (error) {
    console.error('Database error (consumeFeatureQuota):', error);
    return { allowed: false, tier, feature, used: 0, limit, remaining: 0, error: true };
  }
}

async function getUsageSummary(userId, platform, date = null) {
  const user = await getUser(userId, platform);
  const tier = getUserTier(user);
  const limits = getPlanLimits(tier);
  const today = date || getTodayDateKey();
  const usage = {};

  for (const feature of TRACKED_FEATURES) {
    const used = await getFeatureUsage(userId, platform, feature, today);
    const limit = Number.isFinite(limits[feature]) ? limits[feature] : 0;
    usage[feature] = {
      used,
      limit,
      remaining: Math.max(0, limit - used)
    };
  }

  return { tier, date: today, usage, limits };
}

async function setUserPlan(userId, platform, tier = 'free', expiresAt = null) {
  const cleanTier = String(tier || 'free').toLowerCase() === 'pro' ? 'pro' : 'free';
  const current = await getUser(userId, platform);
  const subscription = {
    ...(current.subscription || {}),
    tier: cleanTier,
    status: 'active',
    startedAt: current.subscription?.startedAt || new Date().toISOString(),
    expiresAt: expiresAt || null
  };
  return await updateUser(userId, platform, { subscription });
}

// ============ DAILY GOAL TRACKING ============

async function getDailyGoalProgress(userId, platform, date = null) {
  const key = KEYS.dailyGoal(platform, userId, date || getTodayDateKey());
  try {
    const saved = await redis.get(key);
    if (saved) return saved;
    return {
      date: date || getTodayDateKey(),
      quizQuestionsAnswered: 0,
      quizSetsCompleted: 0,
      topicGoalsCompleted: 0,
      quizTargetPerDay: 10,
      topicTargetPerDay: 1,
      quizDone: false,
      topicDone: false,
      completedAt: null
    };
  } catch (error) {
    console.error('Database error (getDailyGoalProgress):', error);
    return null;
  }
}

async function updateDailyGoalProgress(userId, platform, patch = {}, date = null) {
  try {
    const current = await getDailyGoalProgress(userId, platform, date);
    if (!current) return null;
    const merged = { ...current, ...patch };
    merged.quizDone = merged.quizQuestionsAnswered >= merged.quizTargetPerDay || merged.quizDone;
    merged.topicDone = merged.topicGoalsCompleted >= merged.topicTargetPerDay || merged.topicDone;
    if (merged.quizDone && merged.topicDone && !merged.completedAt) {
      merged.completedAt = new Date().toISOString();
    }
    const key = KEYS.dailyGoal(platform, userId, date || getTodayDateKey());
    await redis.set(key, merged, { ex: 86400 * 5 });
    return merged;
  } catch (error) {
    console.error('Database error (updateDailyGoalProgress):', error);
    return null;
  }
}

async function markDailyQuizCompletion(userId, platform, answeredCount = 0) {
  const p = await getDailyGoalProgress(userId, platform);
  if (!p) return null;
  return await updateDailyGoalProgress(userId, platform, {
    quizQuestionsAnswered: (p.quizQuestionsAnswered || 0) + Math.max(0, Number(answeredCount) || 0),
    quizSetsCompleted: (p.quizSetsCompleted || 0) + 1
  });
}

async function markDailyTopicGoalCompletion(userId, platform) {
  const p = await getDailyGoalProgress(userId, platform);
  if (!p) return null;
  return await updateDailyGoalProgress(userId, platform, {
    topicGoalsCompleted: (p.topicGoalsCompleted || 0) + 1
  });
}

// ============ LEADERBOARD ============

// Update leaderboard score
async function updateLeaderboard(userId, platform, xp, name = 'Student') {
  try {
    const weekKey = KEYS.leaderboard('weekly');
    const monthKey = KEYS.leaderboard('monthly');
    const allTimeKey = KEYS.leaderboard('alltime');
    
    const member = `${platform}:${userId}`;
    
    // Update all leaderboards
    await redis.zadd(weekKey, { score: xp, member });
    await redis.zadd(monthKey, { score: xp, member });
    await redis.zadd(allTimeKey, { score: xp, member });
    
    // Set expiry for weekly (7 days) and monthly (30 days)
    await redis.expire(weekKey, 604800);
    await redis.expire(monthKey, 2592000);
    
    return true;
  } catch (error) {
    console.error('Database error (updateLeaderboard):', error);
    return false;
  }
}

// Get leaderboard
async function getLeaderboard(period = 'weekly', limit = 10) {
  try {
    const key = KEYS.leaderboard(period);
    const results = await redis.zrange(key, 0, limit - 1, { rev: true, withScores: true });
    
    // Format results
    const leaderboard = [];
    for (let i = 0; i < results.length; i += 2) {
      const member = results[i];
      const score = results[i + 1];
      const [platform, userId] = member.split(':');
      const profile = await getUser(userId, platform);
      const username = profile?.username
        ? (profile.username.startsWith('@') ? profile.username : `@${profile.username}`)
        : null;
      const displayName = username || profile?.name || profile?.firstName || `User ${String(userId).slice(-4)}`;
      leaderboard.push({
        rank: Math.floor(i / 2) + 1,
        userId,
        platform,
        xp: parseInt(score),
        username,
        name: displayName
      });
    }
    
    return leaderboard;
  } catch (error) {
    console.error('Database error (getLeaderboard):', error);
    return [];
  }
}

// Get user rank
async function getUserRank(userId, platform, period = 'weekly') {
  try {
    const key = KEYS.leaderboard(period);
    const member = `${platform}:${userId}`;
    const rank = await redis.zrevrank(key, member);
    return rank !== null ? rank + 1 : null;
  } catch (error) {
    console.error('Database error (getUserRank):', error);
    return null;
  }
}

async function getKeysByPattern(pattern) {
  try {
    return await redis.keys(pattern);
  } catch (error) {
    console.error('Database error (getKeysByPattern):', error);
    return [];
  }
}

// ============ GROUP LEAGUE & REFERRALS ============

function normalizeReferralCode(code = '') {
  return String(code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function getReferralCodeFromUserId(userId) {
  return `MIGA${String(userId).slice(-6)}`.toUpperCase();
}

async function ensureReferralCode(userId, platform = 'telegram') {
  try {
    const user = await getUser(userId, platform);
    const existing = normalizeReferralCode(user.referralCode || '');
    if (existing) return existing;

    const referralCode = getReferralCodeFromUserId(userId);
    await updateUser(userId, platform, { referralCode });
    await redis.set(`miga:ref:code:${referralCode}`, String(userId));
    return referralCode;
  } catch (error) {
    console.error('Database error (ensureReferralCode):', error);
    return null;
  }
}

async function getUserIdByReferralCode(code) {
  try {
    const normalized = normalizeReferralCode(code);
    if (!normalized) return null;
    return await redis.get(`miga:ref:code:${normalized}`);
  } catch (error) {
    console.error('Database error (getUserIdByReferralCode):', error);
    return null;
  }
}

async function applyReferral(newUserId, platform, code) {
  try {
    const normalized = normalizeReferralCode(code);
    if (!normalized) return { ok: false, reason: 'invalid_code' };

    const inviterId = await getUserIdByReferralCode(normalized);
    if (!inviterId) return { ok: false, reason: 'code_not_found' };
    if (String(inviterId) === String(newUserId)) return { ok: false, reason: 'self_referral' };

    const newUser = await getUser(newUserId, platform);
    if (newUser.referredBy) return { ok: false, reason: 'already_referred' };

    // Reward both sides.
    await addXP(inviterId, platform, 120, 'referral_inviter');
    await addXP(newUserId, platform, 80, 'referral_joiner');
    await awardBadge(inviterId, platform, 'community_builder');
    await awardBadge(newUserId, platform, 'referred_member');

    const inviter = await getUser(inviterId, platform);
    const inviterCount = (inviter.referralsCount || 0) + 1;
    await updateUser(inviterId, platform, { referralsCount: inviterCount, proQuizUnlocked: true });
    await updateUser(newUserId, platform, { referredBy: String(inviterId), proQuizUnlocked: true });

    return { ok: true, inviterId: String(inviterId), referralCode: normalized };
  } catch (error) {
    console.error('Database error (applyReferral):', error);
    return { ok: false, reason: 'error' };
  }
}

async function trackGroup(groupId, groupTitle = '') {
  try {
    await redis.sadd('miga:groups:tracked', String(groupId));
    if (groupTitle) {
      await redis.set(`miga:group:title:${groupId}`, groupTitle);
    }
    return true;
  } catch (error) {
    console.error('Database error (trackGroup):', error);
    return false;
  }
}

async function getTrackedGroups() {
  try {
    const ids = await redis.smembers('miga:groups:tracked');
    return Array.isArray(ids) ? ids : [];
  } catch (error) {
    console.error('Database error (getTrackedGroups):', error);
    return [];
  }
}

async function updateGroupLeaderboard(groupId, userId, platform, totalXp) {
  try {
    const key = `miga:group:leaderboard:weekly:${groupId}`;
    const member = `${platform}:${userId}`;
    await redis.zadd(key, { score: totalXp, member });
    await redis.expire(key, 604800);
    await trackGroup(groupId);
    return true;
  } catch (error) {
    console.error('Database error (updateGroupLeaderboard):', error);
    return false;
  }
}

async function getGroupLeaderboard(groupId, limit = 10) {
  try {
    const key = `miga:group:leaderboard:weekly:${groupId}`;
    const results = await redis.zrange(key, 0, limit - 1, { rev: true, withScores: true });
    const leaderboard = [];
    for (let i = 0; i < results.length; i += 2) {
      const member = results[i];
      const score = results[i + 1];
      const [platform, userId] = member.split(':');
      const profile = await getUser(userId, platform);
      const username = profile?.username
        ? (profile.username.startsWith('@') ? profile.username : `@${profile.username}`)
        : null;
      const name = username || profile?.name || profile?.firstName || `User ${String(userId).slice(-4)}`;
      leaderboard.push({
        rank: Math.floor(i / 2) + 1,
        userId,
        platform,
        xp: parseInt(score, 10) || 0,
        name,
        username
      });
    }
    return leaderboard;
  } catch (error) {
    console.error('Database error (getGroupLeaderboard):', error);
    return [];
  }
}

async function getGroupTitle(groupId) {
  try {
    return await redis.get(`miga:group:title:${groupId}`);
  } catch (error) {
    console.error('Database error (getGroupTitle):', error);
    return null;
  }
}

// ============ GLOBAL STATS ============

// Get global stats (for admin dashboard)
async function getGlobalStats() {
  try {
    const totalUsers = await redis.get(`${KEYS.globalStats()}:totalUsers`) || 0;
    const totalQuestions = await redis.get(`${KEYS.globalStats()}:totalQuestionsAsked`) || 0;
    const totalPhotos = await redis.get(`${KEYS.globalStats()}:totalPhotosAnalyzed`) || 0;
    const totalProblems = await redis.get(`${KEYS.globalStats()}:totalProblemsSolved`) || 0;
    const totalQuizzes = await redis.get(`${KEYS.globalStats()}:totalQuizzesCompleted`) || 0;
    
    return {
      totalUsers: parseInt(totalUsers),
      totalQuestions: parseInt(totalQuestions),
      totalPhotos: parseInt(totalPhotos),
      totalProblems: parseInt(totalProblems),
      totalQuizzes: parseInt(totalQuizzes)
    };
  } catch (error) {
    console.error('Database error (getGlobalStats):', error);
    return { totalUsers: 0, totalQuestions: 0, totalPhotos: 0, totalProblems: 0, totalQuizzes: 0 };
  }
}

// ============ QUIZ BANK (UPSTASH LISTS) ============

async function getQuizSubjectsFromRedis(limit = 20) {
  try {
    const keys = await redis.keys('quiz:subject:*');
    if (!keys || keys.length === 0) return [];

    const subjects = [];
    for (const key of keys) {
      const slug = key.split(':').pop();
      const count = await redis.llen(key);
      if (count > 0) {
        subjects.push({
          id: slug,
          name: toTitleCase(slug),
          icon: QUIZ_SUBJECT_ICONS[slug] || '📘',
          count
        });
      }
    }

    return subjects
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  } catch (error) {
    console.error('Database error (getQuizSubjectsFromRedis):', error);
    return [];
  }
}

async function getQuizQuestionsFromRedis(subjectId, limit = 10) {
  try {
    const key = `quiz:subject:${(subjectId || '').toLowerCase()}`;
    const raw = await redis.lrange(key, 0, -1);
    if (!raw || raw.length === 0) return [];

    const parsed = raw
      .map(item => {
        try {
          return typeof item === 'string' ? JSON.parse(item) : item;
        } catch {
          return null;
        }
      })
      .filter(q => q && (q.question_text || q.question) && Array.isArray(q.options) && q.options.length === 4)
      .map(q => ({
        question_text: q.question_text || q.question,
        options: q.options.map(o => String(o)),
        correct_answer: normalizeQuizAnswerIndex(q, q.options, 0),
        explanation: q.explanation || 'Great job!'
      }))
      .filter(q => q.question_text && q.question_text.length >= 12);

    return parsed.sort(() => 0.5 - Math.random()).slice(0, limit);
  } catch (error) {
    console.error('Database error (getQuizQuestionsFromRedis):', error);
    return [];
  }
}

// ============ SESSION TRACKING ============

// Track session time (for early bird / night owl badges)
async function trackSessionTime(userId, platform) {
  try {
    const hour = new Date().getHours();
    const user = await getUser(userId, platform);
    
    // Early bird: before 6 AM
    if (hour < 6) {
      user.stats.earlyBirdSessions = (user.stats.earlyBirdSessions || 0) + 1;
    }
    // Night owl: after midnight (0-3 AM)
    if (hour >= 0 && hour < 3) {
      user.stats.nightOwlSessions = (user.stats.nightOwlSessions || 0) + 1;
    }
    
    await updateUser(userId, platform, { stats: user.stats });
    return user.stats;
  } catch (error) {
    console.error('Database error (trackSessionTime):', error);
    return null;
  }
}

module.exports = {
  // Generic data
  saveData,
  getData,
  deleteData,
  getKeysByPattern,

  // User management
  getUser,
  updateUser,
  setLanguage,
  setMode,
  setExam,
  setGrade,
  isOnboarded,
  getOnboardingStep,
  resetUser,
  saveUserProfile,
  userExists,
  getAllUsers,
  registerUserForBroadcast,
  
  // Gamification
  addXP,
  awardBadge,
  getUserBadges,
  
  // Streak
  updateStreak,
  getStreak,
  
  // Conversation
  addToHistory,
  getConversationHistory,
  clearHistory,
  
  // Stats
  incrementStat,
  incrementPhotoCount,
  incrementVoiceCount,
  incrementProblemsSolved,
  incrementQuizzesCompleted,
  getUserStats,
  
  // Weak areas
  trackWeakArea,
  getWeakAreas,
  
  // Study plan
  saveStudyPlan,
  getStudyPlan,
  
  // Usage tracking
  trackDailyUsage,
  getDailyUsage,
  hasExceededFreeLimit,
  getPlanLimits,
  getFeatureUsage,
  consumeFeatureQuota,
  getUsageSummary,
  setUserPlan,
  getDailyGoalProgress,
  updateDailyGoalProgress,
  markDailyQuizCompletion,
  markDailyTopicGoalCompletion,
  
  // Leaderboard
  updateLeaderboard,
  getLeaderboard,
  getUserRank,
  updateGroupLeaderboard,
  getGroupLeaderboard,
  trackGroup,
  getTrackedGroups,
  getGroupTitle,

  // Referrals
  ensureReferralCode,
  getUserIdByReferralCode,
  applyReferral,
  
  // Session
  trackSessionTime,
  
  // Global
  getGlobalStats,

  // Upstash quiz bank
  getQuizSubjectsFromRedis,
  getQuizQuestionsFromRedis,
};

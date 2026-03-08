const db = require('./database');
const openrouter = require('./openrouter');

const STATE_KEY = (platform, userId) => `miga:goal:state:${platform}:${userId}`;
const RESUME_KEY = (platform, userId) => `miga:goal:resume:${platform}:${userId}`;

function extractJsonBlock(text = '') {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) return fenced[1].trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text;
}

function parseStrictJson(text = '') {
  const raw = extractJsonBlock(text);
  return JSON.parse(raw);
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function normalizeQuestion(q = {}) {
  const options = Array.isArray(q.options) ? q.options.map(String).slice(0, 4) : [];
  if (options.length !== 4) throw new Error('Invalid question options');
  const correct = Number(q.correct_answer);
  if (!Number.isInteger(correct) || correct < 0 || correct > 3) {
    throw new Error('Invalid correct_answer');
  }
  return {
    question_text: String(q.question_text || '').trim(),
    options,
    correct_answer: correct,
    explanation: String(q.explanation || '').trim() || 'Great attempt.'
  };
}

function normalizePlan(raw = {}, topic = '') {
  if (!raw || !Array.isArray(raw.sessions) || raw.sessions.length < 2) {
    throw new Error('AI plan missing sessions');
  }

  const sessions = raw.sessions.slice(0, 10).map((s, idx) => {
    const teach = Array.isArray(s.teach_points) ? s.teach_points.map(String).map(t => t.trim()).filter(Boolean) : [];
    if (teach.length < 3) throw new Error(`Session ${idx + 1} missing teach_points`);
    return {
      title: String(s.title || `Session ${idx + 1}`).trim(),
      objective: String(s.objective || '').trim(),
      duration_minutes: clamp(Number(s.duration_minutes) || 12, 8, 40),
      break_after_minutes: clamp(Number(s.break_after_minutes) || 8, 5, 25),
      teach_points: teach.slice(0, 8),
      checkpoint: normalizeQuestion(s.checkpoint || {})
    };
  });

  const masterQuizRaw = Array.isArray(raw.master_quiz) ? raw.master_quiz : [];
  if (masterQuizRaw.length < 3) throw new Error('master_quiz must have at least 3 questions');
  const master_quiz = masterQuizRaw.slice(0, 5).map(normalizeQuestion);

  return {
    topic: String(raw.topic || topic).trim() || topic,
    overview: String(raw.overview || '').trim(),
    sessions,
    master_quiz
  };
}

async function planTopicWithAI(topic, user = {}) {
  const exam = String(user.exam || 'UPSC').toUpperCase();
  const style = user.language || 'en';
  const prompt = `
You are MIGA, a high-performance Indian exam tutor.
Create a complete micro-session learning plan for topic: "${topic}".
Target exam: ${exam}.
Language code: ${style}.

Rules:
1) Teach deeply like an experienced UPSC mentor, but do not dump huge text at once.
2) Session sizing must be balanced by complexity. Easy topics can have fewer/shorter sessions, complex topics must have more depth and time.
3) For each session include only:
   - title
   - objective
   - duration_minutes
   - break_after_minutes
   - teach_points (3-8 concise teaching steps)
   - checkpoint (MCQ) with exactly 4 options and correct_answer index 0-3.
4) checkpoint MUST be answerable only from teach_points of that same session.
5) master_quiz (3-5 MCQs) must be answerable only from all session teach_points.
6) No markdown. Return STRICT JSON object only.

Required JSON schema:
{
  "topic": "string",
  "overview": "string",
  "sessions": [
    {
      "title": "string",
      "objective": "string",
      "duration_minutes": 12,
      "break_after_minutes": 8,
      "teach_points": ["..."],
      "checkpoint": {
        "question_text": "string",
        "options": ["A","B","C","D"],
        "correct_answer": 0,
        "explanation": "string"
      }
    }
  ],
  "master_quiz": [
    {
      "question_text": "string",
      "options": ["A","B","C","D"],
      "correct_answer": 0,
      "explanation": "string"
    }
  ]
}
  `.trim();

  const response = await openrouter.chat([
    { role: 'system', content: 'You output strict JSON only.' },
    { role: 'user', content: prompt }
  ], { temperature: 0.2, maxTokens: 2600 });

  // AI-only repair path: no static template fallback.
  try {
    return normalizePlan(parseStrictJson(response), topic);
  } catch (e) {
    const repair = await openrouter.chat([
      { role: 'system', content: 'Fix malformed JSON. Return strict valid JSON only.' },
      { role: 'user', content: `Repair this into the required schema JSON only:\n${response}` }
    ], { temperature: 0.1, maxTokens: 2600 });
    return normalizePlan(parseStrictJson(repair), topic);
  }
}

async function startGoal(userId, platform, topic, user = {}) {
  const plan = await planTopicWithAI(topic, user);
  const state = {
    userId: String(userId),
    platform,
    topic: plan.topic,
    overview: plan.overview,
    sessions: plan.sessions,
    master_quiz: plan.master_quiz,
    currentSessionIndex: 0,
    currentMasterIndex: 0,
    sessionResults: [],
    masterResults: [],
    status: 'active',
    startedAt: Date.now(),
    updatedAt: Date.now()
  };
  await db.saveData(STATE_KEY(platform, userId), state, 86400 * 14);
  await db.deleteData(RESUME_KEY(platform, userId));
  return state;
}

async function getGoalState(userId, platform) {
  return await db.getData(STATE_KEY(platform, userId));
}

async function saveGoalState(userId, platform, state) {
  state.updatedAt = Date.now();
  await db.saveData(STATE_KEY(platform, userId), state, 86400 * 14);
  return state;
}

function getCurrentSession(state) {
  if (!state || !Array.isArray(state.sessions)) return null;
  return state.sessions[state.currentSessionIndex] || null;
}

function getCurrentMasterQuestion(state) {
  if (!state || !Array.isArray(state.master_quiz)) return null;
  return state.master_quiz[state.currentMasterIndex] || null;
}

function formatSessionText(state, session) {
  const lines = [
    `🎯 *Goal Topic:* ${state.topic}`,
    `━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `📘 *${session.title}*`,
    session.objective ? `*Objective:* ${session.objective}` : null,
    `⏱️ *Study Time:* ${session.duration_minutes} min`,
    ``,
    `*Tutor Flow:*`
  ].filter(Boolean);

  session.teach_points.forEach((p, i) => {
    lines.push(`${i + 1}. ${p}`);
  });

  lines.push('', `🧠 Checkpoint incoming...`);
  return lines.join('\n');
}

async function scheduleResume(userId, platform, topic, chatId, breakMinutes) {
  const dueAt = Date.now() + (breakMinutes * 60 * 1000);
  await db.saveData(RESUME_KEY(platform, userId), {
    userId: String(userId),
    platform,
    topic,
    chatId: String(chatId),
    dueAt,
    notified: false
  }, 86400 * 7);
  return dueAt;
}

async function clearResume(userId, platform) {
  await db.deleteData(RESUME_KEY(platform, userId));
}

async function recordSessionAnswer(userId, platform, sessionIndex, isCorrect) {
  const state = await getGoalState(userId, platform);
  if (!state || state.status !== 'active') return null;
  if (sessionIndex !== state.currentSessionIndex) return state;

  state.sessionResults.push({
    sessionIndex,
    isCorrect: Boolean(isCorrect),
    ts: Date.now()
  });
  state.currentSessionIndex += 1;

  const sessionsDone = state.currentSessionIndex >= state.sessions.length;
  if (sessionsDone) {
    state.status = 'master_quiz';
  }
  await saveGoalState(userId, platform, state);

  return {
    state,
    sessionsDone,
    nextBreakMinutes: sessionsDone ? 0 : state.sessions[state.currentSessionIndex - 1].break_after_minutes
  };
}

async function recordMasterAnswer(userId, platform, masterIndex, isCorrect) {
  const state = await getGoalState(userId, platform);
  if (!state || state.status !== 'master_quiz') return null;
  if (masterIndex !== state.currentMasterIndex) return state;

  state.masterResults.push({
    masterIndex,
    isCorrect: Boolean(isCorrect),
    ts: Date.now()
  });
  state.currentMasterIndex += 1;

  const complete = state.currentMasterIndex >= state.master_quiz.length;
  if (complete) state.status = 'completed';
  await saveGoalState(userId, platform, state);

  return { state, complete };
}

function buildCompletionSummary(state, displayName = 'Learner') {
  const sessionCorrect = state.sessionResults.filter(r => r.isCorrect).length;
  const masterCorrect = state.masterResults.filter(r => r.isCorrect).length;
  const masterTotal = state.master_quiz.length;
  return (
    `🏆 *GOAL COMPLETED* 🏆\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `👤 *Student:* ${displayName}\n` +
    `📚 *Topic:* ${state.topic}\n` +
    `✅ *Session Checkpoints:* ${sessionCorrect}/${state.sessions.length}\n` +
    `🎯 *Master Quiz:* ${masterCorrect}/${masterTotal}\n\n` +
    `Proud of your consistency. Keep this streak alive.`
  );
}

module.exports = {
  startGoal,
  getGoalState,
  saveGoalState,
  getCurrentSession,
  getCurrentMasterQuestion,
  formatSessionText,
  scheduleResume,
  clearResume,
  recordSessionAnswer,
  recordMasterAnswer,
  buildCompletionSummary
};

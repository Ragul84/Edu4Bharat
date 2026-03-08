# Edu4Bharat

<p align="center">
  <b>India's OpenClaw-style AI Study Agent for Telegram</b><br/>
  <sub>Powered by MIGA + Mindgains.ai</sub>
</p>

<p align="center">
  <a href="https://github.com/Ragul84/Edu4Bharat/stargazers"><img src="https://img.shields.io/github/stars/Ragul84/Edu4Bharat?style=for-the-badge" alt="Stars"></a>
  <a href="https://github.com/Ragul84/Edu4Bharat/network/members"><img src="https://img.shields.io/github/forks/Ragul84/Edu4Bharat?style=for-the-badge" alt="Forks"></a>
  <a href="https://github.com/Ragul84/Edu4Bharat/issues"><img src="https://img.shields.io/github/issues/Ragul84/Edu4Bharat?style=for-the-badge" alt="Issues"></a>
  <img src="https://img.shields.io/badge/telegram-bot-blue?style=for-the-badge&logo=telegram" alt="Telegram Bot">
</p>

<p align="center">
  <a href="https://t.me/edu4bharatai_bot"><b>Try the bot: https://t.me/edu4bharatai_bot</b></a>
</p>

## What Is This?

Edu4Bharat is an autonomous education bot stack for Indian learners:

- Real quiz + PYQ practice from Upstash Redis
- Goal-based AI micro-tutoring with checkpoints
- Group league, host mode, and battle flows
- Shareable achievement banners
- Daily automations via cron + heartbeat
- Strict Free/Pro daily credit controls

This project is positioned as an India-first open autonomous education-agent build inspired by OpenClaw-style orchestration for real exam prep workflows.

## Core Features

- Multi-exam support: UPSC, TNPSC, SSC, Banking, Railways, state exams
- Multi-language support: English, Hindi, Tamil, Telugu, Kannada, Malayalam
- AI tutor mode: `/goal <topic>` with sessioned teaching + master quiz
- Quiz modes: subject quiz, PYQ practice, group battle, duel, host rounds
- Growth loops: streaks, XP, referrals, leaderboard, share cards
- Broadcast automations: challenge, reminders, mega quiz events, group top-3

## Free vs Pro (Limits, Not Feature Locks)

All features are available in both tiers. Pro gives higher daily limits.

### Free default limits

- AI chat: `8/day`
- Quiz questions: `15/day`
- PYQ questions: `5/day`
- Goal sessions: `1/day`
- Image solves: `3/day`
- Voice chats: `4/day`
- Current affairs fetch: `3/day`

### Pro default limits

- AI chat: `60/day`
- Quiz questions: `60/day`
- PYQ questions: `20/day`
- Goal sessions: `6/day`
- Image solves: `20/day`
- Voice chats: `25/day`
- Current affairs fetch: `15/day`

## User Commands

- `/start` - start/home
- `/quiz` - quiz center
- `/goal <topic>` - AI tutor micro-session
- `/dailyprogress` - daily target tracker
- `/myplan` - current tier + model
- `/usage` - today's credit usage/remaining
- `/groupleague` - group weekly rankings
- `/hoststart <subject>` `/hostnext` `/hostend` - group host mode
- `/battle <subject>` - group speed battle

## Automation Layer (Cron + Heartbeat)

- Vercel cron drives scheduled broadcast jobs (`/api/broadcast`)
- Heartbeat tasks handle recurring operational checks and resume pings
- Goal resume pings and scheduled study reminders run without manual intervention

## OpenClaw-Style Workspace Layer

Edu4Bharat is operated with a broader autonomous workspace pattern:

- `HEARTBEAT.md` task loop for periodic maintenance and nudges
- `cron/jobs.json` for scheduled jobs
- memory-driven continuity (`memory/MEMORY.md`, `memory/HISTORY.md`)
- skill-based execution conventions for education workflows

Runtime mirror files are included under `workspace-runtime/`.

## Stack

- Node.js + Vercel serverless API
- Telegram Bot API (webhook mode)
- Upstash Redis (state, leaderboard, quotas, session memory)
- OpenRouter (single fast low-cost model route with fallback key)
- Sharp (banner rendering)

## Architecture

```text
Client Channels -> Edu4Bharat Runtime
                   |- tutoring + quiz orchestration
                   |- limit/plan governance
                   |- autonomy loop (cron + heartbeat)
                   |- memory-backed continuity
                   |- analytics + growth loops
```

## Setup

1. Install deps

```bash
npm install
```

2. Configure env vars

- `TELEGRAM_BOT_TOKEN`
- `OPENROUTER_API_KEY`
- `OPENROUTER_API_KEY_BACKUP` (recommended)
- `OPENROUTER_MODEL` (fast, low-cost model)
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `CRON_SECRET`

Optional limit overrides:

- `LIMIT_FREE_AI_CHAT`, `LIMIT_FREE_QUIZ_QUESTIONS`, ...
- `LIMIT_PRO_AI_CHAT`, `LIMIT_PRO_QUIZ_QUESTIONS`, ...

3. Deploy

```bash
vercel --prod
```

4. Set webhook

```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://<your-domain>/api/telegram"
```

## Repo Goals

- Build the most reliable exam-prep AI bot experience for India
- Keep quality high: no dummy quizzes, strict QC, real PYQ-first direction
- Open-source operational patterns for education agents (cron, heartbeat, quotas, group game loops)

## Contributing

PRs are welcome for:

- exam-quality validation pipelines
- localization improvements
- battle/league fairness logic
- mentor-quality AI tutoring prompts

---

Built by Mindgains.ai with MIGA mascot.

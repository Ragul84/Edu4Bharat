const path = require('path');
const sharp = require('sharp');

const bannerEngine = {
  TEMPLATES: {
    VICTORY: 'victory.jpg',
    STUDY: 'study.jpg',
    BATTLEWIN: 'battlewin.jpg',
  },

  getTemplatePath(type = 'VICTORY') {
    const key = String(type || 'VICTORY').toUpperCase();
    const file = this.TEMPLATES[key] || this.TEMPLATES.VICTORY;
    return path.join(__dirname, '..', 'assets', 'banners', file);
  },

  escapeXml(value = '') {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  },

  wrapLine(text = '', maxChars = 24, maxLines = 2) {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    const lines = [];
    let current = '';

    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (next.length <= maxChars) current = next;
      else {
        if (current) lines.push(current);
        current = word;
      }
      if (lines.length >= maxLines) break;
    }

    if (current && lines.length < maxLines) lines.push(current);
    return lines.length ? lines : ['General Studies'];
  },

  getTheme(type, data = {}) {
    const key = String(type || '').toUpperCase();
    if (key === 'STUDY') {
      return {
        topTitle: data.topTitle || 'DAILY MISSION COMPLETE',
        heroWord: data.bigWord || 'MASTERED',
        detailLine: data.detailLine || 'Session Closed',
      };
    }
    if (key === 'BATTLEWIN') {
      return {
        topTitle: data.topTitle || 'QUIZ BATTLE WON',
        heroWord: data.bigWord || 'VICTORY',
        detailLine: data.detailLine || 'Rank Secured',
      };
    }
    return {
      topTitle: data.topTitle || 'GOAL COMPLETED',
      heroWord: data.bigWord || 'ACHIEVED',
      detailLine: data.detailLine || 'Milestone Unlocked',
    };
  },

  makeOverlaySvg(width, height, type, data = {}) {
    const theme = this.getTheme(type, data);
    const rawTopic = String(data.topic || data.subject || 'General Studies');
    const title = this.escapeXml(theme.topTitle);
    const heroWord = this.escapeXml(theme.heroWord);
    const detailLine = this.escapeXml(theme.detailLine);
    const topic = this.escapeXml(rawTopic);
    const score = this.escapeXml(data.score || '');
    const statLine = this.escapeXml(data.statLine || '');
    const brandTag = this.escapeXml(data.brandTag || '@Edu4BharatAI_bot');
    const usernameRaw = String(data.username || '').trim();
    const handle = usernameRaw ? (usernameRaw.startsWith('@') ? usernameRaw : `@${usernameRaw}`) : '@learner';
    const xpNumber = Number.isFinite(Number(data.xpGained)) ? Math.max(0, Number(data.xpGained)) : null;
    const identityLine = this.escapeXml(xpNumber !== null ? `${handle}  |  +${xpNumber} XP` : handle);
    const statementRaw = String(data.statement || `I just mastered ${rawTopic} on @Edu4BharatAI_bot`);

    const panelX = Math.floor(width * 0.5);
    const panelY = Math.floor(height * 0.14);
    const panelW = Math.floor(width * 0.45);
    const panelH = Math.floor(height * 0.72);
    const left = panelX + 40;

    const titleRaw = String(theme.topTitle || '');
    const titleLen = titleRaw.length;
    const titleFontSize = Math.max(22, Math.min(30, 34 - Math.floor(titleLen / 6)));
    const titleTracking = titleLen > 26 ? 0.5 : 1;

    let lineY = panelY + 170;
    const topicLines = this.wrapLine(topic, 22, 2)
      .map((line) => {
        const text = `<text x="${left}" y="${lineY}" font-size="56" font-family="Segoe UI, Arial, sans-serif" font-weight="700" fill="#F8FAFF">${this.escapeXml(line)}</text>`;
        lineY += 60;
        return text;
      })
      .join('');

    const heroY = lineY + 16;
    const heroSize = Math.max(68, Math.floor(width * 0.054));
    let statementY = heroY + 54;
    const statementLines = this.wrapLine(statementRaw, 28, 2)
      .map((line) => {
        const text = `<text x="${left}" y="${statementY}" font-size="30" font-family="Segoe UI, Arial, sans-serif" font-weight="600" fill="#F3F6FF">${this.escapeXml(line)}</text>`;
        statementY += 42;
        return text;
      })
      .join('');

    const detailY = statementY + 8;
    const scoreY = detailY + 46;
    const statY = scoreY + 46;
    const scoreRow = score
      ? `<text x="${left}" y="${scoreY}" font-size="34" font-family="Segoe UI, Arial, sans-serif" font-weight="700" fill="#95F5D7">${score}</text>`
      : '';
    const statRow = statLine
      ? `<text x="${left}" y="${statY}" font-size="24" font-family="Segoe UI, Arial, sans-serif" font-weight="500" fill="#E9EEFF">${statLine}</text>`
      : '';
    const identityY = panelY + panelH - 56;

    return `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="panelBg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(11, 15, 44, 0.38)" />
      <stop offset="100%" stop-color="rgba(6, 10, 26, 0.68)" />
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FFE8A8" />
      <stop offset="100%" stop-color="#E9B85E" />
    </linearGradient>
  </defs>
  <rect x="${panelX}" y="${panelY}" width="${panelW}" height="${panelH}" rx="24" fill="url(#panelBg)" />
  <text x="${left}" y="${panelY + 56}" font-size="${titleFontSize}" font-family="Segoe UI, Arial, sans-serif" font-weight="700" fill="url(#gold)" letter-spacing="${titleTracking}">${title}</text>
  ${topicLines}
  <text x="${left}" y="${heroY}" font-size="${heroSize}" font-family="Segoe UI, Arial, sans-serif" font-weight="800" fill="url(#gold)">${heroWord}</text>
  ${statementLines}
  ${detailLine ? `<text x="${left}" y="${detailY}" font-size="27" font-family="Segoe UI, Arial, sans-serif" font-weight="600" fill="#F3F6FF">${detailLine}</text>` : ''}
  ${scoreRow}
  ${statRow}
  <text x="${left}" y="${identityY}" font-size="24" font-family="Segoe UI, Arial, sans-serif" font-weight="600" fill="#DCE5FF">${identityLine}</text>
  <text x="${Math.floor(width * 0.03)}" y="${Math.floor(height * 0.95)}" font-size="18" font-family="Segoe UI, Arial, sans-serif" fill="#E8EAFE">Mindgains.ai</text>
  <text x="${Math.floor(width * 0.79)}" y="${Math.floor(height * 0.95)}" font-size="16" font-family="Segoe UI, Arial, sans-serif" fill="#F3F5FF">${brandTag}</text>
</svg>`.trim();
  },

  async generate(type, data) {
    try {
      const templatePath = this.getTemplatePath(type);
      const image = sharp(templatePath);
      const meta = await image.metadata();
      const width = meta.width || 1280;
      const height = meta.height || 720;
      const overlay = Buffer.from(this.makeOverlaySvg(width, height, type, data));

      return await image
        .composite([{ input: overlay, top: 0, left: 0 }])
        .jpeg({ quality: 91 })
        .toBuffer();
    } catch (error) {
      console.error('Banner generation failed:', error.message);
      return null;
    }
  },
};

module.exports = bannerEngine;

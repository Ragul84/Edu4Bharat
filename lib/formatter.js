/**
 * MIGA Telegram Text Formatter
 * Converts AI output to clean Telegram Markdown
 * - No raw ### headers
 * - No *** or ** leaking
 * - Bold keys before colons
 * - Proper spacing and line breaks
 * - Max 4096 chars (Telegram limit)
 */

/**
 * Format AI-generated text for Telegram
 * @param {string} text - Raw AI output
 * @returns {string} - Clean Telegram Markdown
 */
function formatForTelegram(text) {
  if (!text) return '';

  let out = text;

  // 1. Convert ### / ## / # headers → bold line with separator
  out = out.replace(/^#{1,3}\s+(.+)$/gm, (_, title) => `\n*${title.trim()}*\n${'─'.repeat(20)}`);

  // 2. Convert **text** → *text* (Telegram uses single * for bold)
  out = out.replace(/\*\*(.+?)\*\*/g, '*$1*');

  // 3. Convert __text__ or _text_ → _text_ (italic, keep as is)
  out = out.replace(/__(.+?)__/g, '_$1_');

  // 4. Bold keys before colons: "Word:" or "Two Words:" → "*Word:*"
  // Only if the key is at start of line or after bullet
  out = out.replace(/(^|[\n•\-])\s*([A-Za-z][A-Za-z\s]{1,30}):/gm, (match, prefix, key) => {
    // Skip if already bolded
    if (key.startsWith('*')) return match;
    return `${prefix} *${key.trim()}:*`;
  });

  // 5. Clean up bullet points — ensure • style
  out = out.replace(/^[\-\*]\s+/gm, '• ');

  // 6. Remove excessive blank lines (max 2 consecutive)
  out = out.replace(/\n{3,}/g, '\n\n');

  // 7. Trim leading/trailing whitespace
  out = out.trim();

  // 8. Truncate to Telegram limit (4096 chars)
  if (out.length > 4000) {
    out = out.substring(0, 3950) + '\n\n_...continued. Ask me for more!_';
  }

  return out;
}

/**
 * Format Smart Notes specifically
 * Adds section separators and ensures clean structure
 */
function formatNotes(text, topic) {
  let formatted = formatForTelegram(text);

  // Ensure it starts with a clean header
  const header = `📝 *Smart Notes: ${topic}*\n${'━'.repeat(22)}\n\n`;

  // Add footer with home hint
  const footer = `\n\n${'━'.repeat(22)}\n_Tap 🏠 Home to explore more features_`;

  return header + formatted + footer;
}

/**
 * Escape special chars for MarkdownV2
 */
function escapeV2(text) {
  // Characters that must be escaped in MarkdownV2
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

/**
 * Format Current Affairs — MarkdownV2 for beautiful Telegram rendering
 * Structure per item:
 *   1) __Category__
 *
 *   `"Headline"`
 *
 *   💡 Exam relevance
 *   ──────────────────
 */
function formatCurrentAffairs(rawItems, date) {
  // rawItems is the raw AI text — we parse it into structured blocks
  // Split by double newline to get individual items
  const lines = rawItems.split('\n').map(l => l.trim()).filter(Boolean);

  // Escape the date for MarkdownV2
  const safeDate = escapeV2(date);

  let out = `📰 *Current Affairs*\n__${safeDate}__\n${'━'.repeat(22)}\n\n`;

  // Parse AI output — look for category lines and news lines
  // AI format: "[EMOJI] *Category*\nHeadline\n*Why it matters:* explanation"
  // We'll rebuild it cleanly
  let itemNum = 0;
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Detect category line — starts with emoji or number or has *Category*
    const isCategoryLine = /^\*[^*]+\*$/.test(line) ||
                           /^[🔵🟢🔴🟡🟠⚪🟣🤍📌🌐🏛️🔬💰🌿🏅⚽🎖️]/.test(line) ||
                           /^\d+[\)\.]\s/.test(line);

    if (isCategoryLine) {
      itemNum++;
      // Extract clean category name — strip emojis, *, numbers
      let category = line
        .replace(/^\d+[\)\.]\s*/, '')
        .replace(/\*/g, '')
        .replace(/^[^\w\s]+/, '')
        .trim();

      // Next line = headline
      const headline = lines[i + 1] || '';
      // Line after = why it matters
      const whyLine = lines[i + 2] || '';
      const why = whyLine.replace(/^\*?Why it matters:?\*?\s*/i, '').replace(/\*/g, '').trim();

      // Build block with MarkdownV2
      const safeCategory = escapeV2(category);
      const safeHeadline = escapeV2(headline.replace(/\*/g, ''));
      const safeWhy      = escapeV2(why);

      out += `${itemNum}\\) __${safeCategory}__\n\n`;
      out += `\`"${safeHeadline}"\`\n\n`;
      if (safeWhy) out += `💡 _${safeWhy}_\n`;
      out += `${'─'.repeat(18)}\n\n`;

      i += 3; // skip category + headline + why
    } else {
      i++;
    }
  }

  // If parsing failed (AI gave unexpected format), fallback to plain escaped text
  if (itemNum === 0) {
    const safeRaw = escapeV2(rawItems.replace(/\*\*/g, '').replace(/###/g, ''));
    out += safeRaw;
  }

  out += `\n💡 _Stay updated daily for exam success\\!_`;
  return out;
}

/**
 * Format PYQ response
 */
function formatPYQ(text, query) {
  let formatted = formatForTelegram(text);
  const header = `📚 *PYQ Practice*\n_Query: ${query}_\n${'━'.repeat(22)}\n\n`;
  const footer = `\n\n${'━'.repeat(22)}\n_Ask for more PYQs or a different year/subject!_`;
  return header + formatted + footer;
}

/**
 * Format AI chat response (general)
 */
function formatChat(text) {
  return formatForTelegram(text);
}

/**
 * Home button keyboard — always include this on AI responses
 */
function homeButton() {
  return {
    inline_keyboard: [
      [{ text: '🏠 Home', callback_data: 'menu_main' }]
    ]
  };
}

/**
 * Home + Back button keyboard
 */
function homeAndBackButton(backData, backLabel = '🔙 Back') {
  return {
    inline_keyboard: [
      [{ text: backLabel, callback_data: backData }, { text: '🏠 Home', callback_data: 'menu_main' }]
    ]
  };
}

module.exports = {
  formatForTelegram,
  formatNotes,
  formatCurrentAffairs,
  formatPYQ,
  formatChat,
  homeButton,
  homeAndBackButton
};
